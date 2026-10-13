// Reduced gamma4 timing-plasticity experiment. Not a reconstructed biochemical
// model: see documentation/design/mushroom_body_learning.md for assumptions.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';

export const annotationRevision = 'ebd66db2596fcc39c6950fb54ea3efa00f7fe8a0';
export const annotationHash = '30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6';
export const annotationURL = `https://raw.githubusercontent.com/flyconnectome/flywire_annotations/${annotationRevision}/supplemental_files/Supplemental_file1_neuron_annotations.tsv`;
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function mapGamma4(graph, rootIds, path) {
  if (!(rootIds instanceof BigInt64Array) || rootIds.length !== graph.row.length - 1) throw Error('Invalid root IDs');
  const indices = new Map(Array.from(rootIds, (id, i) => [id.toString(), i]));
  if (indices.size !== rootIds.length) throw Error('Duplicate graph root IDs');
  const cells = { kc: [], dan: [], mbon: [] };
  let header;
  for await (const line of createInterface({ input: createReadStream(path), crlfDelay: Infinity })) {
    const fields = line.split('\t');
    if (!header) { header = fields; for (const key of ['root_id', 'hemibrain_type', 'cell_class', 'side', 'fbbt_id', 'known_nt', 'top_nt']) if (!header.includes(key)) throw Error(`Missing annotation column ${key}`); continue; }
    const get = key => fields[header.indexOf(key)];
    const index = indices.get(get('root_id'));
    if (index === undefined) continue;
    const type = get('hemibrain_type'), cls = get('cell_class');
    const kind = cls === 'Kenyon_Cell' && /^KCg-/.test(type) ? 'kc'
      : cls === 'DAN' && type === 'PAM08' ? 'dan'
        : cls === 'MBON' && type === 'MBON05' ? 'mbon' : null;
    // MBON05 dendrites are CONTRALATERAL to its soma (FBbt:00111004).
    if (kind && get('side') === (kind === 'mbon' ? 'left' : 'right')) cells[kind].push({ index, rootId: get('root_id'), side: get('side'), type, ontology: get('fbbt_id'), knownNT: get('known_nt'), predictedNT: get('top_nt') });
  }
  for (const list of Object.values(cells)) {
    list.sort((a, b) => a.index - b.index);
    if (!list.length || new Set(list.map(c => c.index)).size !== list.length) throw Error('Missing or duplicate mapped cells');
  }
  const kcSet = new Set(cells.kc.map(c => c.index)), edges = [], excludedNegativeEdges = [];
  for (const cell of cells.mbon) for (let k = graph.row[cell.index]; k < graph.row[cell.index + 1]; k++) {
    if (kcSet.has(graph.col[k])) (graph.sign[k] > 0 ? edges : excludedNegativeEdges).push(k);
  }
  const connected = new Set(edges.map(k => graph.col[k]));
  cells.kc = cells.kc.filter(c => connected.has(c.index));
  if (cells.kc.length < 4 || !edges.length) throw Error(`Insufficient mapped excitatory KC-to-MBON edges: ${JSON.stringify({ candidates: kcSet.size, connected: cells.kc.length, edges: edges.length, excludedNegativeEdges: excludedNegativeEdges.length, mbon: cells.mbon })}`);
  return { compartment: 'right gamma4', cells, edges, excludedNegativeEdges,
    annotationRevision, annotationHash, annotationURL };
}

export class Gamma4Memory {
  constructor(model, mapping, { eta = 0.25, tau = 1, minGain = 0.2, maxGain = 1.8 } = {}) {
    if (![eta, tau, minGain, maxGain].every(Number.isFinite) || eta <= 0 || tau <= 0 || minGain <= 0 || minGain >= 1 || maxGain <= 1) throw Error('Invalid plasticity configuration');
    this.model = model; this.mapping = mapping;
    this.config = { eta, tau, minGain, maxGain };
    this.identity = digest({ mapping, config: this.config, model: model.config });
    this.base = Float32Array.from(mapping.edges, k => model.params.magnitude[k]);
    this.gains = new Float64Array(this.base.length).fill(1);
    this.trace = new Float64Array(this.base.length);
    this.danTrace = 0; this.time = 0;
    for (const k of mapping.edges) if (!Number.isSafeInteger(k) || k < 0 || k >= model.graph.col.length || model.graph.sign[k] !== 1) throw Error('Invalid plastic edge');
    if (new Set(mapping.edges).size !== mapping.edges.length) throw Error('Duplicate plastic edge');
  }
  advance(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw Error('Invalid time interval');
    const decay = Math.exp(-dt / this.config.tau);
    for (let k = 0; k < this.trace.length; k++) this.trace[k] *= decay;
    this.danTrace *= decay; this.time += dt;
  }
  // kc is measured excess KC activity; dan is measured stimulation-evoked PAM
  // activity. Timing polarity is literature-based; equation/rates are unfitted.
  pair(kc, dan) {
    if (kc.length !== this.trace.length || !kc.every(v => Number.isFinite(v) && v >= 0) || !Number.isFinite(dan) || dan < 0) throw Error('Invalid local activity');
    const { eta, minGain, maxGain } = this.config;
    for (let k = 0; k < this.gains.length; k++) {
      const g = this.gains[k];
      const potentiation = kc[k] * this.danTrace * (maxGain - g);
      const depression = dan * (this.trace[k] + kc[k]) * (g - minGain);
      this.gains[k] = Math.max(minGain, Math.min(maxGain, g + eta * (potentiation - depression)));
      this.trace[k] = Math.max(this.trace[k], kc[k]);
    }
    this.danTrace = Math.max(this.danTrace, dan);
    this.apply();
  }
  apply() {
    for (let k = 0; k < this.gains.length; k++) this.model.setMagnitude(this.mapping.edges[k], this.base[k] * this.gains[k]);
  }
  snapshot() {
    return { version: 1, identity: this.identity, time: this.time, gains: [...this.gains], trace: [...this.trace], danTrace: this.danTrace };
  }
  restore(state) {
    const { minGain, maxGain } = this.config;
    if (state.version !== 1 || state.identity !== this.identity || !Number.isFinite(state.time) || state.time < 0 ||
      !Number.isFinite(state.danTrace) || state.danTrace < 0 || !Array.isArray(state.gains) || !Array.isArray(state.trace) ||
      state.gains.length !== this.gains.length || state.trace.length !== this.trace.length ||
      !state.gains.every(v => Number.isFinite(v) && v >= minGain && v <= maxGain) ||
      !state.trace.every(v => Number.isFinite(v) && v >= 0)) throw Error('Incompatible memory checkpoint');
    this.gains.set(state.gains); this.trace.set(state.trace);
    this.danTrace = state.danTrace; this.time = state.time; this.apply();
  }
}
