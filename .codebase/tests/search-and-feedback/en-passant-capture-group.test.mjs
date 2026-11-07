import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { copyBoard, uci } from '../../src/search-and-feedback/puzzle-search.mjs';

// Black plays d7d5 from real history, so white's e5 pawn may capture en passant on d6.
const recaptured = '4k3/2pp4/8/4P3/8/8/8/4K3 b - - 0 1';
const safe = '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1';
const afterDoublePush = fen => {
  const board = new Chess(fen);
  board.move({ from: 'd7', to: 'd5' });
  return board;
};

test('en-passant capture is recaptured by an ordinary pawn capture after real history', () => {
  const board = afterDoublePush(recaptured);
  const capture = board.moves({ verbose: true }).find(move => uci(move) === 'e5d6');
  assert.match(capture.flags, /e/);
  const proof = certifyCaptureRetention(board, 'e5d6');
  assert.equal(proof.status, 'failure');
  assert.equal(proof.certificate.target, 'd6');
  assert.deepEqual(proof.certificate.recaptures, ['c7d6']);
});

test('safe twin: the same en-passant capture has no recapture without the c7 pawn', () => {
  const proof = certifyCaptureRetention(afterDoublePush(safe), 'e5d6');
  assert.equal(proof.status, 'success');
  assert.deepEqual(proof.certificate.recaptures, []);
});

test('certificate leaves the source board FEN and PGN unchanged', () => {
  for (const fen of [recaptured, safe]) {
    const board = afterDoublePush(fen), before = [board.fen(), board.pgn()];
    certifyCaptureRetention(board, 'e5d6');
    assert.deepEqual([board.fen(), board.pgn()], before);
  }
});

test('no reply to an en-passant capture is itself en passant', () => {
  for (const fen of [recaptured, safe]) {
    const copy = copyBoard(afterDoublePush(fen));
    copy.move({ from: 'e5', to: 'd6' });
    for (const reply of copy.moves({ verbose: true })) assert.doesNotMatch(reply.flags, /e/);
  }
});

test('seeded random games: no reply to any capture is en passant', t => {
  let a = 7;
  const rand = () => (a = (a * 1103515245 + 12345) % 2147483648) / 2147483648;
  let captures = 0;
  for (let game = 0; game < 40; game++) {
    const board = new Chess();
    for (let ply = 0; ply < 60; ply++) {
      const moves = board.moves({ verbose: true });
      if (moves.length === 0) break;
      const move = moves[Math.floor(rand() * moves.length)];
      board.move(move);
      if (!move.captured) continue;
      captures++;
      for (const reply of board.moves({ verbose: true })) assert.doesNotMatch(reply.flags, /e/);
    }
  }
  t.diagnostic(`checked ${captures} captures`);
  assert.ok(captures > 100, `expected more than 100 captures, got ${captures}`);
});
