// Pathway trace v1 (2026-11-03). Read-only diagnostic: the same brain pass as engineered memory test v2, saving neuron activity per board so a brain-free analysis can find where the twin-board difference is lost. Brain connections never change. No learning.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, closeSync, createReadStream, existsSync, mkdirSync, openSync, readFileSync, readSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { restartSplit } from '../../src/puzzle-learning/twin-pair-generator-v1.mjs';

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
let peakRssMiB = 0;

// Resource guard: records the peak RSS seen so far.
function guard() {
  const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
  peakRssMiB = Math.max(peakRssMiB, rssMiB);
  assert(rssMiB <= 2048 && freeMiB >= 256 && performance.now() - started <= 1800000, 'Resource guard');
}
// Pacing: keeps CPU use near the 0.5 duty.
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
const manifest = { schema: 'pathway-trace-v1-run', status: 'running', pid: process.pid, argv: process.argv,
  registrationSha256: sha(registration), pins: config.pins,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5, wallSeconds: 1800, passes: 280 },
  scope: 'read-only brain passes; brain connections never change; no learning; diagnostic for engineered memory test v2' };
atomic(`${out}/manifest.json`, manifest);

try {
  // Step 5 (as in v2): training-bucket pairs only.
  const pairsInfo = JSON.parse(readFileSync(config.paths.pairsManifest, 'utf8').replace(/^﻿/, ''));
  assert.equal(pairsInfo.bucket, 'train');
  assert.equal(pairsInfo.task, 'capture');
  const pairs = readFileSync(config.paths.pairs, 'utf8').split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
  for (const pair of pairs) {
    assert(restartSplit(pair.gameId) === 'train', 'Pair outside the training bucket');
    assert.equal(pair.kind, 'recapture');
  }
  assert.equal(new Set(pairs.map(p => p.gameId)).size, pairs.length, 'Game ids not unique');
  assert(pairs.length === 136, 'Need 136 pairs');

  // Step 4: board list in pairs-file order, good then bad.
  const boards = [];
  for (const pair of pairs) for (const side of ['good', 'bad']) boards.push({ key: `${pair.gameId}:${side}`, fen: pair[side].fen, move: pair.move });

  // Eye input for every board.
  const retina = loadRetina('.cache/full.npz'), eyes = createEyesV2(retina);
  const stimOf = boards.map(b => eyes.encode(b.fen, b.move).stimulation);

  // Step 5: load the graph and annotations; read root_id, cell_class and super_class.
  const graph = loadGraph('.cache/full.npz'), roots = readNpz('.cache/full.npz', ['root_ids']).root_ids;
  const indices = new Map(Array.from(roots, (root, i) => [root.toString(), i]));
  const annotation = new Map();
  let header;
  for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
    const fields = line.split('\t'); if (!header) { header = fields; continue; }
    const index = indices.get(fields[header.indexOf('root_id')]);
    // Keep the first annotation row seen for each neuron.
    if (index !== undefined && !annotation.has(index)) annotation.set(index, { cell: fields[header.indexOf('cell_class')], superClass: fields[header.indexOf('super_class')] });
  }

  // Step 6: model, as in v2.
  const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
  const rawForward = model.forward.bind(model);
  model.forward = (...values) => { const result = rawForward(...values); pace(); return result; };
  const magnitudes = () => {
    const m = model.params.magnitude;
    return createHash('sha256').update(Buffer.from(m.buffer, m.byteOffset, m.byteLength)).digest('hex');
  };
  const n = model.h[0].length;

  // Step 5 (cont.): assign every neuron to exactly one group. Earlier rules win.
  const photoreceptors = new Set(retina.retina_idx);
  const superGroup = new Map([['optic', 'optic'], ['visual_projection', 'vpn'], ['visual_centrifugal', 'vcn'], ['central', 'central']]);
  const groups = { photoreceptor: [], kc: [], mbon: [], optic: [], vpn: [], vcn: [], central: [], other: [] };
  for (let i = 0; i < n; i++) {
    const a = annotation.get(i);
    let group = 'other';
    if (photoreceptors.has(i)) group = 'photoreceptor';
    else if (a && a.cell === 'Kenyon_Cell') group = 'kc';
    else if (a && a.cell === 'MBON') group = 'mbon';
    else if (a && superGroup.has(a.superClass)) group = superGroup.get(a.superClass);
    groups[group].push(i);
  }
  assert.equal(Object.values(groups).reduce((sum, g) => sum + g.length, 0), n, 'Groups do not cover every neuron once');
  atomic(`${out}/groups.json`, groups);
  const trace = [...groups.kc, ...groups.vpn, ...groups.mbon];

  const before = magnitudes();
  let passes = 0;
  const pass = stimulation => {
    guard();
    passes++;
    if (passes > 280) throw Error('Pass budget exceeded');
    model.forward([0], stimulation);
  };

  // Step 7: one pass per board; append records as we go.
  const finalFile = `${out}/final.f32`, stepsFile = `${out}/steps.f32`;
  writeFileSync(finalFile, ''); writeFileSync(stepsFile, '');
  const bytes = f32 => Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
  const keys = [];
  for (let b = 0; b < boards.length; b++) {
    pass(stimOf[b]);
    keys.push(boards[b].key);
    appendFileSync(finalFile, bytes(Float32Array.from(model.h[model.steps])));
    const steps = new Float32Array((model.steps + 1) * trace.length);
    for (let t = 0; t <= model.steps; t++) for (let j = 0; j < trace.length; j++) steps[t * trace.length + j] = model.h[t][trace[j]];
    appendFileSync(stepsFile, bytes(steps));
  }

  // Step 8: determinism check on the first board (not appended), then connections unchanged.
  pass(stimOf[0]);
  const again = Float32Array.from(model.h[model.steps]);
  const fd = openSync(finalFile, 'r'), firstBuf = Buffer.alloc(n * 4);
  readSync(fd, firstBuf, 0, n * 4, 0); closeSync(fd);
  for (let i = 0; i < n; i++) if (again[i] !== firstBuf.readFloatLE(i * 4)) throw Error('Brain pass is not deterministic');
  assert.equal(magnitudes(), before, 'Brain connections changed');

  // Step 9: board index file.
  atomic(`${out}/boards.json`, {
    keys, n, steps: model.steps,
    traceGroups: { kc: groups.kc.length, vpn: groups.vpn.length, mbon: groups.mbon.length },
    finalBytesPerBoard: n * 4, stepsBytesPerBoard: (model.steps + 1) * trace.length * 4 });

  // Step 10: summary with file hashes.
  const cpu = process.cpuUsage(cpuStarted);
  atomic(`${out}/summary.json`, {
    schema: 'pathway-trace-v1', boards: boards.length, n,
    groupCounts: Object.fromEntries(Object.entries(groups).map(([g, list]) => [g, list.length])),
    passes, peakRssMiB,
    elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)),
    cpuSeconds: (cpu.user + cpu.system) / 1e6, memoryUnchanged: true,
    finalSha256: await fileHash(finalFile), stepsSha256: await fileHash(stepsFile) });
  atomic(`${out}/manifest.json`, { ...manifest, status: 'complete' });
} catch (error) {
  atomic(`${out}/manifest.json`, { ...manifest, status: 'failed', error: error.message });
  throw error;
}
