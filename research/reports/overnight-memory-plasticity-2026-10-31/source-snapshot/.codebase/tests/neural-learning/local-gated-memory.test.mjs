import test from 'node:test';
import assert from 'node:assert/strict';
import { stepLocalGated, LOCAL_GATED_DEFAULTS as C } from '../../src/neural-learning/local-gated-memory.mjs';

// Independent small-step integration of the same equations; no shared code with the closed form.
function integrate({ gain, trace, k, excess, deficit, dt }, steps = 2_000_000) {
  const E = Math.min(1, Math.max(0, (k - C.theta) / (1 - C.theta))), h = dt / steps;
  let e = trace;
  for (let i = 0; i < steps; i++) e += h * (E - e) / C.tauE;
  let g = gain;
  const a = C.eta * excess, b = C.eta * deficit;
  for (let i = 0; i < steps; i++) g += h * e * (b * (C.maxGain - g) - a * (g - C.minGain));
  return { gain: g, trace: e };
}
const step = (o, c = C) => stepLocalGated(o, c);

test('S1 closed form matches independent small-step integration', () => {
  for (const o of [{ gain: 1, trace: 0, k: 1, excess: 0.5, deficit: 0, dt: 1 }, { gain: 0.3, trace: 0.2, k: 0.7, excess: 0, deficit: 0.5, dt: 1 },
    { gain: 0.6, trace: 1, k: 0, excess: 0.25, deficit: 0.25, dt: 4 }, { gain: 0.2, trace: 0, k: 0.9, excess: 0, deficit: 0.5, dt: 0.5 }]) {
    const exact = step(o), small = integrate(o);
    assert.ok(Math.abs(exact.gain - small.gain) < 1e-6, `gain ${exact.gain} vs ${small.gain}`);
    assert.ok(Math.abs(exact.trace - small.trace) < 1e-6, `trace ${exact.trace} vs ${small.trace}`);
  }
});

test('S1 hand-derived values', () => {
  // k=1, trace settled at 1: rate = 0.5*0.5 = 0.25, target 0.2.
  const down = step({ gain: 1, trace: 1, k: 1, excess: 0.5, deficit: 0, dt: 1 });
  assert.ok(Math.abs(down.gain - (0.2 + 0.8 * Math.exp(-0.25))) < 1e-15);
  assert.equal(down.target, 0.2);
  const up = step({ gain: 0.2, trace: 1, k: 1, excess: 0, deficit: 0.5, dt: 1 });
  assert.ok(Math.abs(up.gain - (1 - 0.8 * Math.exp(-0.25))) < 1e-15);
  assert.equal(up.target, 1);
  // k=theta gives zero target eligibility; k=0.6 gives 0.5.
  assert.equal(step({ gain: 0.5, trace: 0, k: C.theta, excess: 0.5, deficit: 0, dt: 1 }).gain, 0.5);
  assert.ok(Math.abs(step({ gain: 0.5, trace: 0.5, k: 0.6, excess: 0, deficit: 0, dt: 1 }).trace - 0.5) < 1e-15);
});

test('S1 stays finite and in bounds on adversarial input', () => {
  for (const gain of [0.2, 0.2000001, 0.5, 0.9999999, 1]) for (const trace of [0, 1e-300, 0.5, 1]) for (const k of [0, 0.2, 0.2000001, 1])
    for (const [excess, deficit] of [[0, 0], [1e-300, 0], [0, 1e-300], [1e6, 0], [0, 1e6], [1e6, 1e6], [1e-300, 1e6]]) for (const dt of [1e-9, 1, 1e6]) {
      const r = step({ gain, trace, k, excess, deficit, dt });
      assert.ok(Number.isFinite(r.gain) && r.gain >= C.minGain - 1e-15 && r.gain <= C.maxGain + 1e-15, JSON.stringify({ gain, trace, k, excess, deficit, dt, r }));
      assert.ok(r.trace >= 0 && r.trace <= 1);
    }
});

test('S2 a settled inactive KC does not move under any pulse', () => {
  let trace = 1;
  for (let i = 0; i < 40; i++) trace = step({ gain: 0.5, trace, k: 0, excess: 0, deficit: 0, dt: 1 }).trace;
  assert.ok(trace < 1e-30);
  for (const [excess, deficit] of [[0.5, 0], [0, 0.5]]) {
    const r = step({ gain: 0.5, trace, k: 0, excess, deficit, dt: 1 });
    assert.ok(Math.abs(r.gain - 0.5) < 1e-9);
  }
  // Exactly zero trace and activity: exact no-op.
  assert.equal(step({ gain: 0.5, trace: 0, k: 0, excess: 0.5, deficit: 0, dt: 1 }).gain, 0.5);
});

test('S3 delay lowers update size; target and direction never change', () => {
  for (const [gain, excess, deficit, dir] of [[0.7, 0.5, 0, -1], [0.7, 0, 0.5, 1]]) {
    let last = Infinity, target = null;
    for (const delay of [0, 0.25, 0.5, 1, 2, 4]) {
      const decayed = Math.exp(-delay / C.tauE);
      const r = step({ gain, trace: decayed, k: 0, excess, deficit, dt: 0.5 });
      const move = r.gain - gain;
      assert.equal(Math.sign(move), dir);
      assert.ok(Math.abs(move) < last);
      last = Math.abs(move);
      target ??= r.target;
      assert.equal(r.target, target);
    }
  }
});

test('S4 a stale trace after the declared gap moves a gain by under 1e-3 per pulse', () => {
  // Image frame then gap (dt 4, tauE 0.5): e^-8 of a full trace remains, then one pulse frame at k=0.
  const afterImage = step({ gain: 1, trace: 0, k: 1, excess: 0, deficit: 0, dt: 1 }).trace;
  const afterGap = step({ gain: 1, trace: afterImage, k: 0, excess: 0, deficit: 0, dt: 4 }).trace;
  assert.ok(afterGap < 4e-4);
  const r = step({ gain: 1, trace: afterGap, k: 0, excess: 0.5, deficit: 0, dt: 1 });
  assert.ok(Math.abs(r.gain - 1) < 1e-3, `moved ${Math.abs(r.gain - 1)}`);
});

test('gain stays inside bounds and can travel the full range both ways', () => {
  let g = 1;
  for (let i = 0; i < 200; i++) g = step({ gain: g, trace: 1, k: 1, excess: 0.5, deficit: 0, dt: 1 }).gain;
  assert.ok(g >= C.minGain && g < C.minGain + 1e-6);
  for (let i = 0; i < 200; i++) g = step({ gain: g, trace: 1, k: 1, excess: 0, deficit: 0.5, dt: 1 }).gain;
  assert.ok(g <= C.maxGain && g > C.maxGain - 1e-6);
});
