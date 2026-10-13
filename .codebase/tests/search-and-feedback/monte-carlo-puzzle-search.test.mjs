import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { searchMonteCarlo } from '../../src/search-and-feedback/monte-carlo-puzzle-search.mjs';
const uniform = { evaluate: async (_board, moves) => ({ priors: moves.map(() => 1), value: 0.25 }) };

test('seeded sampling reproduces trajectories and different seeds explore different paths', async () => {
  const run = async seed => {
    const traces = [];
  const result = await searchMonteCarlo(uniform, new Chess(), { seed, simulations: 20,
      maxEvaluations: 100, maxDepth: 3, milliseconds: 10000, randomFraction: 1,
      onSimulation: async trace => traces.push(trace) });
    return { traces, candidates: result.candidates, randomState: result.randomState };
  };
  const first = await run(17);
  assert.deepEqual(first, await run(17));
  assert.notDeepEqual(first.traces.map(t => t.moves), (await run(18)).traces.map(t => t.moves));
});

test('depth-limited continuations are unknown rather than backed-up draws', async () => {
  const traces = [];
  const result = await searchMonteCarlo(uniform, new Chess(), { simulations: 8,
    maxDepth: 1, maxEvaluations: 2, milliseconds: 10000,
    onSimulation: async trace => traces.push(trace) });
  assert.equal(result.simulations, 8);
  assert.equal(result.evaluations, 1);
  assert.ok(['legalMoveGenerationMs', 'forcingShortlistMs', 'neuralAssessmentMs', 'pacingWallMs', 'searchWallMs']
    .every(key => Number.isFinite(result.phaseTiming[key]) && result.phaseTiming[key] >= 0));
  assert.ok(result.phaseTiming.neuralAssessmentMs <= result.phaseTiming.searchWallMs);
  assert.equal(result.cutoffs.depth, 8);
  assert.ok(result.candidates.filter(c => c.visits).every(c => c.value === null && c.valueVisits === 0));
  assert.ok(traces.every(t => t.evidence === 'unknown-cutoff' && t.rootEstimate === null));
});

test('mate backups preserve actor perspective for both colors', async () => {
  for (const [fen, wanted] of [['7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', 'f7g7'],
    ['8/8/8/8/8/6k1/5q2/7K b - - 0 1', 'f2g2']]) {
    const traces = [];
    const brain = { evaluate: async (_board, moves) => ({
      priors: moves.map(m => m.from + m.to === wanted ? 1 : 0), value: 0 }) };
    const result = await searchMonteCarlo(brain, new Chess(fen), { simulations: 3,
      maxEvaluations: 2, milliseconds: 10000, uniformMix: 0, randomFraction: 1,
      onSimulation: async trace => traces.push(trace) });
    assert.equal(result.candidates.find(c => c.uci === wanted).value, 1);
    assert.ok(traces.every(t => t.rootEstimate === 1 && t.reason === 'terminal'));
  }
});

test('bounded workspace keeps repetition history and real board intact on evaluator failure', async () => {
  const board = new Chess();
  for (const move of ['Nf3', 'Nf6', 'Ng1', 'Ng8']) board.move(move);
  const original = board.pgn(); let calls = 0;
  await assert.rejects(searchMonteCarlo({ evaluate: async (hypothetical, moves) => {
    assert.ok(hypothetical.history().length >= 4);
    if (++calls === 2) throw Error('assessment failure');
    return { priors: moves.map(() => 1), value: 0 };
  } }, board, { milliseconds: 10000 }), /assessment failure/);
  assert.equal(board.pgn(), original);
  const result = await searchMonteCarlo(uniform, board, { simulations: 20,
    maxEvaluations: 2, maxNodes: 21, milliseconds: 10000 });
  assert.ok(result.nodes <= 21);
  assert.ok(result.evaluations <= 2);
  assert.equal(board.pgn(), original);
});

test('forcing candidate mode limits neural action presentations and reports omissions', async () => {
  const board = new Chess('7k/8/2q5/8/8/5N2/8/K7 w - - 0 1');
  const seen = [];
  const brain = { evaluate: async (_board, moves) => {
    seen.push(moves.map(move => move.from + move.to));
    return { priors: moves.map(() => 1), value: 0 };
  } };
  const result = await searchMonteCarlo(brain, board, { seed: 9, simulations: 2,
    maxEvaluations: 2, maxDepth: 2, milliseconds: 10000, randomFraction: 1,
    candidateMode: 'forcing', maxCandidates: 8, quietReserve: 2 });
  assert.equal(result.candidateCoverage.mode, 'forcing');
  assert.equal(result.candidateCoverage.expansions, result.evaluations);
  assert.ok(result.candidateCoverage.selectedCandidates < result.candidateCoverage.legalCandidates);
  assert.equal(result.candidateCoverage.rootSelected.length, seen[0].length);
  assert.ok(result.candidateCoverage.rootSelected.some(row => row.tags.includes('new-attack')));
  assert.equal(board.history().length, 0);
});

test('all-legal remains the default candidate mode', async () => {
  const result = await searchMonteCarlo(uniform, new Chess(), { simulations: 1,
    maxEvaluations: 1, milliseconds: 10000 });
  assert.equal(result.candidateMode, 'all-legal');
  assert.equal(result.candidateCoverage.omittedCandidates, 0);
  assert.equal(result.candidateCoverage.selectedCandidates, result.candidateCoverage.legalCandidates);
});

test('the declared puzzle objective and horizon reach every neural position evaluation and trace', async () => {
  const task = { objective: 'forced-mate', plies: 3 }, seen = [], traces = [];
  const brain = { evaluate: async (_board, moves, context) => {
    seen.push(context);
    return { priors: moves.map(() => 1), value: 0 };
  } };
  const result = await searchMonteCarlo(brain, new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),
    { simulations: 1, maxEvaluations: 2, task, onSimulation: async trace => traces.push(trace) });
  assert.deepEqual(seen, [task, task]);
  assert.deepEqual(result.task, task);
  assert.deepEqual(traces[0].task, task);
  await assert.rejects(searchMonteCarlo(brain, new Chess(), { task: { objective: 'forced-mate', plies: 2 } }),
    /Invalid Monte Carlo budget/);
});

test('optional forcing prior raises forcing-action exploration without changing default policy', async () => {
  const board = new Chess('5r1k/6pp/7N/8/2Q5/8/8/K7 w - - 0 1');
  const run = forcingPriorMix => searchMonteCarlo(uniform, board, { simulations: 1,
    maxEvaluations: 1, milliseconds: 10000, candidateMode: 'forcing',
    maxCandidates: 16, quietReserve: 4, uniformMix: 0, forcingPriorMix });
  const neuralOnly = await run(0), biased = await run(0.5);
  const neuralWinningPrior = neuralOnly.candidates.find(c => c.uci === 'c4g8').prior;
  const biasedWinningPrior = biased.candidates.find(c => c.uci === 'c4g8').prior;
  const biasedQuietPrior = biased.candidates.find(c => c.uci === 'h6g8').prior;
  assert.ok(biasedWinningPrior > neuralWinningPrior);
  assert.ok(biasedWinningPrior > biasedQuietPrior);
  assert.equal(biased.forcingPriorMix, 0.5);
  await assert.rejects(searchMonteCarlo(uniform, board, { simulations: 1,
    maxEvaluations: 1, candidateMode: 'all-legal', forcingPriorMix: 0.5 }), /Invalid Monte Carlo budget/);
});
