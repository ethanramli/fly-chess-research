import assert from 'node:assert/strict';
import test from 'node:test';
import { pairGate } from '../../src/neural-learning/transfer-evaluation-v1.mjs';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';

const games = ['g1', 'g1', 'g1', 'g2', 'g2', 'g3', 'g3', 'g4', 'g4', 'g4', 'g5', 'g5', 'g6', 'g6', 'g6', 'g7', 'g7', 'g8', 'g8', 'g8'];
const P = [true, true, false, true, false, true, true, false, true, true, true, false, true, true, true, false, true, true, false, true];
const C = [false, true, false, true, false, false, true, true, false, false, false, false, true, false, false, true, false, false, true, false];
const D = [true, false, true, false, false, true, false, false, true, false, true, true, false, true, false, false, true, true, false, true];
const run = (P, C, extra = {}) => numericPairGate({ arms: { P, C }, games: ['a', 'b', 'c'], primary: 'P', comparators: ['C'], minCorrect: 0, minMargin: 0, resamples: 2000, ...extra });

test('numericPairGate matches v1 pairGate on 0/1 scores', () => {
  const arms = { P, C, D };
  const numeric = Object.fromEntries(Object.entries(arms).map(([name, xs]) => [name, xs.map(Number)]));
  const options = { games, primary: 'P', comparators: ['C', 'D'], minCorrect: 10, minMargin: 1, resamples: 2000 };
  assert.deepEqual(numericPairGate({ arms: numeric, ...options }), pairGate({ arms, ...options }));
});

test('numericPairGate sums fractional scores into a fractional margin', () => {
  const r = run([1, 1 / 3, 0.5], [0.5, 0.25, 0.5]);
  assert.ok(Math.abs(r.correct - 11 / 6) < 1e-12);
  assert.ok(Math.abs(r.comparators.C.margin - 7 / 12) < 1e-12);
});

test('numericPairGate rejects scores outside [0, 1], non-numbers, length mismatch and bad bounds', () => {
  for (const bad of [1.5, -0.1, NaN, '0.5']) {
    assert.throws(() => run([bad, 0.5, 0.5], [0.5, 0.5, 0.5]), { message: 'Score must be a finite number in [0, 1]' });
    assert.throws(() => run([0.5, 0.5, 0.5], [0.5, bad, 0.5]), { message: 'Score must be a finite number in [0, 1]' });
  }
  assert.throws(() => run([0.5, 0.5, 0.5], [0.5, 0.5]), /length differs/);
  assert.throws(() => run([0.5, 0.5, 0.5], [0.5, 0.5, 0.5], { lowerQuantile: 0.5 }), /lowerQuantile/);
});

test('numericPairGate passes a clear positive difference and fails equal arms on lower', () => {
  const positions = Array.from({ length: 60 }, (_, i) => `game-${i}`);
  const arms = (p, c) => ({ P: Array(60).fill(p), C: Array(60).fill(c) });
  const options = { games: positions, primary: 'P', comparators: ['C'], minCorrect: 44, minMargin: 6, resamples: 2000 };
  const win = numericPairGate({ arms: arms(0.9, 0.3), ...options });
  assert.equal(win.pass, true);
  assert.ok(win.comparators.C.lower > 0);
  const tie = numericPairGate({ arms: arms(0.5, 0.5), ...options, minCorrect: 0, minMargin: 0 });
  assert.equal(tie.pass, false);
  assert.equal(tie.comparators.C.lower, 0);
});
