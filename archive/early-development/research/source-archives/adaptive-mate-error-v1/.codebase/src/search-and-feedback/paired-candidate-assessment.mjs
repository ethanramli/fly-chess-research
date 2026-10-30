import assert from 'node:assert/strict';
import { forcingCandidates } from './delta-forcing-candidates.mjs';
import { uci } from './experimental-puzzle-search.mjs';

// Compare candidate generation under one frozen memory state. The caller
// supplies a read-only brain; this helper does not teach or select weights.
export async function compareCandidateSets(brain, board, task, delta, options = {}) {
  if (typeof brain?.assess !== 'function' || typeof brain?.memoryFingerprint !== 'function')
    throw Error('Require read-only assessment interface');
  const legal = board.moves({ verbose: true }), before = brain.memoryFingerprint(), history = board.pgn();
  const shortlist = forcingCandidates(board, delta, options);
  const shortMoves = shortlist.candidates.map(v => v.move);
  const all = await brain.assess(board, legal, task);
  if (brain.memoryFingerprint() !== before || board.pgn() !== history) throw Error('All-legal assessment changed state');
  const focused = await brain.assess(board, shortMoves, task);
  if (brain.memoryFingerprint() !== before || board.pgn() !== history) throw Error('Focused assessment changed state');
  assert.equal(all.memoryFingerprint, focused.memoryFingerprint);
  return { all: { ...all, legalCount: legal.length }, focused: { ...focused, legalCount: legal.length,
    selectedCount: shortMoves.length }, omitted: shortlist.omitted,
    omittedMoves: legal.map(uci).filter(move => !shortMoves.some(v => uci(v) === move)),
    choiceAgreement: all.choice === focused.choice,
    delta };
}
