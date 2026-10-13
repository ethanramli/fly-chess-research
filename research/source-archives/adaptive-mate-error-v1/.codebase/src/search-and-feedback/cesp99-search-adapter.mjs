import { createSearchAsync } from './vendor/cesp99/mcts.mjs';
import { copyBoard, uci } from './experimental-puzzle-search.mjs';

// Licensed upstream search mechanics, adapted to our serial evaluator and bounds.
// Does not introduce a position-value learner or alter neural parameters.
export async function searchCesp99(brain, realBoard, {
  simulations = 200, maxEvaluations = 16, maxDepth = 6, maxNodes = 4096,
  milliseconds = 2000, exploration = 1.5,
  task = { objective: 'forced-mate', plies: 3 }, guard = () => {},
} = {}) {
  for (const value of [simulations, maxEvaluations, maxDepth, maxNodes])
    if (!Number.isSafeInteger(value) || value < 1 || value > 100000) throw Error('Invalid search bound');
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || !Number.isFinite(exploration)
    || exploration <= 0) throw Error('Invalid search timing/exploration');
  if (maxDepth > 128 || !task || task.objective !== 'forced-mate'
    || ![1, 3, 5, 7].includes(task.plies)
    || Object.keys(task).some(k => !['objective', 'plies'].includes(k))) throw Error('Invalid task/depth');
  const board = copyBoard(realBoard), fingerprint = brain.memoryFingerprint();
  const realFen = realBoard.fen(), realHistory = realBoard.pgn(), traces = [];
  const started = performance.now(), cutoff = Symbol('search cutoff');
  let evaluations = 0, nodes = 1, stoppedBy = 'simulations', search;
  const check = () => { guard(); if (brain.memoryFingerprint() !== fingerprint)
    throw Error('Search changed persistent memory');
    if (performance.now() - started >= milliseconds) { stoppedBy = 'time'; throw cutoff; } };
  const encoding = {
    encodeBoard: current => current,
    moveToIndex: (move, current) => current.moves({ verbose: true }).findIndex(m => uci(m) === uci(move)),
  };
  const evaluator = {
    beforeExpand(count) { check(); if (nodes + count > maxNodes) { stoppedBy = 'nodes'; throw cutoff; }
      if (evaluations >= maxEvaluations) { stoppedBy = 'evaluations'; throw cutoff; } },
    async forward(current) {
      const moves = current.moves({ verbose: true });
      const result = await brain.evaluate(current, moves, task);
      if (!Array.isArray(result.priors) || result.priors.length !== moves.length
        || !result.priors.every(p => Number.isFinite(p) && p >= 0)
        || !Number.isFinite(result.value) || Math.abs(result.value) > 1
        || !(result.priors.reduce((a, b) => a + b, 0) > 0)) throw Error('Invalid neural assessment');
      evaluations++; nodes += moves.length;
      if (brain.memoryFingerprint() !== fingerprint) throw Error('Search changed persistent memory');
      return { policy: Float32Array.from(result.priors, p => p > 0 ? Math.log(p) : -Infinity),
        value: result.value };
    },
  };
  try {
    search = await createSearchAsync(evaluator, board, encoding, { sims: simulations, cPuct: exploration,
      beforeSelect: depth => { check(); if (depth > maxDepth) { stoppedBy = 'depth'; throw cutoff; } },
      onSimulation: trace => traces.push({ index: traces.length, ...trace, task: { ...task },
        evidence: 'model-estimate-or-terminal-rule', learningAllowed: false }) });
    while (search.done < search.sims) { check(); await search.step(); }
  } catch (error) { if (error !== cutoff) throw error; }
  // A cutoff can leave the hypothetical board inside an unfinished traversal.
  // Discard it; neither the real board nor an incomplete simulation is committed.
  if (brain.memoryFingerprint() !== fingerprint) throw Error('Search changed persistent memory');
  if (realBoard.fen() !== realFen || realBoard.pgn() !== realHistory) throw Error('Search changed real task');
  return { ...(search?.result() ?? { move: null, visits: [], sims: 0 }), evaluations, nodes,
    traces,
    stoppedBy, elapsedMs: performance.now() - started, memoryFingerprint: fingerprint,
    evidence: 'search-estimate-only', learningApplied: false,
    source: 'cesp99/fly-chess@3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf' };
}
