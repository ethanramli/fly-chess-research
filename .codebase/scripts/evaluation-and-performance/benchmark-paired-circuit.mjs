import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { PairedTrainer } from '../../src/supervised-baselines/paired.mjs';
import { PairedCircuitTrainer } from '../../src/supervised-baselines/paired-circuit.mjs';
import { encodeFen } from '../../src/supervised-baselines/positions.mjs';
import { streamRows } from '../../src/runtime/storage.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

function guard() {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Soft memory guard');
}
if (await sha256('.cache/full.npz') !== graphHash) throw Error('Graph checksum mismatch');
guard();
const g = loadGraph('.cache/full.npz');
const root = [...g.output].sort((a, b) => (g.row[b + 1] - g.row[b]) - (g.row[a + 1] - g.row[a]))[0];
const nodes = [root], seen = new Uint8Array(g.row.length - 1); seen[root] = 1;
for (let q = 0; q < nodes.length && nodes.length < 4096; q++) {
  for (let e = g.row[nodes[q]]; e < g.row[nodes[q] + 1] && nodes.length < 4096; e++) {
    const i = g.col[e]; if (!seen[i]) { seen[i] = 1; nodes.push(i); }
  }
}
const results = [];
// Two distinct training game families, selected by file order without labels.
let previousGroup;
for await (const row of streamRows('research/data/pilot-v1/train.jsonl')) {
  if (row.group === previousGroup) continue;
  previousGroup = row.group;
  guard();
  const m = new SparseTrainer(g, { outputs: 2, seed: 47, normalization: 'global' });
  const pair = new PairedTrainer(m), xa = encodeFen(row.fenA), xb = encodeFen(row.fenB);
  const start = performance.now(), c = new PairedCircuitTrainer(m, nodes);
  c.anchor(xa, xb, row.targetA, row.targetB);
  const anchorAndSetupSeconds = (performance.now() - start) / 1000;
  c.forward(); c.backward();
  m.zeroGrad(); pair.train(xa, xb, row.targetA, row.targetB);
  const maps = { magnitude: c.a.edges, bias: c.a.nodes, leak: c.a.nodes, inputBias: c.a.inputs };
  let diff = 0, norm = 0;
  function compare(a, b) { diff += (a - b) ** 2; norm += b * b; }
  for (const [key, indices] of Object.entries(maps)) for (let k = 0; k < indices.length; k++) compare(c.a.grads[key][k], m.grads[key][indices[k]] / 2);
  for (let k = 0; k < c.a.inputs.length; k++) for (let f = 0; f < m.inputDim; f++) compare(c.a.grads.input[k * m.inputDim + f], m.grads.input[c.a.inputs[k] * m.inputDim + f] / 2);
  const relativeAnchorGradientError = Math.sqrt(diff / (norm || 1));
  if (relativeAnchorGradientError > 2e-5) throw Error(`Pair anchor gradient mismatch: ${relativeAnchorGradientError}`);
  m.zeroGrad();
  const localStart = performance.now(), steps = 12, learningRate = 0.02;
  for (let i = 0; i < steps; i++) { guard(); c.forward(); c.backward(); c.step(learningRate); }
  const cached = c.verify();
  const cachedSeconds = anchorAndSetupSeconds + (performance.now() - localStart) / 1000;
  c.a.copyParams(c.a.backup, true); c.a.anchored = true;
  const exactStart = performance.now();
  for (let i = 0; i < steps; i++) {
    guard(); m.zeroGrad(); pair.train(xa, xb, row.targetA, row.targetB);
    for (const [key, indices] of Object.entries(maps)) for (let k = 0; k < indices.length; k++) c.a.grads[key][k] = m.grads[key][indices[k]] / 2;
    for (let k = 0; k < c.a.inputs.length; k++) for (let f = 0; f < m.inputDim; f++) c.a.grads.input[k * m.inputDim + f] = m.grads.input[c.a.inputs[k] * m.inputDim + f] / 2;
    c.a.step(learningRate);
  }
  // Reuse paired verification to evaluate the exact endpoint without backward.
  c.anchored = true;
  const exact = c.verify();
  const exactSeconds = (performance.now() - exactStart) / 1000;
  const result = { pair: row.id, group: row.group, steps, learningRate, blockNeurons: nodes.length,
    activeEdges: c.a.edges.length, relativeAnchorGradientError, cached, exact,
    cachedSeconds, exactSeconds, sameBlockSpeedRatio: exactSeconds / cachedSeconds,
    peakResidentMiB: process.resourceUsage().maxRSS / 1024 };
  results.push(result); console.log(JSON.stringify(result));
  if (results.length === 2) break;
}
writeFileSync('research/reports/paired-circuit-feasibility.json', JSON.stringify({ timestamp: new Date().toISOString(), graphHash,
  scope: 'Same-block paired-objective microbenchmark from scratch; two training families; no held-out evaluation or circuit rotation',
  limitations: ['Both methods fix the head and all outside-block parameters', 'Timings include cache setup and true-loss verification; exclude common graph/model setup and gradient diagnostic', 'Fixed method order, single seed, process-lifetime peak RSS; soft memory guard', 'Does not establish whole-model time-to-quality or novelty'], results }, null, 2) + '\n');
