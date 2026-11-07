import test from 'node:test';
import assert from 'node:assert/strict';
import {
  median,
  scaleVectors,
  sparsifyTop,
  activeFraction,
  twinSeparation,
  oracleKnn,
  leaveOneOut,
  inkRule,
} from '../../src/neural-learning/pathway-trace-analysis-v1.mjs';

// Small deterministic PRNG so the synthetic pairs are the same on every run.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Twin pairs: good = base + e0, bad = base - e0. Labels are fixed by construction.
function twinPairs(count, dim, seed) {
  const r = rng(seed);
  const pairs = [];
  for (let i = 0; i < count; i++) {
    const base = Float64Array.from({ length: dim }, () => (r() - 0.5) * 0.2);
    const good = Float64Array.from(base);
    const bad = Float64Array.from(base);
    good[0] += 1;
    bad[0] -= 1;
    pairs.push({ good, bad });
  }
  return pairs;
}

// Same boards, but good/bad swapped for a random half of the practice pairs.
function shuffledLabelPairs(count, dim, seed) {
  const r = rng(seed + 1);
  return twinPairs(count, dim, seed).map((p) => (r() < 0.5 ? { good: p.bad, bad: p.good } : p));
}

test('median handles odd and even counts and rejects empty input', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.throws(() => median([]));
});

test('scaleVectors none returns equal copies, not the same objects', () => {
  const a = [Float64Array.from([1, 2]), Float64Array.from([3, 4])];
  const out = scaleVectors(a, a, 'none');
  assert.deepEqual(out.map((v) => Array.from(v)), [[1, 2], [3, 4]]);
  assert.notEqual(out[0], a[0]);
});

test('scaleVectors rms matches hand values', () => {
  const data = [Float64Array.from([1, 2]), Float64Array.from([3, 2])];
  const out = scaleVectors(data, data, 'rms');
  // rms over train: [sqrt(5), 2]. Each value is divided by rms + 1e-6.
  assert.ok(Math.abs(out[0][0] - 1 / (Math.sqrt(5) + 1e-6)) < 1e-12);
  assert.ok(Math.abs(out[0][1] - 2 / (2 + 1e-6)) < 1e-12);
  assert.ok(Math.abs(out[1][0] - 3 / (Math.sqrt(5) + 1e-6)) < 1e-12);
});

test('scaleVectors zscore gives train feature means of about zero', () => {
  const r = rng(7);
  const train = Array.from({ length: 50 }, () => Float64Array.from({ length: 4 }, () => r() * 10 + 3));
  const out = scaleVectors(train, train, 'zscore');
  for (let j = 0; j < 4; j++) {
    const mean = out.reduce((s, v) => s + v[j], 0) / out.length;
    assert.ok(Math.abs(mean) < 1e-9, `feature ${j} mean ${mean}`);
  }
});

test('scaleVectors fits statistics on train only', () => {
  const train = [Float64Array.from([0]), Float64Array.from([2])];
  const all = [Float64Array.from([1]), Float64Array.from([100])];
  const out = scaleVectors(train, all, 'zscore');
  // Train mean 1, train std 1: the value 1 maps to about 0 and 100 maps to about 99.
  assert.ok(Math.abs(out[0][0]) < 1e-5);
  assert.ok(Math.abs(out[1][0] - 99) < 1e-4);
});

test('sparsifyTop keeps the largest values and zeros the rest', () => {
  const v = Float64Array.from([0.5, 3, 1, 2, 0]);
  // fraction 0.4 of 5 entries = 2 kept: values 3 and 2.
  assert.deepEqual(Array.from(sparsifyTop(v, 0.4)), [0, 3, 0, 2, 0]);
});

test('sparsifyTop keeps at least one value and breaks ties by lower index', () => {
  const v = Float64Array.from([1, 1, 1, 1]);
  assert.deepEqual(Array.from(sparsifyTop(v, 0.01)), [1, 0, 0, 0]);
  assert.deepEqual(Array.from(sparsifyTop(v, 0.5)), [1, 1, 0, 0]);
});

test('activeFraction averages the non-zero share per vector', () => {
  assert.equal(activeFraction([Float64Array.from([0, 1]), Float64Array.from([1, 1])]), 0.75);
  assert.equal(activeFraction([]), 0);
});

test('twinSeparation is small when twins are close and pairs are far apart', () => {
  const pairs = [0, 100, 200, 300].map((x) => ({
    good: Float64Array.from([x, 0]),
    bad: Float64Array.from([x + 0.1, 0]),
  }));
  const r = twinSeparation(pairs);
  assert.ok(Math.abs(r.within - 0.1) < 1e-12);
  assert.ok(r.across > 100);
  assert.ok(r.ratio < 0.01);
});

test('twinSeparation returns ratio 0 when across distance is 0', () => {
  const same = () => ({ good: Float64Array.from([1, 1]), bad: Float64Array.from([2, 2]) });
  const r = twinSeparation([same(), same()]);
  assert.equal(r.across, 0);
  assert.equal(r.ratio, 0);
});

test('oracleKnn and leaveOneOut are perfect when the label is the sign of e0', () => {
  for (const k of [1, 3]) {
    const practice = twinPairs(20, 12, 11);
    const test = twinPairs(10, 12, 99);
    assert.deepEqual(oracleKnn(practice, test, k), { correct: 10, total: 10 });
    assert.deepEqual(leaveOneOut(practice, k), { correct: 20, total: 20 });
  }
});

test('oracleKnn and leaveOneOut fall below perfect when practice labels are shuffled', () => {
  for (const k of [1, 3]) {
    const practice = shuffledLabelPairs(40, 12, 5);
    const test = twinPairs(40, 12, 77);
    const oracle = oracleKnn(practice, test, k);
    const loo = leaveOneOut(practice, k);
    assert.equal(oracle.total, 40);
    assert.equal(loo.total, 40);
    assert.ok(oracle.correct < oracle.total, `oracle ${oracle.correct}/40 should be below perfect`);
    assert.ok(loo.correct < loo.total, `loo ${loo.correct}/40 should be below perfect`);
  }
});

test('inkRule counts sums of entries', () => {
  const pairs = [
    { good: Float64Array.from([2, 2]), bad: Float64Array.from([1, 1]) }, // correct
    { good: Float64Array.from([0, 1]), bad: Float64Array.from([3, 0]) }, // wrong
    { good: Float64Array.from([1, 1]), bad: Float64Array.from([1, 1]) }, // tie: wrong
  ];
  assert.deepEqual(inkRule(pairs), { correct: 1, total: 3 });
});
