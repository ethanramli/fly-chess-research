import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { searchCesp99 } from '../../src/search-and-feedback/cesp99-search-adapter.mjs';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('upstream PUCT keeps quiet moves, backs up mate correctly and preserves task/history/memory', async () => {
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const original = board.pgn(), task = { objective: 'forced-mate', plies: 1 };
  const brain = { memoryFingerprint: () => 'fixed', async evaluate(b, moves, supplied) {
    assert.deepEqual(supplied, task);
    return { priors: moves.map(m => m.from === 'f7' && m.to === 'g7' ? 100 : 1), value: 0 };
  } };
  const result = await searchCesp99(brain, board, { simulations: 16, maxEvaluations: 32,
    maxDepth: 4, maxNodes: 4096, milliseconds: 60000, task });
  assert.equal(result.move, 'f7g7'); assert.equal(result.stoppedBy, 'simulations');
  assert.equal(result.traces.length, result.sims);
  assert.equal(result.visits.length, board.moves().length);
  assert.ok(result.visits.find(r => r.uci === 'g6f5')); // quiet alternatives remain eligible
  assert.equal(board.pgn(), original); assert.equal(result.learningApplied, false);
});

test('bounded adapter matches unmodified archived upstream search when bounds do not bind', async () => {
  const helper = pathToFileURL(resolve('.codebase/src/search-and-feedback/vendor/cesp99/policy-for-legal.mjs')).href;
  const original = readFileSync('research/literature/cesp99-calculation-2026-10-07/web/engine/mcts.js', 'utf8')
    .replace("'./flybrain.js'", JSON.stringify(helper));
  const upstream = await import('data:text/javascript;base64,' + Buffer.from(original).toString('base64'));
  const board = new Chess();
  const priors = moves => moves.map((m, i) => i + 1);
  const brain = { memoryFingerprint: () => 'fixed', async evaluate(b, moves) {
    return { priors: priors(moves), value: b.turn() === 'w' ? 0.2 : -0.3 };
  } };
  const scratch = new Chess(), evaluator = { forward(b) {
    return { policy: Float32Array.from(priors(b.moves()), p => Math.log(p)),
      value: b.turn() === 'w' ? 0.2 : -0.3 };
  } };
  const enc = { encodeBoard: b => b, moveToIndex: (m, b) =>
    b.moves({ verbose: true }).findIndex(x => x.from === m.from && x.to === m.to && x.promotion === m.promotion) };
  const direct = await upstream.createSearchAsync(evaluator, scratch, enc, { sims: 8, cPuct: 1.5 });
  while (direct.done < direct.sims) await direct.step();
  const adapted = await searchCesp99(brain, board, { simulations: 8, maxEvaluations: 32,
    maxDepth: 16, maxNodes: 4096, milliseconds: 60000 });
  for (const key of ['move', 'visits', 'rootValue', 'rootPrior', 'sims'])
    assert.deepEqual(adapted[key], direct.result()[key]);
});

test('evaluation/depth cutoffs discard unfinished hypothetical work and reject mutable memory', async () => {
  const board = new Chess(), before = board.pgn();
  const brain = { memoryFingerprint: () => 'fixed', async evaluate(b, moves) {
    return { priors: moves.map(() => 1), value: 0 };
  } };
  const limited = await searchCesp99(brain, board, { maxEvaluations: 1, milliseconds: 60000 });
  assert.equal(limited.evaluations, 1); assert.equal(limited.sims, 0);
  assert.equal(limited.stoppedBy, 'evaluations'); assert.equal(board.pgn(), before);
  const depth = await searchCesp99(brain, board, { maxDepth: 1, simulations: 100,
    maxEvaluations: 100, milliseconds: 60000 });
  assert.equal(depth.stoppedBy, 'depth'); assert.equal(board.pgn(), before);
  let memory = 0;
  await assert.rejects(searchCesp99({ memoryFingerprint: () => String(memory),
    async evaluate(b, moves) { memory++; return { priors: moves.map(() => 1), value: 0 }; }
  }, board), /persistent memory/);
});
