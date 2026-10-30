import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { searchMonteCarlo } from '../src/lowram/monte-carlo-puzzle-search.mjs';
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
