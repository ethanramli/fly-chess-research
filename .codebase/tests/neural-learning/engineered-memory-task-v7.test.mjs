import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';
import { partialFisherYates, replayPosition } from '../../src/neural-learning/engineered-memory-v4-ledger.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { judgeV6, marginFor } from '../../src/neural-learning/engineered-memory-task-v6.mjs';
import {
  captureCandidates, permuteCaptureValues, judgeV7, pieceValueChoice,
} from '../../src/neural-learning/engineered-memory-task-v7.mjs';

const uciOf = m => m.from + m.to + (m.promotion ?? '');
const legalOf = board => board.moves({ verbose: true }).map(uciOf).sort();

// 1.e4 a6 2.e5 f5: white may take en passant (e5f6) or bishop-takes-a6 (f1a6). Replayed from the start, so the FEN check runs.
const EP = { gameId: 'g', ply: 4, history: ['e2e4', 'a7a6', 'e4e5', 'f7f5'], fen: 'rnbqkbnr/1pppp1pp/p7/4Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3' };
// Captures: c4b5 (bishop takes pawn), c4d5 (bishop takes queen), e4d5 (pawn takes queen). Quiet moves include e4e5.
const MIXED_FEN = '4k3/8/8/1p1q4/2B1P3/8/8/4K3 w - - 0 1';
// Captures: c4b5, c4d5, e4d5. Every one takes a queen with a pawn, so all score 8.
const QUEENS_FEN = '4k3/8/8/1q1q4/2P1P3/8/8/4K3 w - - 0 1';

test('captureCandidates includes en passant and drops quiet moves even when labelled safe', () => {
  const { board, legal } = replayPosition(EP);
  const categoryOf = (id, uci) => ({ e5f6: 'safe', f1a6: 'unsafe' })[uci] ?? 'safe'; // every quiet move is labelled safe
  assert.deepEqual(captureCandidates(board, legal, categoryOf, 'ep'), ['e5f6', 'f1a6']);
  assert.deepEqual(pieceValueChoice(board, ['e5f6', 'f1a6']), ['e5f6']); // pawn takes pawn scores 0, bishop takes pawn scores -2
});

test('captureCandidates drops unknown captures and unsafe quiet moves', () => {
  const board = new Chess(MIXED_FEN);
  const legal = legalOf(board);
  const cats = { c4b5: 'unknown', c4d5: 'unsafe', e4d5: 'safe' };
  assert.deepEqual(captureCandidates(board, legal, (id, uci) => cats[uci] ?? 'safe', 'mixed'), ['c4d5', 'e4d5']);
  // Quiet moves labelled unsafe are not captures, so they cannot supply the unsafe candidate.
  const captures = new Set(['c4b5', 'c4d5', 'e4d5']);
  assert.throws(() => captureCandidates(board, legal, uci => (captures.has(uci) ? 'safe' : 'unsafe'), 'mixed'), /lack a safe or an unsafe/);
});

test('captureCandidates throws without a safe candidate or without an unsafe candidate', () => {
  const board = new Chess(MIXED_FEN);
  const legal = legalOf(board);
  assert.throws(() => captureCandidates(board, legal, () => 'safe', 'mixed'), /lack a safe or an unsafe/);
  assert.throws(() => captureCandidates(board, legal, () => 'unsafe', 'mixed'), /lack a safe or an unsafe/);
  // Only the unsafe capture is unknown, so no unsafe candidate remains.
  assert.throws(() => captureCandidates(board, legal, uci => (uci === 'c4d5' ? 'unknown' : 'safe'), 'mixed'), /lack a safe or an unsafe/);
});

test('captureCandidates refuses a legal list that differs from the replayed board', () => {
  const board = new Chess(MIXED_FEN);
  assert.throws(() => captureCandidates(board, legalOf(board).slice(1), () => 'safe', 'mixed'), /differ from the replayed board/);
});

// Eight ledger slots. Known capture slots are a(+1), c(-1), f(+1), h(-1). Quiet slots are b and g (-1). Unknown slots are d (capture) and e (quiet).
const LEDGER = [
  { slot: 0, uci: 'a', value: 1 },
  { slot: 1, uci: 'b', value: -1 },
  { slot: 2, uci: 'c', value: -1 },
  { slot: 3, uci: 'd', value: null },
  { slot: 4, uci: 'e', value: null },
  { slot: 5, uci: 'f', value: 1 },
  { slot: 6, uci: 'g', value: -1 },
  { slot: 7, uci: 'h', value: -1 },
];
const CAPTURES = new Set(['a', 'c', 'd', 'f', 'h']);
const isCapture = slot => CAPTURES.has(slot.uci);
const KNOWN_CAPTURE_POSITIONS = [0, 2, 5, 7];

test('permuteCaptureValues permutes only known capture slots and keeps quiet, unknown and counts', () => {
  const seed = 6101;
  const { values, indices } = permuteCaptureValues(LEDGER, isCapture, seed);
  assert.deepEqual(indices, partialFisherYates([0, 1, 2, 3], 4, mulberry32((seed ^ 0x7ca7) >>> 0)));
  const expected = LEDGER.map(slot => slot.value);
  KNOWN_CAPTURE_POSITIONS.forEach((pos, t) => { expected[pos] = LEDGER[KNOWN_CAPTURE_POSITIONS[indices[t]]].value; });
  assert.deepEqual(values, expected);
  assert.equal(values[1], -1); // quiet
  assert.equal(values[6], -1); // quiet
  assert.equal(values[3], null); // unknown capture
  assert.equal(values[4], null); // unknown quiet
  assert.equal(count(values, 1), 2);
  assert.equal(count(values, -1), 4);
  assert.deepEqual(permuteCaptureValues(LEDGER, isCapture, seed), { values, indices }); // deterministic
});

test('permuteCaptureValues changes the capture values for some seed', () => {
  const original = LEDGER.map(slot => slot.value);
  const moved = [...Array(20).keys()].some(i => JSON.stringify(permuteCaptureValues(LEDGER, isCapture, i + 1).values) !== JSON.stringify(original));
  assert.equal(moved, true);
});

function count(xs, v) {
  return xs.filter(x => x === v).length;
}

// Same fixture shape as the v6 tests: 32 positions in two games of 16. M = marginFor(32) = 2.
const GAMES = [...Array(16).fill('gA'), ...Array(16).fill('gB')];
const N = GAMES.length;
const fill = x => Array(N).fill(x);
const BASE = { full: fill(0.75), none: fill(0.6875), shuffled: fill(0.6875), quarter: fill(0.71875) }; // margins 2, 2, 1
const seedRow = (seed, over = {}) => ({ seed, scores: BASE, retention: { lost: 2, previouslyRecalled: 100 }, ...over });
const judge = rows => judgeV7(rows, { games: GAMES, n: N, resamples: 500 });

test('judgeV7 passes at the v6 margin rule and reports gate seed 20261107', () => {
  const res = judge([seedRow(6101), seedRow(6102)]);
  assert.equal(res.pass, true);
  assert.equal(res.outcome, 'passes');
  const { none, shuffled, quarter } = res.perSeed[0].gate.comparators;
  assert.deepEqual([none.margin, shuffled.margin, quarter.margin], [2, 2, 1]);
  assert.equal(res.rule.margin, marginFor(N));
  assert.equal(res.rule.gateSeed, 20261107);
});

test('judgeV7 fails a seed whose none or shuffled margin is M-1, and fails when quarter margin is 0', () => {
  assert.equal(judge([seedRow(6101, { scores: { ...BASE, none: fill(0.71875) } })]).pass, false);
  assert.equal(judge([seedRow(6101, { scores: { ...BASE, shuffled: fill(0.71875) } })]).pass, false);
  assert.equal(judge([seedRow(6101, { scores: { ...BASE, quarter: fill(0.75) } })]).pass, false);
});

test('judgeV7 fails when a lower bound is exactly 0', () => {
  // Quarter differs from full only in gA. Both bootstrap draws land on gB in a quarter of resamples, so the 2.5% quantile is 0.
  const quarterOnlyA = GAMES.map(g => (g === 'gA' ? 0.71875 : 0.75));
  const res = judge([seedRow(6101, { scores: { ...BASE, quarter: quarterOnlyA } })]);
  assert.equal(res.perSeed[0].gate.comparators.quarter.lower, 0);
  assert.equal(res.pass, false);
});

test('judgeV7 retention: 0.02 passes, 0.03 and no recalled probe fail', () => {
  assert.equal(judge([seedRow(6101, { retention: { lost: 2, previouslyRecalled: 100 } })]).pass, true);
  assert.equal(judge([seedRow(6101, { retention: { lost: 3, previouslyRecalled: 100 } })]).pass, false);
  assert.equal(judge([seedRow(6101, { retention: { lost: 0, previouslyRecalled: 0 } })]).pass, false);
});

test('judgeV7 needs every seed, and refuses an empty seed list or a games array whose length is not n', () => {
  const res = judge([seedRow(6101), seedRow(6102, { retention: { lost: 3, previouslyRecalled: 100 } })]);
  assert.deepEqual(res.perSeed.map(r => r.pass), [true, false]);
  assert.equal(res.pass, false);
  assert.throws(() => judge([]), /needs seeds/);
  assert.throws(() => judgeV7([seedRow(6101)], { games: GAMES.slice(1), n: N, resamples: 500 }), /differs from n/);
});

test('judgeV7 bootstraps with seed 20261107, not the v6 seed, on the same data', () => {
  const games = Array.from({ length: 40 }, (_, i) => `g${i}`);
  const varied = k => games.map((_, i) => ((i * k) % 11) / 10);
  const scores = { full: varied(7), none: varied(3), shuffled: varied(5), quarter: varied(2) };
  const rows = [{ seed: 6101, scores, retention: { lost: 0, previouslyRecalled: 10 } }];

  const v7 = judgeV7(rows, { games, n: 40, resamples: 500 }).perSeed[0].gate;
  const expected = numericPairGate({
    arms: scores, games, primary: 'full', comparators: ['none', 'shuffled', 'quarter'],
    minCorrect: 0, minMargin: 0, resamples: 500, seed: 20261107, lowerQuantile: 0.025,
  });
  assert.deepEqual(v7, expected);

  const v6 = judgeV6(rows, { games, n: 40, resamples: 500 }).perSeed[0].gate;
  assert.notDeepEqual(v7.comparators, v6.comparators);
});

test('pieceValueChoice returns the unique top score, and every tie in candidate order', () => {
  // Bxb5 takes a pawn with a bishop (1 - 3 = -2). Bxd5 takes a queen with a bishop (9 - 3 = 6). exd5 takes a queen with a pawn (9 - 1 = 8).
  assert.deepEqual(pieceValueChoice(new Chess(MIXED_FEN), ['c4b5', 'c4d5', 'e4d5']), ['e4d5']);
  assert.deepEqual(pieceValueChoice(new Chess(QUEENS_FEN), ['c4b5', 'c4d5', 'e4d5']), ['c4b5', 'c4d5', 'e4d5']);
});

test('pieceValueChoice refuses a quiet move or an illegal move', () => {
  assert.throws(() => pieceValueChoice(new Chess(MIXED_FEN), ['e4e5']), /Not a legal capture/);
  assert.throws(() => pieceValueChoice(new Chess(MIXED_FEN), ['a1a8']), /Not a legal capture/);
});
