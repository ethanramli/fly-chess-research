import assert from 'node:assert/strict';
import test from 'node:test';
import { Chess } from 'chess.js';
import { compareByGame, judgeRetention, recordEffectiveWrites, scoreAllLegal, summarizePressure } from '../../src/neural-learning/fly-connections-metrics-v1.mjs';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';

const near = (actual, expected, tol = 1e-12) => assert.ok(Math.abs(actual - expected) <= tol, `${actual} is not ${expected}`);
// Test-side Float32 bit reader, independent of the producer helper.
const float32Bits = x => new Uint32Array(Float32Array.of(x).buffer)[0];

// White Ka1 and Rh1, black Ka8. Hand count: king a2, b2 (b1 is attacked by the rook);
// rook b1..g1 (6) and h2..h8 (7). Total 15.
const KR = 'k7/8/8/8/8/8/8/K6R w - - 0 1';
const KR_LEGAL = ['a1a2', 'a1b2', 'h1b1', 'h1c1', 'h1d1', 'h1e1', 'h1f1', 'h1g1', 'h1h2', 'h1h3', 'h1h4', 'h1h5', 'h1h6', 'h1h7', 'h1h8'];
const ranked = (scores = {}) => KR_LEGAL.map(move => ({ move, score: scores[move] ?? 0.1 }));
const outcomesFor = (wins = []) => Object.fromEntries(KR_LEGAL.map(move => [move, wins.includes(move)]));

test('scoreAllLegal enumerates the hand-counted legal domain, king and quiet moves included', () => {
  const r = scoreAllLegal(new Chess(KR), ranked({ a1a2: 0.5 }), outcomesFor(['a1a2']));
  assert.equal(r.counts.legal, 15);
  assert.deepEqual(r.topMoves, [{ move: 'a1a2', score: 0.5 }]);
  assert.equal(r.s, 1);
  assert.equal(r.c, 1);
  assert.equal(r.success, 1);
  assert.equal(r.counts.successes, 1);
  assert.equal(r.counts.failures, 14);
  near(r.margin, 0.4); // 0.5 best success minus 0.1 best failure
});

test('top ties use the fixed tolerance and s/c counts every tied top move', () => {
  const r = scoreAllLegal(new Chess(KR), ranked({ a1a2: 0.5, a1b2: 0.5 + 1e-8, h1h8: 0.5 }), outcomesFor(['a1a2', 'h1h8']));
  assert.deepEqual(r.topMoves.map(m => m.move), ['a1a2', 'a1b2', 'h1h8']);
  assert.equal(r.c, 3);
  assert.equal(r.s, 2);
  near(r.success, 2 / 3);
  near(r.tolerance, 1e-9 + 1e-7 * (0.5 + 1e-8), 1e-18);
  near(r.margin, -1e-8, 1e-15); // 0.5 best success minus 0.5+1e-8 best failure
});

test('a score just outside the tolerance is not tied', () => {
  const r = scoreAllLegal(new Chess(KR), ranked({ a1a2: 0.5, h1h8: 0.5, a1b2: 0.5 - 1e-6 }), outcomesFor(['a1a2']));
  assert.deepEqual(r.topMoves.map(m => m.move), ['a1a2', 'h1h8']);
  assert.equal(r.c, 2);
  assert.equal(r.s, 1);
  near(r.success, 0.5);
  assert.equal(r.margin, 0); // 0.5 success against 0.5 failing h1h8
});

test('margin is the best successful score minus the best failing score, not a mean', () => {
  const r = scoreAllLegal(new Chess(KR), ranked({ a1a2: 0.9, h1h8: 0.2, a1b2: 0.5 }), outcomesFor(['a1a2', 'h1h8']));
  assert.deepEqual(r.topMoves.map(m => m.move), ['a1a2']);
  near(r.margin, 0.4); // a mean-of-successes rule would give (0.9+0.2)/2 - 0.5 = 0.05
  const wrong = scoreAllLegal(new Chess(KR), ranked({ a1b2: 0.9, a1a2: 0.2 }), outcomesFor(['a1a2']));
  assert.equal(wrong.success, 0);
  near(wrong.margin, -0.7); // best success 0.2 minus failing top 0.9
});

test('a domain with no success or no failure has a null margin and correct s/c', () => {
  const none = scoreAllLegal(new Chess(KR), ranked({ a1a2: 0.5 }), outcomesFor());
  assert.equal(none.margin, null);
  assert.equal(none.s, 0);
  assert.equal(none.success, 0);
  assert.equal(none.counts.successes, 0);
  const all = scoreAllLegal(new Chess(KR), ranked({ a1a2: 0.5 }), Object.fromEntries(KR_LEGAL.map(m => [m, true])));
  assert.equal(all.margin, null);
  assert.equal(all.success, 1);
  assert.doesNotMatch(JSON.stringify([none, all]), /Infinity|NaN/);
});

test('scoreAllLegal rejects incomplete, unknown, duplicate, nonlegal and nonfinite inputs', () => {
  const ok = outcomesFor(['a1a2']);
  const missingOutcome = { ...ok };
  delete missingOutcome.h1h8;
  assert.throws(() => scoreAllLegal(new Chess(KR), ranked(), missingOutcome), /Missing outcome for h1h8/);
  assert.throws(() => scoreAllLegal(new Chess(KR), ranked(), { ...ok, e2e4: true }), /Unknown outcome key e2e4/);
  assert.throws(() => scoreAllLegal(new Chess(KR), ranked(), { ...ok, a1a2: 1 }), /must be boolean/);
  assert.throws(() => scoreAllLegal(new Chess(KR), ranked().slice(1), ok), /Ranking has 14 moves/);
  const dup = ranked();
  dup[1] = { ...dup[0] };
  assert.throws(() => scoreAllLegal(new Chess(KR), dup, ok), /Duplicate ranked move a1a2/);
  const nonlegal = ranked();
  nonlegal[0] = { move: 'e2e4', score: 0.1 };
  assert.throws(() => scoreAllLegal(new Chess(KR), nonlegal, ok), /Nonlegal ranked move e2e4/);
  for (const score of [NaN, Infinity]) {
    const bad = ranked();
    bad[2] = { move: bad[2].move, score };
    assert.throws(() => scoreAllLegal(new Chess(KR), bad, ok), /Nonfinite score/);
  }
  const unsorted = ranked();
  [unsorted[0], unsorted[1]] = [unsorted[1], unsorted[0]];
  assert.throws(() => scoreAllLegal(new Chess(KR), unsorted, ok), /sorted by UCI/);
});

test('scoreAllLegal leaves the board, its history and the inputs unchanged', () => {
  const board = new Chess();
  board.move('e4');
  board.move('e5');
  const fen = board.fen();
  const history = board.history({ verbose: true });
  const legal = board.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? '')).sort();
  assert.equal(legal.length, 29); // hand count after 1.e4 e5
  const ranking = legal.map((move, i) => ({ move, score: i / 100 }));
  const outcomes = Object.fromEntries(legal.map(m => [m, m.startsWith('g')]));
  const rankingBefore = structuredClone(ranking);
  const outcomesBefore = structuredClone(outcomes);
  const r = scoreAllLegal(board, ranking, outcomes);
  assert.equal(r.counts.legal, 29);
  assert.ok(r.topMoves.every(m => !ranking.includes(m))); // copies, not references
  assert.equal(board.fen(), fen);
  assert.deepEqual(board.history({ verbose: true }), history);
  assert.deepEqual(ranking, rankingBefore);
  assert.deepEqual(outcomes, outcomesBefore);
  assert.equal(board.moves({ verbose: true }).length, 29);
});

// Retention fixtures. A group: naive margin -0.2 everywhere; acquired boards a1-a3, unacquired a4.
// B group: naive margin -0.1; acquired b1, b2, b4, unacquired b3.
const rec = (boardId, gameId, margin, success, tolerance = 0) => ({ boardId, gameId, margin, success, tolerance });
const naiveA = [rec('a1', 'g1', -0.2, 0.1), rec('a2', 'g2', -0.2, 0.1), rec('a3', 'g3', -0.2, 0.1), rec('a4', 'g4', -0.2, 0.1)];
const afterA = [rec('a1', 'g1', 0.5, 0.9), rec('a2', 'g2', 0.3, 0.8), rec('a3', 'g3', 0.6, 0.8), rec('a4', 'g4', 0.7, 0.5)];
const afterB = [rec('a1', 'g1', 0.45, 0.9), rec('a2', 'g2', 0.2, 0.8), rec('a3', 'g3', 0.5, 0.8), rec('a4', 'g4', 0.7, 0.5)];
const naiveB = [rec('b1', 'h1', -0.1, 0.2), rec('b2', 'h2', -0.1, 0.2), rec('b3', 'h3', -0.1, 0.2), rec('b4', 'h4', -0.1, 0.2)];
const bAfter = [rec('b1', 'h1', 0.4, 0.8), rec('b2', 'h2', 0.2, 0.9), rec('b3', 'h3', 0.5, 0.6), rec('b4', 'h4', 0.3, 0.8)];
const bFinal = [rec('b1', 'h1', 0.35, 0.8), rec('b2', 'h2', 0.25, 0.9), rec('b3', 'h3', 0.1, 0.1), rec('b4', 'h4', 0.3, 0.8)];
const base = { a0: naiveA, aAfterA: afterA, aAfterB: afterB, aFinal: afterB, bBefore: naiveB, bAfter, bFinal, minAcquired: 3 };
const judge = (over = {}) => judgeRetention({ ...base, ...over });
const withMargin = (records, id, margin) => records.map(r => (r.boardId === id ? { ...r, margin } : r));
const withSuccess = (records, id, success) => records.map(r => (r.boardId === id ? { ...r, success } : r));

test('judgeRetention passes when the acquired subset and the all-board ratio both retain', () => {
  const r = judge();
  assert.equal(r.pass, true);
  assert.equal(r.a.acquired, 3);
  assert.deepEqual(r.a.lostIds, []);
  assert.deepEqual(r.a.failedIds, ['a4']); // unacquired board is published as a failure
  near(r.a.groupRatioAfterB, 2.65 / 2.9, 1e-9); // (0.65+0.4+0.7+0.9)/(0.7+0.5+0.8+0.9)
  assert.equal(r.a.items.length, 4);
  assert.equal(r.b.acquired, 3);
  assert.deepEqual(r.b.lostIds, []);
  assert.deepEqual(r.b.failedIds, ['b3']);
});

test('an acquired A board that loses success or retention fails the joint result', () => {
  const lostSuccess = judge({ aAfterB: withSuccess(afterB, 'a2', 0.6), aFinal: withSuccess(afterB, 'a2', 0.6) });
  assert.deepEqual(lostSuccess.a.lostIds, ['a2']);
  assert.equal(lostSuccess.pass, false);
  // a3 ratio at the final checkpoint: (0.1 + 0.2) / (0.6 + 0.2) = 0.375
  const lostFinal = judge({ aFinal: withMargin(afterB, 'a3', 0.1) });
  assert.deepEqual(lostFinal.a.lostIds, ['a3']);
  assert.equal(lostFinal.pass, false);
});

test('the all-board ratio catches losses that an acquired-only check would hide', () => {
  const hidden = judge({ aAfterB: withMargin(afterB, 'a4', -0.5), aFinal: withMargin(afterB, 'a4', -0.5) });
  assert.deepEqual(hidden.a.lostIds, []); // every acquired board still passes on its own
  near(hidden.a.groupRatioAfterB, 1.45 / 2.9, 1e-9); // (0.65+0.4+0.7-0.3)/2.9
  assert.equal(hidden.a.groupPass, false);
  assert.equal(hidden.pass, false);
});

test('a zero or negative learned-margin denominator fails the group without dividing', () => {
  // learned sum: 0.7+0.5+0.8-2.3 = -0.3
  const negative = judge({ aAfterA: withMargin(afterA, 'a4', -2.5) });
  assert.equal(negative.a.groupRatioAfterB, null);
  assert.equal(negative.a.pass, false);
  // exact binary values: learned 0.5+0.5+0.25-1.25 = 0
  const zeroNaive = naiveA.map(r => ({ ...r, margin: 0 }));
  const zeroAfter = [rec('a1', 'g1', 0.5, 0.9), rec('a2', 'g2', 0.5, 0.8), rec('a3', 'g3', 0.25, 0.8), rec('a4', 'g4', -1.25, 0.5)];
  const zero = judge({ a0: zeroNaive, aAfterA: zeroAfter, aAfterB: zeroAfter, aFinal: zeroAfter });
  assert.equal(zero.a.acquired, 3);
  assert.deepEqual(zero.a.lostIds, []); // each acquired board has ratio 1
  assert.equal(zero.a.groupRatioAfterB, null);
  assert.equal(zero.a.pass, false);
});

test('retention compares exactly at .70, with no rounding', () => {
  const one = margin => judgeRetention({
    a0: [rec('x', 'k', 0, 0.1)], aAfterA: [rec('x', 'k', 1, 0.9)], aAfterB: [rec('x', 'k', margin, 0.9)], aFinal: [rec('x', 'k', 1, 0.9)],
    bBefore: [rec('y', 'm', 0, 0.1)], bAfter: [rec('y', 'm', 1, 0.9)], bFinal: [rec('y', 'm', 1, 0.9)], minAcquired: 1,
  });
  assert.equal(one(0.7).pass, true);
  const below = one(0.6999);
  assert.deepEqual(below.a.lostIds, ['x']);
  assert.equal(below.pass, false);
});

test('B acquisition is fixed at its post-B checkpoint and must stay successful after R', () => {
  const lost = judge({ bFinal: withSuccess(bFinal, 'b2', 0.7) });
  assert.deepEqual(lost.b.lostIds, ['b2']);
  assert.equal(lost.pass, false);
  // b3 fails at bAfter, so a late success at bFinal does not add it to the acquired set.
  const late = judge({ bFinal: withSuccess(bFinal, 'b3', 0.9) });
  assert.equal(late.b.acquired, 3);
  assert.equal(late.b.items[2].acquired, false);
  assert.equal(late.pass, true);
});

test('judgeRetention rejects missing, duplicate, misaligned, null-margin and invalid records or config', () => {
  assert.throws(() => judge({ aAfterB: afterB.slice(0, 3) }), /has 3 records; reference has 4/);
  assert.throws(() => judge({ aAfterB: [afterB[1], afterB[0], afterB[2], afterB[3]] }), /identity\/order/);
  assert.throws(() => judge({ a0: naiveA.map((r, i) => (i === 1 ? { ...r, boardId: 'a1' } : r)) }), /duplicate boardId/);
  assert.throws(() => judge({ aAfterA: withMargin(afterA, 'a1', null) }), /margin must be finite/);
  assert.throws(() => judge({ bAfter: withSuccess(bAfter, 'b1', 1.2) }), /success must be in/);
  assert.throws(() => judge({ aFinal: afterB.map((r, i) => (i === 0 ? { ...r, tolerance: -1 } : r)) }), /tolerance must be finite/);
  for (const minAcquired of [0, 2.5, 5]) assert.throws(() => judge({ minAcquired }), /minAcquired/);
  for (const retention of [0, 1.5]) assert.throws(() => judge({ retention }), /retention/);
  assert.throws(() => judge({ epsilon: -1 }), /epsilon/);
});

test('recordEffectiveWrites separates gain-only tails and sub-1% effective writes from real pressure', () => {
  const ids = [10, 20, 30, 40, 50];
  const records = recordEffectiveWrites(
    ids,
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1 + 1e-9, 0.995, 0.9, 0.99],
    Float32Array.of(1, 1, 1, 1, 1),
    Float32Array.of(1, 1, 0.995, 0.9, 0.99),
  );
  assert.deepEqual(records.map(r => r.edgeId), [20, 30, 40, 50]); // edge 10 unchanged: not returned
  const [tail, small, big, edge50] = records;
  // Gain changed, effective bits identical: recorded, not pressure.
  assert.equal(tail.gainChanged, true);
  assert.equal(tail.effectiveChanged, false);
  assert.equal(tail.relativeEffectiveChange, 0);
  assert.equal(tail.pressureWrite, false);
  // Effective change of about 0.5%: recorded, below 1%.
  assert.equal(small.pressureWrite, false);
  near(small.relativeEffectiveChange, 1 - Math.fround(0.995));
  // Effective change of about 10%: pressure.
  assert.equal(big.pressureWrite, true);
  near(big.relativeEffectiveChange, 1 - Math.fround(0.9));
  assert.equal(big.beforeBits, float32Bits(1));
  assert.equal(big.afterBits, float32Bits(0.9));
  assert.equal(float32Bits(1), 0x3f800000);
  // Gain moved by 1%, but Float32(0.99) sits just under 1% of base: not pressure.
  assert.equal(edge50.gainChanged, true);
  assert.equal(edge50.pressureWrite, false);
  assert.ok(edge50.relativeEffectiveChange < 0.01);
  near(edge50.relativeEffectiveChange, 1 - Math.fround(0.99));
  assert.deepEqual(records.filter(r => r.pressureWrite).map(r => r.edgeId), [40]);
});

test('recordEffectiveWrites rejects malformed data and leaves inputs unchanged', () => {
  const ids = [1, 2];
  const base2 = [1, 1];
  const gains = [1, 0.9];
  const before = Float32Array.of(1, 1);
  const after = Float32Array.of(1, 0.9);
  const bad = [
    [[[1, 1], base2, gains, gains, before, after], /Invalid or duplicate edge ID/],
    [[[1, 1.5], base2, gains, gains, before, after], /Invalid or duplicate edge ID/],
    [[ids, base2, gains, gains, [1, 1], after], /must be a Float32Array/],
    [[ids, base2, gains, gains, before, Float32Array.of(1)], /one value per edge/],
    [[ids, [1, 0], gains, gains, before, after], /must be finite and positive/],
    [[ids, base2, [1, NaN], gains, before, after], /must be finite and positive/],
    [[[], [], [], [], new Float32Array(0), new Float32Array(0)], /nonempty list/],
  ];
  for (const [args, pattern] of bad) assert.throws(() => recordEffectiveWrites(...args), pattern);
  const inputs = { ids: [...ids], base: [...base2], gains: [...gains], before: [...before], after: [...after] };
  recordEffectiveWrites(ids, base2, [1, 1], gains, before, after);
  assert.deepEqual({ ids, base: base2, gains, before: [...before], after: [...after] }, inputs);
});

test('summarizePressure applies the 25% shared-write and 25% mask thresholds with exact counts', () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8];
  const base1 = Array(8).fill(1);
  const finalMag = Float32Array.of(0.9, 0.5, 1, 1, 1, 1, 1, 1);
  const r = summarizePressure([1, 2, 3, 4], [1, 5], base1, finalMag, ids);
  assert.deepEqual(r.shared, { numerator: 1, denominator: 4, pass: true }); // exactly 25%
  assert.deepEqual(r.mask, { numerator: 2, denominator: 8, pass: true }); // exactly 25%
  assert.equal(r.pass, true);
  const noShared = summarizePressure([1, 2, 3, 4], [5, 6], base1, finalMag, ids);
  assert.equal(noShared.shared.numerator, 0);
  assert.equal(noShared.shared.pass, false);
  assert.equal(noShared.pass, false);
  const twentyPercent = summarizePressure([1, 2, 3, 4, 5], [1], base1, finalMag, ids);
  assert.deepEqual(twentyPercent.shared, { numerator: 1, denominator: 5, pass: false });
  const maskFail = summarizePressure([1, 2, 3, 4], [1], base1, Float32Array.of(1, 1, 1, 1, 1, 1, 1, 1), ids);
  assert.equal(maskFail.shared.pass, true);
  assert.deepEqual(maskFail.mask, { numerator: 0, denominator: 8, pass: false });
  assert.equal(maskFail.pass, false);
});

test('summarizePressure rejects an empty A capacity and edges outside the mask', () => {
  const ids = [1, 2];
  const base1 = [1, 1];
  const finalMag = Float32Array.of(1, 1);
  assert.throws(() => summarizePressure([], [1], base1, finalMag, ids), /empty A capacity/);
  assert.throws(() => summarizePressure([1], [99], base1, finalMag, ids), /unique edge IDs/);
  assert.throws(() => summarizePressure([1, 1], [1], base1, finalMag, ids), /unique edge IDs/);
});

test('compareByGame returns exact sums and game-clustered lower bounds', () => {
  const games = Array.from({ length: 20 }, (_, i) => `g${i}`);
  const win = compareByGame({ arms: { P: games.map(() => 1), C: games.map(() => 0) }, games, primary: 'P', comparators: ['C'], seed: 7 });
  assert.equal(win.pass, true);
  assert.equal(win.comparators.C.margin, 20);
  assert.equal(win.comparators.C.lower, 20); // unit differences over 20 distinct games sum to 20 in every resample
  const tie = compareByGame({ arms: { P: games.map(() => 0.5), C: games.map(() => 0.5) }, games, primary: 'P', comparators: ['C'], seed: 7 });
  assert.equal(tie.pass, false);
  assert.equal(tie.comparators.C.margin, 0);
  assert.equal(tie.comparators.C.lower, 0);
  const exact = compareByGame({ arms: { P: [1, 0.5, 0, 1], C: [0, 0.5, 0.5, 0] }, games: ['a', 'b', 'c', 'd'], primary: 'P', comparators: ['C'], seed: 7 });
  assert.equal(exact.correct, 2.5);
  assert.equal(exact.comparators.C.margin, 1.5); // 2.5 - 1.0
  // Thin wrapper: identical to the shared gate with the registered options.
  assert.deepEqual(win, numericPairGate({ arms: { P: games.map(() => 1), C: games.map(() => 0) }, games, primary: 'P', comparators: ['C'], minCorrect: 0, minMargin: 0, resamples: 10000, seed: 7, lowerQuantile: 0.025 }));
});

test('compareByGame rejects bad game IDs, cardinalities, scores and seeds', () => {
  const ok = { arms: { P: [1, 0], C: [0, 1] }, games: ['a', 'b'], primary: 'P', comparators: ['C'], seed: 7 };
  assert.throws(() => compareByGame({ ...ok, games: ['a', ''] }), /nonempty strings/);
  assert.throws(() => compareByGame({ ...ok, games: ['a', 3] }), /nonempty strings/);
  assert.throws(() => compareByGame({ ...ok, arms: { P: [1], C: [0, 1] } }), /one score per game/);
  assert.throws(() => compareByGame({ ...ok, arms: { P: [1, 0], C: [0, 1.5] } }), /finite in \[0, 1\]/);
  assert.throws(() => compareByGame({ ...ok, arms: { P: [1, 0], C: [0, 1], X: [0, 'y'] } }), /finite in/);
  assert.throws(() => compareByGame({ ...ok, seed: 1.5 }), /32-bit/);
});
