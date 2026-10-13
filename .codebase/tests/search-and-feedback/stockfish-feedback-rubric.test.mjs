import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { gradeStockfishChoice, conservativeValueError } from '../../src/search-and-feedback/stockfish-feedback-rubric.mjs';

function fixture() {
  const board = new Chess();
  const engine = { binarySha256: 'a'.repeat(64), settingsHash: 'b'.repeat(64) };
  const moves = board.moves({ verbose: true });
  const chosen = moves[0].from + moves[0].to;
  const analyses = moves.flatMap(move => [100, 200].map(budget => {
    const child = new Chess(); child.loadPgn(board.pgn()); child.move(move);
    return { move: move.from + move.to, budget, engine, fen: child.fen(), pgn: child.pgn(),
      completed: true, transcript: ['info depth 10 score cp 0 wdl 0 1000 0 nodes 200 pv a7a6'] };
  }));
  return { criterion: 'full-game-expected-score', context: { fen: board.fen(), pgn: board.pgn() },
    actor: 'w', chosen, engine, analyses };
}

test('graded feedback distinguishes tied best, inaccuracy and blunder with actor perspective', () => {
  const review = fixture();
  assert.equal(gradeStockfishChoice(review).grade, 'engine-near-best');
  // Child is black to move: black winning probability is white regret.
  for (const record of review.analyses.filter(row => row.move === review.chosen))
    record.transcript = ['info depth 10 score cp 40 wdl 120 880 0 nodes 200 pv a7a6'];
  const mild = gradeStockfishChoice(review);
  assert.equal(mild.grade, 'inaccuracy');
  assert.ok(mild.signal < 0);
  for (const record of review.analyses.filter(row => row.move === review.chosen))
    record.transcript = ['info depth 10 score cp 200 wdl 400 600 0 nodes 200 pv a7a6'];
  const severe = gradeStockfishChoice(review);
  assert.equal(severe.grade, 'blunder');
  assert.ok(severe.signal < mild.signal);
  assert.equal(conservativeValueError(severe, 0).error, -0.4);
});

test('missing coverage and latest bounded estimates cannot teach', () => {
  const missing = fixture(); missing.analyses.pop();
  assert.equal(gradeStockfishChoice(missing).teachingAllowed, false);
  const bounded = fixture();
  bounded.analyses[0].transcript.push('info depth 11 score cp 100 lowerbound wdl 400 600 0 nodes 400 pv a7a6');
  const grade = gradeStockfishChoice(bounded);
  assert.equal(grade.grade, 'unknown');
  assert.equal(conservativeValueError(grade, 0).available, false);
});

test('budget disagreement withholds directional error and forged identities fail', () => {
  const review = fixture();
  review.analyses[0].transcript = ['info depth 10 score cp 100 wdl 400 600 0 nodes 200 pv a7a6'];
  review.analyses[1].transcript = ['info depth 10 score cp -100 wdl 0 600 400 nodes 200 pv a7a6'];
  const grade = gradeStockfishChoice(review);
  assert.equal(grade.signal, 0);
  assert.equal(conservativeValueError(grade, 0).available, false);
  const forged = fixture(); forged.analyses[0].engine = { ...forged.engine, settingsHash: 'c'.repeat(64) };
  assert.throws(() => gradeStockfishChoice(forged), /Mixed teacher identity/);
  const wrongBoard = fixture(); wrongBoard.analyses[0].fen = wrongBoard.context.fen;
  assert.throws(() => gradeStockfishChoice(wrongBoard), /child position mismatch/);
});
