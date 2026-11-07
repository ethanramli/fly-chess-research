import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { planesWhole, planesCentred, planesCentredAttack } from '../../src/neural-learning/centred-board-v1.mjs';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

test('planesWhole on start position after e2e4', () => {
  const v = planesWhole(START, 'e2e4');
  let ones = 0;
  for (const x of v) ones += x;
  assert.equal(ones, 32);
  let pawns = 0;
  for (let i = 0; i < 64; i++) pawns += v[i];
  assert.equal(pawns, 8);
  assert.equal(v[(4 - 1) * 8 + 4], 1); // own pawn on e4, plane 0
});

test('colour normalisation: black e7e5 shows as own pawn on rank 4, file e', () => {
  const v = planesWhole(AFTER_E4, 'e7e5');
  assert.equal(v[(4 - 1) * 8 + 4], 1);
  // White's e4 pawn is an opponent pawn; flipping rank 4 gives rank 5.
  assert.equal(v[6 * 64 + (5 - 1) * 8 + 4], 1);
});

test('planesCentred puts the moved piece at centre cell (7,7) of its own plane', () => {
  const v = planesCentred(START, 'e2e4');
  assert.equal(v[0 * 225 + 7 * 15 + 7], 1);
  let ones = 0;
  for (const x of v) ones += x;
  assert.equal(ones, 32);
});

test('planesCentredAttack counts an opponent knight attacking the landing square', () => {
  // Black knight c3 attacks a2. White rook a1 moves to a2.
  const fen = '4k3/8/8/8/8/2n5/8/R3K3 w - - 0 1';
  assert.ok(new Chess(fen).move({ from: 'a1', to: 'a2' })); // legal
  const v = planesCentredAttack(fen, 'a1a2');
  assert.equal(v.length, 12 * 225 + 12);
  const oppKnight = 6 + 'pnbrqk'.indexOf('n');
  assert.equal(v[12 * 225 + oppKnight], 1);
});
