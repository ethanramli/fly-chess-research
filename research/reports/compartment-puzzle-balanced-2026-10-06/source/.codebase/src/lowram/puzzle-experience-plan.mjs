import { Chess } from 'chess.js';
import { searchMonteCarlo } from './monte-carlo-puzzle-search.mjs';
import { reviewTracedExperience } from './trace-consequence-review.mjs';
import { verifiedExperience } from './verified-feedback.mjs';
import { certifyMate } from './mate-certificate.mjs';
import { uci } from './experimental-puzzle-search.mjs';
import { explainVerifiedLine } from './verified-line-explanation.mjs';

export function experienceBoard(row) {
  if (!row || !['train', 'fixture'].includes(row.split) || row.objective !== 'forced-mate'
    || ![1, 3, 5, 7].includes(row.plies) || typeof row.fen !== 'string'
    || typeof row.group !== 'string' || !row.group.length)
    throw Error('Require declared training/fixture family and supported task');
  const board = new Chess(row.fen);
  if (row.pgn !== undefined) {
    if (typeof row.pgn !== 'string' || row.pgn.length > 65536) throw Error('Oversized task history');
    board.loadPgn(row.pgn);
    if (board.fen() !== row.fen) throw Error('Task FEN and history disagree');
  }
  if (board.isGameOver() || board.history().length > 512) throw Error('Finished or oversized task');
  return board;
}

// This prepares experiences; only the separate neural receiver may adapt state.
// The policy receives public board/action context, never puzzle IDs/solutions,
// certificates, diagnostic labels, or feedback generated after commitment.
export async function planPuzzleExperience(brain, row, {
  search = {}, review = {}, maxTraceRecords = 512,
  guard = () => {}, onTrace = async () => {},
} = {}) {
  if (typeof brain?.evaluate !== 'function' || typeof brain?.memoryFingerprint !== 'function'
    || !Number.isSafeInteger(maxTraceRecords) || maxTraceRecords < 1 || maxTraceRecords > 512)
    throw Error('Require bounded read-only policy interface');
  const requested = search.simulations ?? 32;
  if (!Number.isSafeInteger(requested) || requested > maxTraceRecords) throw Error('Trace record budget too small');
  const board = experienceBoard(row), pgn = board.pgn(), fingerprint = brain.memoryFingerprint();
  const task = Object.freeze({ objective: row.objective, plies: row.plies });
  const traces = []; let calls = 0;
  const readOnlyPolicy = { evaluate: async (hypothetical, moves) => {
    guard();
    if (brain.memoryFingerprint() !== fingerprint) throw Error('Learning occurred during investigation');
    const history = hypothetical.pgn();
    const assessment = await brain.evaluate(hypothetical, moves, task); calls++;
    if (hypothetical.pgn() !== history) throw Error('Policy changed hypothetical board');
    if (brain.memoryFingerprint() !== fingerprint) throw Error('Learning occurred during investigation');
    return assessment;
  } };
  const calculation = await searchMonteCarlo(readOnlyPolicy, board, { ...search, guard,
    onSimulation: async trace => {
      guard();
      if (traces.length >= maxTraceRecords) throw Error('Trace capacity exceeded');
      // Storage callbacks receive a copy; cannot rewrite teacher evidence.
      traces.push(trace); await onTrace(structuredClone(trace));
    } });
  if (brain.memoryFingerprint() !== fingerprint || board.pgn() !== pgn)
    throw Error('Investigation changed task or lasting memory');
  guard();
  const consequence = reviewTracedExperience(board, calculation, traces, task,
    { ...review, maxTraces: maxTraceRecords, maxTraceDepth: search.maxDepth ?? 6 });
  const taskProof = certifyMate(board, board.turn(), { plies: task.plies,
    maxNodes: review.maxProofNodes ?? 4096, milliseconds: review.proofMilliseconds ?? 2000 });
  const experiences = [];
  for (const evidence of consequence.evidence) {
    const verified = verifiedExperience(board, evidence.move, task, evidence.proof);
    if (!verified.learningAllowed) continue;
    experiences.push({ ...verified, context: { fen: board.fen(), pgn, task }, proof: evidence.proof,
      role: evidence.move === consequence.chosen ? 'committed-choice' : 'teacher-counterfactual',
      explanation: explainVerifiedLine(board, evidence.move, task, evidence.proof),
      diagnostics: consequence.diagnostics.filter(d => d.candidate === evidence.move || d.move === evidence.move),
      delivery: 'Explicit replay of this board/action with checked consequence; no eligibility through prior search claimed' });
  }
  if (brain.memoryFingerprint() !== fingerprint || board.pgn() !== pgn)
    throw Error('Teacher review changed task or lasting memory');
  return { schema: 'puzzle-experience-plan-v1',
    task: { id: row.id, family: row.group, split: row.split, fen: board.fen(), pgn, ...task },
    memoryFingerprint: fingerprint, policyCalls: calls, calculation, traces, consequence,
    taskProof, experiences, unknownReviewed: consequence.evidence.filter(e => e.proof.status === 'unknown').length,
    scope: 'Read-only investigation and verified replay plan; not neural adaptation, calibrated evaluation error, delayed credit or transfer' };
}
