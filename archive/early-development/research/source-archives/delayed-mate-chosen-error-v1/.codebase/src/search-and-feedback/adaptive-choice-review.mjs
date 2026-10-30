import { copyBoard } from './puzzle-search.mjs';
import { certifyMate } from './mate-certificate.mjs';
import { verifiedExperience } from './verified-feedback.mjs';
import { explainVerifiedLine } from './verified-line-explanation.mjs';

// Teacher-only post-commitment review. This module neither ranks alternatives
// nor calculates neural updates; the existing receiver checks evidence again.
export function reviewCommittedChoice(board, move, task, {
  maxNodes = 4096, milliseconds = 2000,
} = {}) {
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > 100000
    || !Number.isFinite(milliseconds) || milliseconds < 1 || milliseconds > 2000)
    throw Error('Require bounded consequence verification');
  if (task?.objective !== 'forced-mate' || ![1, 3, 5, 7].includes(task.plies)
    || typeof move !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))
    throw Error('Require supported task and committed legal action');
  const pgn = board.pgn(), fen = board.fen(), actor = board.turn();
  const successor = copyBoard(board);
  successor.move({ from: move.slice(0, 2), to: move.slice(2, 4),
    ...(move.length === 5 ? { promotion: move[4] } : {}) });
  const proof = certifyMate(successor, actor, { plies: task.plies - 1, maxNodes, milliseconds });
  const verified = verifiedExperience(board, move, task, proof);
  if (board.pgn() !== pgn || board.fen() !== fen) throw Error('Review changed task position');
  return { ...verified, proof, context: { fen, pgn, task: { objective: task.objective, plies: task.plies } },
    role: 'committed-choice',
    explanation: verified.learningAllowed ? explainVerifiedLine(board, move, task, proof) : null,
    delivery: 'Immediate checked board/action replay; no delayed eligibility or natural reward reconstruction' };
}
