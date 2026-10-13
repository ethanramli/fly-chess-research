import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import assert from 'node:assert/strict';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { graphHash, sha256 } from '../runtime/fetch-graph.mjs';

const MiB = 2 ** 20;
const start = performance.now(), timings = [];
const path = '.cache/full.npz';
if (await sha256(path) !== graphHash) throw Error('Run npm run fetch:graph first; graph checksum mismatch');
if (os.freemem() < 450 * MiB) throw Error('Less than 450 MiB free. Close an application before benchmarking.');
const graph = loadGraph(path);
const m = new SparseTrainer(graph, { steps: 8, inputDim: 1280, outputs: 8, seed: 29 });
const bytes = m.allocatedBytes();
assert.ok(bytes < 256 * MiB);
const initial = m.params.magnitude.slice();
const input = new Float32Array(1280);
// A real starting-board occupancy pattern, with constant and castling planes.
// Targets below are arbitrary engineering fixtures, NOT a chess rubric.
const back = [3, 1, 2, 4, 5, 2, 1, 3];
for (let f = 0; f < 8; f++) {
  input[back[f] * 64 + f] = 1; input[8 + f] = 1;
  input[(back[f] + 6) * 64 + 56 + f] = 1; input[6 * 64 + 48 + f] = 1;
}
input.fill(1, 12 * 64, 16 * 64); input.fill(1, 17 * 64, 18 * 64);
const target = new Float32Array([0.2, -0.1, 0.3, -0.2, 0.1, 0.4, -0.3, 0.2]);
m.forward(input); const initialLoss = m.loss(target);
let maximumRSS = process.memoryUsage().rss, changedEdges = 0;
for (let i = 0; i < 20; i++) {
  const t = performance.now();
  m.forward(input); const loss = m.backward(target);
  const stats = m.step({ learningRate: 0.2 });
  timings.push((performance.now() - t) / 1000);
  changedEdges = Math.max(changedEdges, stats.changedEdges);
  maximumRSS = Math.max(maximumRSS, process.memoryUsage().rss);
  if (maximumRSS > 768 * MiB || os.freemem() < 256 * MiB) throw Error('Memory guard triggered');
  if (i % 5 === 0) console.log(JSON.stringify({ update: i + 1, loss, changedEdges: stats.changedEdges, rssMiB: maximumRSS / MiB }));
}
m.forward(input); const finalLoss = m.loss(target);
let netChangedEdges = 0;
for (let k = 0; k < initial.length; k++) {
  if (initial[k] !== m.params.magnitude[k]) netChangedEdges++;
  assert.ok(m.params.magnitude[k] > 0 && Number.isFinite(m.params.magnitude[k]));
}
assert.ok(finalLoss < initialLoss * 0.6, 'Engineering fixture did not fit');
assert.ok(netChangedEdges > 1000, 'No substantial evidence of updates inside the graph');
assert.equal(m.allocatedBytes(), bytes);
const sorted = timings.slice(3).sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)];
const report = {
  scope: 'Full real released graph; from-scratch weights; arbitrary-target single-position engineering fit. NOT chess skill, reasoning, or generalization evidence.',
  timestamp: new Date().toISOString(), node: process.version, cpu: os.cpus()[0].model,
  totalSystemMiB: os.totalmem() / MiB, remainingFreeMiB: os.freemem() / MiB,
  graphSHA256: graphHash, neurons: m.n, edges: graph.col.length,
  inputNeurons: graph.input.length, outputNeurons: graph.output.length,
  recurrentSteps: m.steps, criterionOutputs: m.outputs,
  parameters: Object.values(m.params).reduce((s, a) => s + a.length, 0),
  allocatedArrayMiB: bytes / MiB,
  peakResidentMiB: Math.max(maximumRSS / MiB, process.resourceUsage().maxRSS / 1024),
  memoryGuard: 'Soft checks between updates; max-old-space-size caps JS heap only, not typed arrays. No OS hard limit.',
  initialLoss, finalLoss, netChangedEdges, maximumEdgesChangedPerUpdate: changedEdges,
  stepSeconds: timings, medianStepSeconds: median,
  projected10000PositionPassHours: median * 10000 / 3600,
  projected50000PositionPassHours: median * 50000 / 3600,
  projected58MillionPositionPassDays: median * 58000000 / 86400,
  projectionCaveat: 'Linear extrapolation of one repeatedly used board on a short warm run. Diverse positions, thermal throttling, pair losses, evaluation and labeling add cost.',
  elapsedSeconds: (performance.now() - start) / 1000,
};
mkdirSync('reports', { recursive: true });
writeFileSync('research/reports/lowram-feasibility.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
