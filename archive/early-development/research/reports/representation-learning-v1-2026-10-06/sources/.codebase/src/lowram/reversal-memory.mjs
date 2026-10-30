// Candidate comparison based on Gkanias et al., eLife 2022, not validated biology.
// Source equation: dg/dt = D * (k + g - 1), with compartment-local D <= 0.
// See documentation/design/reversal_mechanism_evidence.md for approximations.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { digest } from './mushroom-body.mjs';

export async function mapReversalMemory(graph, rootIds, annotationPath, onSegment = async () => {}) {
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
    if (index !== undefined && ['left', 'right'].includes(side) &&
      (get('cell_class') === 'Kenyon_Cell' || ['MBON12', 'MBON01', 'PPL103', 'PAM02'].includes(type))) {
      if (cells.has(index)) throw Error('Duplicate annotation root');
      cells.set(index, { index, rootId: get('root_id'), type, side, cellClass: get('cell_class') });
    }
    if (++lines % 10000 === 0) await onSegment();
  }
  const groups = [], excluded = { negativeSign: 0, unsupportedKCType: 0, unannotatedInputs: 0 };
  for (const side of ['left', 'right']) for (const mbonType of ['MBON12', 'MBON01']) {
    const danType = mbonType === 'MBON12' ? 'PPL103' : 'PAM02';
    const dan = [...cells.values()].filter(c => c.type === danType && c.side === side);
    const edges = [], kc = [], observedKCTypes = {};
    for (const post of [...cells.values()].filter(c => c.type === mbonType)) {
      for (let e = graph.row[post.index]; e < graph.row[post.index + 1]; e++) {
        const pre = cells.get(graph.col[e]);
        if (!pre) { excluded.unannotatedInputs++; continue; }
        if (pre.cellClass !== 'Kenyon_Cell' || pre.side !== side) continue;
        observedKCTypes[pre.type] = (observedKCTypes[pre.type] ?? 0) + 1;
        // PAM02 occupies beta'2a, so gamma-KC inputs to MBON01 are excluded.
        const eligible = /^KCa'b'-/.test(pre.type) || (mbonType === 'MBON12' && /^KCg-/.test(pre.type));
        if (!eligible) { excluded.unsupportedKCType++; continue; }
        if (graph.sign[e] !== 1) { excluded.negativeSign++; continue; }
        edges.push(e); kc.push(pre.index);
      }
    }
    groups.push({ side, mbonType, danType, dan, edges, kc, observedKCTypes });
  }
  const allEdges = groups.flatMap(g => g.edges);
  if (new Set(allEdges).size !== allEdges.length) throw Error('Overlapping plastic groups');
  return { schema: 'reversal-coarse-mapping-v1', groups, excluded,
    readyForCandidateExperiment: groups.every(g => g.dan.length > 0 && g.edges.length > 0),
    approximation: 'Existing positive KC-to-MBON edges filtered by KC subtype/hemisphere; no synapse-coordinate compartment or receptor identity. Same-side DAN population modulates qualifying KC axon inputs; MBON soma side is not used as a compartment mask.' };
}

export class ReversalMemory {
  constructor(model, mapping, { eta = 0.5, minGain = 0.2, maxGain = 1.8, activityScale = 1.5 } = {}) {
    if (![eta, minGain, maxGain, activityScale].every(Number.isFinite) || eta <= 0 || minGain <= 0 || minGain >= 1 || maxGain <= 1 || activityScale <= 0) throw Error('Invalid candidate configuration');
    this.model = model; this.mapping = mapping;
    if (mapping.readyForCandidateExperiment === false) throw Error('Incomplete mapped candidate; no learning enabled');
    this.config = { eta, minGain, maxGain, activityScale };
    this.edges = mapping.groups.flatMap(g => g.edges);
    if (!this.edges.length || new Set(this.edges).size !== this.edges.length) throw Error('Invalid candidate edge mask');
    for (const g of mapping.groups) {
      if (!g.dan.length || g.edges.length !== g.kc.length) throw Error('Invalid local group');
      for (let i = 0; i < g.edges.length; i++) {
        const e = g.edges[i];
        if (!Number.isSafeInteger(e) || e < 0 || e >= model.graph.col.length || model.graph.sign[e] !== 1 || model.graph.col[e] !== g.kc[i]) throw Error('Invalid existing plastic edge');
      }
      if (g.dan.some(c => !Number.isSafeInteger(c.index) || c.index < 0 || c.index >= model.n)) throw Error('Invalid DAN mapping');
    }
    this.base = Float32Array.from(this.edges, e => model.params.magnitude[e]);
    if (!this.base.every(v => Number.isFinite(v) && v > 0)) throw Error('Invalid base efficacy');
    this.gains = new Float64Array(this.edges.length).fill(1);
    this.events = 0;
    this.identity = digest({ mapping, config: this.config, model: model.config, base: [...this.base] });
  }
  observe(rest, dt = 1) {
    const h = this.model.h[this.model.steps], { eta, minGain, maxGain, activityScale } = this.config;
    if (rest.length !== this.model.n || !Number.isFinite(dt) || dt <= 0 || dt > 1) throw Error('Invalid observation interval');
    // Validate the complete local observation before any state mutation.
    for (const g of this.mapping.groups) for (const i of [...g.kc, ...g.dan.map(c => c.index)]) if (!Number.isFinite(h[i]) || !Number.isFinite(rest[i])) throw Error('Nonfinite local activity');
    const factors = this.mapping.groups.map(g => -g.dan.reduce((sum, c) => sum + Math.max(0, h[c.index] - rest[c.index]) / activityScale, 0) / g.dan.length);
    if (factors.some(D => eta * dt * -D > 1)) throw Error('Unstable candidate Euler step; no state changed');
    let offset = 0, changed = 0;
    for (let group = 0; group < this.mapping.groups.length; group++) {
      const g = this.mapping.groups[group], D = factors[group];
      for (let i = 0; i < g.edges.length; i++, offset++) {
        const k = Math.max(0, h[g.kc[i]] - rest[g.kc[i]]) / activityScale;
        const before = this.gains[offset];
        const after = Math.max(minGain, Math.min(maxGain, before + eta * dt * D * (k + before - 1)));
        if (!Number.isFinite(after)) throw Error('Nonfinite efficacy');
        this.gains[offset] = after; if (after !== before) changed++;
      }
    }
    this.events++; this.apply();
    return { factors, changedEdges: changed, events: this.events,
      scope: 'Source-derived computational comparison; measured excess DAN rates with fixed negative modulatory polarity, not negative reward or reconstructed dopamine release' };
  }
  apply() { for (let i = 0; i < this.edges.length; i++) this.model.params.magnitude[this.edges[i]] = this.base[i] * this.gains[i]; }
  snapshot() { return { version: 1, identity: this.identity, events: this.events, gains: [...this.gains] }; }
  restore(s) {
    if (s.version !== 1 || s.identity !== this.identity || !Number.isSafeInteger(s.events) || s.events < 0 || !Array.isArray(s.gains) || s.gains.length !== this.gains.length || !s.gains.every(v => Number.isFinite(v) && v >= this.config.minGain && v <= this.config.maxGain)) throw Error('Incompatible candidate state');
    this.gains.set(s.gains); this.events = s.events; this.apply();
  }
}
