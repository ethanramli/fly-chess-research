// Eye test v2 runner (restart plan revision 2026-11-03, problem 5): read-only; memory never changes. One fresh output directory per config.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';
import { runEyeTestV2 } from '../../src/neural-learning/eye-test-v2-runner.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { createPublicAttackMapEncoderV2 } from '../../src/chess-input/public-attack-map-cue-v2.mjs';

const { values: args } = parseArgs({ options: { config: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
assert.equal(args['cpu-duty'], '0.5');
assert(args.config, 'Missing --config');
const registration = readFileSync(args.config), config = JSON.parse(registration.toString('utf8').replace(/^﻿/, ''));
const out = config.paths.run;
assert(!existsSync(out), 'Fresh output required');
const sha = x => createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const fileHash = async p => { const h = createHash('sha256'); for await (const b of createReadStream(p)) h.update(b); return h.digest('hex'); };
const atomic = (path, body) => { writeFileSync(path + '.partial', JSON.stringify(body) + '\n'); renameSync(path + '.partial', path); };
const started = performance.now(), cpuStarted = process.cpuUsage(), sleep = new Int32Array(new SharedArrayBuffer(4));
function guard() {
  const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
  assert(rssMiB <= 2048 && freeMiB >= 256 && performance.now() - started <= 3600000, 'Resource guard');
}
function pace() {
  const cpu = process.cpuUsage(cpuStarted);
  let delay = 2 * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  while (delay > 0) {
    Atomics.wait(sleep, 0, 0, Math.min(delay, 100));
    delay = 2 * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  }
}
for (const [path, expected] of Object.entries(config.pins)) assert.equal(await fileHash(path), expected, `Changed input ${path}`);

guard(); mkdirSync(out, { recursive: true });
const manifest = { schema: 'eye-test-v2-run-v1', status: 'running', pid: process.pid, argv: process.argv,
  registrationSha256: sha(registration), pins: config.pins,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5, wallSeconds: 3600 },
  scope: 'read-only Eye test v2; memory never changes; decoder directions come from the checker answers' };
atomic(`${out}/manifest.json`, manifest);
try {
  const graph = loadGraph('.cache/full.npz'), roots = readNpz('.cache/full.npz', ['root_ids']).root_ids;
  const indices = new Map(Array.from(roots, (root, i) => [root.toString(), i]));
  const TOKEN_TYPES = ['MBON01', 'MBON12', 'MBON07'];
  const kcs = [], typeCells = new Map(TOKEN_TYPES.map(t => [t, []]));
  let header;
  for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
    const fields = line.split('\t'); if (!header) { header = fields; continue; }
    const index = indices.get(fields[header.indexOf('root_id')]), cls = fields[header.indexOf('cell_class')], type = fields[header.indexOf('hemibrain_type')];
    if (index === undefined) continue;
    if (cls === 'Kenyon_Cell') kcs.push(index);
    if (typeCells.has(type)) typeCells.get(type).push(index);
  }
  const kcIndices = [...new Set(kcs)].sort((a, b) => a - b), kcSet = new Set(kcIndices);
  // Token pools are rebuilt from the graph by this stated rule, not copied from the archived Stage 1 runs.
  const groups = TOKEN_TYPES.map(mbonType => {
    const kc = new Set();
    for (const j of typeCells.get(mbonType)) for (let e = graph.row[j]; e < graph.row[j + 1]; e++) if (graph.sign[e] === 1 && kcSet.has(graph.col[e])) kc.add(graph.col[e]);
    return { mbonType, kc: [...kc].sort((a, b) => a - b) };
  });
  const retina = loadRetina('.cache/full.npz');
  const eyes = createEyesV2(retina);
  const encoder = createPublicAttackMapEncoderV2({ readyForCandidateExperiment: true, groups });
  const tokens = { encode: (fen, move) => encoder.encode(new Chess(fen), move, { objective: 'capture-retention', plies: 1 }).stimulation };

  const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
  const rawForward = model.forward.bind(model);
  model.forward = (...values) => { guard(); const result = rawForward(...values); pace(); return result; };

  const pairs = readFileSync(config.paths.pairs, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  assert.equal(pairs.length, 48, 'Pair count');

  const result = await runEyeTestV2({ model, kcIndices, readerCells: neuronReaderCells.cells, eyes, tokens,
    photoreceptorIndices: retina.retina_idx, pairs, guard,
    log: row => appendFileSync(`${out}/records.jsonl`, JSON.stringify(row) + '\n') });
  atomic(`${out}/summary.json`, result);
  atomic(`${out}/manifest.json`, { ...manifest, status: 'complete' });
} catch (error) {
  atomic(`${out}/manifest.json`, { ...manifest, status: 'failed', error: error.message });
  throw error;
}
