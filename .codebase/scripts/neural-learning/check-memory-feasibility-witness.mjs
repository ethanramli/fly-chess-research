// Oracle mathematical instrument only. No candidate/model/teacher imported; no weight state is exported.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import os from 'node:os';
import { buildFixture, SEEDS } from '../../src/neural-learning/memory-assay-fixture.mjs';

const { values: { out } } = parseArgs({ options: { out: { type: 'string' } } });
if (!out || existsSync(out)) throw Error('Require fresh --out FILE');
const started = performance.now(), cpuStart = process.cpuUsage(), rows = [];
const median = xs => { const a = [...xs].sort((x, y) => x - y); return (a[5] + a[6]) / 2; };
for (const seed of SEEDS.dev) {
  const t0 = performance.now();
  const f = buildFixture({ seed, q: 0.25, relation: 'conflicting', w: 0, bg: 0 });
  const P = Float32Array.from(f.baseP), R = Float32Array.from(f.baseR);
  const union = item => new Set([...f.images[`${item}+`].focal, ...f.images[`${item}-`].focal]);
  const A = union('A'), B = union('B'), shared = new Set([...A].filter(i => B.has(i)));
  const gp = new Float64Array(f.nKC), gr = new Float64Array(f.nKC);
  for (let i = 0; i < f.nKC; i++) { gp[i] = 1.2 * R[i] / (P[i] + R[i]); gr[i] = 1.2 * P[i] / (P[i] + R[i]); }
  const assign = (item, reversed = false) => {
    for (const [image, sign] of [[`${item}+`, 1], [`${item}-`, -1]]) for (const i of f.images[image].focal) {
      if (shared.has(i)) continue;
      const positive = reversed ? sign < 0 : sign > 0;
      gp[i] = positive ? 1 : 0.2; gr[i] = positive ? 0.2 : 1;
    }
  };
  const score = image => {
    let v = 0;
    for (let i = 0; i < f.nKC; i++) v += f.images[image].h[i] / 1.5 * (Math.fround(P[i] * gp[i]) - Math.fround(R[i] * gr[i]));
    return v / f.s;
  };
  const tests = {};
  let minGain = 1, maxGain = 0, pairedError = 0;
  for (const [test, reversed] of [['T1', false], ['T2', false], ['T3', true], ['T4', false], ['T5', true]]) {
    assign('A', reversed);
    if (test !== 'T1') { assign('B'); assign('C'); }
    for (let i = 0; i < f.nKC; i++) {
      minGain = Math.min(minGain, gp[i], gr[i]); maxGain = Math.max(maxGain, gp[i], gr[i]);
      pairedError = Math.max(pairedError, Math.abs(gp[i] + gr[i] - 1.2));
      assert.ok(gp[i] >= 0.2 && gp[i] <= 1 && gr[i] >= 0.2 && gr[i] <= 1);
    }
    tests[test] = Object.fromEntries(['A', 'B', 'C'].map(item => {
      const positive = item === 'A' && reversed ? `${item}-` : `${item}+`, negative = positive.endsWith('+') ? `${item}-` : `${item}+`;
      const m = score(positive) - score(negative);
      return [item, { m, mNorm: m / 1.6, greedy: m > 0 }];
    }));
  }
  assert.ok(pairedError < 1e-12);
  for (const item of ['B', 'C']) for (const t of ['T3', 'T4', 'T5']) assert.equal(tests[t][item].m, tests.T2[item].m);
  rows.push({ seed, fixtureId: f.id, sharedCells: shared.size, minGain, maxGain, pairedError, tests, R: tests.T2.A.m / tests.T1.A.m });
  assert.ok(process.memoryUsage().rss < 2048 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20);
  await sleep(performance.now() - t0);
}
const acq = (t, item) => median(rows.map(r => r.tests[t][item].mNorm)) >= 0.4 && rows.filter(r => r.tests[t][item].greedy).length / rows.length >= 0.9;
const compatible = { G1: acq('T1', 'A'), G2: acq('T2', 'B') && acq('T2', 'C'),
  G3: median(rows.map(r => r.R)) >= 0.7 && rows.filter(r => r.tests.T2.A.greedy).length / rows.length >= 0.9,
  G4: ['T3', 'T4', 'T5'].every(t => acq(t, 'A')), G6: rows.filter(r => r.tests.T3.B.greedy).length / rows.length >= 0.9 };
const cpu = process.cpuUsage(cpuStart), sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const result = { schema: 'memory-readout-oracle-feasibility-v1', instrumentOnly: true, compatible,
  sources: { self: sha(new URL(import.meta.url)), fixture: sha(new URL('../../src/neural-learning/memory-assay-fixture.mjs', import.meta.url)) },
  medianA_T1: median(rows.map(r => r.tests.T1.A.mNorm)), medianB_T2: median(rows.map(r => r.tests.T2.B.mNorm)),
  medianA_T3: median(rows.map(r => r.tests.T3.A.mNorm)), medianRetention: median(rows.map(r => r.R)), rows,
  resources: { wallSeconds: (performance.now() - started) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6,
    processHighWaterRssMiB: process.resourceUsage().maxRSS / 1024, cpuDuty: 0.5 },
  scope: 'Compatible bounded readout states with paired gain sum1.2, using oracle knowledge. Not learning, finite-exposure reachability, retention through time or an importable weight bank.' };
writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ compatible, scope: result.scope, out }));
if (!Object.values(compatible).every(Boolean)) process.exitCode = 1;
