import { createHash } from 'node:crypto';
import { uci } from './puzzle-search.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Receiver-side replay. It recomputes every legal reply and rejects incomplete,
// reordered, fabricated or action-mismatched certificates.
export function checkCaptureRetentionCertificate(board, move, proof, { maxReplies = 256 } = {}) {
  if (!Number.isSafeInteger(maxReplies) || maxReplies < 1 || maxReplies > 256)
    throw Error('Invalid reply bound');
  const beforeFen = board.fen(), beforePgn = board.pgn(), actor = board.turn();
  const action = board.moves({ verbose: true }).find(candidate => uci(candidate) === move);
  if (!action || !action.captured) throw Error('Capture-retention task requires a legal capture');
  if (proof?.status === 'unknown') {
    if (proof.certificate != null || proof.certificateSha256 != null)
      throw Error('Unknown consequence cannot carry a teaching certificate');
    return { verified: false, status: 'unknown', learningAllowed: false,
      experimentalPulse: null, certificateSha256: null };
  }
  if (!['success', 'failure'].includes(proof?.status) || !proof.certificate
    || proof.certificate.schema !== 'capture-retention-certificate-v1'
    || proof.certificate.rootFen !== beforeFen || proof.certificate.rootPgn !== beforePgn
    || proof.certificate.actor !== actor || proof.certificate.move !== move
    || proof.certificate.target !== action.to) throw Error('Certificate does not bind to this capture');
  board.move(action);
  let replies, recaptures;
  try {
    const legal = board.moves({ verbose: true });
    if (legal.length > maxReplies) return { verified: false, status: 'unknown', learningAllowed: false,
      experimentalPulse: null, certificateSha256: null };
    replies = legal.map(uci).sort();
    recaptures = legal.filter(reply => reply.to === action.to && Boolean(reply.captured)).map(uci).sort();
  } finally {
    board.undo();
    if (board.fen() !== beforeFen || board.pgn() !== beforePgn)
      throw Error('Certificate check changed the source position');
  }
  if (!same(proof.certificate.replies, replies) || !same(proof.certificate.recaptures, recaptures))
    throw Error('Certificate omits or alters legal opponent replies');
  const status = recaptures.length ? 'failure' : 'success';
  const certificateSha256 = digest(proof.certificate);
  if (status !== proof.status || proof.certificateSha256 !== certificateSha256)
    throw Error('Certificate consequence or digest mismatch');
  return { verified: true, status, actor, move, learningAllowed: true,
    experimentalPulse: status === 'failure', certificateSha256,
    meaning: 'One-reply immediate recapturability only; not strategic move quality' };
}
