import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { explainVerifiedLine } from '../../src/search-and-feedback/verified-line-explanation.mjs';

function explanation(fen, move, plies = 3, maxNodes = 4096) {
  const board = new Chess(fen), successor = new Chess(fen);
  successor.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
  const proof = certifyMate(successor, board.turn(), { plies: plies - 1, maxNodes, milliseconds: 2000 });
  const history = board.pgn();
  const result = explainVerifiedLine(board, move, { objective: 'forced-mate', plies }, proof);
  assert.equal(board.pgn(), history); return { result, proof };
}

test('verified rook concession and later forced mate are tied to their actual choices and sole defensive reply', () => {
  const { result } = explanation('4r2k/6pr/6K1/7Q/8/8/8/5R2 w - - 0 1', 'f1f8');
  assert.equal(result.status, 'success');
  assert.deepEqual(result.sequence.map(step => step.move), ['f1f8', 'e8f8', 'h5h7']);
  assert.equal(result.sequence[1].onlyLegalReply, true);
  assert.equal(result.sequence[1].captured, 'r');
  assert.equal(result.sequence[1].change, -5);
  assert.equal(result.mateDespiteMaterialConcession, true);
  assert.deepEqual(result.earlierAttackingChoices, [{ ply: 1, move: 'f1f8' }, { ply: 3, move: 'h5h7' }]);
  const black = explanation('8/8/8/8/8/5kq1/6R1/7K b - - 0 1', 'g3g2', 1).result;
  assert.equal(black.actor, 'b'); assert.equal(black.status, 'success');
  assert.equal(black.sequence[0].captured, 'r'); assert.equal(black.sequence[0].change, 5);
});

test('changed support makes the apparent sacrifice fail the same bounded objective', () => {
  const { result } = explanation('4r2k/6pr/8/7Q/6K1/8/8/5R2 w - - 0 1', 'f1f8');
  assert.equal(result.status, 'failure');
  assert.equal(result.mateDespiteMaterialConcession, false);
  assert.match(result.outcome, /full-game outcome unknown/);
});

test('unknown and forged certificates cannot invent a delayed payoff', () => {
  const fen = '4r2k/6pr/6K1/7Q/8/8/8/5R2 w - - 0 1';
  const { result } = explanation(fen, 'f1f8', 3, 1);
  assert.equal(result.status, 'unknown'); assert.equal(result.teachingAllowed, false);
  assert.deepEqual(result.sequence, []);
  const board = new Chess(fen), { proof } = explanation(fen, 'f1f8');
  proof.certificate.tree.children[0].move = 'e8e7';
  assert.throws(() => explainVerifiedLine(board, 'f1f8', { objective: 'forced-mate', plies: 3 }, proof), /certificate/);
});

