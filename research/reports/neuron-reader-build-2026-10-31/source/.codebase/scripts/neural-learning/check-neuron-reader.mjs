// Static identity/annotation check only. Never creates a model or propagates the graph.
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { freemem } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { neuronReaderCells as roster } from '../../src/neural-learning/neuron-reader.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const { values } = parseArgs({ options: { out: { type: 'string' } } });
if (!values.out || existsSync(values.out)) throw Error('Use --out <new directory>; existing outputs are never overwritten');
const started = performance.now();
function guard() {
  if (process.memoryUsage().rss > 2048 * 2 ** 20 || freemem() < 256 * 2 ** 20 || performance.now() - started > 300000)
    throw Error('Static neuron-reader check exceeded resource/time guard');
}
async function fileHash(path) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(path)) { guard(); h.update(chunk); }
  return h.digest('hex');
}
guard();
const files = { graphSha256: '.cache/full.npz', annotationSha256: '.cache/flywire-annotations-v2.1.0.tsv',
  typeAnnotationsSha256: '.cache/flywire-codex-783-verify/consolidated_cell_types.csv.gz' };
const inputs = {};
for (const [key, path] of Object.entries(files)) {
  inputs[key] = await fileHash(join(root, path));
  if (inputs[key] !== roster[key]) throw Error('Pinned input hash mismatch: ' + key);
}
const roots = readNpz(join(root, files.graphSha256), ['root_ids']).root_ids;
const graph = loadGraph(join(root, files.graphSha256));
if (roots.length !== roster.nodes || graph.row.length - 1 !== roster.nodes
  || fixedStateHash({ graph, params: {} }, []) !== roster.graphStateHash)
  throw Error('Pinned sparse graph shape/content mismatch');
for (const cell of roster.cells) if (roots[cell.index].toString() !== cell.rootId) throw Error('Root-ID/index mismatch');

const wanted = new Map(roster.cells.map(cell => [cell.rootId, cell])), seen = new Set();
const counts = Object.fromEntries(roster.cells.map(cell => [cell.type, 0]));
let header;
for await (const line of createInterface({ input: createReadStream(join(root, files.annotationSha256)), crlfDelay: Infinity })) {
  const fields = line.split('\t');
  if (!header) {
    header = fields;
    for (const key of ['root_id', 'hemibrain_type', 'cell_class', 'side', 'known_nt', 'top_nt'])
      if (!header.includes(key)) throw Error('Missing annotation column ' + key);
    continue;
  }
  const get = key => fields[header.indexOf(key)];
  if (Object.hasOwn(counts, get('hemibrain_type'))) counts[get('hemibrain_type')]++;
  const cell = wanted.get(get('root_id'));
  if (!cell) continue;
  if (seen.has(cell.rootId) || get('hemibrain_type') !== cell.type || get('cell_class') !== 'MBON'
    || get('side') !== cell.somaSide || get('known_nt') !== cell.knownNT || get('top_nt') !== cell.predictedNT)
    throw Error('Cell annotation mismatch: ' + cell.rootId);
  seen.add(cell.rootId);
}
if (seen.size !== 14 || Object.entries(counts).some(([type, n]) => n !== roster.cells.filter(c => c.type === type).length))
  throw Error('Missing or extra annotated observation cells');
guard();
await setTimeout(performance.now() - started); // One-shot 0.5 duty pacing; not an OS CPU cap.
guard();
const sources = {};
for (const path of ['.codebase/src/neural-learning/neuron-reader.mjs', '.codebase/src/neural-learning/neuron-reader-cells.json',
  '.codebase/src/puzzle-learning/record-neuron-candidates.mjs', '.codebase/scripts/neural-learning/check-neuron-reader.mjs',
  '.codebase/src/neural-learning/association-validation.mjs', '.codebase/src/runtime/graph.mjs',
  '.codebase/src/supervised-baselines/trainer.mjs', '.codebase/src/chess-input/eyes-v1.mjs'])
  sources[path] = createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
const result = { schema: 'neuron-reader-static-check-v1', status: 'pass',
  scope: 'Static graph/root-ID/annotation identities only; no model, neural propagation, teaching or learning',
  inputs, rosterIdentity: roster.identity, graphStateHash: roster.graphStateHash, nodes: roster.nodes, cells: roster.cells,
  cpuDuty: 0.5, elapsedMs: performance.now() - started, rssSnapshotMiB: process.memoryUsage().rss / 2 ** 20,
  command: [process.execPath, ...process.execArgv, ...process.argv.slice(1)], sources };
mkdirSync(values.out);
writeFileSync(join(values.out, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ status: result.status, cells: seen.size, rosterIdentity: roster.identity, output: values.out }) + '\n');
