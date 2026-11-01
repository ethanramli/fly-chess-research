// Static inspection only: reuse the sparse loader and stream the unthresholded table.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, writeFileSync } from 'node:fs';
import { freemem } from 'node:os';
import { createInterface } from 'node:readline';
import { setTimeout } from 'node:timers/promises';
import { createGunzip } from 'node:zlib';
import { loadGraph, readNpz } from '../../../.codebase/src/runtime/graph.mjs';

const started = performance.now();
function guard() {
  assert(process.memoryUsage().rss < 2048 * 2 ** 20, 'RSS limit');
  assert(freemem() >= 256 * 2 ** 20, 'Free-memory limit');
  assert(performance.now() - started < 300000, 'Time limit');
}
async function digest(path) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(path)) { guard(); h.update(chunk); }
  return h.digest('hex');
}
const paths = { graph: '.cache/full.npz', annotations: '.cache/flywire-annotations-v2.1.0.tsv',
  connections: '.cache/flywire-codex-783-verify/connections.csv.gz' };
const inputs = {};
for (const [key, path] of Object.entries(paths)) inputs[key] = { path, sha256: await digest(path) };
assert.equal(inputs.graph.sha256, '4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2');
assert.equal(inputs.annotations.sha256, '30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6');

const g = loadGraph(paths.graph);
const { root_ids: roots, retina_idx: retina, retina_eye: retinaEyes } = readNpz(paths.graph,
  ['root_ids', 'retina_idx', 'retina_eye']);
const n = roots.length, rootMap = new Map(Array.from(roots, (id, i) => [id.toString(), i]));
const cells = new Array(n), annotationKC = { cells: 0, predictedDopamine: 0, knownAcetylcholine: 0 };
const photoTypes = new Set(['R1-6', 'R7', 'R8']);
let columns;
for await (const line of createInterface({ input: createReadStream(paths.annotations), crlfDelay: Infinity })) {
  const f = line.split('\t');
  if (!columns) { columns = Object.fromEntries(f.map((key, i) => [key, i])); continue; }
  const get = key => f[columns[key]] ?? '';
  const cell = { rootId: get('root_id'), type: get('cell_type') || get('hemibrain_type'),
    cellClass: get('cell_class'), side: get('side'), knownNT: get('known_nt'), predictedNT: get('top_nt') };
  if (cell.cellClass === 'Kenyon_Cell') {
    annotationKC.cells++;
    if (cell.predictedNT === 'dopamine') annotationKC.predictedDopamine++;
    if (cell.knownNT.split(',').map(s => s.trim()).includes('acetylcholine')) annotationKC.knownAcetylcholine++;
  }
  const i = rootMap.get(cell.rootId);
  if (i !== undefined) { assert(!cells[i], 'Duplicate annotation root'); cells[i] = cell; }
}
assert.equal(cells.filter(Boolean).length, n, 'Missing annotation');
const outgoing = new Uint32Array(n), incident = new Uint8Array(n), signs = new Int8Array(n);
const retained = new Map(), retainedByType = {};
let minimumSynapses = Infinity, maximumSynapses = 0;
for (let q = 0; q < n; q++) {
  if (q % 4096 === 0) guard();
  for (let k = g.row[q]; k < g.row[q + 1]; k++) {
    const p = g.col[k], weight = g.initial[k];
    outgoing[p]++; incident[p] = incident[q] = 1; signs[p] = g.sign[k];
    minimumSynapses = Math.min(minimumSynapses, weight); maximumSynapses = Math.max(maximumSynapses, weight);
    if (cells[p].cellClass !== 'Kenyon_Cell' || cells[q].cellClass !== 'MBON') continue;
    retained.set(p * n + q, weight);
    const entry = retainedByType[cells[q].type] ??= { edges: 0, synapses: 0 };
    entry.edges++; entry.synapses += weight;
  }
}

// Aggregate neuropil rows by neuron pair before applying the five-synapse threshold.
const all = new Map(); let sourceRows = 0, header;
for await (const line of createInterface({ input: createReadStream(paths.connections).pipe(createGunzip()), crlfDelay: Infinity })) {
  const f = line.split(',');
  if (!header) { header = Object.fromEntries(f.map((key, i) => [key, i])); continue; }
  if (++sourceRows % 65536 === 0) guard();
  const p = rootMap.get(f[header.pre_root_id]), q = rootMap.get(f[header.post_root_id]);
  if (p === undefined || q === undefined || cells[p].cellClass !== 'Kenyon_Cell' || cells[q].cellClass !== 'MBON') continue;
  const weight = Number(f[header.syn_count]);
  assert(Number.isSafeInteger(weight) && weight > 0);
  const key = p * n + q;
  all.set(key, (all.get(key) ?? 0) + weight);
}
const byType = {}, totals = { edges: all.size, synapses: 0, retainedEdges: retained.size, retainedSynapses: 0 };
let expectedRetainedEdges = 0;
for (const [key, weight] of all) {
  const q = key % n, type = cells[q].type;
  const entry = byType[type] ??= { edges: 0, synapses: 0, retainedEdges: 0, retainedSynapses: 0 };
  totals.synapses += weight; entry.edges++; entry.synapses += weight;
  if (weight >= 5) {
    expectedRetainedEdges++;
    assert.equal(retained.get(key), weight, 'Retained edge/count differs from source');
    totals.retainedSynapses += weight; entry.retainedEdges++; entry.retainedSynapses += weight;
  } else assert(!retained.has(key), 'Subthreshold edge in released graph');
}
assert.equal(expectedRetainedEdges, retained.size, 'Missing/unexplained retained pairs');
for (const [type, value] of Object.entries(retainedByType)) {
  assert.equal(value.edges, byType[type].retainedEdges);
  assert.equal(value.synapses, byType[type].retainedSynapses);
}
const isolated = [], kcSigns = { positive: 0, negative: 0, noOutgoing: 0 }, mbon05 = [];
for (let i = 0; i < n; i++) {
  if (!incident[i]) isolated.push({ index: i, ...cells[i], input: g.input.includes(i), output: g.output.includes(i) });
  if (cells[i].cellClass === 'Kenyon_Cell') kcSigns[signs[i] === 1 ? 'positive' : signs[i] === -1 ? 'negative' : 'noOutgoing']++;
  if (cells[i].type === 'MBON05') mbon05.push({ index: i, ...cells[i], outgoingSign: signs[i], outgoingEdges: outgoing[i] });
}
const photos = { selected: retina.length, withOutgoing: 0, sides: {}, eyeCodes: {}, annotationDisagreements: [] };
for (let k = 0; k < retina.length; k++) {
  const i = retina[k], cell = cells[i];
  if (outgoing[i]) photos.withOutgoing++;
  photos.sides[cell.side] = (photos.sides[cell.side] ?? 0) + 1;
  photos.eyeCodes[retinaEyes[k]] = (photos.eyeCodes[retinaEyes[k]] ?? 0) + 1;
  if (!photoTypes.has(cell.type)) photos.annotationDisagreements.push({ index: i, ...cell });
}
for (const { path, sha256 } of Object.values(inputs)) assert.equal(await digest(path), sha256, 'Input changed during audit');
await setTimeout(performance.now() - started); // One-shot duty pacing; no neural state is simulated.
guard();
const result = { schema: 'neuron-reader-graph-audit-v1', date: '2026-11-01',
  scope: 'Static sparse-graph and streamed source-table audit; no inference, teaching, learning or graph mutation',
  inputs, nodes: n, edges: g.col.length, incidentNodes: incident.reduce((a, b) => a + b, 0),
  isolatedNodes: isolated, minimumSynapses, maximumSynapses, sourceRows, kcMbon: totals, kcMbonByType: byType,
  annotationKC, actualKCOutgoingSigns: kcSigns, mbon05, photos,
  command: [process.execPath, ...process.execArgv, ...process.argv.slice(1)], cpuDuty: 0.5,
  elapsedMs: performance.now() - started, rssSnapshotMiB: process.memoryUsage().rss / 2 ** 20,
  scriptSha256: await digest(new URL(import.meta.url)) };
writeFileSync(new URL('./result.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ nodes: n, edges: g.col.length, isolated: isolated.length, kcMbon: totals,
  selectedEyesInputs: photos.selected, withOutgoing: photos.withOutgoing,
  annotationDisagreements: photos.annotationDisagreements.length, result: new URL('./result.json', import.meta.url).pathname }));
