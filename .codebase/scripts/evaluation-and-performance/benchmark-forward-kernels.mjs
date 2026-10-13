// Development-only A/B/C benchmark of mathematically equivalent sparse kernels.
// It does not modify the production trainer or apply learning updates.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, samples: { type: 'string', default: '12' } } });
const samples = Number(args.samples);
if (!args.out || existsSync(args.out) || !Number.isSafeInteger(samples) || samples < 6 || samples > 64)
  throw Error('Require fresh --out and 6..64 measured samples');
const started = performance.now(), cpuStarted = process.cpuUsage();
const rssLimit = 768 * 2 ** 20, freeLimit = 256 * 2 ** 20;
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
function guard() {
  const rss = process.memoryUsage().rss, free = os.freemem();
  if (rss > rssLimit || free < freeLimit) throw Error(`Resource guard rssMiB=${rss / 2 ** 20} freeMiB=${free / 2 ** 20}`);
}
function stateHash(model) {
  const h = createHash('sha256');
  for (const a of [...model.h, ...model.activity, model.drive, model.alpha, model.prediction])
    h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  return h.digest('hex');
}
function parameterHash(model) {
  const h = createHash('sha256');
  for (const a of Object.values(model.params)) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  return h.digest('hex');
}
function forwardHoisted(x, stimulation = []) {
  if (x.length !== this.inputDim) throw Error('Input dimension mismatch');
  const g = this.graph, p = this.params, n = this.n, s = this.saturation;
  const row = g.row, col = g.col, sign = g.sign, magnitude = p.magnitude;
  this.activeInput = [];
  for (let f = 0; f < x.length; f++) {
    if (!Number.isFinite(x[f])) throw Error('Nonfinite input');
    if (x[f] !== 0) this.activeInput.push(f);
  }
  this.x = x;
  this.h[0].fill(0); this.drive.set(p.bias);
  for (const { index, current } of stimulation) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= n || !Number.isFinite(current)) throw Error('Invalid neural stimulation');
    this.drive[index] += current;
  }
  for (let j = 0; j < n; j++) this.alpha[j] = 1 / (1 + Math.exp(-p.leak[j]));
  for (let i = 0; i < g.input.length; i++) {
    let value = p.inputBias[i];
    for (const f of this.activeInput) value += p.input[i * this.inputDim + f] * x[f];
    this.drive[g.input[i]] += value;
  }
  for (let t = 0; t < this.steps; t++) {
    const prev = this.h[t], next = this.h[t + 1], act = this.activity[t];
    for (let j = 0; j < n; j++) {
      let z = this.drive[j];
      for (let k = row[j], end = row[j + 1]; k < end; k++) z += sign[k] * magnitude[k] * prev[col[k]];
      if (!Number.isFinite(z)) throw Error('Nonfinite recurrent input');
      act[j] = z > 0 ? s * Math.tanh(z / s) : 0;
      next[j] = (1 - this.alpha[j]) * prev[j] + this.alpha[j] * act[j];
    }
  }
  const last = this.h[this.steps];
  for (let o = 0; o < this.outputs; o++) {
    let z = p.headBias[o];
    for (let i = 0; i < g.output.length; i++) z += p.head[o * g.output.length + i] * last[g.output[i]];
    this.prediction[o] = z;
    if (!Number.isFinite(z)) throw Error('Nonfinite prediction');
  }
  return this.prediction;
}
function forwardSigned(signedMagnitude, x, stimulation = []) {
  if (x.length !== this.inputDim) throw Error('Input dimension mismatch');
  const g = this.graph, p = this.params, n = this.n, s = this.saturation;
  const row = g.row, col = g.col;
  this.activeInput = [];
  for (let f = 0; f < x.length; f++) {
    if (!Number.isFinite(x[f])) throw Error('Nonfinite input');
    if (x[f] !== 0) this.activeInput.push(f);
  }
  this.x = x;
  this.h[0].fill(0); this.drive.set(p.bias);
  for (const { index, current } of stimulation) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= n || !Number.isFinite(current)) throw Error('Invalid neural stimulation');
    this.drive[index] += current;
  }
  for (let j = 0; j < n; j++) this.alpha[j] = 1 / (1 + Math.exp(-p.leak[j]));
  for (let i = 0; i < g.input.length; i++) {
    let value = p.inputBias[i];
    for (const f of this.activeInput) value += p.input[i * this.inputDim + f] * x[f];
    this.drive[g.input[i]] += value;
  }
  for (let t = 0; t < this.steps; t++) {
    const prev = this.h[t], next = this.h[t + 1], act = this.activity[t];
    for (let j = 0; j < n; j++) {
      let z = this.drive[j];
      for (let k = row[j], end = row[j + 1]; k < end; k++) z += signedMagnitude[k] * prev[col[k]];
      if (!Number.isFinite(z)) throw Error('Nonfinite recurrent input');
      act[j] = z > 0 ? s * Math.tanh(z / s) : 0;
      next[j] = (1 - this.alpha[j]) * prev[j] + this.alpha[j] * act[j];
    }
  }
  const last = this.h[this.steps];
  for (let o = 0; o < this.outputs; o++) {
    let z = p.headBias[o];
    for (let i = 0; i < g.output.length; i++) z += p.head[o * g.output.length + i] * last[g.output[i]];
    this.prediction[o] = z;
    if (!Number.isFinite(z)) throw Error('Nonfinite prediction');
  }
  return this.prediction;
}
function forwardUnrolledSigned(signedMagnitude, x, stimulation = []) {
  if (x.length !== this.inputDim) throw Error('Input dimension mismatch');
  const g = this.graph, p = this.params, n = this.n, s = this.saturation;
  const row = g.row, col = g.col;
  this.activeInput = [];
  for (let f = 0; f < x.length; f++) {
    if (!Number.isFinite(x[f])) throw Error('Nonfinite input');
    if (x[f] !== 0) this.activeInput.push(f);
  }
  this.x = x;
  this.h[0].fill(0); this.drive.set(p.bias);
  for (const { index, current } of stimulation) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= n || !Number.isFinite(current)) throw Error('Invalid neural stimulation');
    this.drive[index] += current;
  }
  for (let j = 0; j < n; j++) this.alpha[j] = 1 / (1 + Math.exp(-p.leak[j]));
  for (let i = 0; i < g.input.length; i++) {
    let value = p.inputBias[i];
    for (const f of this.activeInput) value += p.input[i * this.inputDim + f] * x[f];
    this.drive[g.input[i]] += value;
  }
  for (let t = 0; t < this.steps; t++) {
    const prev = this.h[t], next = this.h[t + 1], act = this.activity[t];
    for (let j = 0; j < n; j++) {
      let z = this.drive[j], k = row[j], end = row[j + 1];
      for (; k + 3 < end; k += 4) {
        z += signedMagnitude[k] * prev[col[k]];
        z += signedMagnitude[k + 1] * prev[col[k + 1]];
        z += signedMagnitude[k + 2] * prev[col[k + 2]];
        z += signedMagnitude[k + 3] * prev[col[k + 3]];
      }
      for (; k < end; k++) z += signedMagnitude[k] * prev[col[k]];
      if (!Number.isFinite(z)) throw Error('Nonfinite recurrent input');
      act[j] = z > 0 ? s * Math.tanh(z / s) : 0;
      next[j] = (1 - this.alpha[j]) * prev[j] + this.alpha[j] * act[j];
    }
  }
  const last = this.h[this.steps];
  for (let o = 0; o < this.outputs; o++) {
    let z = p.headBias[o];
    for (let i = 0; i < g.output.length; i++) z += p.head[o * g.output.length + i] * last[g.output[i]];
    this.prediction[o] = z;
    if (!Number.isFinite(z)) throw Error('Nonfinite prediction');
  }
  return this.prediction;
}
function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q = p => sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
  return { count: sorted.length, totalMs: sorted.reduce((a, b) => a + b, 0),
    meanMs: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    medianMs: q(.5), p95Ms: q(.95), maxMs: sorted.at(-1) };
}

guard();
const protocolPath = 'research/data/adaptive-two-valence-v1/protocol.json';
const protocol = readJson(protocolPath), variant = protocol.variants.find(v => v.id === 'original');
const prerequisitePath = join(variant.prerequisite, 'report.json'), prerequisite = readJson(prerequisitePath);
assert.equal(await sha256(prerequisitePath), variant.reportSha256);
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const mapping = readJson(mappingPath).mapping;
assert.equal(digest(mapping), prerequisite.identity.mappingHash);
const sourceRun = 'research/reports/adaptive-two-valence-original-v2-2026-10-06';
const audit = readJson(join(sourceRun, 'audit.json'));
assert.equal(audit.passed, true);
assert.equal(await sha256(join(sourceRun, 'report.json')), audit.reportSha256);
const receiptPath = join(sourceRun, 'event-adaptive-0.json'), receipt = readJson(receiptPath);
assert.equal(await sha256('.cache/full.npz'), graphHash);
guard();
const graph = loadGraph('.cache/full.npz');
guard();
const model = new SparseTrainer(graph, prerequisite.identity.model);
const memory = new ReversalMemory(model, mapping, protocol.memory);
memory.restore(receipt.receipt.after);
const signedBuildStarted = performance.now();
const signedMagnitude = Float32Array.from(model.params.magnitude, (m, i) => graph.sign[i] * m);
const signedBuildMs = performance.now() - signedBuildStarted;
const signedBytes = signedMagnitude.byteLength;
const stimulation = receipt.receipt.presentation.stimulation;
const fixedParameterIdentity = parameterHash(model);
const methods = {
  production: (...args_) => model.forward(...args_),
  hoistedArrays: (...args_) => forwardHoisted.apply(model, args_),
  signedMagnitude: (...args_) => forwardSigned.call(model, signedMagnitude, ...args_),
  unrolledSigned: (...args_) => forwardUnrolledSigned.call(model, signedMagnitude, ...args_),
};
const timings = Object.fromEntries(Object.keys(methods).map(k => [k, []]));
const sampleIdentities = [];
for (let warm = 0; warm < 2; warm++) for (const method of Object.values(methods)) method([0], stimulation);
for (let i = 0; i < samples; i++) {
  guard();
  const order = i % 2 === 0 ? ['production','hoistedArrays','unrolledSigned','signedMagnitude']
    : ['production','signedMagnitude','unrolledSigned','hoistedArrays'];
  let reference = null, referenceHash = null;
  for (const name of order) {
    const t = performance.now();
    const output = methods[name]([0], stimulation);
    const elapsed = performance.now() - t;
    const prediction = Float32Array.from(output);
    const activities = stateHash(model);
    if (name === 'production') { reference = prediction; referenceHash = activities; }
    else {
      assert.deepEqual(prediction, reference, `${name} output differs from production`);
      assert.equal(activities, referenceHash, `${name} activity differs from production`);
    }
    assert.equal(parameterHash(model), fixedParameterIdentity);
    timings[name].push(elapsed);
  }
  sampleIdentities.push(referenceHash);
}

const sourcePaths = [
  '.codebase/scripts/evaluation-and-performance/benchmark-forward-kernels.mjs',
  '.codebase/scripts/runtime/fetch-graph.mjs', '.codebase/src/supervised-baselines/trainer.mjs',
  '.codebase/src/runtime/graph.mjs', '.codebase/src/neural-learning/reversal-memory.mjs',
  '.codebase/src/neural-learning/mushroom-body.mjs', 'package.json', 'package-lock.json',
];
const inputPaths = [protocolPath, prerequisitePath, mappingPath,
  join(sourceRun, 'report.json'), join(sourceRun, 'audit.json'), receiptPath,
  '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv'];
const identity = {
  graphSHA256: graphHash,
  sources: Object.fromEntries(await Promise.all(sourcePaths.map(async p => [p, await sha256(p)]))),
  inputs: Object.fromEntries(await Promise.all(inputPaths.map(async p => [p, await sha256(p)]))),
  model: model.config, memory: memory.config,
  dependencyIdentity: { node: process.version, chessJs: JSON.parse(readFileSync('node_modules/chess.js/package.json', 'utf8')).version },
  signedWeightCache: { bytes: signedBytes, buildMs: signedBuildMs },
  sampleStimulation: stimulation,
};
const cpu = process.cpuUsage(cpuStarted);
const summaries = Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, summarize(v)]));
const report = {
  complete: true,
  scope: 'Interleaved A/B/C/D comparison on the same frozen brain state and saved teaching stimulation. Production kernel versus local-array-hoisted kernel versus precomputed signed edge magnitudes versus a four-edge-unrolled signed kernel. Each candidate exactly matches production predictions and every recurrent activity buffer on every sample. No learner source is changed and no update is applied.',
  timestamp: new Date().toISOString(), identity,
  fixture: { move: receipt.experience.move, channel: receipt.channel,
    neurons: model.n, edges: graph.col.length, steps: model.steps,
    samples, warmupPassesPerKernel: 2, exactChecks: samples * 3 },
  timing: { kernels: summaries,
    relativeMedian: Object.fromEntries(Object.entries(summaries).map(([k,v]) => [k, v.medianMs / summaries.production.medianMs])),
    rawMs: timings, sampleActivityHashes: sampleIdentities,
    note: 'Short single-host microbenchmark; p95/max are noisy. Signed-magnitude cache requires every magnitude mutation path to refresh affected entries before it can be used in production. Its memory allocation/build cost is reported. The unrolled candidate preserves edge-summation order and is checked against every activity buffer.' },
  resources: { peakRssMiB: process.resourceUsage().maxRSS / 1024,
    elapsedSeconds: (performance.now() - started) / 1000,
    cpuSeconds: (cpu.user + cpu.system) / 1e6,
    freeMemoryMiBAtEnd: os.freemem() / 2 ** 20, cpu: os.cpus()[0].model },
  exactEquivalence: true,
  command: { executable: process.execPath, options: process.execArgv, argv: process.argv.slice(1), node: process.version },
};
mkdirSync(args.out, { recursive: true });
const reportPath = join(args.out, 'report.json');
writeFileSync(`${reportPath}.partial`, JSON.stringify(report, null, 2));
renameSync(`${reportPath}.partial`, reportPath);
writeFileSync(join(args.out, 'README.md'), [
  '# Sparse forward kernel benchmark', '', `Completed ${report.timestamp}.`, '', report.scope, '',
  'The candidate kernels are diagnostic hypotheses. A faster microkernel is not adopted until the persistent-learning path refreshes all derived state and an end-to-end matched cycle shows a real benefit.', '',
  'See `report.json` for raw samples, exact-equivalence checks, memory cost and pinned identities.', '',
].join('\n'));
console.log(JSON.stringify({ complete: true, kernels: summaries,
  relativeMedian: report.timing.relativeMedian, signedCacheBytes: signedBytes,
  peakRssMiB: report.resources.peakRssMiB, out: args.out }));
