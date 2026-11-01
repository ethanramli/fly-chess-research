// Declared development grid (prediction-reservoir-proposal.md). Unrecorded screen; a selected setting still needs the recorded run and audit.
import { existsSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { SEEDS } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { runCellSeed } from '../../src/neural-learning/memory-assay-run.mjs';
import { evaluateCell } from '../../src/neural-learning/memory-assay-gates.mjs';
import { makePredictionRule } from '../../src/neural-learning/memory-assay-rule-prediction-scaled.mjs';

const { values: { out } } = parseArgs({ options: { out: { type: 'string' } } });
if (!out || existsSync(out)) throw Error('Require fresh --out FILE');
const cell = { q: 0.25, relation: 'conflicting', w: 0, bg: 0 };
const rows = [];
for (const store of ['reservoir', 'gated']) for (const eta of [1, 1.5, 2, 3]) for (const V0 of [0.8, 1.2, 1.6]) {
  const name = `prediction-${store}-eta${eta}-V${V0}`;
  registerRule(name, fixture => makePredictionRule(name, fixture, { store, eta, V0 }));
  const t0 = performance.now();
  const records = SEEDS.dev.flatMap(seed => runCellSeed({ ruleName: name, cell, seed }));
  if (process.memoryUsage().rss > 2048 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Resource guard: RSS/free memory');
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, performance.now() - t0); // duty 0.5
  const e = evaluateCell(records), pool = arm => records.filter(r => r.arm === arm).flatMap(r => [r.tests.T1.A.greedy, r.tests.T2.B.greedy]);
  const frac = xs => xs.filter(Boolean).length / xs.length, inf = frac(pool('informative')), shuf = frac(pool('shuffled'));
  const shuffledPass = shuf >= 0.35 && shuf <= 0.65 && inf - shuf >= 0.25;
  const A = e.mNormMedian.A, slack = Math.min(A.T1 - 0.4, e.mNormMedian.B.T2 - 0.4, e.mNormMedian.C.T2 - 0.4, A.T3 - 0.4, A.T4 - 0.4, A.T5 - 0.4, e.RMedian - 0.7);
  const punishRev1 = records.filter(r => r.arm === 'informative').map(r => r.pulses.REV1.punish).reduce((a, b) => a + b, 0) / SEEDS.dev.length;
  const row = { store, eta, V0, R: e.RMedian, A, B: e.mNormMedian.B, C: e.mNormMedian.C.T2, gates: Object.fromEntries(Object.entries(e.gates).map(([g, v]) => [g, v.pass])), shuffled: { inf, shuf, pass: shuffledPass }, slack, punishRev1, allPass: e.allPass && shuffledPass };
  rows.push(row);
  console.log(store, eta, V0, 'R', e.RMedian.toFixed(3), 'A', Object.values(A).map(x => x.toFixed(3)).join(' '), 'B', e.mNormMedian.B.T2.toFixed(3), 'C', row.C.toFixed(3), 'slack', slack.toFixed(3), 'pun', punishRev1.toFixed(1), row.allPass ? 'PASS' : Object.entries(row.gates).filter(([, p]) => !p).map(([g]) => g).join(','), shuffledPass ? '' : 'shuf-fail');
}
writeFileSync(out, JSON.stringify({ schema: 'memory-prediction-grid-v1', cell, seeds: SEEDS.dev, node: process.version, rows }, null, 1) + '\n', { flag: 'wx' });
