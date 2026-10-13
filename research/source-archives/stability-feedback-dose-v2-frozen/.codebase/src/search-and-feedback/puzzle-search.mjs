import { Chess } from 'chess.js';

export function uci(move) { return move.from + move.to + (move.promotion ?? ''); }

// Values are always from the current player's perspective.
export function terminalValue(board) {
  if (board.isCheckmate()) return -1;
  if (board.isDraw()) return 0;
  return null;
}

export function copyBoard(board) {
  // FEN alone loses repetition history. Preserve it in the hypothetical board.
  const copy = new Chess();
  copy.loadPgn(board.pgn());
  return copy;
}

function integer(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

// A serial PUCT workspace. No labels, teacher scores, learning or weight updates.
// Deadline is soft: a running evaluator call cannot be interrupted.
export async function searchPuzzle(brain, realBoard, {
  simulations = 16, maxEvaluations = 8, maxDepth = 6, maxNodes = 4096,
  milliseconds = 2000, exploration = 1.5, uniformMix = 0.15,
  guard = () => {}, pace = async () => {},
} = {}) {
  if (!integer(simulations, 1, 100000) || !integer(maxEvaluations, 1, 100000)
    || !integer(maxDepth, 1, 128) || !integer(maxNodes, 1, 100000)
    || !Number.isFinite(milliseconds) || milliseconds <= 0
    || !Number.isFinite(exploration) || exploration <= 0
    || !(uniformMix >= 0 && uniformMix <= 1)) throw Error('Invalid search budget');
  const board = copyBoard(realBoard), started = performance.now();
  const root = { visits: 0, edges: null };
  let evaluations = 0, nodes = 1, completed = 0, terminalLeaves = 0, cutoffs = 0;
  async function expand(node) {
    guard();
    const begin = performance.now(), moves = board.moves({ verbose: true });
    const result = brain.evaluate(board, moves);
    if (result.priors.length !== moves.length || !result.priors.every(p => Number.isFinite(p) && p >= 0)
      || !Number.isFinite(result.value) || Math.abs(result.value) > 1) throw Error('Invalid brain assessment');
    const sum = result.priors.reduce((a, b) => a + b, 0);
    if (!(sum > 0)) throw Error('Empty move distribution');
    evaluations++;
    await pace(performance.now() - begin);
    if (nodes + moves.length > maxNodes) { cutoffs++; return result.value; }
    node.edges = moves.map((move, i) => ({ move, prior: (1 - uniformMix) * result.priors[i] / sum + uniformMix / moves.length,
      visits: 0, sum: 0, child: null }));
    nodes += moves.length;
    return result.value;
  }
  if (terminalValue(board) !== null) throw Error('Cannot search a finished game');
  // Count root assessment even if a too-small node budget prevents expansion.
  const rootMoves = board.moves({ verbose: true });
  if (maxNodes < 1 + rootMoves.length) throw Error('Node budget cannot hold root moves');
  await expand(root);
  for (let iteration = 0; iteration < simulations; iteration++) {
    if (performance.now() - started >= milliseconds || evaluations >= maxEvaluations) break;
    guard();
    let node = root, value = 0;
    const path = [];
    try {
      for (let depth = 0; ; depth++) {
        const terminal = terminalValue(board);
        if (terminal !== null) { value = terminal; terminalLeaves++; break; }
        if (depth >= maxDepth) { cutoffs++; break; } // Unknown, not a verified draw.
        if (!node.edges) { value = await expand(node); break; }
        const scale = Math.sqrt(node.visits + 1);
        let best, bestScore = -Infinity;
        for (const edge of node.edges) {
          const q = edge.visits ? edge.sum / edge.visits : 0;
          const score = q + exploration * edge.prior * scale / (1 + edge.visits);
          if (score > bestScore) { bestScore = score; best = edge; }
        }
        board.move(best.move); path.push({ node, edge: best });
        best.child ??= { visits: 0, edges: null };
        node = best.child;
      }
      node.visits++;
      for (let i = path.length - 1; i >= 0; i--) {
        value = -value;
        const { node: parent, edge } = path[i];
        edge.visits++; edge.sum += value; parent.visits++;
      }
      completed++;
    } finally { for (let i = path.length - 1; i >= 0; i--) board.undo(); }
    await new Promise(resolve => setImmediate(resolve));
  }
  const candidates = root.edges.map(e => ({ uci: uci(e.move), move: e.move,
    visits: e.visits, prior: e.prior, value: e.visits ? e.sum / e.visits : null }));
  const ordered = [...candidates].sort((a, b) => b.visits - a.visits || b.prior - a.prior);
  return { move: ordered[0].move, candidates, evaluations, simulations: completed,
    nodes, terminalLeaves, unknownCutoffs: cutoffs, elapsedMs: performance.now() - started,
    scope: 'Search estimates; visits and cutoff values are not verified puzzle feedback' };
}

// Independent outcome feedback, never called from searchPuzzle or brain.evaluate.
// Exhaustive AND/OR mate proof under depth AND node limits. Unknown is not failure.
export function verifyMate(board, attacker, { plies = 3, maxNodes = 256 } = {}) {
  if (!['w', 'b'].includes(attacker) || !integer(plies, 0, 15) || !integer(maxNodes, 1, 1000000)) throw Error('Invalid mate proof budget');
  const copy = copyBoard(board);
  let nodes = 0;
  function visit(remaining) {
    if (nodes >= maxNodes) return 'unknown';
    nodes++;
    if (copy.isCheckmate()) return copy.turn() !== attacker ? 'success' : 'failure';
    if (copy.isDraw() || remaining === 0) return 'failure';
    const attackTurn = copy.turn() === attacker;
    let unknown = false;
    for (const move of copy.moves({ verbose: true })) {
      copy.move(move);
      let result;
      try { result = visit(remaining - 1); } finally { copy.undo(); }
      if (attackTurn && result === 'success') return 'success';
      if (!attackTurn && result === 'failure') return 'failure';
      if (result === 'unknown') unknown = true;
      if (nodes >= maxNodes && unknown) break;
    }
    return unknown ? 'unknown' : attackTurn ? 'failure' : 'success';
  }
  const status = visit(plies);
  return { status, reward: status === 'unknown' ? null : status === 'success' ? 1 : -1,
    nodes, criterion: `force_mate_within_${plies}_remaining_plies`, attacker,
    meaning: 'Failure means this bounded mate objective was not met, not that the move loses a full game' };
}
