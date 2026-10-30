import { copyBoard, uci } from './experimental-puzzle-search.mjs';
import { verifiedExperience } from './verified-feedback.mjs';
import { explainVerifiedLine } from './verified-line-explanation.mjs';

// Explicit teacher replay of independently checked board/action contexts.
// This is not a neural eligibility trace or credit for hypothetical search nodes.
export function verifiedConsequenceClips(taskBoard, candidate, task, proof,
  { maxClips = 4, maxCertificateNodes = 4096 } = {}) {
  if (!Number.isSafeInteger(maxClips) || maxClips < 1 || maxClips > 4
    || !Number.isSafeInteger(maxCertificateNodes) || maxCertificateNodes < 1 || maxCertificateNodes > 4096)
    throw Error('Invalid consequence replay bounds');
  const verified = verifiedExperience(taskBoard, candidate, task, proof);
  if (!verified.learningAllowed) return { status: 'unknown', clips: [],
    meaning: 'Unresolved consequence supplies no replay experience' };
  let nodes = 0; const seen = new Set(), stack = [proof.certificate.tree];
  while (stack.length) {
    const node = stack.pop();
    if (seen.has(node) || ++nodes > maxCertificateNodes) throw Error('Certificate replay capacity or repeated node');
    seen.add(node); for (const entry of node.children) stack.push(entry.node);
  }
  const board = copyBoard(taskBoard), actor = board.turn(), original = board.pgn(), clips = [];
  const prefix = [];
  function append(before, move, contextTask, contextProof) {
    const event = verifiedExperience(before, move, contextTask, contextProof);
    if (!event.learningAllowed || event.actor !== actor) throw Error('Unverified replay context');
    clips.push({ ...event, context: { fen: before.fen(), pgn: before.pgn(), task: contextTask },
      proof: structuredClone(contextProof), role: 'verified-consequence-clip',
      provenance: { originalCandidate: candidate, originalCertificateSha256: verified.certificateSha256,
        precedingMoves: [...prefix], interpretation: 'One illustrative certified branch, replayed as separate experiences; not delayed neural credit' },
      explanation: explainVerifiedLine(before, move, contextTask, contextProof) });
  }
  append(board, candidate, { ...task }, proof);
  const move = board.moves({ verbose: true }).find(m => uci(m) === candidate); board.move(move); prefix.push(candidate);
  let node = proof.certificate.tree;
  while (node.children.length && clips.length < maxClips) {
    const entry = [...node.children].sort((a, b) => a.move.localeCompare(b.move))[0];
    const before = copyBoard(board), remaining = task.plies - prefix.length, attacking = board.turn() === actor;
    const played = board.moves({ verbose: true }).find(m => uci(m) === entry.move);
    if (!played) throw Error('Illegal certified continuation');
    board.move(played);
    if (attacking) {
      if (![1, 3, 5, 7].includes(remaining)) throw Error('Replay horizon perspective mismatch');
      const contextProof = { status: entry.node.status, attacker: actor,
        criterion: `force_mate_within_${remaining - 1}_remaining_plies`,
        certificate: { schema: 'bounded-mate-certificate-v1', rootFen: board.fen(), rootPgn: board.pgn(),
          attacker: actor, plies: remaining - 1, tree: entry.node } };
      append(before, entry.move, { objective: task.objective, plies: remaining }, contextProof);
    }
    prefix.push(entry.move); node = entry.node;
  }
  if (taskBoard.pgn() !== original) throw Error('Consequence replay changed real task history');
  return { status: verified.status, clips, originalCertificateSha256: verified.certificateSha256,
    boundedBy: clips.length === maxClips && node.children.length ? 'clips' : null,
    meaning: 'Teacher presents bounded verified state/action contexts along an illustrative certificate branch. No eligibility mechanism or neural learning is implied.' };
}
