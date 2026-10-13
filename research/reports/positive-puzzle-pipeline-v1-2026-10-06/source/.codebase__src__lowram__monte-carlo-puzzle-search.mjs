import { copyBoard, terminalValue, uci } from './experimental-puzzle-search.mjs';

const integer = (n, lo, hi) => Number.isSafeInteger(n) && n >= lo && n <= hi;

// A separate experiment: existing frozen deterministic PUCT remains unchanged.
// Both players investigate their own preferences; backups change perspective.
// Random exploration supplies sampled continuations, never best-defense proof.
export async function searchMonteCarlo(brain, realBoard, {
  seed = 1, simulations = 32, maxEvaluations = 16, maxDepth = 6,
  maxNodes = 4096, milliseconds = 2000, exploration = 1.5,
  randomFraction = 0.25, uniformMix = 0.15,
  guard = () => {}, pace = async () => {}, onSimulation = async () => {},
} = {}) {
  if (!integer(seed, 0, 0xffffffff) || !integer(simulations, 1, 100000)
    || !integer(maxEvaluations, 1, 100000) || !integer(maxDepth, 1, 128)
    || !integer(maxNodes, 1, 100000) || !(milliseconds > 0 && Number.isFinite(milliseconds))
    || !(exploration > 0 && Number.isFinite(exploration))
    || !(randomFraction >= 0 && randomFraction <= 1)
    || !(uniformMix >= 0 && uniformMix <= 1)) throw Error('Invalid Monte Carlo budget');
  let randomState = seed >>> 0;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const board = copyBoard(realBoard), started = performance.now();
  const root = { visits: 0, edges: null, capacityBlocked: false };
  let evaluations = 0, nodes = 1, completed = 0, terminalLeaves = 0;
  const cutoffs = { depth: 0, capacity: 0, evaluations: 0, time: 0 };
  const expired = () => performance.now() - started >= milliseconds;
  if (terminalValue(board) !== null) throw Error('Cannot search a finished game');
  if (maxNodes < 1 + board.moves().length) throw Error('Node budget cannot hold root moves');

  async function expand(node) {
    guard();
    const begin = performance.now(), moves = board.moves({ verbose: true });
    const result = await brain.evaluate(board, moves);
    if (!Array.isArray(result.priors) || result.priors.length !== moves.length
      || !result.priors.every(p => Number.isFinite(p) && p >= 0)
      || !Number.isFinite(result.value) || Math.abs(result.value) > 1)
      throw Error('Invalid brain assessment');
    const sum = result.priors.reduce((a, b) => a + b, 0);
    if (!(sum > 0)) throw Error('Empty move distribution');
    evaluations++;
    await pace(performance.now() - begin);
    if (nodes + moves.length > maxNodes) node.capacityBlocked = true;
    else {
      node.edges = moves.map((move, i) => ({ move,
        prior: (1 - uniformMix) * result.priors[i] / sum + uniformMix / moves.length,
        visits: 0, valueVisits: 0, sum: 0, child: null }));
      nodes += moves.length;
    }
    return result.value;
  }
  await expand(root);
  function select(node) {
    if (random() < randomFraction) {
      let threshold = random();
      for (const edge of node.edges) {
        threshold -= edge.prior;
        if (threshold < 0) return edge;
      }
      return node.edges.at(-1);
    }
    const scale = Math.sqrt(node.visits + 1);
    let best, bestScore = -Infinity;
    for (const edge of node.edges) {
      const q = edge.valueVisits ? edge.sum / edge.valueVisits : 0;
      const score = q + exploration * edge.prior * scale / (1 + edge.visits);
      if (score > bestScore) { best = edge; bestScore = score; }
    }
    return best;
  }
  for (let iteration = 0; iteration < simulations; iteration++) {
    if (expired()) { cutoffs.time++; break; }
    if (evaluations >= maxEvaluations) { cutoffs.evaluations++; break; }
    guard();
    const path = [], moves = [];
    let node = root, value = null, reason, leafFen;
    try {
      for (let depth = 0; ; depth++) {
        const terminal = terminalValue(board);
        if (terminal !== null) {
          value = terminal; terminalLeaves++; reason = 'terminal'; break;
        }
        if (expired()) { cutoffs.time++; reason = 'time'; break; }
        if (depth >= maxDepth) { cutoffs.depth++; reason = 'depth'; break; }
        if (node.capacityBlocked) { cutoffs.capacity++; reason = 'capacity'; break; }
        if (!node.edges) {
          if (evaluations >= maxEvaluations) { cutoffs.evaluations++; reason = 'evaluations'; break; }
          value = await expand(node);
          reason = node.capacityBlocked ? 'assessment-capacity' : 'assessment';
          if (node.capacityBlocked) cutoffs.capacity++;
          break;
        }
        const edge = select(node);
        board.move(edge.move); path.push({ node, edge }); moves.push(uci(edge.move));
        edge.child ??= { visits: 0, edges: null, capacityBlocked: false };
        node = edge.child;
      }
      leafFen = board.fen();
      node.visits++;
      for (let i = path.length - 1; i >= 0; i--) {
        if (value !== null) value = -value;
        const { node: parent, edge } = path[i];
        edge.visits++; parent.visits++;
        // A resource cutoff is unknown: no zero-valued draw is backed up.
        if (value !== null) { edge.valueVisits++; edge.sum += value; }
      }
      completed++;
    } finally {
      for (let i = path.length - 1; i >= 0; i--) board.undo();
    }
    // Await streaming consumer. Only this one bounded path is retained here.
    await onSimulation({ index: iteration, moves, leafFen, reason,
      rootEstimate: value, evidence: reason === 'terminal' ? 'observed-terminal'
        : value === null ? 'unknown-cutoff' : 'model-estimate',
      randomState, evaluations });
    await new Promise(resolve => setImmediate(resolve));
  }
  const candidates = root.edges.map(edge => ({ uci: uci(edge.move), move: edge.move,
    visits: edge.visits, valueVisits: edge.valueVisits, prior: edge.prior,
    value: edge.valueVisits ? edge.sum / edge.valueVisits : null }));
  const ordered = [...candidates].sort((a, b) => b.visits - a.visits || b.prior - a.prior);
  return { move: ordered[0].move, candidates, seed, randomState, simulations: completed,
    evaluations, nodes, terminalLeaves, cutoffs, elapsedMs: performance.now() - started,
    stoppedBy: { simulations: completed >= simulations, evaluations: evaluations >= maxEvaluations,
      time: expired(), depth: cutoffs.depth > 0, capacity: cutoffs.capacity > 0 },
    scope: 'Seeded stochastic PUCT; sampled replies and estimates are not independent outcome verification' };
}
