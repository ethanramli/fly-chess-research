import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { positionDelta, forcingCandidates } from '../src/lowram/delta-forcing-candidates.mjs';

test('delta records opponent changes and forcing shortlist retains a quiet escape', () => {
  const before = new Chess('7k/8/8/8/4r3/8/4K3/4R3 b - - 0 1');
  const after = new Chess(before.fen()); after.move({ from: 'e4', to: 'e3' });
  const delta = positionDelta(before, after);
  assert.deepEqual(delta.changedSquares, ['e3', 'e4']);
  assert.equal(delta.sideToMove, 'w');
  const result = forcingCandidates(after, delta, { maxCandidates: 4, quietReserve: 1 });
  assert.equal(result.legalCount, after.moves().length);
  assert.ok(result.candidates.length <= 4);
  assert.ok(result.candidates.some(v => v.tags.includes('touches-delta')));
  assert.ok(result.candidates.some(v => v.tags.length === 0) || result.candidates.length < 4);
});

test('candidate omission is measurable instead of hidden', () => {
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const result = forcingCandidates(board, { changedSquares: [], captures: [], arrivals: [] }, { maxCandidates: 3, quietReserve: 1 });
  assert.equal(result.legalCount, board.moves().length);
  assert.equal(result.omitted, result.legalCount - result.candidates.length);
  assert.throws(() => forcingCandidates(board, { changedSquares: [] }, { maxCandidates: 0 }));
});
