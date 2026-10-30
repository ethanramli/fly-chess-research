import { copyBoard, uci } from './experimental-puzzle-search.mjs';
import { verifiedExperience } from './verified-feedback.mjs';

// Fixed teacher rubric units, not learned values or biological reward units.
const units = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 });
function material(board, actor) {
  let balance = 0;
  for (const rank of board.board()) for (const piece of rank) if (piece)
    balance += units[piece.type] * (piece.color === actor ? 1 : -1);
  return balance;
}

// A displayed certificate branch is illustrative. Every defensive alternative
// required by the independent proof remains covered by the full certificate.
// Never claim a sacrifice was necessary just because one winning line has it.
export function explainVerifiedLine(taskBoard, candidate, task, proof) {
  const verified = verifiedExperience(taskBoard, candidate, task, proof);
  if (!verified.learningAllowed) return { status: 'unknown', teachingAllowed: false, sequence: [],
    meaning: 'No complete consequence proof; no concession or payoff teaching claim' };
  const board = copyBoard(taskBoard), actor = taskBoard.turn(), initial = material(board, actor);
  const sequence = [];
  function play(move, coveredDefenses = null) {
    const legal = board.moves({ verbose: true }), found = legal.find(m => uci(m) === move);
    if (!found) throw Error('Certificate illustration contains illegal move');
    const before = material(board, actor), playedBy = board.turn();
    const played = board.move(found), after = material(board, actor);
    sequence.push({ ply: sequence.length + 1, move, san: played.san, playedBy,
      captured: played.captured ?? null, promotion: played.promotion ?? null,
      materialBefore: before, materialAfter: after, change: after - before,
      legalRepliesAtThisNode: playedBy === actor ? null : legal.length,
      certifiedDefensiveBranches: playedBy === actor ? null : coveredDefenses,
      onlyLegalReply: playedBy !== actor && legal.length === 1, successorFen: board.fen() });
  }
  play(candidate);
  let node = proof.certificate.tree;
  while (node.children.length) {
    const entry = [...node.children].sort((a, b) => a.move.localeCompare(b.move))[0];
    play(entry.move, node.children.length); node = entry.node;
  }
  const concession = sequence.some(step => step.materialAfter < initial);
  const actorLosses = sequence.filter(step => step.playedBy !== actor && step.captured)
    .map(step => ({ ply: step.ply, captured: step.captured, units: units[step.captured] }));
  const mate = board.isCheckmate() && board.turn() !== actor;
  if (verified.status === 'success' && !mate) throw Error('Successful certificate illustration does not end in mate');
  return { schema: 'verified-line-explanation-v1', status: verified.status, teachingAllowed: true,
    actor, candidate, criterion: proof.criterion, certificateSha256: verified.certificateSha256,
    materialRubric: { units, initialBalance: initial, finalBalance: material(board, actor),
      scope: 'Conventional fixed material accounting for teacher explanation; not a complete position assessment' },
    sequence, actorLosses, materialConcessionObserved: concession,
    mateDespiteMaterialConcession: verified.status === 'success' && concession,
    earlierAttackingChoices: sequence.filter(step => step.playedBy === actor).map(step => ({ ply: step.ply, move: step.move })),
    outcome: verified.status === 'success' ? 'Forced mate under the stated horizon and covered defenses'
      : 'Forced mate is unavailable under this horizon; full-game outcome unknown',
    limitations: ['One illustrative branch of the independently checked strategy/counterstrategy.',
      'A material concession does not establish necessity, best full-game play, or that the model rejected the move for material reasons.',
      'This explanation is teacher evidence, not a neural evaluation, arbitrary parameter update or validated delayed credit.'] };
}
