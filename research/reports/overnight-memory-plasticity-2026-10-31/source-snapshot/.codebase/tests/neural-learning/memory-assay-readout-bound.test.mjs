import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { constrainedBoxBound, reversalReadoutBound, aggregateReversalBounds } from '../../src/neural-learning/memory-assay-readout-bound.mjs';
import { buildFixture, gridCells, SEEDS, isGatedCell, mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { makeRule } from '../../src/neural-learning/memory-assay-rule-local-gated.mjs';

test('dual upper bound agrees with independently enumerated two-dimensional vertices', () => {
  const lo = [-0.8, -0.6], hi = [0.9, 0.7];
  for (const a of [[1, 1], [-1, 0.4], [0, 0], [0.5, -0.8]]) {
    for (const b of [[1, -1], [-0.5, 1], [0, 0], [0, 1]]) {
      const points = lo.flatMap(x => [lo[1], hi[1]].map(y => [x, y]));
      points.push(...hi.flatMap(x => [lo[1], hi[1]].map(y => [x, y])));
      if (b[1]) for (const x of [lo[0], hi[0]]) points.push([x, -b[0] * x / b[1]]);
      if (b[0]) for (const y of [lo[1], hi[1]]) points.push([-b[1] * y / b[0], y]);
      const valid = points.filter(p => p.every((v, i) => v >= lo[i] && v <= hi[i]) && b[0] * p[0] + b[1] * p[1] >= -1e-14);
      const optimum = Math.max(...valid.map(p => a[0] * p[0] + a[1] * p[1]));
      const r = constrainedBoxBound(a, b, lo, hi);
      assert.ok(r.upper >= optimum - 1e-12);
      assert.ok(Math.abs(r.upper - optimum) < 1e-9);
    }
  }
});

test('exactly opposing requirements cannot both have a positive margin', () => {
  const r = constrainedBoxBound([1, -1], [-1, 1], [-1, -1], [1, 1]);
  assert.ok(r.upper < 1e-9);
  assert.equal(r.lambda, 1);
  assert.equal(constrainedBoxBound([1], [1], [-2], [-1]).feasible, false);
  assert.throws(() => constrainedBoxBound([NaN], [1], [0], [1]));
});

test('fixture binding and generous Float32 range are deterministic', () => {
  const f = buildFixture({ seed: 1001, q: 0.5, relation: 'congruent', w: 0.5, bg: 0 });
  const r = reversalReadoutBound(f);
  assert.equal(r.fixtureId, f.id);
  assert.deepEqual(r, reversalReadoutBound(f));
  assert.ok(Number.isFinite(r.upperMNorm));
});

test('aggregate bound allows the full seed failure budget before declaring incompatibility', () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ feasible: true, upperMNorm: i / 20 }));
  const r = aggregateReversalBounds(rows);
  assert.equal(r.allowedFailures, 1);
  assert.ok(Math.abs(r.optimisticMedian - 0.325) < 1e-12);
  // Enumerate every possible abandoned seed independently of the implementation.
  const med = xs => { xs.sort((a, b) => a - b); return (xs[5] + xs[6]) / 2; };
  const exhaustive = Math.max(...rows.map((_, j) => med(rows.map((v, i) => i === j ? Infinity : v.upperMNorm))));
  assert.equal(r.optimisticMedian, exhaustive);
});

test('certificate bounds the actual adapter readout with Float32 magnitudes', () => {
  const f = buildFixture({ seed: 1001, q: 0.5, relation: 'congruent', w: 0.5, bg: 0.1 });
  const rule = makeRule('bound-adapter-check', f), bound = reversalReadoutBound(f), rng = mulberry32(12345);
  let feasibleSamples = 0;
  for (let j = 0; j < 256; j++) {
    rule.memory.gains.set(Array.from({ length: 2 * f.nKC }, () => 0.2 + 0.8 * rng()));
    rule.memory.apply();
    const v = id => rule.value(id, f.images[id].h);
    const A = v('A-') - v('A+'), B = v('B+') - v('B-');
    const mag = rule.memory.model.params.magnitude;
    let directA = 0;
    for (let i = 0; i < f.nKC; i++) directA += (f.images['A-'].h[i] - f.images['A+'].h[i])
      / (1.5 * f.s) * (mag[i] - mag[f.nKC + i]);
    assert.ok(Math.abs(A - directA) < 1e-12);
    if (B >= 0) { feasibleSamples++; assert.ok(A <= bound.upper + 1e-12); }
  }
  assert.ok(feasibleSamples > 0, 'comparison must include actual B-preserving states');
});

test('development grid capacity diagnostic preserves every original cell', async t => {
  const cells = [], cpuStart = process.cpuUsage(), started = performance.now();
  for (const cell of gridCells()) {
    const before = performance.now();
    const certificates = SEEDS.dev.map(seed => reversalReadoutBound(buildFixture({ seed, ...cell })));
    cells.push({ cell, gated: isGatedCell(cell), ...aggregateReversalBounds(certificates), certificates });
    assert.ok(process.memoryUsage().rss < 2048 * 2 ** 20, 'RSS guard');
    assert.ok(os.freemem() >= 256 * 2 ** 20, 'free-memory guard');
    await sleep(performance.now() - before); // equal compute/rest durations: declared duty 0.5
  }
  const cpu = process.cpuUsage(cpuStart);
  const result = { schema: 'memory-assay-readout-capacity-v1', seeds: SEEDS.dev, nKC: 200, s: 20,
    resources: { wallSeconds: (performance.now() - started) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6,
      processHighWaterRssMiB: process.resourceUsage().maxRSS / 1024, cpuDuty: 0.5 },
    cellsEvaluated: cells.length, gatedCells: cells.filter(c => c.gated).length,
    incompatibleGated: cells.filter(c => c.gated && c.incompatible).map(({ cell, optimisticMedian }) => ({ cell, optimisticMedian })), cells };
  assert.equal(result.cellsEvaluated, 108);
  assert.equal(result.gatedCells, 28);
  assert.ok(result.incompatibleGated.some(c => c.cell.q === 0.5 && c.cell.w === 0.5 && c.cell.relation === 'congruent'));
  // Raw certificates stay in the action stdout. Optional fresh artifact for this lead-owned math check.
  if (process.env.MEMORY_BOUND_ARTIFACT) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(process.env.MEMORY_BOUND_ARTIFACT, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
  }
  t.diagnostic(JSON.stringify({ cellsEvaluated: result.cellsEvaluated, incompatibleGated: result.incompatibleGated, resources: result.resources }));
});
