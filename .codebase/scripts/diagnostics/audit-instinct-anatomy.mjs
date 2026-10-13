// Read-only anatomical feasibility audit for the proposed instinct design.
// Paths are structural evidence, never evidence of functional reward/learning.
import { createReadStream, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: {
  out: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' },
} });
const duty = Number(args['cpu-duty']);
if (!args.out || !(duty >= 0.1 && duty <= 1)) throw Error('Require --out NEW_JSON_PATH and valid --cpu-duty');
if (existsSync(args.out) || existsSync(`${args.out}.partial`)) throw Error('Refusing to overwrite audit');
const start = performance.now(), cpu = process.cpuUsage();
function guard() {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Soft memory guard: audit incomplete; rerun to a new path');
}
async function pace(since) {
  guard();
  await new Promise(resolve => setTimeout(resolve, Math.min(30000, (performance.now() - since) * (1 / duty - 1))));
}
guard();
const files = { graph: '.cache/full.npz', annotations: '.cache/flywire-annotations-v2.1.0.tsv', ontology: '.cache/fbbt.obo' };
const hashes = {};
for (const [key, path] of Object.entries(files)) hashes[key] = await sha256(path);
if (hashes.graph !== graphHash || hashes.annotations !== annotationHash) throw Error('Pinned graph/annotation checksum mismatch');
const phase = performance.now();
const g = loadGraph(files.graph), ids = readNpz(files.graph, ['root_ids']).root_ids;
const index = new Map(Array.from(ids, (id, i) => [id.toString(), i]));
if (ids.length !== g.row.length - 1 || index.size !== ids.length) throw Error('Invalid root identity array');
await pace(phase);
const cells = new Map(), counts = {}, annotationOnly = {};
let header, lines = 0, segment = performance.now();
for await (const line of createInterface({ input: createReadStream(files.annotations), crlfDelay: Infinity })) {
  const row = line.split('\t');
  if (!header) { header = row; continue; }
  const get = name => row[header.indexOf(name)] ?? '';
  const type = get('cell_type') || get('hemibrain_type');
  const kind = type === 'DNp01' || type === 'Giant Fiber' ? 'GF'
    : ['LC4', 'LPLC2'].includes(type) ? type
    : get('cell_class') === 'Kenyon_Cell' ? 'KC'
    : /^MBON/.test(type) ? 'MBON'
    : get('cell_class') === 'DAN' ? 'DAN' : null;
  if (kind) {
    const rootId = get('root_id'), i = index.get(rootId);
    if (i === undefined) annotationOnly[kind] = (annotationOnly[kind] ?? 0) + 1;
    else {
      counts[kind] = (counts[kind] ?? 0) + 1;
      cells.set(i, { index: i, rootId, kind, type, hemibrainType: get('hemibrain_type'), side: get('side'),
        knownTransmitter: get('known_nt'), predictedTransmitter: get('top_nt'), predictedConfidence: Number(get('top_nt_conf')), ontologyIds: get('fbbt_id') });
    }
  }
  if (++lines % 10000 === 0) { await pace(segment); segment = performance.now(); }
}
const gf = [...cells.values()].filter(c => c.kind === 'GF');
if (gf.length !== 2) throw Error(`Expected two identified GF neurons, found ${gf.length}`);
const maxHops = 8, distance = new Int16Array(ids.length).fill(-1), next = new Int32Array(ids.length).fill(-1);
const nextEdge = new Int32Array(ids.length).fill(-1), queue = new Int32Array(ids.length);
let head = 0, tail = 0;
for (const c of gf) { distance[c.index] = 0; queue[tail++] = c.index; }
segment = performance.now();
while (head < tail) {
  const receiver = queue[head++];
  if (distance[receiver] < maxHops) for (let e = g.row[receiver]; e < g.row[receiver + 1]; e++) {
    const sender = g.col[e];
    if (distance[sender] !== -1) continue;
    distance[sender] = distance[receiver] + 1; next[sender] = receiver; nextEdge[sender] = e;
    queue[tail++] = sender;
  }
  if (head % 5000 === 0) { await pace(segment); segment = performance.now(); }
}
function pathFrom(i) {
  if (distance[i] < 0) return null;
  const path = [];
  while (next[i] !== -1) {
    const j = next[i], e = nextEdge[i];
    // Independently check each reconstructed hop against CSR direction and root IDs.
    if (e < g.row[j] || e >= g.row[j + 1] || g.col[e] !== i || distance[i] !== distance[j] + 1) throw Error('Invalid reconstructed path');
    path.push({ from: ids[i].toString(), to: ids[j].toString(), edgeIndex: e, fixedSign: g.sign[e], anatomicalCount: g.initial[e] });
    i = j;
  }
  if (!gf.some(c => c.index === i)) throw Error('Path did not reach GF');
  return path;
}
const mbons = [...cells.values()].filter(c => c.kind === 'MBON').map(c => ({ ...c, minHopsToEitherGF: distance[c.index] < 0 ? null : distance[c.index], oneShortestPath: pathFrom(c.index) }));
const directInputs = gf.map(c => {
  const groups = {};
  for (let e = g.row[c.index]; e < g.row[c.index + 1]; e++) {
    const pre = cells.get(g.col[e]), key = pre?.kind ?? 'other';
    const group = groups[key] ??= { edges: 0, anatomicalCount: 0, positiveEdges: 0, negativeEdges: 0 };
    group.edges++; group.anatomicalCount += g.initial[e]; group[g.sign[e] > 0 ? 'positiveEdges' : 'negativeEdges']++;
  }
  return { ...c, incoming: groups };
});
const candidateTypes = new Set(['MBON12', 'MBON01', 'MBON05', 'PPL103', 'PAM02', 'PAM08']);
const candidateCells = [...cells.values()].filter(c => candidateTypes.has(c.type));
const candidateEdges = [], kcInputs = [];
for (const post of candidateCells) {
  let positiveKC = 0, negativeKC = 0;
  for (let e = g.row[post.index]; e < g.row[post.index + 1]; e++) {
    const pre = cells.get(g.col[e]);
    if (pre?.kind === 'KC') { if (g.sign[e] > 0) positiveKC++; else negativeKC++; }
    if (pre && candidateTypes.has(pre.type)) candidateEdges.push({ from: pre.rootId, fromType: pre.type,
      to: post.rootId, toType: post.type, edgeIndex: e, fixedSign: g.sign[e], anatomicalCount: g.initial[e] });
  }
  if (post.kind === 'MBON') kcInputs.push({ rootId: post.rootId, type: post.type, somaSide: post.side, positiveKCEdges: positiveKC, negativeKCEdges: negativeKC });
}
// Resolve adult compartment names from the locally pinned ontology, without guessing aliases.
const ontology = [];
let block = [];
function consume() {
  if (block.some(line => /^synonym: "(?:MBON\d+|PPL1\d+|PAM\d+)" EXACT/.test(line))) {
    ontology.push(block.filter(line => /^(id:|name:|synonym:)/.test(line)));
  }
  block = [];
}
for await (const line of createInterface({ input: createReadStream(files.ontology), crlfDelay: Infinity })) {
  if (line === '[Term]') consume();
  block.push(line);
}
consume();
guard();
// Hash files again so the report detects concurrent changes to the source artifacts.
for (const [key, path] of Object.entries(files)) if (await sha256(path) !== hashes[key]) throw Error('Source changed during audit');
const used = process.cpuUsage(cpu);
const report = {
  schema: 'fly-instinct-anatomy-audit-v1', date: '2026-10-05',
  command: `node --max-old-space-size=256 .codebase/scripts/diagnostics/audit-instinct-anatomy.mjs --out ${args.out} --cpu-duty ${duty}`,
  scope: 'Read-only anatomy and path existence; no stimulation, learning, behavior, receptor or subcellular validation',
  inputs: { files, hashes }, sourceSha256: await sha256('.codebase/scripts/diagnostics/audit-instinct-anatomy.mjs'),
  graph: { neurons: ids.length, directedEdges: g.col.length }, counts, annotationOnly,
  giantFibers: directInputs, maxHops, reachableMBONs: mbons.filter(c => c.minHopsToEitherGF !== null).length,
  mbons, dopamineCells: [...cells.values()].filter(c => c.kind === 'DAN'), ontology,
  candidateRelay: { cells: candidateCells, edges: candidateEdges, kcInputs,
    scope: 'Type-level identity and directed edge inventory; compartment eligibility and transmitter physiology require further validation' },
  limitations: [
    'Shortest paths ignore competing paths, signs as a combined effect, signal strength, dynamics, subcellular anatomy and receptor identity.',
    'No new connections or sign changes are introduced; path existence does not validate an MB-to-GF learning mechanism.',
    'The graph schema has one signed edge magnitude; it does not encode electrical gap junction dynamics or a complete motor system.',
    'No parameters are trained and no resource improvement is claimed.'
  ],
  resources: { peakRssMiB: process.resourceUsage().maxRSS / 1024, elapsedSeconds: (performance.now() - start) / 1000, cpuSeconds: (used.user + used.system) / 1e6, cpuDuty: duty, measurement: 'Through report preparation; excludes final report write' }
};
mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(`${args.out}.partial`, JSON.stringify(report, null, 2));
renameSync(`${args.out}.partial`, args.out);
console.log(JSON.stringify({ report: args.out, graph: report.graph, counts, giantFibers: directInputs, reachableMBONs: report.reachableMBONs, resources: report.resources }, null, 2));
