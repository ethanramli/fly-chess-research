import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { reviewCommittedContrast } from '../../src/search-and-feedback/contrastive-choice-review.mjs';

test('packages a verified failed choice with a verified successful alternative after commitment', () => {
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const fen = board.fen(), pgn = board.pgn();
  const result = reviewCommittedContrast(board, 'f7f6', ['f7h7'],
    { objective: 'forced-mate', plies: 1 });
  assert.equal(result.schema, 'verified-choice-contrast-v1');
  assert.equal(result.choice.status, 'failure');
  assert.equal(result.alternatives[0].status, 'success');
  assert.deepEqual(result.contrast, {
    status: 'verified-failure-versus-success', failureMove: 'f7f6', successfulAlternative: 'f7h7',
    scope: 'The chosen move fails and the reviewed alternative satisfies only the declared bounded objective.',
  });
  assert.deepEqual(result.experiences.map(event => event.role), ['committed-choice', 'teacher-counterfactual']);
  assert.ok(result.experiences.every(event => event.learningAllowed && event.certificateSha256));
  assert.equal(board.fen(), fen); assert.equal(board.pgn(), pgn);
});

test('does not invent a contrast when the committed choice is already successful', () => {
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const result = reviewCommittedContrast(board, 'f7h7', ['f7f6'],
    { objective: 'forced-mate', plies: 1 });
  assert.equal(result.choice.status, 'success');
  assert.equal(result.alternatives[0].status, 'failure');
  assert.equal(result.contrast.status, 'incomplete');
  assert.equal(result.experiences.length, 2);
});

test('verification exhaustion remains unknown and is omitted from teaching experiences', () => {
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const result = reviewCommittedContrast(board, 'f7f6', ['f7h7'],
    { objective: 'forced-mate', plies: 7 }, { maxNodes: 1 });
  assert.ok([result.choice, ...result.alternatives].some(event => event.status === 'unknown'));
  assert.ok(result.experiences.every(event => event.status !== 'unknown'));
  assert.equal(result.contrast.status, 'incomplete');
});

test('rejects duplicate, chosen-as-counterfactual, or oversized alternative sets', () => {
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const task = { objective: 'forced-mate', plies: 1 };
  assert.throws(() => reviewCommittedContrast(board, 'f7f6', ['f7h7', 'f7h7'], task));
  assert.throws(() => reviewCommittedContrast(board, 'f7f6', ['f7f6'], task));
  assert.throws(() => reviewCommittedContrast(board, 'f7f6', Array(9).fill('f7h7'), task));
});

test('reported task identity cannot be overwritten by extra caller properties', () => {
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const result = reviewCommittedContrast(board, 'f7f6', ['f7h7'],
    { objective: 'forced-mate', plies: 1, actor: 'b', fen: 'forged', pgn: 'forged' });
  assert.equal(result.task.actor, 'w');
  assert.equal(result.task.fen, board.fen());
  assert.equal(result.task.pgn, board.pgn());
});
