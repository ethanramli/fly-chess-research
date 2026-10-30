// 2026-10-29. Tests for stage2-strata-v1.mjs. Each verdict is cross-checked against plain
// chess.js legal-move enumeration (no certificates) so the expected chess truth is independent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  CLASSIFIERS, classifyStage2, pieceCount, classifyActualMate, classifyEscapableCheck,
  classifyMandatoryDefense, classifyMisleadingImprovingMove,
} from '../../src/search-and-feedback/stage2-strata-v1.mjs';

const uci = move => move.from + move.to + (move.promotion ?? '');
const afterFen = (fen, move) => { const board = new Chess(fen); board.move(move); return board.fen(); };
// Chess truth: moves after which the side that just moved has checkmated the opponent.
const mateInOneTruth = fen => new Chess(fen).moves({ verbose: true }).filter(m => new Chess(afterFen(fen, m)).isCheckmate()).map(uci).sort();
// Chess truth: does the side to move in fen have a mate in one after move m? (opponent view)
const opponentHasMateInOne = fen => mateInOneTruth(fen).length > 0;

const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'; // Ra8# (back rank)
const QG7_MATE = '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'; // Qg7#
const NO_MATE = '8/8/8/8/8/5k2/8/R3K3 w - - 0 1'; // no mate in one for white
const CHECK_ESCAPABLE = '4k3/8/8/8/8/8/4R3/6K1 b - - 0 1'; // Re2+ ; king escapes
const CHECK_INTERPOSE = '4kb2/8/8/8/8/8/8/4R1K1 b - - 0 1'; // Re1+ ; Be7 blocks, king can move
const CHECK_CAPTURE = '4k3/8/8/8/8/8/8/r3R1K1 b - - 0 1'; // Re1+ ; Rxe1 captures checker
const CHECKMATED = 'R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1'; // black mated by Ra8
const WHITE_NOT_IN_CHECK = '4k3/8/8/8/8/8/4R3/6K1 w - - 0 1';
const MANDATORY_DEFENSE = '6k1/5ppp/8/8/8/8/8/R5K1 b - - 0 1'; // Ra8# threat; Kh8 permits it, others avoid
const IN_CHECK_BLACK = 'k7/8/8/8/8/8/8/R5K1 b - - 0 1';
const NO_THREAT = '4k3/8/8/8/8/8/8/4K3 b - - 0 1'; // bare kings, no mate possible
const MISLEADING = '6kN/6pp/8/8/8/8/R7/K7 b - - 0 1'; // Kxh8 captures the knight but allows Ra8#; other moves avoid mate

const strip = value => JSON.parse(JSON.stringify(value));

test('fixtures load as legal positions and respect the six-piece limit', () => {
  for (const fen of [MATE_IN_ONE, QG7_MATE, NO_MATE, CHECK_ESCAPABLE, CHECK_INTERPOSE, CHECK_CAPTURE, CHECKMATED, WHITE_NOT_IN_CHECK, MANDATORY_DEFENSE, IN_CHECK_BLACK, NO_THREAT]) {
    new Chess(fen); // throws if illegal
    assert.ok(pieceCount(fen) <= 6, fen);
  }
  assert.equal(pieceCount(MATE_IN_ONE), 6);
  assert.equal(pieceCount(new Chess(MATE_IN_ONE)), 6);
});

test('actual-mate: positive back-rank mate and queen mate match chess truth', () => {
  for (const [fen, truth] of [[MATE_IN_ONE, ['a1a8']], [QG7_MATE, ['f7e8', 'f7f8', 'f7g7', 'f7h7']]]) {
    assert.deepEqual(mateInOneTruth(fen), truth);
    const r = classifyActualMate(fen);
    assert.equal(r.status, 'verified', r.reason);
    assert.deepEqual([...r.evidence.matingMoves].sort(), truth);
    assert.equal(r.evidence.rootCertificate.status, 'success');
  }
});

test('actual-mate: negative is a certified rejection, not unknown', () => {
  assert.deepEqual(mateInOneTruth(NO_MATE), []);
  const r = classifyActualMate(NO_MATE);
  assert.equal(r.status, 'rejected', r.reason);
  assert.equal(r.evidence.rootCertificate.status, 'failure');
  assert.equal(r.evidence.rootCertificate.certificateCheck.verified, true);
  assert.equal(r.evidence.moves.length, new Chess(NO_MATE).moves().length);
});

test('actual-mate: tiny node budget is unknown, never rejected', () => {
  assert.equal(classifyActualMate(MATE_IN_ONE, { maxNodes: 1 }).status, 'unknown');
  assert.equal(classifyActualMate(NO_MATE, { maxNodes: 1 }).status, 'unknown');
});

test('escapable-check: positive lists every reply, each certificate matches chess truth', () => {
  const r = classifyEscapableCheck(CHECK_ESCAPABLE);
  assert.equal(r.status, 'verified', r.reason);
  const legal = new Chess(CHECK_ESCAPABLE).moves({ verbose: true });
  assert.equal(r.evidence.replies.length, legal.length);
  for (const reply of r.evidence.replies) {
    const truthMate = opponentHasMateInOne(afterFen(CHECK_ESCAPABLE, legal.find(m => uci(m) === reply.move)));
    assert.equal(reply.opponentMateInOne, truthMate ? 'success' : 'failure', reply.move);
    assert.equal(reply.type, 'king-move');
  }
});

test('escapable-check: interposition and capture-of-checker reply types are classified', () => {
  const interpose = classifyEscapableCheck(CHECK_INTERPOSE);
  assert.equal(interpose.status, 'verified', interpose.reason);
  assert.ok(interpose.evidence.replies.some(reply => reply.type === 'interposition' && reply.move === 'f8e7'));
  assert.ok(interpose.evidence.replies.some(reply => reply.type === 'king-move'));
  const capture = classifyEscapableCheck(CHECK_CAPTURE);
  assert.equal(capture.status, 'verified', capture.reason);
  assert.ok(capture.evidence.replies.some(reply => reply.type === 'capture-checker' && reply.move === 'a1e1'));
});

test('escapable-check: negatives (not in check, checkmated) are rejected; tiny budget is unknown', () => {
  assert.equal(classifyEscapableCheck(WHITE_NOT_IN_CHECK).status, 'rejected');
  assert.equal(classifyEscapableCheck(CHECKMATED).status, 'rejected');
  assert.equal(classifyEscapableCheck(CHECK_ESCAPABLE, { maxNodes: 1 }).status, 'unknown');
});

test('mandatory-defense: per-move avoid-mate statuses match chess truth; both kinds present', () => {
  const r = classifyMandatoryDefense(MANDATORY_DEFENSE);
  assert.equal(r.status, 'verified', r.reason);
  for (const entry of r.evidence.moves) {
    const truthPermits = opponentHasMateInOne(afterFen(MANDATORY_DEFENSE, new Chess(MANDATORY_DEFENSE).moves({ verbose: true }).find(m => uci(m) === entry.move)));
    assert.equal(entry.status, truthPermits ? 'failure' : 'success', entry.move);
  }
  assert.deepEqual(r.evidence.permittingMoves, ['g8h8']);
  assert.equal(r.evidence.avoidingMoves.length, new Chess(MANDATORY_DEFENSE).moves().length - 1);
});

test('mandatory-defense: in check, bare kings (no threat) are rejected; tiny budget is unknown', () => {
  assert.equal(classifyMandatoryDefense(IN_CHECK_BLACK).status, 'rejected');
  assert.equal(classifyMandatoryDefense(NO_THREAT).status, 'rejected');
  assert.deepEqual(mateInOneTruth(NO_THREAT), []);
  assert.equal(classifyMandatoryDefense(MANDATORY_DEFENSE, { maxNodes: 1 }).status, 'unknown');
});

test('misleading-improving-move: quiet failing move is not attractive (negative)', () => {
  const r = classifyMisleadingImprovingMove(MANDATORY_DEFENSE);
  assert.equal(r.status, 'rejected', r.reason);
  assert.deepEqual(r.evidence.attractiveFailingMoves, []);
  assert.equal(r.evidence.attractiveDefinition.id, 'capture-or-check');
  assert.match(r.evidence.attractiveDefinition.status, /pending researcher review/);
});

test('misleading-improving-move: precondition failure is rejected; unknown attractive definition throws', () => {
  assert.equal(classifyMisleadingImprovingMove(NO_THREAT).status, 'rejected');
  assert.throws(() => classifyMisleadingImprovingMove(MANDATORY_DEFENSE, { attractive: 'positional' }), /Unknown attractive definition/);
});

test('misleading-improving-move: positive lure matches chess truth', () => {
  const r = classifyMisleadingImprovingMove(MISLEADING);
  assert.equal(r.status, 'verified', r.reason);
  const truthFailing = new Chess(MISLEADING).moves({ verbose: true }).filter(m => opponentHasMateInOne(afterFen(MISLEADING, m))).map(uci);
  assert.deepEqual(truthFailing, ['g8h8']);
  assert.deepEqual(r.evidence.attractiveFailingMoves, [{ move: 'g8h8', san: 'Kxh8', reasons: ['capture'] }]);
  assert.equal(r.evidence.mandatoryDefense.permittingMoves.join(), 'g8h8');
});

test('misleading-improving-move: tiny budget is unknown', () => {
  assert.equal(classifyMisleadingImprovingMove(MISLEADING, { maxNodes: 1 }).status, 'unknown');
});

test('determinism: repeated calls give identical output', () => {
  for (const fen of [MATE_IN_ONE, MANDATORY_DEFENSE]) {
    const first = JSON.stringify(classifyStage2(fen));
    for (let i = 0; i < 2; i++) assert.equal(JSON.stringify(classifyStage2(fen)), first);
  }
});

test('no wall-clock dependence: a jumping performance.now leaves output identical', () => {
  const original = performance.now;
  const baseline = JSON.stringify(classifyStage2(MANDATORY_DEFENSE, { maxNodes: 512 }));
  let tick = 0;
  performance.now = () => (tick += 1e9);
  try {
    assert.equal(JSON.stringify(classifyStage2(MANDATORY_DEFENSE, { maxNodes: 512 })), baseline);
  } finally {
    performance.now = original;
  }
});

test('classifyStage2 returns all four strata keyed by name, and CLASSIFIERS covers them', () => {
  const all = classifyStage2(MATE_IN_ONE);
  assert.deepEqual(Object.keys(all).sort(), Object.keys(CLASSIFIERS).sort());
  assert.deepEqual(Object.keys(all).sort(), ['actual-mate', 'escapable-check', 'mandatory-defense', 'misleading-improving-move']);
  assert.equal(all['actual-mate'].status, 'verified');
  assert.equal(all['escapable-check'].status, 'rejected');
  assert.equal(all['mandatory-defense'].status, 'rejected');
  assert.equal(all['misleading-improving-move'].status, 'rejected');
  assert.deepEqual(strip(classifyStage2(MATE_IN_ONE)), strip(all));
});
