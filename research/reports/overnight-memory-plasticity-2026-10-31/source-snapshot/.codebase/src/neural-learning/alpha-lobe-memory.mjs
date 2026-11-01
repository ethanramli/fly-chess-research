// Alpha-lobe long-term stores beside the restrained compartments (2026-10-26).
// alpha-one-memory.mjs (pinned by the r10 runs) plus the aversive alpha3 store:
// long-term groups are alpha/beta KC -> MBON07 (MBON-alpha1) edges modulated by
// PAM11 (reward) and alpha/beta KC -> MBON14 (MBON-alpha3) edges modulated by
// PPL106 (PPL1-alpha3, punishment). Both use the alpha1 rule dg = eta*D*k without
// the inactive-KC recovery term. alpha3 sources: PPL1-alpha3 memory after spaced
// training resisted unpaired DAN activation (Aso and Rubin, eLife 2016); MBON-alpha3
// is required for aversive long-term memory (Wu et al., Sci Rep 2017).
// Approximations: no slow alpha3 acquisition, no consolidation timing, coarse
// cell-level mask; deterministic persistence is not measured biological retention.
// Register: research/literature/source-solution-register.md (2026-10-26).
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { digest } from './mushroom-body.mjs';
import { ReversalMemory } from './reversal-memory.mjs';

// Long-term DAN type -> its MBON type.
export const LONG_TERM = { PAM11: 'MBON07', PPL106: 'MBON14' };

// Per side: positive same-side alpha/beta KC inputs to mbonType, with the same-side danType cells.
export async function mapAlphaLobeCompartment(graph, rootIds, annotationPath, { mbonType, danType, schema }, onSegment = async () => {}) {
  if (LONG_TERM[danType] !== mbonType) throw Error('Unregistered alpha-lobe compartment');
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
    if (index !== undefined && ['left', 'right'].includes(side) && (get('cell_class') === 'Kenyon_Cell' || [mbonType, danType].includes(type))) {
      if (cells.has(index)) throw Error('Duplicate annotation root');
      cells.set(index, { index, rootId: get('root_id'), type, side, cellClass: get('cell_class') });
    }
    if (++lines % 10000 === 0) await onSegment();
  }
  const groups = [], excluded = { negativeSign: 0, unsupportedKCType: 0, unannotatedInputs: 0 };
  const mbons = [...cells.values()].filter(c => c.type === mbonType);
  for (const side of ['left', 'right']) {
    const dan = [...cells.values()].filter(c => c.type === danType && c.side === side).map(c => ({ index: c.index, rootId: c.rootId }));
    const edges = [], kc = [], observedKCTypes = {};
    for (const post of mbons) for (let e = graph.row[post.index]; e < graph.row[post.index + 1]; e++) {
      const pre = cells.get(graph.col[e]);
      if (!pre) { excluded.unannotatedInputs++; continue; }
      if (pre.cellClass !== 'Kenyon_Cell' || pre.side !== side) continue;
      observedKCTypes[pre.type] = (observedKCTypes[pre.type] ?? 0) + 1;
      // alpha1 and alpha3 lie in the alpha lobe: only alpha/beta KC axons.
      if (!/^KCab-/.test(pre.type)) { excluded.unsupportedKCType++; continue; }
      if (graph.sign[e] !== 1) { excluded.negativeSign++; continue; }
      edges.push(e); kc.push(pre.index);
    }
    groups.push({ side, mbonType, danType, dan, edges, kc, observedKCTypes });
  }
  const all = groups.flatMap(g => g.edges);
  if (new Set(all).size !== all.length) throw Error('Overlapping alpha-lobe groups');
  return { schema, groups, readouts: { [mbonType]: mbons.map(c => ({ index: c.index, rootId: c.rootId })) }, excluded,
    readyForCandidateExperiment: groups.every(g => g.dan.length > 0 && g.edges.length > 0) && mbons.length > 0,
    approximation: `Positive alpha/beta KC-to-${mbonType} edges by KC hemisphere, modulated by the same-side ${danType} population; no synapse-coordinate compartment or receptor identity.` };
}
export const mapAlphaThree = (graph, rootIds, annotationPath, onSegment) =>
  mapAlphaLobeCompartment(graph, rootIds, annotationPath, { mbonType: 'MBON14', danType: 'PPL106', schema: 'alpha-three-mapping-v1' }, onSegment);

// Combined mapping = restrained groups + alpha1 groups (PAM11) + alpha3 groups (PPL106).
export function combineAlphaLobeMapping(restrained, alphaOne, alphaThree) {
  if (alphaOne?.schema !== 'alpha-one-mapping-v1' || alphaThree?.schema !== 'alpha-three-mapping-v1'
    || alphaOne.readyForCandidateExperiment !== true || alphaThree.readyForCandidateExperiment !== true || !restrained?.readyForCandidateExperiment)
    throw Error('Incomplete alpha-lobe mapping; no learning enabled');
  if (restrained.groups.some(g => g.danType in LONG_TERM)) throw Error('Restrained mapping already has alpha-lobe groups');
  if (!alphaOne.groups.every(g => g.danType === 'PAM11') || !alphaThree.groups.every(g => g.danType === 'PPL106')) throw Error('Mislabelled alpha-lobe groups');
  return { ...restrained, schema: 'reversal-coarse-mapping-v1+alpha-one-mapping-v1+alpha-three-mapping-v1',
    groups: [...restrained.groups, ...alphaOne.groups, ...alphaThree.groups] };
}

export class AlphaLobeMemory {
  constructor(model, mapping, { eta = 0.5, minGain = 0.2, maxGain = 1.8, activityScale = 1.5 } = {}) {
    if (!Array.isArray(mapping?.groups)) throw Error('Invalid combined mapping');
    this.alphaLobe = mapping.groups.filter(g => g.danType in LONG_TERM);
    if (Object.keys(LONG_TERM).some(type => !this.alphaLobe.some(g => g.danType === type))
      || this.alphaLobe.some(g => g.mbonType !== LONG_TERM[g.danType])) throw Error('Missing alpha1 or alpha3 groups');
    this.restrained = new ReversalMemory(model, { ...mapping, groups: mapping.groups.filter(g => !(g.danType in LONG_TERM)) }, { eta, minGain, maxGain, activityScale });
    this.model = model; this.mapping = mapping;
    this.config = { eta, minGain, maxGain, activityScale };
    const own = new Set(this.restrained.edges);
    this.alphaEdges = this.alphaLobe.flatMap(g => g.edges);
    if (!this.alphaEdges.length || new Set(this.alphaEdges).size !== this.alphaEdges.length || this.alphaEdges.some(e => own.has(e)))
      throw Error('Invalid alpha-lobe edge mask');
    for (const g of this.alphaLobe) {
      if (!g.dan.length || g.edges.length !== g.kc.length) throw Error('Invalid alpha-lobe group');
      for (let i = 0; i < g.edges.length; i++) {
        const e = g.edges[i];
        if (!Number.isSafeInteger(e) || e < 0 || e >= model.graph.col.length || model.graph.sign[e] !== 1 || model.graph.col[e] !== g.kc[i]) throw Error('Invalid existing alpha-lobe edge');
      }
      if (g.dan.some(c => !Number.isSafeInteger(c.index) || c.index < 0 || c.index >= model.n)) throw Error('Invalid alpha-lobe DAN mapping');
    }
    this.edges = [...this.restrained.edges, ...this.alphaEdges];
    this.alphaBase = Float32Array.from(this.alphaEdges, e => model.params.magnitude[e]);
    if (!this.alphaBase.every(v => Number.isFinite(v) && v > 0)) throw Error('Invalid alpha-lobe base efficacy');
    this.alphaGains = new Float64Array(this.alphaEdges.length).fill(1);
    this.identity = digest({ schema: 'alpha-lobe-memory-v1', restrained: this.restrained.identity, alphaLobe: this.alphaLobe, config: this.config, base: [...this.alphaBase] });
  }
  get events() { return this.restrained.events; }
  observe(rest, dt = 1) {
    const h = this.model.h[this.model.steps], { eta, minGain, maxGain, activityScale } = this.config;
    if (rest.length !== this.model.n || !Number.isFinite(dt) || dt <= 0 || dt > 1) throw Error('Invalid observation interval');
    for (const g of this.alphaLobe) for (const i of [...g.kc, ...g.dan.map(c => c.index)]) if (!Number.isFinite(h[i]) || !Number.isFinite(rest[i])) throw Error('Nonfinite local activity');
    const alphaFactors = this.alphaLobe.map(g => -g.dan.reduce((sum, c) => sum + Math.max(0, h[c.index] - rest[c.index]) / activityScale, 0) / g.dan.length);
    if (alphaFactors.some(D => eta * dt * -D > 1)) throw Error('Unstable candidate Euler step; no state changed');
    const next = Float64Array.from(this.alphaGains);
    let offset = 0, changed = 0;
    for (let group = 0; group < this.alphaLobe.length; group++) {
      const g = this.alphaLobe[group], D = alphaFactors[group];
      for (let i = 0; i < g.edges.length; i++, offset++) {
        const k = Math.max(0, h[g.kc[i]] - rest[g.kc[i]]) / activityScale;
        next[offset] = Math.max(minGain, Math.min(maxGain, next[offset] + eta * dt * D * k));
        if (!Number.isFinite(next[offset])) throw Error('Nonfinite efficacy');
        if (next[offset] !== this.alphaGains[offset]) changed++;
      }
    }
    // The restrained update validates and throws before mutating; commit the alpha lobe after it.
    const restrained = this.restrained.observe(rest, dt);
    this.alphaGains.set(next); this.applyAlpha();
    return { factors: restrained.factors, alphaFactors, alphaDanTypes: this.alphaLobe.map(g => g.danType),
      changedEdges: restrained.changedEdges + changed, alphaChangedEdges: changed, events: this.events,
      scope: 'Restrained ReversalMemory update plus alpha1/alpha3 active-KC depression without DAN-alone recovery; not reconstructed dopamine release' };
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

// Fixed preference: restrained balance minus the reward-depressed MBON-alpha1 drive
// plus the punishment-depressed MBON-alpha3 drive (aversive-DAN compartment read as
// approach, the registered convention for MBON12).
const mean = values => {
  if (!Array.isArray(values) || values.length < 1 || values.length > 128 || !values.every(Number.isFinite)) throw Error('Invalid bounded MBON population');
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};
export function readAlphaLobeMBON(populations) {
  const [MBON12, MBON01, MBON07, MBON14] = ['MBON12', 'MBON01', 'MBON07', 'MBON14'].map(type => mean(populations?.[type]));
  const restrainedScore = MBON12 - MBON01, score = restrainedScore - MBON07 + MBON14;
  if (!Number.isFinite(score)) throw Error('Nonfinite MBON preference');
  return { MBON12, MBON01, MBON07, MBON14, restrainedScore, score,
    meaning: 'Fixed mean(MBON12) - mean(MBON01) - mean(MBON07) + mean(MBON14); larger preferred; engineered readout' };
}
