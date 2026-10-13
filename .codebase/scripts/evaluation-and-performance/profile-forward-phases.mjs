// Diagnostic-only phase timing for the sparse recurrent forward pass.
// The instrumented copy is compared against SparseTrainer.forward after every sample.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { digest as createDigest } from '../../src/neural-learning/mushroom-body.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, samples: { type: 'string', default: '8' } } });
const samples = Number(args.samples);
if (!args.out || existsSync(args.out) || !Number.isSafeInteger(samples) || samples < 3 || samples > 32)
  throw Error('Require a fresh --out and 3..32 measured samples');
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
function profiledForward(x, stimulation, phaseRows) {
  const { graph: g, params: p, n, saturation: s } = this;
  let begin = performance.now();
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
  phaseRows.prepare.push(performance.now() - begin);

  begin = performance.now();
  for (let j = 0; j < n; j++) this.alpha[j] = 1 / (1 + Math.exp(-p.leak[j]));
  phaseRows.leakCoefficients.push(performance.now() - begin);

  begin = performance.now();
  for (let i = 0; i < g.input.length; i++) {
    let value = p.inputBias[i];
    for (const f of this.activeInput) value += p.input[i * this.inputDim + f] * x[f];
    this.drive[g.input[i]] += value;
  }
  phaseRows.inputProjection.push(performance.now() - begin);

  begin = performance.now();
  for (let t = 0; t < this.steps; t++) {
    const prev = this.h[t], next = this.h[t + 1], act = this.activity[t];
    for (let j = 0; j < n; j++) {
      let z = this.drive[j];
      for (let k = g.row[j]; k < g.row[j + 1]; k++) z += g.sign[k] * p.magnitude[k] * prev[g.col[k]];
      if (!Number.isFinite(z)) throw Error('Nonfinite recurrent input');
      act[j] = z > 0 ? s * Math.tanh(z / s) : 0;
      next[j] = (1 - this.alpha[j]) * prev[j] + this.alpha[j] * act[j];
    }
  }
  phaseRows.sparseRecurrence.push(performance.now() - begin);

  begin = performance.now();
  const last = this.h[this.steps];
  for (let o = 0; o < this.outputs; o++) {
    let z = p.headBias[o];
    for (let i = 0; i < g.output.length; i++) z += p.head[o * g.output.length + i] * last[g.output[i]];
    this.prediction[o] = z;
    if (!Number.isFinite(z)) throw Error('Nonfinite prediction');
  }
  phaseRows.readout.push(performance.now() - begin);
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
const protocol = readJson(protocolPath);
const variant = protocol.variants.find(v => v.id === 'original');
const prerequisitePath = join(variant.prerequisite, 'report.json');
const prerequisite = readJson(prerequisitePath);
assert.equal(await sha256(prerequisitePath), variant.reportSha256);
assert.equal(prerequisite.complete, true);
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const mapping = readJson(mappingPath).mapping;
assert.equal(createDigest(mapping), prerequisite.identity.mappingHash);
const runPath = 'research/reports/adaptive-two-valence-original-v2-2026-10-06';
const runReport = readJson(join(runPath, 'report.json'));
const runAudit = readJson(join(runPath, 'audit.json'));
assert.equal(runAudit.passed, true);
assert.equal(await sha256(join(runPath, 'report.json')), runAudit.reportSha256);
const receiptPath = join(runPath, 'event-adaptive-0.json');
const receipt = readJson(receiptPath);
assert.equal(receipt.receipt.update.changedEdges, 89);
assert.equal(await sha256('.cache/full.npz'), graphHash);
guard();

const setupStarted = performance.now();
const graph = loadGraph('.cache/full.npz');
guard();
const model = new SparseTrainer(graph, prerequisite.identity.model);
const memory = new ReversalMemory(model, mapping, protocol.memory);
model.forward([0]);
const rest = Float32Array.from(model.h[model.steps]);
memory.restore(receipt.receipt.after);
guard();
const stimulation = receipt.receipt.presentation.stimulation;
const fixedBefore = parameterHash(model);
const tuners = { prepare: [], leakCoefficients: [], inputProjection: [], sparseRecurrence: [], readout: [] };
const referenceMs = [], profiledMs = [];
const setupMs = performance.now() - setupStarted;

for (let i = 0; i < samples + 1; i++) {
  guard();
  const startReference = performance.now();
  const expectedView = model.forward([0], stimulation);
  const referenceElapsed = performance.now() - startReference;
  const expected = Float32Array.from(expectedView);
  const expectedState = stateHash(model);
  referenceMs.push(referenceElapsed);

  const startProfile = performance.now();
  const actualView = profiledForward.call(model, [0], stimulation, tuners);
  const profiledElapsed = performance.now() - startProfile;
  const actual = Float32Array.from(actualView);
  const actualState = stateHash(model);
  profiledMs.push(profiledElapsed);
  assert.deepEqual(actual, expected);
  assert.equal(actualState, expectedState, 'Instrumented pass must reproduce every saved activity buffer');
  assert.equal(parameterHash(model), fixedBefore, 'Forward must not alter model parameters or memory');
  if (i === 0) for (const rows of Object.values(tuners)) rows.length = 0;
}

const sourcePaths = [
  '.codebase/scripts/evaluation-and-performance/profile-forward-phases.mjs',
  '.codebase/scripts/runtime/fetch-graph.mjs',
  '.codebase/src/supervised-baselines/trainer.mjs',
  '.codebase/src/runtime/graph.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs',
  '.codebase/src/neural-learning/mushroom-body.mjs',
  'package.json', 'package-lock.json',
];
const inputPaths = [protocolPath, protocol.puzzles, prerequisitePath, mappingPath,
  join(runPath, 'report.json'), join(runPath, 'audit.json'), receiptPath,
  '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv'];
const identity = {
  graphSHA256: graphHash,
  sources: Object.fromEntries(await Promise.all(sourcePaths.map(async p => [p, await sha256(p)]))),
  inputs: Object.fromEntries(await Promise.all(inputPaths.map(async p => [p, await sha256(p)]))),
  model: model.config, memory: memory.config,
  dependencyIdentity: { node: process.version, chessJs: JSON.parse(readFileSync('node_modules/chess.js/package.json', 'utf8')).version },
  sampleStimulation: stimulation,
};
const cpu = process.cpuUsage(cpuStarted);
const report = {
  complete: true,
  scope: 'Diagnostic-only decomposition of the same serial sparse recurrent forward pass used for the frozen first feedback receipt. The hand-instrumented copy is checked against the production method on every sample, including every activity buffer. No learner source is changed and no learning update is applied.',
  timestamp: new Date().toISOString(), identity,
  fixture: { move: receipt.experience.move, channel: receipt.channel,
    changedEdgesInReferenceReceipt: receipt.receipt.update.changedEdges,
    neurons: model.n, edges: graph.col.length, steps: model.steps },
  timing: {
    setupMs, sampleCount: samples, warmupCount: 1,
    productionForwardMs: summarize(referenceMs.slice(1)),
    instrumentedForwardMs: summarize(profiledMs.slice(1)),
    phases: Object.fromEntries(Object.entries(tuners).map(([k, v]) => [k, summarize(v)])),
    interpretation: 'Subphase samples are synchronous wall timings without training pacing. They overlap minimally only through timer overhead. Compare phase totals to instrumented full pass; this tool adds instrumentation and does not claim a speedup.',
  },
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
  '# Sparse forward phase profile', '', `Completed ${report.timestamp}.`, '', report.scope, '',
  'The large share of time falls in the recurrent sparse-edge pass; the phase timings identify whether static per-neuron coefficients or edge traversal are the next optimization target. The hand-instrumented pass exactly matches the production pass for all sampled output and activity arrays.', '',
  'No performance improvement is claimed; see `report.json` for raw measurements and pinned identities.', '',
].join('\n'));
console.log(JSON.stringify({ complete: report.complete,
  phases: report.timing.phases,
  productionForward: report.timing.productionForwardMs,
  peakRssMiB: report.resources.peakRssMiB, out: args.out }));
