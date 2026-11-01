import test from 'node:test';
import assert from 'node:assert/strict';
import { stepReservoir } from '../../src/neural-learning/local-reservoir-memory.mjs';
import { stepSupralinearReservoir as step, EXIT_D0 } from '../../src/neural-learning/local-supralinear-reservoir-memory.mjs';
import { LOCAL_GATED_DEFAULTS as C } from '../../src/neural-learning/local-gated-memory.mjs';
import { buildFixture, mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { register } from '../../src/neural-learning/memory-assay-rule-prediction-supralinear.mjs';
import { register as registerV11 } from '../../src/neural-learning/memory-assay-rule-prediction-reservoir-v1-1.mjs';
import { createRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { runCellSeed } from '../../src/neural-learning/memory-assay-phase-recorded.mjs';
import { auditRecordedEvents } from '../../src/neural-learning/memory-assay-phase-audit.mjs';
register(registerRule); registerV11(registerRule);
const base = { gain: .6, trace: 1, k: 1, excess: 0, deficit: 0, dt: 1 };

test('at drive d0 the step equals the linear reservoir', () => {
  for (const o of [{ excess: EXIT_D0 }, { deficit: EXIT_D0 }]) {
    const p = [.1, .2, .3, .4], a = step({ ...base, ...o }, p, C), b = stepReservoir({ ...base, ...o }, p, C);
    a.states.forEach((x, i) => assert.ok(Math.abs(x - b.states[i]) < 1e-12));
  }
});

test('reservoir exit is smaller below d0 and larger above; buffer entry is unchanged', () => {
  const exit = excess => [step({ ...base, excess }, [0, 1, 0, 0], C).states[0], stepReservoir({ ...base, excess }, [0, 1, 0, 0], C).states[0]];
  const [lowQ, lowL] = exit(.025), [highQ, highL] = exit(.5);
  assert.ok(lowQ < lowL / 5); assert.ok(highQ > highL);
  const q = step({ ...base, deficit: .025 }, [1, 0, 0, 0], C).states, l = stepReservoir({ ...base, deficit: .025 }, [1, 0, 0, 0], C).states;
  q.forEach((x, i) => assert.ok(Math.abs(x - l[i]) < 1e-14));
});

test('mean-field transition agrees with independently simulated particles', () => {
  const p = [.1, .2, .3, .4], excess = .3, deficit = .2, drive = excess + deficit, rng = mulberry32(811), N = 300000, count = [0, 0, 0, 0];
  const buffer = 1 - Math.exp(-C.eta * drive), reservoir = 1 - Math.exp(-C.eta * drive * (drive / EXIT_D0)), down = excess / drive;
  for (let n = 0; n < N; n++) {
    let state = 0, x = rng();
    while (x > p[state] && state < 3) x -= p[state++];
    const isReservoir = state === 1 || state === 3;
    if (rng() < (isReservoir ? reservoir : buffer)) {
      const wantWeak = rng() < down;
      if (state === 1) { if (wantWeak) state = 0; } // opposite evidence opens the strong reservoir; consistent evidence stays
      else if (state === 3) { if (!wantWeak) state = 2; }
      else state = wantWeak ? 3 : 1;
    }
    count[state]++;
  }
  const r = step({ ...base, excess, deficit }, p, C);
  r.states.forEach((x, i) => assert.ok(Math.abs(x - count[i] / N) < .003, `${i}: ${x} ${count[i] / N}`));
});

test('mass and gain stay valid across random inputs', () => {
  const rng = mulberry32(99);
  let p = [1, 0, 0, 0], gain = 1, trace = 0;
  for (let i = 0; i < 20000; i++) {
    const big = rng() < .5, drive = rng() * (big ? 1 : .05), r = step({ gain, trace, k: rng(), excess: rng() < .5 ? drive : 0, deficit: rng() < .5 ? drive : 0, dt: rng() < .5 ? 1 : 4 }, p, C);
    p = r.states; gain = r.gain; trace = r.trace;
    assert.ok(p.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
    assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12);
    assert.ok(gain >= .2 && gain <= 1);
  }
});

test('no signal or settled inactive cell leaves masses and gain unchanged', () => {
  for (const o of [{ ...base }, { ...base, k: 0, trace: 0, excess: .5 }]) {
    const p = [.1, .2, .3, .4], r = step(o, p, C);
    assert.deepEqual(r.states, p); assert.equal(r.gain, o.gain);
  }
});

test('weak repeated signals release at least five times less from a reservoir than the linear rule', () => {
  let q = [0, 1, 0, 0], l = [0, 1, 0, 0];
  for (let i = 0; i < 100; i++) { q = step({ ...base, excess: .025 }, q, C).states; l = stepReservoir({ ...base, excess: .025 }, l, C).states; }
  assert.ok(1 - l[1] > 5 * (1 - q[1]), `linear ${1 - l[1]} quadratic ${1 - q[1]}`);
});

test('strong pulses still cross efficacy in both directions', () => {
  let p = [0, 1, 0, 0], gain = 1;
  for (const [excess, deficit, want, g] of [[1000, 0, [1, 0, 0, 0], 1], [1000, 0, [0, 0, 0, 1], .2], [0, 1000, [0, 0, 1, 0], .2], [0, 1000, [0, 1, 0, 0], 1]]) {
    const r = step({ ...base, gain, excess, deficit }, p, C);
    assert.deepEqual(r.states, want); assert.equal(r.gain, g); p = r.states; gain = r.gain;
  }
});

test('a snapshot from the linear rule is refused, in both directions', () => {
  const f = buildFixture({ seed: 1001, nKC: 200, s: 20, q: .25, relation: 'conflicting', w: 0, bg: 0 });
  const a = createRule('prediction-supralinear-v1', f), b = createRule('prediction-reservoir-v1.1', f);
  assert.throws(() => a.restore(JSON.parse(JSON.stringify(b.snapshot()))));
  assert.throws(() => b.restore(JSON.parse(JSON.stringify(a.snapshot()))));
});

test('all four arms replay through the recorded audit; no-event controls leave gains unchanged', () => {
  const profile = { ruleName: 'prediction-supralinear-v1', seeds: [1001], nKC: 200, s: 20, cell: { q: .25, relation: 'conflicting', w: 0, bg: 0 }, temperature: .1, danDip: 0 };
  const rows = [], records = runCellSeed({ ...profile, seed: 1001, writeRecord: r => rows.push(r) });
  let i = 0;
  const replay = auditRecordedEvents(() => rows[i++] ?? null, profile);
  assert.deepEqual(replay.summaries, records);
  assert.notEqual(records[0].finalGainsHash, records[0].initialGainsHash);
  assert.ok(records.filter(r => ['absent', 'disabled'].includes(r.arm)).every(r => r.initialGainsHash === r.finalGainsHash));
});
