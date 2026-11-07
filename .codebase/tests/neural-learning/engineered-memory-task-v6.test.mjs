import test from 'node:test';
import assert from 'node:assert/strict';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';
import { judgeV5 } from '../../src/neural-learning/engineered-memory-task-v5.mjs';
import { judgeV6, marginFor } from '../../src/neural-learning/engineered-memory-task-v6.mjs';

test('marginFor rescales the v5 margin of 7 per 150 positions and rounds up', () => {
  assert.equal(marginFor(150), 7);
  assert.equal(marginFor(574), 27);
  assert.equal(marginFor(32), 2);
});

// 32 positions in two games of 16. Dyadic scores keep every margin exact. Every per-position difference is positive for none, shuffled and quarter, so their bootstrap lower bounds are positive.
const GAMES = [...Array(16).fill('gA'), ...Array(16).fill('gB')];
const N = GAMES.length;
const fill = x => Array(N).fill(x);
const BASE = { full: fill(0.75), none: fill(0.6875), shuffled: fill(0.6875), quarter: fill(0.71875) }; // margins 2, 2, 1; M = 2
const seedRow = (seed, over = {}) => ({
  seed,
  scores: BASE,
  retention: { lost: 2, previouslyRecalled: 100 },
  ...over,
});
const judge = rows => judgeV6(rows, { games: GAMES, n: N, resamples: 500 });

test('judgeV6 passes when every margin meets M, quarter margin is above 0, bounds are positive and loss is 2%', () => {
  const res = judge([seedRow(6101), seedRow(6102)]);
  assert.equal(res.pass, true);
  assert.equal(res.outcome, 'passes');
  const { none, shuffled, quarter } = res.perSeed[0].gate.comparators;
  assert.deepEqual([none.margin, shuffled.margin, quarter.margin], [2, 2, 1]);
  assert.equal(res.rule.margin, 2);
  assert.equal(res.rule.gateSeed, 20261106);
});

test('judgeV6 fails a seed whose none or shuffled margin is M-1, and passes at exactly M', () => {
  const noneShort = judge([seedRow(6101, { scores: { ...BASE, none: fill(0.71875) } })]);
  assert.equal(noneShort.perSeed[0].gate.comparators.none.margin, 1);
  assert.equal(noneShort.pass, false);

  const shuffledShort = judge([seedRow(6101, { scores: { ...BASE, shuffled: fill(0.71875) } })]);
  assert.equal(shuffledShort.perSeed[0].gate.comparators.shuffled.margin, 1);
  assert.equal(shuffledShort.pass, false);

  assert.equal(judge([seedRow(6101)]).pass, true);
});

test('judgeV6 fails when the quarter margin is 0', () => {
  const res = judge([seedRow(6101, { scores: { ...BASE, quarter: fill(0.75) } })]);
  assert.equal(res.perSeed[0].gate.comparators.quarter.margin, 0);
  assert.equal(res.pass, false);
});

test('judgeV6 fails when a lower bound is exactly 0, even with a positive quarter margin', () => {
  // Quarter differs from full only in game gA. Both bootstrap draws land on gB in a quarter of resamples, so the 2.5% quantile is exactly 0.
  const quarterOnlyA = GAMES.map(g => (g === 'gA' ? 0.71875 : 0.75));
  const res = judge([seedRow(6101, { scores: { ...BASE, quarter: quarterOnlyA } })]);
  const q = res.perSeed[0].gate.comparators.quarter;
  assert.equal(q.margin, 0.5);
  assert.equal(q.lower, 0);
  assert.equal(res.pass, false);
});

test('judgeV6 fails when lost / previouslyRecalled is 0.03, and when no probe was recalled', () => {
  assert.equal(judge([seedRow(6101, { retention: { lost: 3, previouslyRecalled: 100 } })]).pass, false);
  assert.equal(judge([seedRow(6101, { retention: { lost: 0, previouslyRecalled: 0 } })]).pass, false);
  assert.equal(judge([seedRow(6101, { retention: { lost: 2, previouslyRecalled: 100 } })]).pass, true); // 0.02 exactly
});

test('judgeV6 needs every seed: one failing seed fails the run', () => {
  const res = judge([seedRow(6101), seedRow(6102, { retention: { lost: 3, previouslyRecalled: 100 } })]);
  assert.deepEqual(res.perSeed.map(r => r.pass), [true, false]);
  assert.equal(res.outcome, 'does not pass');
});

test('judgeV6 refuses an empty seed list and a games array whose length is not n', () => {
  assert.throws(() => judge([]), /needs seeds/);
  assert.throws(() => judgeV6([seedRow(6101)], { games: GAMES.slice(1), n: N, resamples: 500 }), /differs from n/);
});

test('judgeV6 bootstraps with seed 20261106, not the v5 seed, on the same data', () => {
  const games = Array.from({ length: 40 }, (_, i) => `g${i}`);
  const varied = k => games.map((_, i) => ((i * k) % 11) / 10);
  const scores = { full: varied(7), none: varied(3), shuffled: varied(5), quarter: varied(2) };
  const rows = [{ seed: 6101, scores, retention: { lost: 0, previouslyRecalled: 10 } }];

  const v6 = judgeV6(rows, { games, n: 40, resamples: 500 }).perSeed[0].gate;
  const expected = numericPairGate({
    arms: scores, games, primary: 'full', comparators: ['none', 'shuffled', 'quarter'],
    minCorrect: 0, minMargin: 0, resamples: 500, seed: 20261106, lowerQuantile: 0.025,
  });
  assert.deepEqual(v6, expected);

  const v5 = judgeV5(rows, { games, resamples: 500 }).perSeed[0].gate;
  assert.notDeepEqual(v6.comparators, v5.comparators);
});
