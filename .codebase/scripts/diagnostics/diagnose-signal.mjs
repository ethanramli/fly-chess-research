import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { encodeFen } from '../../src/supervised-baselines/positions.mjs';
import { streamRows } from '../../src/runtime/storage.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

// Diagnose position sensitivity at scratch initialization using training inputs
// only. This is an activation measurement, not a training-quality score.
if (await sha256('.cache/full.npz') !== graphHash) throw Error('Graph checksum mismatch');
const m = new SparseTrainer(loadGraph('.cache/full.npz'), { outputs: 2, seed: 47, normalization: 'global' });
const saved = m.h.map(a => new Float32Array(a.length));
const stages = Array.from({ length: m.steps + 1 }, (_, t) => ({ timestep: t, deltaSquared: 0, activitySquared: 0, active: 0, count: 0 }));
let pairs = 0, outputDeltaSquared = 0, readoutDeltaSquared = 0, inputDeltaSquared = 0;
for await (const row of streamRows('research/data/pilot-v1/train.jsonl')) {
  if (process.memoryUsage().rss > 512 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Soft memory guard');
  const xa = encodeFen(row.fenA), xb = encodeFen(row.fenB);
  for (let f = 0; f < xa.length; f++) inputDeltaSquared += (xa[f] - xb[f]) ** 2;
  const pa = Array.from(m.forward(xa));
  for (let t = 0; t <= m.steps; t++) saved[t].set(m.h[t]);
  const pb = m.forward(xb);
  for (let o = 0; o < m.outputs; o++) readoutDeltaSquared += (pa[o] - pb[o]) ** 2;
  for (let t = 0; t <= m.steps; t++) {
    const stage = stages[t];
    for (let j = 0; j < m.n; j++) {
      stage.deltaSquared += (saved[t][j] - m.h[t][j]) ** 2;
      stage.activitySquared += (saved[t][j] ** 2 + m.h[t][j] ** 2) / 2;
      stage.active += Number(saved[t][j] > 0) + Number(m.h[t][j] > 0);
      stage.count++;
    }
  }
  for (const j of m.graph.output) outputDeltaSquared += (saved[m.steps][j] - m.h[m.steps][j]) ** 2;
  if (++pairs === 16) break;
}
const report = { timestamp: new Date().toISOString(), graphHash, config: m.config, pairs,
  scope: 'First 16 training pairs at scratch initialization; normalized RMS sensitivity, not reasoning evidence',
  inputDeltaRMS: Math.sqrt(inputDeltaSquared / (pairs * m.inputDim)),
  outputNeuronDeltaRMS: Math.sqrt(outputDeltaSquared / (pairs * m.graph.output.length)),
  predictionDeltaRMS: Math.sqrt(readoutDeltaSquared / (pairs * m.outputs)),
  stages: stages.map(s => ({ timestep: s.timestep, deltaRMS: Math.sqrt(s.deltaSquared / s.count),
    activityRMS: Math.sqrt(s.activitySquared / s.count), positiveFraction: s.active / (2 * s.count) })),
  peakResidentMiB: process.resourceUsage().maxRSS / 1024,
  limitation: 'RMS values use different feature populations; ratios alone do not identify a cause of poor learning' };
writeFileSync('research/reports/initial-position-sensitivity.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
