import test from 'node:test';
import assert from 'node:assert/strict';
import { stepSlow } from '../../src/neural-learning/local-slow-memory.mjs';

test('slow step matches independent small-step integration with fast held', () => {
  const steps = 1_000_000, h = 1 / steps;
  for (const [slow, fast, rate, rho] of [[1, 0.5, 0.25, 0.25], [0.2, 1, 0.18, 0.5], [0.7, 0.7, 0.3, 0.25]]) {
    let s = slow;
    for (let i = 0; i < steps; i++) s += h * rho * rate * (fast - s);
    assert.ok(Math.abs(stepSlow({ slow, fast, rate, dt: 1 }, rho) - s) < 1e-6);
  }
});

test('zero rate leaves slow state exactly unchanged', () => {
  assert.equal(stepSlow({ slow: 0.37, fast: 0.9, rate: 0, dt: 1 }, 0.25), 0.37);
});

test('slow state stays between its old value and fast, and can travel back', () => {
  let s = 1;
  for (let i = 0; i < 500; i++) { const next = stepSlow({ slow: s, fast: 0.2, rate: 0.25, dt: 1 }, 0.25); assert.ok(next <= s && next >= 0.2); s = next; }
  assert.ok(s < 0.2 + 1e-6);
  for (let i = 0; i < 500; i++) { const next = stepSlow({ slow: s, fast: 1, rate: 0.25, dt: 1 }, 0.25); assert.ok(next >= s && next <= 1); s = next; }
  assert.ok(s > 1 - 1e-6);
});

test('slower rho lags more after the same pulses', () => {
  const after = rho => { let s = 1; for (let i = 0; i < 20; i++) s = stepSlow({ slow: s, fast: 0.2, rate: 0.18, dt: 1 }, rho); return s; };
  assert.ok(after(0.25) > after(0.5));
  // Hand check used in addendum v1.4: 20 pulses at rate 0.18, rho 0.25 moves 1-exp(-0.9) = 59% of the way.
  assert.ok(Math.abs((1 - after(0.25)) / 0.8 - (1 - Math.exp(-0.9))) < 1e-12);
});
