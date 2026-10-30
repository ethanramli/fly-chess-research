// Charging-to-long-term branch of the Gkanias et al. (eLife 2022) incentive circuit,
// added beside the existing ReversalMemory (restrained memories), which is reused
// unchanged. Source: pinned circuit.py lines 150-155 at commit 1610c800 ("Charging
// DANs enhance their respective memory MBONs"): PAM-beta'2a charges the attractive
// LTM MBON-beta2beta'2a (MBON02), PPL1-gamma2alpha'1 charges the aversive LTM
// MBON-alpha'1 (MBON15), with w_c2m = 0.3 against w_c2r = 1 for the restrained
// depression, and the same rule dW = delta*(k + W - w_rest) with delta > 0.
// Omitted: forgetting DANs (RFM) and memory assimilation (MAM); the source splits
// PPL1-gamma2alpha'1 into charging and forgetting subsets that the released
// annotation does not separate. Without them the long-term trace cannot be
// extinguished, and its deterministic persistence is not measured biological
// retention. Coarse cell-level masks, not synapse-coordinate compartments.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { digest } from './mushroom-body.mjs';
import { ReversalMemory } from './reversal-memory.mjs';

const LTM = [['MBON02', 'PAM02', 'attraction'], ['MBON15', 'PPL103', 'avoidance']];

export async function mapIncentiveLtm(graph, rootIds, annotationPath, onSegment = async () => {}) {
  if (!(rootIds instanceof BigInt64Array) || rootIds.length !== graph.row.length - 1) throw Error('Invalid root identities');
  const indices = new Map(Array.from(rootIds, (id, i) => [id.toString(), i]));
  if (indices.size !== rootIds.length) throw Error('Duplicate roots');
  const types = new Set(LTM.flat()), cells = new Map(); let header, lines = 0;
  for await (const line of createInterface({ input: createReadStream(annotationPath), crlfDelay: Infinity })) {
    const fields = line.split('\t');
    if (!header) {
      header = fields;
      for (const key of ['root_id', 'hemibrain_type', 'cell_class', 'side']) if (!header.includes(key)) throw Error(`Missing ${key}`);
      continue;
    }
    const get = key => fields[header.indexOf(key)] ?? '';
    const index = indices.get(get('root_id')), type = get('hemibrain_type'), side = get('side');
    if (index !== undefined && ['left', 'right'].includes(side) && (get('cell_class') === 'Kenyon_Cell' || types.has(type))) {
      if (cells.has(index)) throw Error('Duplicate annotation root');
      cells.set(index, { index, rootId: get('root_id'), type, side, cellClass: get('cell_class') });
    }
    if (++lines % 10000 === 0) await onSegment();
  }
  const groups = [], excluded = { negativeSign: 0, unsupportedKCType: 0, unannotatedInputs: 0 }, readouts = {};
  for (const [mbonType, danType] of LTM)
    readouts[mbonType] = [...cells.values()].filter(c => c.type === mbonType).map(c => ({ index: c.index, rootId: c.rootId }));
  for (const side of ['left', 'right']) for (const [mbonType, danType, valence] of LTM) {
    const dan = [...cells.values()].filter(c => c.type === danType && c.side === side).map(c => ({ index: c.index, rootId: c.rootId }));
    const edges = [], kc = [], observedKCTypes = {};
    for (const post of [...cells.values()].filter(c => c.type === mbonType)) {
      for (let e = graph.row[post.index]; e < graph.row[post.index + 1]; e++) {
        const pre = cells.get(graph.col[e]);
        if (!pre) { excluded.unannotatedInputs++; continue; }
        if (pre.cellClass !== 'Kenyon_Cell' || pre.side !== side) continue;
        observedKCTypes[pre.type] = (observedKCTypes[pre.type] ?? 0) + 1;
        // Both charging DANs reach these LTM MBONs only in alpha'/beta' lobes
        // (beta'2a, alpha'1), so only alpha'beta' KC inputs are eligible.
        if (!/^KCa'b'-/.test(pre.type)) { excluded.unsupportedKCType++; continue; }
        if (graph.sign[e] !== 1) { excluded.negativeSign++; continue; }
        edges.push(e); kc.push(pre.index);
      }
    }
    groups.push({ side, mbonType, danType, valence, dan, edges, kc, observedKCTypes });
  }
  const all = groups.flatMap(g => g.edges);
  if (new Set(all).size !== all.length) throw Error('Overlapping LTM groups');
  return { schema: 'incentive-ltm-mapping-v1', groups, readouts, excluded,
    readyForCandidateExperiment: groups.every(g => g.dan.length > 0 && g.edges.length > 0)
      && Object.values(readouts).every(cells => cells.length > 0),
    approximation: 'Positive alpha\'beta\' KC-to-LTM-MBON edges by KC hemisphere; the same-side charging DAN population modulates them; no synapse-coordinate compartment or receptor identity.' };
}

export class IncentiveLtmMemory {
  constructor(model, mapping, ltm, { eta = 0.5, minGain = 0.2, maxGain = 1.8, activityScale = 1.5, ltmRatio = 0.3 } = {}) {
    if (ltm?.schema !== 'incentive-ltm-mapping-v1' || ltm.readyForCandidateExperiment !== true || !Array.isArray(ltm.groups))
      throw Error('Incomplete LTM mapping; no learning enabled');
    if (!Number.isFinite(ltmRatio) || ltmRatio <= 0 || ltmRatio > 1) throw Error('Invalid LTM ratio');
    this.restrained = new ReversalMemory(model, mapping, { eta, minGain, maxGain, activityScale });
    this.model = model; this.mapping = mapping; this.ltm = ltm;
    this.config = { eta, minGain, maxGain, activityScale, ltmRatio };
    const own = new Set(this.restrained.edges);
    this.ltmEdges = ltm.groups.flatMap(g => g.edges);
    if (!this.ltmEdges.length || new Set(this.ltmEdges).size !== this.ltmEdges.length || this.ltmEdges.some(e => own.has(e)))
      throw Error('Invalid LTM edge mask');
    for (const g of ltm.groups) {
      if (!g.dan.length || g.edges.length !== g.kc.length) throw Error('Invalid LTM group');
      for (let i = 0; i < g.edges.length; i++) {
        const e = g.edges[i];
        if (!Number.isSafeInteger(e) || e < 0 || e >= model.graph.col.length || model.graph.sign[e] !== 1 || model.graph.col[e] !== g.kc[i]) throw Error('Invalid existing LTM edge');
      }
      if (g.dan.some(c => !Number.isSafeInteger(c.index) || c.index < 0 || c.index >= model.n)) throw Error('Invalid charging DAN mapping');
    }
    this.edges = [...this.restrained.edges, ...this.ltmEdges];
    this.ltmBase = Float32Array.from(this.ltmEdges, e => model.params.magnitude[e]);
    if (!this.ltmBase.every(v => Number.isFinite(v) && v > 0)) throw Error('Invalid LTM base efficacy');
    this.ltmGains = new Float64Array(this.ltmEdges.length).fill(1);
    this.identity = digest({ schema: 'incentive-ltm-memory-v1', restrained: this.restrained.identity, ltm, config: this.config, base: [...this.ltmBase] });
  }
  get events() { return this.restrained.events; }
  observe(rest, dt = 1) {
    const h = this.model.h[this.model.steps], { eta, minGain, maxGain, activityScale, ltmRatio } = this.config;
    if (rest.length !== this.model.n || !Number.isFinite(dt) || dt <= 0 || dt > 1) throw Error('Invalid observation interval');
    for (const g of this.ltm.groups) for (const i of [...g.kc, ...g.dan.map(c => c.index)]) if (!Number.isFinite(h[i]) || !Number.isFinite(rest[i])) throw Error('Nonfinite local activity');
    // Charging factor: positive, w_c2m/w_c2r = ltmRatio times the restrained magnitude.
    const ltmFactors = this.ltm.groups.map(g => ltmRatio * g.dan.reduce((sum, c) => sum + Math.max(0, h[c.index] - rest[c.index]) / activityScale, 0) / g.dan.length);
    if (ltmFactors.some(delta => eta * dt * delta > 1)) throw Error('Unstable candidate Euler step; no state changed');
    const next = Float64Array.from(this.ltmGains);
    let offset = 0, changed = 0;
    for (let group = 0; group < this.ltm.groups.length; group++) {
      const g = this.ltm.groups[group], delta = ltmFactors[group];
      for (let i = 0; i < g.edges.length; i++, offset++) {
        const k = Math.max(0, h[g.kc[i]] - rest[g.kc[i]]) / activityScale;
        next[offset] = Math.max(minGain, Math.min(maxGain, next[offset] + eta * dt * delta * (k + next[offset] - 1)));
        if (!Number.isFinite(next[offset])) throw Error('Nonfinite efficacy');
        if (next[offset] !== this.ltmGains[offset]) changed++;
      }
    }
    // The restrained update validates and throws before mutating; commit LTM after it.
    const restrained = this.restrained.observe(rest, dt);
    this.ltmGains.set(next); this.applyLtm();
    return { factors: restrained.factors, ltmFactors, changedEdges: restrained.changedEdges + changed, ltmChangedEdges: changed, events: this.events,
      scope: 'Restrained ReversalMemory update plus the source charging-to-LTM potentiation; no forgetting DANs; not reconstructed dopamine release' };
  }
  applyLtm() { for (let i = 0; i < this.ltmEdges.length; i++) this.model.setMagnitude(this.ltmEdges[i], this.ltmBase[i] * this.ltmGains[i]); }
  apply() { this.restrained.apply(); this.applyLtm(); }
  snapshot() { return { version: 1, identity: this.identity, events: this.events, gains: [...this.restrained.gains, ...this.ltmGains] }; }
  restore(s) {
    const n = this.restrained.gains.length, { minGain, maxGain } = this.config;
    if (s?.version !== 1 || s.identity !== this.identity || !Number.isSafeInteger(s.events) || s.events < 0 || !Array.isArray(s.gains)
      || s.gains.length !== this.edges.length || !s.gains.every(v => Number.isFinite(v) && v >= minGain && v <= maxGain)) throw Error('Incompatible candidate state');
    this.restrained.restore({ version: 1, identity: this.restrained.identity, events: s.events, gains: s.gains.slice(0, n) });
    this.ltmGains.set(s.gains.slice(n)); this.applyLtm();
  }
}

// Fixed attraction-minus-avoidance balance over restrained and LTM MBONs
// (source valence roles); an engineered readout, not a natural action circuit.
const mean = values => {
  if (!Array.isArray(values) || values.length < 1 || values.length > 128 || !values.every(Number.isFinite)) throw Error('Invalid bounded MBON population');
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};
export function readIncentiveMBON(populations) {
  const [MBON12, MBON01, MBON02, MBON15] = ['MBON12', 'MBON01', 'MBON02', 'MBON15'].map(type => mean(populations?.[type]));
  const restrainedScore = MBON12 - MBON01, ltmScore = MBON02 - MBON15, score = restrainedScore + ltmScore;
  if (!Number.isFinite(score)) throw Error('Nonfinite MBON preference');
  return { MBON12, MBON01, MBON02, MBON15, restrainedScore, ltmScore, score,
    meaning: 'Fixed (MBON12 - MBON01) + (MBON02 - MBON15); attraction minus avoidance over restrained and LTM MBONs; larger preferred; engineered readout' };
}
