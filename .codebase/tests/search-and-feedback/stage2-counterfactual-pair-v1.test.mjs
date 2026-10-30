import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { verifyStage2CounterfactualPair } from '../../src/search-and-feedback/stage2-counterfactual-pair-v1.mjs';

// Chess truth for every fixture below is checked by chess.js in the first test.
const MATE_IN_1 = '7k/8/6K1/8/8/8/8/R7 w - - 0 1';      // Ra8# (Kh8 covered by Kg6 on g7/h7, rook on g8)
const KING_F6 = '7k/8/5K2/8/8/8/8/R7 w - - 0 1';        // same, king moved g6->f6: Ra8+ Kh7 escapes
const PAWN_B5 = '7k/8/6K1/1p6/8/8/8/R7 w - - 0 1';      // unrelated black pawn: still Ra8#
const KING_F6_PAWN = '7k/8/5K2/1p6/8/8/8/R7 w - - 0 1'; // two edits from MATE_IN_1
const ROOK_ON_A1 = '4r2k/8/8/8/8/8/5PPP/R5K1 w - - 0 1'; // after Kh1, Ra1 guards e1 so Re1 is answered by Rxe1
const ROOK_ON_A2 = '4r2k/8/8/8/8/8/R4PPP/6K1 w - - 0 1';
const MATE_TASK = { objective: 'forced-mate', plies: 1 };
const AVOID_TASK = { objective: 'avoid-mate', plies: 3 };

test('fixtures are legal and the chess truth matches the claimed outcomes', () => {
  for (const fen of [MATE_IN_1, KING_F6, PAWN_B5, KING_F6_PAWN, ROOK_ON_A1, ROOK_ON_A2]) assert.ok(new Chess(fen));
  const mate = new Chess(MATE_IN_1);
  mate.move('Ra8');
  assert.equal(mate.isCheckmate(), true);
  const escape = new Chess(KING_F6);
  escape.move('Ra8');
  assert.equal(escape.isCheckmate(), false);
  assert.ok(escape.moves({ verbose: true }).some(m => m.from === 'h8' && m.to === 'h7'));
  // Avoid-mate: after Kh1, Re8-e1 mates only when no rook on a1 guards e1.
  const guarded = new Chess(ROOK_ON_A1);
  guarded.move('Kh1');
  guarded.move('Re1');
  assert.equal(guarded.isCheckmate(), false);
  const open = new Chess(ROOK_ON_A2);
  open.move('Kh1');
  open.move('Re1');
  assert.equal(open.isCheckmate(), true);
});

test('verified forced-mate pair: adding a king escape square flips mate-in-one to not-mate', () => {
  const r = verifyStage2CounterfactualPair({ first: MATE_IN_1, second: KING_F6, move: 'a1a8', task: MATE_TASK, maxNodes: 4096 });
  assert.equal(r.status, 'verified');
  assert.equal(r.reason, 'certified-outcomes-differ');
  assert.deepEqual(r.outcomes, { first: 'success', second: 'failure' });
  assert.deepEqual(r.edit, { kind: 'move', piece: 'wk', from: 'g6', to: 'f6' });
  assert.equal(r.editClass, 'escape-square');
  assert.match(r.certificates.first, /^[a-f0-9]{64}$/);
  assert.match(r.certificates.second, /^[a-f0-9]{64}$/);
  assert.deepEqual(r.bounds, { maxNodes: 4096 });
});

test('verified avoid-mate pair: moving a supporting rook off the back rank flips the outcome', () => {
  const r = verifyStage2CounterfactualPair({ first: ROOK_ON_A1, second: ROOK_ON_A2, move: 'g1h1', task: AVOID_TASK, maxNodes: 4096 });
  assert.equal(r.status, 'verified');
  assert.deepEqual(r.outcomes, { first: 'success', second: 'failure' });
  assert.deepEqual(r.edit, { kind: 'move', piece: 'wr', from: 'a1', to: 'a2' });
  assert.equal(r.editClass, 'supporting-piece');
});

test('rejected: certified outcomes are equal', () => {
  const r = verifyStage2CounterfactualPair({ first: MATE_IN_1, second: PAWN_B5, move: 'a1a8', task: MATE_TASK, maxNodes: 4096 });
  assert.equal(r.status, 'rejected');
  assert.equal(r.reason, 'outcomes-equal');
  assert.deepEqual(r.outcomes, { first: 'success', second: 'success' });
  assert.deepEqual(r.edit, { kind: 'add', piece: 'bp', square: 'b5' });
});

test('rejected: positions differ by two edits', () => {
  const r = verifyStage2CounterfactualPair({ first: MATE_IN_1, second: KING_F6_PAWN, move: 'a1a8', task: MATE_TASK, maxNodes: 4096 });
  assert.equal(r.status, 'rejected');
  assert.equal(r.reason, 'not-exactly-one-edit');
  assert.equal(r.edit, null);
  assert.equal(r.outcomes, null);
});

test('rejected: move is illegal in the first position', () => {
  const r = verifyStage2CounterfactualPair({ first: MATE_IN_1, second: KING_F6, move: 'a1b2', task: MATE_TASK, maxNodes: 4096 });
  assert.equal(r.status, 'rejected');
  assert.equal(r.reason, 'illegal-in-first');
});

test('unknown: a tiny node budget exhausts the avoid-mate certificate', () => {
  const r = verifyStage2CounterfactualPair({ first: ROOK_ON_A1, second: ROOK_ON_A2, move: 'g1h1', task: AVOID_TASK, maxNodes: 1 });
  assert.equal(r.status, 'unknown');
  assert.deepEqual(r.outcomes, { first: 'unknown', second: 'unknown' });
  assert.deepEqual(r.bounds, { maxNodes: 1 });
});

test('deterministic: repeated calls give identical output', () => {
  const input = { first: MATE_IN_1, second: KING_F6, move: 'a1a8', task: MATE_TASK, maxNodes: 4096 };
  const first = JSON.stringify(verifyStage2CounterfactualPair(input));
  for (let i = 0; i < 3; i++) assert.equal(JSON.stringify(verifyStage2CounterfactualPair(input)), first);
});

test('unsupported task or budget throws instead of deciding', () => {
  assert.throws(() => verifyStage2CounterfactualPair({ first: MATE_IN_1, second: KING_F6, move: 'a1a8', task: { objective: 'forced-mate', plies: 2 }, maxNodes: 4096 }), TypeError);
  assert.throws(() => verifyStage2CounterfactualPair({ first: MATE_IN_1, second: KING_F6, move: 'a1a8', task: MATE_TASK, maxNodes: 0 }), RangeError);
});
