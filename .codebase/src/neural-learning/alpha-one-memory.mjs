// Alpha1 reward long-term store beside the restrained compartments (2026-10-25).
// The restrained groups (MBON12/PPL103, MBON01/PAM02) keep the unchanged
// ReversalMemory. Added groups: existing positive alpha/beta KC -> MBON07
// (MBON-alpha1) edges modulated by same-side PAM11 (PAM-alpha1). Update: the
// Gkanias depression term dg = eta*D*k without the inactive-KC recovery term,
// because alpha1 memory resisted reduction by DAN activation alone (Aso and Rubin,
// eLife 2016); PAM-alpha1/MBON-alpha1 support appetitive long-term memory
// (Ichinose et al., eLife 2015). Coarse cell-level mask; no extinction, so the
// trace's persistence is deterministic, not measured biological retention.
// Register: research/literature/source-solution-register.md (2026-10-25).
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { digest } from './mushroom-body.mjs';
import { ReversalMemory } from './reversal-memory.mjs';

export async function mapAlphaOne(graph, rootIds, annotationPath, onSegment = async () => {}) {
  if (!(rootIds instanceof BigInt64Array) || rootIds.length !== graph.row.length - 1) throw Error('Invalid root identities');
  const indices = new Map(Array.from(rootIds, (id, i) => [id.toString(), i]));
  if (indices.size !== rootIds.length) throw Error('Duplicate roots');
  const cells = new Map(); let header, lines = 0;
  for await (const line of createInterface({ input: createReadStream(annotationPath), crlfDelay: Infinity })) {
    const fields = line.split('\t');
    if (!header) {
      header = fields;
      for (const key of ['root_id', 'hemibrain_type', 'cell_class', 'side']) if (!header.includes(key)) throw Error(`Missing ${key}`);
      continue;
    }
    const get = key => fields[header.indexOf(key)] ?? '';
    const index = indices.get(get('root_id')), type = get('hemibrain_type'), side = get('side');
    if (index !== undefined && ['left', 'right'].includes(side) && (get('cell_class') === 'Kenyon_Cell' || ['MBON07', 'PAM11'].includes(type))) {
      if (cells.has(index)) throw Error('Duplicate annotation root');
      cells.set(index, { index, rootId: get('root_id'), type, side, cellClass: get('cell_class') });
    }
    if (++lines % 10000 === 0) await onSegment();
  }
  const groups = [], excluded = { negativeSign: 0, unsupportedKCType: 0, unannotatedInputs: 0 };
  const mbons = [...cells.values()].filter(c => c.type === 'MBON07');
  for (const side of ['left', 'right']) {
    const dan = [...cells.values()].filter(c => c.type === 'PAM11' && c.side === side).map(c => ({ index: c.index, rootId: c.rootId }));
    const edges = [], kc = [], observedKCTypes = {};
    for (const post of mbons) for (let e = graph.row[post.index]; e < graph.row[post.index + 1]; e++) {
      const pre = cells.get(graph.col[e]);
      if (!pre) { excluded.unannotatedInputs++; continue; }
      if (pre.cellClass !== 'Kenyon_Cell' || pre.side !== side) continue;
      observedKCTypes[pre.type] = (observedKCTypes[pre.type] ?? 0) + 1;
      // The alpha1 compartment lies in the alpha lobe: only alpha/beta KC axons.
      if (!/^KCab-/.test(pre.type)) { excluded.unsupportedKCType++; continue; }
      if (graph.sign[e] !== 1) { excluded.negativeSign++; continue; }
      edges.push(e); kc.push(pre.index);
    }
    groups.push({ side, mbonType: 'MBON07', danType: 'PAM11', dan, edges, kc, observedKCTypes });
  }
  const all = groups.flatMap(g => g.edges);
  if (new Set(all).size !== all.length) throw Error('Overlapping alpha1 groups');
  return { schema: 'alpha-one-mapping-v1', groups, readouts: { MBON07: mbons.map(c => ({ index: c.index, rootId: c.rootId })) }, excluded,
    readyForCandidateExperiment: groups.every(g => g.dan.length > 0 && g.edges.length > 0) && mbons.length > 0,
    approximation: 'Positive alpha/beta KC-to-MBON-alpha1 edges by KC hemisphere, modulated by the same-side PAM-alpha1 population; no synapse-coordinate compartment or receptor identity.' };
}

// Combined mapping = restrained groups + alpha1 groups (danType PAM11).
export function combineAlphaOneMapping(restrained, alphaOne) {
  if (alphaOne?.schema !== 'alpha-one-mapping-v1' || alphaOne.readyForCandidateExperiment !== true || !restrained?.readyForCandidateExperiment)
    throw Error('Incomplete alpha1 mapping; no learning enabled');
  if (restrained.groups.some(g => g.danType === 'PAM11')) throw Error('Restrained mapping already has alpha1 groups');
  return { ...restrained, schema: 'reversal-coarse-mapping-v1+alpha-one-mapping-v1', groups: [...restrained.groups, ...alphaOne.groups] };
}

export class AlphaOneMemory {
  constructor(model, mapping, { eta = 0.5, minGain = 0.2, maxGain = 1.8, activityScale = 1.5 } = {}) {
    if (!Array.isArray(mapping?.groups)) throw Error('Invalid combined mapping');
    this.alphaOne = mapping.groups.filter(g => g.danType === 'PAM11');
    if (!this.alphaOne.length || this.alphaOne.some(g => g.mbonType !== 'MBON07')) throw Error('Missing alpha1 groups');
    this.restrained = new ReversalMemory(model, { ...mapping, groups: mapping.groups.filter(g => g.danType !== 'PAM11') }, { eta, minGain, maxGain, activityScale });
    this.model = model; this.mapping = mapping;
    this.config = { eta, minGain, maxGain, activityScale };
    const own = new Set(this.restrained.edges);
    this.alphaEdges = this.alphaOne.flatMap(g => g.edges);
    if (!this.alphaEdges.length || new Set(this.alphaEdges).size !== this.alphaEdges.length || this.alphaEdges.some(e => own.has(e)))
      throw Error('Invalid alpha1 edge mask');
    for (const g of this.alphaOne) {
      if (!g.dan.length || g.edges.length !== g.kc.length) throw Error('Invalid alpha1 group');
      for (let i = 0; i < g.edges.length; i++) {
        const e = g.edges[i];
        if (!Number.isSafeInteger(e) || e < 0 || e >= model.graph.col.length || model.graph.sign[e] !== 1 || model.graph.col[e] !== g.kc[i]) throw Error('Invalid existing alpha1 edge');
      }
      if (g.dan.some(c => !Number.isSafeInteger(c.index) || c.index < 0 || c.index >= model.n)) throw Error('Invalid PAM-alpha1 mapping');
    }
    this.edges = [...this.restrained.edges, ...this.alphaEdges];
    this.alphaBase = Float32Array.from(this.alphaEdges, e => model.params.magnitude[e]);
    if (!this.alphaBase.every(v => Number.isFinite(v) && v > 0)) throw Error('Invalid alpha1 base efficacy');
    this.alphaGains = new Float64Array(this.alphaEdges.length).fill(1);
    this.identity = digest({ schema: 'alpha-one-memory-v1', restrained: this.restrained.identity, alphaOne: this.alphaOne, config: this.config, base: [...this.alphaBase] });
  }
  get events() { return this.restrained.events; }
  observe(rest, dt = 1) {
    const h = this.model.h[this.model.steps], { eta, minGain, maxGain, activityScale } = this.config;
    if (rest.length !== this.model.n || !Number.isFinite(dt) || dt <= 0 || dt > 1) throw Error('Invalid observation interval');
    for (const g of this.alphaOne) for (const i of [...g.kc, ...g.dan.map(c => c.index)]) if (!Number.isFinite(h[i]) || !Number.isFinite(rest[i])) throw Error('Nonfinite local activity');
    const alphaFactors = this.alphaOne.map(g => -g.dan.reduce((sum, c) => sum + Math.max(0, h[c.index] - rest[c.index]) / activityScale, 0) / g.dan.length);
    if (alphaFactors.some(D => eta * dt * -D > 1)) throw Error('Unstable candidate Euler step; no state changed');
    const next = Float64Array.from(this.alphaGains);
    let offset = 0, changed = 0;
    for (let group = 0; group < this.alphaOne.length; group++) {
      const g = this.alphaOne[group], D = alphaFactors[group];
      for (let i = 0; i < g.edges.length; i++, offset++) {
        const k = Math.max(0, h[g.kc[i]] - rest[g.kc[i]]) / activityScale;
        next[offset] = Math.max(minGain, Math.min(maxGain, next[offset] + eta * dt * D * k));
        if (!Number.isFinite(next[offset])) throw Error('Nonfinite efficacy');
        if (next[offset] !== this.alphaGains[offset]) changed++;
      }
    }
    // The restrained update validates and throws before mutating; commit alpha1 after it.
    const restrained = this.restrained.observe(rest, dt);
    this.alphaGains.set(next); this.applyAlpha();
    return { factors: restrained.factors, alphaFactors, changedEdges: restrained.changedEdges + changed, alphaChangedEdges: changed, events: this.events,
      scope: 'Restrained ReversalMemory update plus alpha1 active-KC depression without DAN-alone recovery; not reconstructed dopamine release' };
  }
  applyAlpha() { for (let i = 0; i < this.alphaEdges.length; i++) this.model.setMagnitude(this.alphaEdges[i], this.alphaBase[i] * this.alphaGains[i]); }
  apply() { this.restrained.apply(); this.applyAlpha(); }
  snapshot() { return { version: 1, identity: this.identity, events: this.events, gains: [...this.restrained.gains, ...this.alphaGains] }; }
  restore(s) {
    const n = this.restrained.gains.length, { minGain, maxGain } = this.config;
    if (s?.version !== 1 || s.identity !== this.identity || !Number.isSafeInteger(s.events) || s.events < 0 || !Array.isArray(s.gains)
      || s.gains.length !== this.edges.length || !s.gains.every(v => Number.isFinite(v) && v >= minGain && v <= maxGain)) throw Error('Incompatible candidate state');
    this.restrained.restore({ version: 1, identity: this.restrained.identity, events: s.events, gains: s.gains.slice(0, n) });
    this.alphaGains.set(s.gains.slice(n)); this.applyAlpha();
  }
}

// Fixed preference: restrained balance minus the reward-depressed MBON-alpha1 drive.
const mean = values => {
  if (!Array.isArray(values) || values.length < 1 || values.length > 128 || !values.every(Number.isFinite)) throw Error('Invalid bounded MBON population');
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};
export function readAlphaOneMBON(populations) {
  const [MBON12, MBON01, MBON07] = ['MBON12', 'MBON01', 'MBON07'].map(type => mean(populations?.[type]));
  const restrainedScore = MBON12 - MBON01, score = restrainedScore - MBON07;
  if (!Number.isFinite(score)) throw Error('Nonfinite MBON preference');
  return { MBON12, MBON01, MBON07, restrainedScore, score,
    meaning: 'Fixed mean(MBON12) - mean(MBON01) - mean(MBON07); larger preferred; engineered readout' };
}
