import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { compareCandidateSets } from '../../src/search-and-feedback/paired-candidate-assessment.mjs';

test('paired assessment freezes memory and reports omission and choice agreement', async () => {
  const board = new Chess('7k/8/8/8/4r3/8/4K3/4R3 b - - 0 1'); board.move({ from: 'e4', to: 'e3' });
  let calls = 0;
  const brain = { memoryFingerprint: () => 'frozen', assess: async (_board, moves) => {
    calls += 1; return { memoryFingerprint: 'frozen', rows: moves.map(move => ({
      move: move.from + move.to, score: move.captured ? 1 : 0, MBON12: move.captured ? 1 : 0, MBON01: 0 })),
      choice: moves.find(m => m.captured)?.from + moves.find(m => m.captured)?.to ?? moves[0].from + moves[0].to };
  } };
  const result = await compareCandidateSets(brain, board, {}, { changedSquares: ['e3','e4'], captures: ['e4'] }, { maxCandidates: 3, quietReserve: 1 });
  assert.equal(calls, 2); assert.equal(result.all.legalCount, 5); assert.equal(result.focused.selectedCount, 3);
  assert.equal(result.choiceAgreement, true); assert.equal(result.omitted, 2); assert.equal(result.omittedMoves.length, 2);
});
