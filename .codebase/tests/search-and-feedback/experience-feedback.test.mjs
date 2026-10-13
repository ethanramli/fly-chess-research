import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { reviewPuzzleExperience } from '../../src/search-and-feedback/experience-feedback.mjs';
import { uci } from '../../src/search-and-feedback/puzzle-search.mjs';

function trial(fen, bad, good) {
  const board = new Chess(fen), moves = board.moves({ verbose: true });
  return { board, puzzle: { objective: 'forced-mate', plies: 1 }, calculation: {
    move: moves.find(m => uci(m) === bad), unknownCutoffs: 2,
    candidates: moves.map(m => ({ uci: uci(m), prior: uci(m) === good ? 1 : 0.01,
      visits: uci(m) === bad ? 5 : 0, value: uci(m) === bad ? 0.8 : null })) } };
}
test('review establishes avoidable objective miss for both colours, preserves history and avoids invented root cause', () => {
  for (const [fen, bad, good] of [
    ['7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', 'f7f6', 'f7g7'],
    ['8/8/8/8/8/6k1/5q2/7K b - - 0 1', 'f2f3', 'f2g2'],
  ]) {
    const t = trial(fen, bad, good), history = t.board.pgn();
    const r = reviewPuzzleExperience(t.board, t.calculation, t.puzzle);
    assert.equal(r.outcome.avoidableMiss, true); assert.equal(r.outcome.rootCause, 'undetermined');
    assert.equal(r.initialPreference, good);
    assert.ok(r.diagnostics.some(d => d.kind === 'uninvestigated-verified-alternative' && d.move === good));
    assert.equal(r.task.actor, t.board.turn()); assert.equal(t.board.pgn(), history);
    assert.ok(r.coverage.nodes <= 4096); assert.equal(r.coverage.reviewedCandidates, 4);
    assert.ok(!r.diagnostics.some(d => ['missed-refutation', 'evaluation-error'].includes(d.kind)));
  }
});
test('exhausted verifier budget supplies no unknown training events or fabricated avoidability', () => {
  const t = trial('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', 'f7f6', 'f7g7');
  const r = reviewPuzzleExperience(t.board, t.calculation, t.puzzle, { maxProofNodes: 1 });
  assert.equal(r.coverage.nodes, 1); assert.equal(r.outcome.avoidableMiss, false);
  assert.equal(r.evidence.find(e => e.move === 'f7g7').proof.status, 'unknown');
  assert.equal(r.teachingExperiences.length, 1);
  assert.equal(r.teachingExperiences[0].role, 'committed-choice');
});
test('incomplete root generation remains explicit and does not invent proof for an unreviewed move', () => {
  const t = trial('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', 'f7f6', 'f7g7');
  t.calculation.candidates = t.calculation.candidates.filter(c => c.uci !== 'f7g7');
  const r = reviewPuzzleExperience(t.board, t.calculation, t.puzzle, { maxCandidates: 1 });
  assert.ok(r.coverage.generatedCandidates < r.coverage.legalMoves);
  assert.equal(r.coverage.allAlternativesReviewed, false);
  assert.equal(r.outcome.avoidableMiss, false);
  assert.ok(!r.diagnostics.some(d => d.kind === 'candidate-omission'));
});
