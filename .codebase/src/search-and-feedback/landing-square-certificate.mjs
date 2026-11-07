// Checker for the transfer and combination tests (documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md). For any legal non-king move, it lists every legal opponent capture of the moved piece on its landing square, the pinned attackers and the exchange values. It is the teacher's checker; the fly never sees it.
import { createHash } from 'node:crypto';
import { uci } from './puzzle-search.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export const PIECE_VALUES = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9 });

export function certifyLandingSquare(board, move, { maxReplies = 256 } = {}) {
  if (!Number.isSafeInteger(maxReplies) || maxReplies < 1 || maxReplies > 256)
    throw Error('Invalid reply bound');
  const beforeFen = board.fen(), beforePgn = board.pgn();
  const action = board.moves({ verbose: true }).find(candidate => uci(candidate) === move);
  if (!action) throw Error('Task requires a legal move');
  if (action.piece === 'k') throw Error('King moves are outside these tasks');
  const actor = board.turn(), opponent = actor === 'w' ? 'b' : 'w', target = action.to;
  board.move(action);
  try {
    const legal = board.moves({ verbose: true });
    const replies = legal.map(uci).sort();
    if (replies.length > maxReplies) return { status: 'unknown', certificate: null };
    const captures = legal.filter(reply => reply.to === target && Boolean(reply.captured));
    const recaptures = captures.map(uci).sort();
    const attackers = board.attackers(target, opponent).sort();
    const inCheckAfter = board.inCheck();
    // When the opponent is not in check, a non-king attacker that cannot legally capture is pinned to its king.
    let kingSquare = null;
    for (const file of 'abcdefgh') for (const rank of '12345678') {
      const piece = board.get(file + rank);
      if (piece && piece.type === 'k' && piece.color === opponent) kingSquare = file + rank;
    }
    const capturingSquares = new Set(captures.map(reply => reply.from));
    const pinnedAttackers = inCheckAfter ? [] : attackers
      .filter(square => square !== kingSquare && !capturingSquares.has(square)).sort();
    const moverValue = PIECE_VALUES[action.piece];
    const capturedValue = action.captured ? PIECE_VALUES[action.captured] : 0;
    const certificate = { schema: 'landing-square-certificate-v1', rootFen: beforeFen,
      rootPgn: beforePgn, actor, move, target, capture: Boolean(action.captured), replies,
      recaptures, attackers, pinnedAttackers, inCheckAfter, moverValue, capturedValue };
    return { status: recaptures.length ? 'failure' : 'success', certificate,
      certificateSha256: digest(certificate) };
  } finally {
    board.undo();
    if (board.fen() !== beforeFen || board.pgn() !== beforePgn)
      throw Error('Certificate generation changed the source position');
  }
}

export function combinedAnswer(certificate) {
  if (!certificate) throw Error('Certificate is required');
  return certificate.recaptures.length === 0 ||
    (certificate.capture && certificate.capturedValue >= certificate.moverValue) ? 'good' : 'bad';
}
