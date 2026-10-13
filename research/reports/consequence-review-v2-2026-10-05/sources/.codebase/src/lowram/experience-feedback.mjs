// Post-commitment teacher review. Search never receives these proof results.
import { copyBoard, verifyMate, uci } from './puzzle-search.mjs';

export function reviewPuzzleExperience(taskBoard, calculation, puzzle, {
  maxCandidates = 4, maxProofNodes = 4096, nodesPerCandidate = 1024,
} = {}) {
  if (![maxCandidates, maxProofNodes, nodesPerCandidate].every(n => Number.isSafeInteger(n) && n > 0) || maxCandidates > 16 || maxProofNodes > 100000 || nodesPerCandidate > 100000) throw Error('Invalid bounded review');
  const attacker = taskBoard.turn(), chosen = uci(calculation.move), before = taskBoard.pgn();
  const legal = taskBoard.moves({ verbose: true }), legalByUci = new Map(legal.map(m => [uci(m), m]));
  if (!legalByUci.has(chosen) || puzzle.objective !== 'forced-mate' || !Number.isSafeInteger(puzzle.plies) || puzzle.plies < 1) throw Error('Invalid review task/choice');
  const candidates = calculation.candidates;
  if (!Array.isArray(candidates) || new Set(candidates.map(c => c.uci)).size !== candidates.length || candidates.some(c => !legalByUci.has(c.uci) || !Number.isFinite(c.prior) || c.prior < 0 || !Number.isSafeInteger(c.visits) || c.visits < 0)) throw Error('Invalid investigation records');
  const ranked = [...candidates].sort((a, b) => b.prior - a.prior);
  // Label-blind selection: committed move, initial preference, remaining priors,
  // then legal moves missing from candidate generation. No puzzle answer lookup.
  const queue = [...new Set([chosen, ...ranked.map(c => c.uci), ...legalByUci.keys()])].slice(0, maxCandidates);
  const evidence = []; let nodes = 0;
  for (const move of queue) {
    const board = copyBoard(taskBoard); board.move(legalByUci.get(move));
    const allowance = Math.min(nodesPerCandidate, maxProofNodes - nodes);
    const proof = allowance > 0 ? verifyMate(board, attacker, { plies: puzzle.plies - 1, maxNodes: allowance })
      : { status: 'unknown', reward: null, nodes: 0, attacker, criterion: `force_mate_within_${puzzle.plies - 1}_remaining_plies`, meaning: 'Review budget exhausted; no negative consequence established' };
    nodes += proof.nodes;
    const investigated = candidates.find(c => c.uci === move);
    evidence.push({ move, actor: attacker, startingFen: taskBoard.fen(), successorFen: board.fen(),
      generated: Boolean(investigated), visits: investigated?.visits ?? 0,
      prior: investigated?.prior ?? null, searchEstimate: investigated?.value ?? null,
      verifier: { method: 'exhaustive-bounded-AND-OR-mate-v1', budget: allowance, horizon: puzzle.plies - 1 }, proof });
  }
  if (taskBoard.pgn() !== before) throw Error('Teacher review changed real task history');
  const committed = evidence.find(e => e.move === chosen), alternative = evidence.find(e => e.move !== chosen && e.proof.status === 'success');
  const diagnostics = [];
  for (const e of evidence.filter(e => e.proof.status === 'success')) {
    if (!e.generated) diagnostics.push({ kind: 'candidate-omission', move: e.move, evidence: 'Legal alternative omitted from generated candidates; independently satisfies bounded mate objective' });
    else if (e.visits === 0) diagnostics.push({ kind: 'uninvestigated-verified-alternative', move: e.move, evidence: 'Generated candidate received zero search visits but independently satisfies bounded mate objective' });
  }
  if (committed.proof.status === 'failure' && alternative) diagnostics.push({ kind: 'avoidable-objective-miss', move: chosen, alternative: alternative.move,
    evidence: 'Chosen move fails the stated mate horizon while a reviewed alternative satisfies it; no full-game loss claim' });
  if (calculation.unknownCutoffs > 0) diagnostics.push({ kind: 'depth-or-capacity-cutoff-observed', count: calculation.unknownCutoffs,
    attribution: 'undetermined; current search records do not locate every cutoff on a particular line' });
  const first = ranked[0]?.uci ?? null;
  const firstEvidence = evidence.find(e => e.move === first);
  if (firstEvidence?.proof.status === 'failure' && committed.proof.status === 'success') diagnostics.push({
    kind: 'search-rescued-initial-preference', initialMove: first, chosenMove: chosen,
    evidence: 'Initial highest-prior move fails the bounded objective; committed searched move satisfies it. This identifies a preference weakness, not its neural cause.' });
  const teachingExperiences = evidence.filter(e => e.proof.status !== 'unknown').map(e => ({ move: e.move, actor: attacker,
    outcome: e.proof.status, criterion: e.proof.criterion, role: e.move === chosen ? 'committed-choice' : 'teacher-counterfactual',
    neuralDelivery: 'not-implemented' }));
  return { schema: 'consequence-review-v1', objective: puzzle.objective, plies: puzzle.plies,
    task: { fen: taskBoard.fen(), pgn: before, actor: attacker }, chosen, initialPreference: first,
    evidence, diagnostics, teachingExperiences,
    outcome: { status: committed.proof.status, avoidableMiss: committed.proof.status === 'failure' && Boolean(alternative),
      fullGameConsequence: 'unknown', rootCause: 'undetermined' },
    coverage: { legalMoves: legal.length, generatedCandidates: candidates.length, reviewedCandidates: evidence.length,
      allAlternativesReviewed: evidence.length === legal.length, nodes, maxProofNodes, nodesPerCandidate, maxCandidates },
    limitations: ['Only bounded forced-mate consequences are checked; exchange/compensation feedback is not implemented.',
      'Aggregate root statistics cannot establish a missed defensive reply, an evaluation error, or the cause of a rejected sacrifice.',
      'Review success is an exhaustive AND/OR verifier result; no replayable proof certificate is emitted yet.',
      'Teacher counterfactuals are additional experiences and must be counted; unknowns supply no training event.',
      'Structured evidence is not neural learning or held-out transfer.'] };
}
