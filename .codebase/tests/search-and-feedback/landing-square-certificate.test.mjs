import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyLandingSquare, combinedAnswer } from '../../src/search-and-feedback/landing-square-certificate.mjs';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

test('pinned attacker is not a recapture', () => {
  const board = new Chess('4k3/4b3/8/8/1B6/8/8/4RK2 w - - 0 1');
  const before = board.fen();
  const result = certifyLandingSquare(board, 'b4d6');
  assert.equal(result.status, 'success');
  assert.deepEqual(result.certificate.recaptures, []);
  assert.ok(result.certificate.attackers.includes('e7'));
  assert.deepEqual(result.certificate.pinnedAttackers, ['e7']);
  assert.equal(result.certificate.capture, false);
  assert.equal(board.fen(), before);
});

test('unpinned twin is a recapture', () => {
  const board = new Chess('4k3/4b3/8/8/1B6/8/4P3/4RK2 w - - 0 1');
  const result = certifyLandingSquare(board, 'b4d6');
  assert.equal(result.status, 'failure');
  assert.deepEqual(result.certificate.recaptures, ['e7d6']);
  assert.deepEqual(result.certificate.pinnedAttackers, []);
});

test('quiet move with no attacker', () => {
  const board = new Chess(START);
  const result = certifyLandingSquare(board, 'g1f3');
  assert.equal(result.status, 'success');
  assert.deepEqual(result.certificate.attackers, []);
});

test('queen takes defended pawn is bad exchange', () => {
  const board = new Chess('4k3/8/2p5/3p4/8/8/8/3QK3 w - - 0 1');
  const result = certifyLandingSquare(board, 'd1d5');
  assert.equal(result.status, 'failure');
  assert.equal(result.certificate.moverValue, 9);
  assert.equal(result.certificate.capturedValue, 1);
  assert.equal(combinedAnswer(result.certificate), 'bad');
});

test('pawn takes defended queen is good exchange', () => {
  const board = new Chess('4k3/8/2p5/3q4/4P3/8/8/4K3 w - - 0 1');
  const result = certifyLandingSquare(board, 'e4d5');
  assert.equal(result.status, 'failure');
  assert.equal(result.certificate.moverValue, 1);
  assert.equal(result.certificate.capturedValue, 9);
  assert.equal(combinedAnswer(result.certificate), 'good');
});

test('king moves and illegal moves throw', () => {
  const board = new Chess(START);
  board.move('e2e4');
  board.move('e7e5');
  assert.throws(() => certifyLandingSquare(board, 'e1e2'), /King moves are outside these tasks/);
  assert.throws(() => certifyLandingSquare(board, 'e2e5'), /Task requires a legal move/);
});

test('board is unchanged after each call', () => {
  const board = new Chess(START);
  const fen = board.fen(), pgn = board.pgn();
  certifyLandingSquare(board, 'g1f3');
  assert.equal(board.fen(), fen);
  assert.equal(board.pgn(), pgn);
  const exchange = new Chess('4k3/8/2p5/3p4/8/8/8/3QK3 w - - 0 1');
  const exchangeFen = exchange.fen(), exchangePgn = exchange.pgn();
  certifyLandingSquare(exchange, 'd1d5');
  assert.equal(exchange.fen(), exchangeFen);
  assert.equal(exchange.pgn(), exchangePgn);
});

test('opponent in check after the move has no pinned attackers', () => {
  const board = new Chess('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
  const result = certifyLandingSquare(board, 'a1a8');
  assert.equal(result.certificate.inCheckAfter, true);
  assert.deepEqual(result.certificate.pinnedAttackers, []);
});

test('combinedAnswer rejects null certificate', () => {
  assert.throws(() => combinedAnswer(null));
});
