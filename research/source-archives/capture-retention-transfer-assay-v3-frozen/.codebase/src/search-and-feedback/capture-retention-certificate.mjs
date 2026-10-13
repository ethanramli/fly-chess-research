import { createHash } from 'node:crypto';
import { uci } from './puzzle-search.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Teacher-side exhaustive one-reply certificate. This labels only immediate
// recapturability of the moved capturing piece; it is not move-quality feedback.
export function certifyCaptureRetention(board, move, { maxReplies = 256 } = {}) {
  if (!Number.isSafeInteger(maxReplies) || maxReplies < 1 || maxReplies > 256)
    throw Error('Invalid reply bound');
  const beforeFen = board.fen(), beforePgn = board.pgn();
  const action = board.moves({ verbose: true }).find(candidate => uci(candidate) === move);
  if (!action || !action.captured) throw Error('Capture-retention task requires a legal capture');
  const actor = board.turn(), target = action.to;
  board.move(action);
  try {
    const replies = board.moves({ verbose: true }).map(uci).sort();
    if (replies.length > maxReplies) return { status: 'unknown', certificate: null };
    const recaptures = board.moves({ verbose: true })
      .filter(reply => reply.to === target && Boolean(reply.captured)).map(uci).sort();
    const certificate = { schema: 'capture-retention-certificate-v1', rootFen: beforeFen,
      rootPgn: beforePgn, actor, move, target, replies, recaptures };
    return { status: recaptures.length ? 'failure' : 'success', certificate,
      certificateSha256: digest(certificate) };
  } finally {
    board.undo();
    if (board.fen() !== beforeFen || board.pgn() !== beforePgn)
      throw Error('Certificate generation changed the source position');
  }
}
