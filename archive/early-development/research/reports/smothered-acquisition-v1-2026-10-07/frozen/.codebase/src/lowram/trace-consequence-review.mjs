import { copyBoard, terminalValue, uci } from './experimental-puzzle-search.mjs';
import { reviewPuzzleExperience } from './experience-feedback.mjs';

// Post-commitment review only. Complete streamed traces must be replayed before
// describing a reply as unsampled. This does not credit a delayed neural trace.
export function reviewTracedExperience(board, calculation, traces, puzzle, options = {}) {
  const maxTraces = options.maxTraces ?? 4096, maxTraceDepth = options.maxTraceDepth ?? 128;
  if (!Number.isSafeInteger(maxTraces) || maxTraces < 1 || maxTraces > 100000
    || !Number.isSafeInteger(maxTraceDepth) || maxTraceDepth < 1 || maxTraceDepth > 128
    || !Array.isArray(traces) || traces.length > maxTraces
    || traces.length !== calculation.simulations) throw Error('Incomplete or oversized investigation traces');
  const visited = new Map(), seenRoots = new Map(), cutoffs = [];
  for (let i = 0; i < traces.length; i++) {
    const trace = traces[i], hypothetical = copyBoard(board);
    if (trace.index !== i || !Array.isArray(trace.moves) || trace.moves.length > maxTraceDepth
      || !['terminal', 'assessment', 'assessment-capacity', 'depth', 'capacity', 'evaluations', 'time'].includes(trace.reason))
      throw Error('Invalid investigation trace');
    const prefix = [];
    for (const move of trace.moves) {
      const legal = hypothetical.moves({ verbose: true }).find(m => uci(m) === move);
      if (!legal || terminalValue(hypothetical) !== null) throw Error('Illegal investigation continuation');
      hypothetical.move(legal); prefix.push(move);
      visited.set(prefix.join(' '), (visited.get(prefix.join(' ')) ?? 0) + 1);
    }
    if (trace.moves.length) seenRoots.set(trace.moves[0], (seenRoots.get(trace.moves[0]) ?? 0) + 1);
    if (hypothetical.fen() !== trace.leafFen) throw Error('Investigation leaf does not match replay');
    const terminal = terminalValue(hypothetical);
    if (trace.reason === 'terminal') {
      if (terminal === null || trace.evidence !== 'observed-terminal'
        || trace.rootEstimate !== terminal * (trace.moves.length % 2 ? -1 : 1))
        throw Error('Incorrect terminal perspective');
    } else if (['assessment', 'assessment-capacity'].includes(trace.reason)) {
      if (terminal !== null || trace.evidence !== 'model-estimate'
        || !Number.isFinite(trace.rootEstimate) || Math.abs(trace.rootEstimate) > 1)
        throw Error('Invalid model estimate trace');
    } else {
      if (terminal !== null || trace.evidence !== 'unknown-cutoff' || trace.rootEstimate !== null)
        throw Error('A cutoff cannot claim a known outcome');
      cutoffs.push({ simulation: i, moves: trace.moves, leafFen: trace.leafFen, reason: trace.reason });
    }
  }
  if (!Array.isArray(calculation.candidates) || calculation.candidates.some(c => c.visits !== (seenRoots.get(c.uci) ?? 0))
    || [...seenRoots.keys()].some(move => !calculation.candidates.some(c => c.uci === move)))
    throw Error('Root visits disagree with complete traces');
  const review = reviewPuzzleExperience(board, { ...calculation,
    unknownCutoffs: cutoffs.length }, puzzle, options);
  const diagnostics = [];
  for (const evidence of review.evidence) {
    const proof = evidence.proof;
    if (!proof.certificateCheck?.verified) continue;
    const successor = copyBoard(board);
    successor.move(board.moves({ verbose: true }).find(m => uci(m) === evidence.move));
    const tree = proof.certificate.tree;
    // A defender's existential failure branch establishes an escape from this
    // bounded mate objective, independently of the sampled search statistics.
    if (proof.status === 'failure' && proof.certificate.plies > 0
      && terminalValue(successor) === null && successor.turn() !== review.task.actor
      && tree.children.length === 1) {
      const reply = tree.children[0].move, prefix = [evidence.move, reply];
      const sampled = visited.get(prefix.join(' ')) ?? 0;
      diagnostics.push({ kind: sampled ? 'verified-defense-sampled' : 'verified-defense-not-sampled',
        candidate: evidence.move, reply, sampled, criterion: proof.criterion,
        meaning: 'Reply prevents forced mate within the stated horizon; not a full-game loss or a unique best reply' });
    }
    const truncated = cutoffs.filter(t => t.moves[0] === evidence.move);
    if (truncated.length) diagnostics.push({ kind: 'localized-incomplete-investigation',
      candidate: evidence.move, verifiedConsequence: proof.status,
      simulations: truncated.map(t => t.simulation), reasons: [...new Set(truncated.map(t => t.reason))],
      attribution: 'The recorded continuations stopped here; this alone does not prove why the model rejected a move.' });
  }
  return { ...review, schema: 'trace-consequence-review-v1',
    diagnostics: [...review.diagnostics, ...diagnostics],
    investigation: { completeTraces: true, simulations: traces.length, cutoffs,
      defensiveReplyScope: 'Independent bounded-mate certificates, not sampled weak-play success' },
    limitations: [...review.limitations,
      'Located cutoffs and verified unsampled defenses do not establish calibrated evaluation error or delayed neural credit.',
      'Trace records are bounded by the caller and must be streamed for larger training programs.'] };
}
