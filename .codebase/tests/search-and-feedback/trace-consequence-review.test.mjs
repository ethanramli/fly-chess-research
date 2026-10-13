import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { searchMonteCarlo } from '../../src/search-and-feedback/monte-carlo-puzzle-search.mjs';
import { reviewTracedExperience } from '../../src/search-and-feedback/trace-consequence-review.mjs';

async function calculation(board) {
  const traces = [];
  const search = await searchMonteCarlo({ evaluate: async (_b, moves) => ({
    priors: moves.map(() => 1), value: 0 }) }, board, {
    seed: 7, simulations: 8, maxDepth: 1, maxEvaluations: 2,
    milliseconds: 10000, onSimulation: async t => traces.push(t) });
  return { search, traces };
}

test('complete replay locates truncated investigations and independently verified unsampled defenses', async () => {
  const board = new Chess(), history = board.pgn();
  const { search, traces } = await calculation(board);
  const review = reviewTracedExperience(board, search, traces, { objective: 'forced-mate', plies: 3 });
  assert.ok(review.diagnostics.some(d => d.kind === 'verified-defense-not-sampled'));
  assert.ok(review.diagnostics.some(d => d.kind === 'localized-incomplete-investigation'));
  assert.equal(review.investigation.completeTraces, true);
  assert.equal(review.investigation.cutoffs.length, 8);
  assert.equal(board.pgn(), history);
});

test('trace truncation, changed leaves, invented visits and cutoff rewards cannot create diagnostics', async () => {
  const board = new Chess(), { search, traces } = await calculation(board);
  const puzzle = { objective: 'forced-mate', plies: 3 };
  assert.throws(() => reviewTracedExperience(board, search, traces.slice(1), puzzle), /Incomplete/);
  for (const mutate of [t => { t[0].leafFen = new Chess().fen(); },
    t => { t[0].rootEstimate = 1; }, t => { t[0].moves[0] = 'a1a8'; }]) {
    const bad = structuredClone(traces); mutate(bad);
    assert.throws(() => reviewTracedExperience(board, search, bad, puzzle));
  }
  const wrong = structuredClone(search); wrong.candidates[0].visits++;
  assert.throws(() => reviewTracedExperience(board, wrong, traces, puzzle), /visits/);
});

test('proof exhaustion remains unknown despite complete investigation traces', async () => {
  const board = new Chess(), { search, traces } = await calculation(board);
  const review = reviewTracedExperience(board, search, traces, { objective: 'forced-mate', plies: 3 },
    { maxProofNodes: 1, nodesPerCandidate: 1 });
  assert.equal(review.teachingExperiences.length, 0);
  assert.ok(review.evidence.every(e => e.proof.status === 'unknown'));
  assert.ok(!review.diagnostics.some(d => d.kind === 'verified-defense-not-sampled'));
});
