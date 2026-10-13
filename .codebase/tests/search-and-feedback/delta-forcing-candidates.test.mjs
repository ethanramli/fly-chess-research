import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { positionDelta, forcingCandidates } from '../../src/search-and-feedback/delta-forcing-candidates.mjs';

test('delta records opponent changes and ranks the legal check-evasion capture', () => {
  const before = new Chess('7k/8/8/8/4r3/8/4K3/4R3 b - - 0 1');
  const after = new Chess(before.fen()); after.move({ from: 'e4', to: 'e3' });
  const delta = positionDelta(before, after);
  assert.deepEqual(delta.changedSquares, ['e3', 'e4']);
  assert.deepEqual(delta.captures, [], 'the rook move vacated e4 but captured nothing');
  assert.equal(delta.sideToMove, 'w');
  const result = forcingCandidates(after, delta, { maxCandidates: 4, quietReserve: 1 });
  assert.equal(result.legalCount, after.moves().length);
  assert.ok(result.candidates.length <= 4);
  assert.ok(result.candidates.some(v => v.tags.includes('touches-delta')));
  assert.equal(result.candidates[0].uci, 'e2e3');
  assert.ok(result.candidates[0].tags.includes('capture'));
});

test('delta identifies an actual capture square and excludes the moving piece origin', () => {
  const before = new Chess('7k/8/8/8/3p4/8/3R4/K7 w - - 0 1');
  const after = new Chess(before.fen()); after.move({ from: 'd2', to: 'd3' });
  const delta = positionDelta(before, after);
  assert.deepEqual(delta.changedSquares, ['d2', 'd3']);
  assert.deepEqual(delta.captures, []);

  const captured = new Chess('7k/8/8/8/3p4/3R4/8/K7 w - - 0 1');
  const result = new Chess(captured.fen()); result.move({ from: 'd3', to: 'd4' });
  const captureDelta = positionDelta(captured, result);
  assert.deepEqual(captureDelta.captures, ['d4']);
});

test('candidate omission is measurable instead of hidden', () => {
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const result = forcingCandidates(board, { changedSquares: [], captures: [], arrivals: [] }, { maxCandidates: 3, quietReserve: 1 });
  assert.equal(result.legalCount, board.moves().length);
  assert.equal(result.omitted, result.legalCount - result.candidates.length);
  assert.throws(() => forcingCandidates(board, { changedSquares: [] }, { maxCandidates: 0 }));
});

test('newly attacked enemy pieces are prioritized while a quiet reserve remains', () => {
  const board = new Chess('7k/8/2q5/8/8/5N2/8/K7 w - - 0 1');
  const delta = { changedSquares: [], captures: [], arrivals: [] };
  const result = forcingCandidates(board, delta, { maxCandidates: 8, quietReserve: 2 });
  const knightAttack = result.candidates.find(row => row.uci === 'f3e5');
  assert.ok(knightAttack, 'the move that newly attacks the queen should enter the forcing shortlist');
  assert.ok(knightAttack.tags.includes('new-attack'));
  assert.ok(knightAttack.tags.includes('attack-queen'));
  assert.ok(result.candidates.slice(0, -2).some(row => row.tags.includes('new-attack')));
  assert.equal(result.candidates.slice(-2).filter(row => row.tags.length === 0).length, 2);
});

test('checks rank ahead of other forcing candidates and quiet moves', () => {
  const board = new Chess('7k/8/6K1/8/8/8/8/R7 w - - 0 1');
  const result = forcingCandidates(board, { changedSquares: [], captures: [], arrivals: [] },
    { maxCandidates: 4, quietReserve: 1 });
  assert.equal(result.candidates[0].uci, 'a1a8');
  assert.ok(result.candidates[0].tags.includes('check'));
  assert.equal(result.candidates.at(-1).tags.length, 0);
});

test('newly created double attacks receive a fork priority tag', () => {
  const board = new Chess('7k/8/2q1r3/8/8/5N2/8/K7 w - - 0 1');
  const result = forcingCandidates(board, { changedSquares: [], captures: [], arrivals: [] },
    { maxCandidates: 8, quietReserve: 2 });
  const fork = result.candidates.find(row => row.uci === 'f3d4');
  assert.ok(fork, 'the knight move attacking both major pieces should be shortlisted');
  assert.ok(fork.tags.includes('attack-queen'));
  assert.ok(fork.tags.includes('attack-rook'));
  assert.ok(fork.tags.includes('double-attack'));
});
