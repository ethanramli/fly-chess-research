import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import assert from 'node:assert/strict';
import { loadGraph } from '../src/lowram/graph.mjs';
import { SparseTrainer } from '../src/lowram/trainer.mjs';
import { CircuitTrainer } from '../src/lowram/circuit.mjs';
import { encodeFen } from '../src/lowram/positions.mjs';
import { streamRows } from '../src/lowram/storage.mjs';
import { sha256, graphHash } from './fetch-graph.mjs';

const graphPath = '.cache/full.npz', MiB = 2 ** 20;
if (await sha256(graphPath) !== graphHash) throw Error('Graph checksum mismatch');
if (os.freemem() < 512 * MiB) throw Error('Insufficient free memory for bounded benchmark');
const g = loadGraph(graphPath), rows = [];
for await (const row of streamRows('research/data/pilot-v1/train.jsonl')) { rows.push(row); if (rows.length === 2) break; }
const results = [];
function grow(seed, size) {
  const nodes = [seed], seen = new Uint8Array(g.row.length - 1); seen[seed] = 1;
  for (let q = 0; q < nodes.length && nodes.length < size; q++) {
    const j = nodes[q];
    for (let e = g.row[j]; e < g.row[j + 1] && nodes.length < size; e++) if (!seen[g.col[e]]) { seen[g.col[e]] = 1; nodes.push(g.col[e]); }
  }
  return nodes;
}
const outputSeeds = [...g.output].sort((a, b) => (g.row[b + 1] - g.row[b]) - (g.row[a + 1] - g.row[a]));
const nodes = grow(outputSeeds[0], 4096);
for (const [index, row] of rows.entries()) {
  const m = new SparseTrainer(g, { outputs: 2, seed: 47, normalization: 'global' });
  const setupStart = performance.now();
  const c = new CircuitTrainer(m, nodes), setupSeconds = (performance.now() - setupStart) / 1000;
  const x = encodeFen(row.fenA), target = row.targetA, steps = 12, learningRate = 0.02;
  let begin = performance.now(); c.anchor(x, target); const anchorSeconds = (performance.now() - begin) / 1000;
  c.forward(); c.backward();
  let diff2 = 0, exact2 = 0, maxAbs = 0;
  const maps = { magnitude: c.edges, bias: c.nodes, leak: c.nodes, inputBias: c.inputs };
  for (const [key, indices] of Object.entries(maps)) for (let k = 0; k < indices.length; k++) {
    const a = c.grads[key][k], b = m.grads[key][indices[k]];
    diff2 += (a - b) ** 2; exact2 += b * b; maxAbs = Math.max(maxAbs, Math.abs(a - b));
  }
  for (let k = 0; k < c.inputs.length; k++) for (let f = 0; f < m.inputDim; f++) {
    const a = c.grads.input[k * m.inputDim + f], b = m.grads.input[c.inputs[k] * m.inputDim + f];
    diff2 += (a - b) ** 2; exact2 += b * b; maxAbs = Math.max(maxAbs, Math.abs(a - b));
  }
  const relativeGradientError = Math.sqrt(diff2 / (exact2 || 1));
  assert.ok(relativeGradientError < 2e-5, 'Anchor gradient mismatch');
  begin = performance.now(); let surrogateLoss;
  for (let i = 0; i < steps; i++) { surrogateLoss = c.forward().loss; c.backward(); c.step(learningRate); }
  const localStepsSeconds = (performance.now() - begin) / 1000;
  begin = performance.now(); const verified = c.verify(); const verificationSeconds = (performance.now() - begin) / 1000;
  const approxLoss = verified.trueLoss;
  // Restore exactly the same block initialization. Compare the SAME active
  // parameters, examples, learning rate and step count using exact gradients.
  c.copyParams(c.backup, true); c.anchored = true;
  begin = performance.now();
  for (let i = 0; i < steps; i++) {
    m.zeroGrad(); m.forward(x); m.backward(target);
    for (const [key, indices] of Object.entries(maps)) for (let k = 0; k < indices.length; k++) c.grads[key][k] = m.grads[key][indices[k]];
    for (let k = 0; k < c.inputs.length; k++) for (let f = 0; f < m.inputDim; f++) c.grads.input[k * m.inputDim + f] = m.grads.input[c.inputs[k] * m.inputDim + f];
    c.step(learningRate);
    if (process.memoryUsage().rss > 768 * MiB || os.freemem() < 256 * MiB) throw Error('Memory guard');
  }
  m.forward(x); const exactLoss = m.loss(target), exactSeconds = (performance.now() - begin) / 1000;
  const totalCachedSeconds = setupSeconds + anchorSeconds + localStepsSeconds + verificationSeconds;
  const result = { example: row.id, sourceSplit: row.split, steps, learningRate,
    blockNeurons: nodes.length, trainableEdges: c.edges.length, edgeFraction: c.edges.length / g.col.length,
    outgoingBoundaryEdges: c.outgoing.length, blockInputs: c.inputs.length, blockOutputs: c.outputs.length,
    initialLoss: c.anchorLoss, cachedTrueLoss: approxLoss, exactTrueLoss: exactLoss,
    accepted: verified.accepted, rolledBack: verified.rolledBack, relativeGradientError, maximumGradientAbsoluteError: maxAbs,
    setupSeconds, anchorSeconds, localStepsSeconds, verificationSeconds, totalCachedSeconds, exactSeconds,
    sameBlockStepCountSpeedRatio: exactSeconds / totalCachedSeconds,
    peakResidentMiB: process.resourceUsage().maxRSS / 1024 };
  results.push(result); console.log(JSON.stringify(result));
}
const report = { timestamp: new Date().toISOString(), graphSHA256: graphHash, cpu: os.cpus()[0].model, node: process.version,
  scope: 'Two training positions; one 4096-neuron incoming-connected block selected without labels. Exact and cached runs update identical block parameters from identical scratch initialization. Whole-graph inference and verification; no held-out transfer evaluation.',
  limitations: ['This is a same-block microbenchmark, not a whole-model speedup or time-to-quality result', 'One block and two positions do not establish generalization, stable circuit rotation, or publication novelty', 'The output head and all outside-block parameters stay fixed in both methods', 'Setup included in cached total; graph load and common model initialization excluded from both timings', 'Peak RSS is process lifetime, including both methods; guard is soft'], results };
writeFileSync('research/reports/circuit-feasibility.json', JSON.stringify(report, null, 2) + '\n');
