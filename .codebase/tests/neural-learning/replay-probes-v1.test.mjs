// Checks for the stage 1 case-recall and simple-learner probes (design section 7.2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { dense, unit, projection, randomKey, keepCount, caseScore, SimpleLearner } from '../../src/neural-learning/replay-probes-v1.mjs';

test('dense vectors follow the column order and unit length is exact', () => {
  const cols = new Map([[10, 0], [20, 1], [30, 2]]);
  assert.deepEqual([...dense([{ index: 30, current: 2 }, { index: 10, current: 1 }], cols)], [1, 0, 2]);
  const u = unit(Float64Array.from([3, 4]));
  assert.ok(Math.abs(u[0] - 0.6) < 1e-12 && Math.abs(u[1] - 0.8) < 1e-12);
});

test('keep count rounds half up', () => {
  assert.equal(keepCount(19.5), 20);
  assert.equal(keepCount(19.4), 19);
});

test('random projection is deterministic for a seed and has the requested shape', () => {
  const a = projection(4101, 5, 3), b = projection(4101, 5, 3), c = projection(4102, 5, 3);
  assert.equal(a.length, 5);
  assert.ok(a.every(row => row.length === 3));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('random key keeps at most k units, rectified, and has unit length', () => {
  const W = projection(7, 40, 6);
  const key = randomKey(Float64Array.from([1, 0, 2, 0, 0, 1]), W, 5);
  const kept = [...key].filter(x => x !== 0);
  assert.ok(kept.length <= 5);
  assert.ok(key.every(x => x >= 0));
  const norm = Math.sqrt(key.reduce((s, x) => s + x * x, 0));
  assert.ok(Math.abs(norm - 1) < 1e-12 || norm === 0);
});

test('case recall: an exact match decides alone by its mean sign', () => {
  const K = Float64Array.from([1, 0]);
  const store = [{ key: K, sign: 1 }, { key: K, sign: -1 }, { key: Float64Array.from([0, 1]), sign: 1 }];
  assert.equal(caseScore(store, K), 0);
});

test('case recall: otherwise the inverse-distance-weighted mean sign of the 3 nearest lessons', () => {
  const store = [
    { key: Float64Array.from([1, 0]), sign: 1 },
    { key: Float64Array.from([0.9, 0.1]), sign: 1 },
    { key: Float64Array.from([0, 1]), sign: -1 },
    { key: Float64Array.from([-1, 0]), sign: -1 },
  ];
  const s = caseScore(store, Float64Array.from([1, 0.05]));
  assert.ok(s > 0.9, `score ${s}`); // the two near lessons are reward; the far ones are farther than the top three
});

test('simple learner: starts at zero, then moves toward the sign it was taught', () => {
  const L = new SimpleLearner(3);
  const phi = Float64Array.from([1, 2, 0]);
  assert.equal(L.score(phi), 0);
  L.update(phi, 1);
  assert.ok(Math.abs(L.score(phi) - 1) < 1e-6);
  L.update(phi, -1);
  assert.ok(Math.abs(L.score(phi)) < 1e-6);
});

test('simple learner refuses a sign that is not +1 or -1', () => {
  assert.throws(() => new SimpleLearner(2).update(Float64Array.from([1, 0]), 0), /sign/);
});
