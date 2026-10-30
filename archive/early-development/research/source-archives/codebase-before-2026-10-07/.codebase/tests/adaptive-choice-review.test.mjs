import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { reviewCommittedChoice } from '../src/lowram/adaptive-choice-review.mjs';
import { verifiedExperience } from '../src/lowram/verified-feedback.mjs';

test('committed-choice review binds success and failure without changing the real board', () => {
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const fen = board.fen(), pgn = board.pgn(), task = { objective: 'forced-mate', plies: 1 };
  for (const [move, status] of [['f7h7', 'success'], ['f7f6', 'failure']]) {
    const event = reviewCommittedChoice(board, move, task);
    assert.equal(event.status, status);
    assert.equal(event.actor, 'w');
    assert.equal(event.learningAllowed, true);
    assert.equal(verifiedExperience(board, move, task, event.proof).certificateSha256, event.certificateSha256);
    assert.equal(event.context.fen, fen);
    assert.equal(board.fen(), fen); assert.equal(board.pgn(), pgn);
    const other = move === 'f7h7' ? 'f7f6' : 'f7h7';
    assert.throws(() => verifiedExperience(board, other, task, event.proof), /certificate/);
  }
});

test('verification exhaustion stays unknown and cannot become a teaching event', () => {
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const event = reviewCommittedChoice(board, 'f7f6', { objective: 'forced-mate', plies: 7 }, { maxNodes: 1 });
  assert.equal(event.status, 'unknown'); assert.equal(event.learningAllowed, false);
  assert.equal(event.experimentalPulse, null); assert.equal(event.certificateSha256, null);
  assert.equal(event.explanation, null);
  assert.throws(() => reviewCommittedChoice(board, 'a1a2', { objective: 'forced-mate', plies: 1 }));
  assert.throws(() => reviewCommittedChoice(board, 'f7h7', { objective: 'forced-mate', plies: 1 }, { maxNodes: Infinity }));
});
