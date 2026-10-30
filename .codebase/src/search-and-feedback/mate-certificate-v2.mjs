// v2, 2026-10-29. Derives from mate-certificate.mjs (v1).
// Changed vs v1: construction is bounded by maxNodes only; the milliseconds
// option and the time stop were removed, so a result no longer depends on
// machine load. bounds.millisecondsPerStage is kept as null for field shape.
// elapsedMs is metadata only. Passing milliseconds throws.
// Why: deterministic verified/unknown status for audit replay and parallel runs.
// Certificate schema is unchanged (bounded-mate-certificate-v1).
import { copyBoard, uci } from './puzzle-search.mjs';
import { checkMateCertificate } from './mate-certificate-check-v2.mjs';

export function certifyMate(taskBoard, attacker, { plies = 3, maxNodes = 4096, ...unsupported } = {}) {
  if (Object.hasOwn(unsupported, 'milliseconds')) throw Error('milliseconds budget removed in v2; use maxNodes');
  if (!['w', 'b'].includes(attacker) || !Number.isSafeInteger(plies) || plies < 0 || plies > 15 || !Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > 100000) throw Error('Invalid certificate budget');
  const board = copyBoard(taskBoard), started = performance.now();
  let nodes = 0, stoppedBy = null;
  function visit(remaining) {
    if (nodes >= maxNodes) { stoppedBy = 'nodes'; return null; }
    nodes++;
    if (board.isCheckmate()) return { status: board.turn() !== attacker ? 'success' : 'failure', children: [] };
    if (board.isDraw() || remaining === 0) return { status: 'failure', children: [] };
    const attacking = board.turn() === attacker, children = [];
    let unknown = false;
    for (const move of board.moves({ verbose: true })) {
      board.move(move); let child;
      try { child = visit(remaining - 1); } finally { board.undo(); }
      if (!child) unknown = true;
      else {
        const entry = { move: uci(move), node: child };
        // Existential branch: attacker needs one win; defender needs one escape.
        if ((attacking && child.status === 'success') || (!attacking && child.status === 'failure')) return { status: child.status, children: [entry] };
        children.push(entry);
      }
      if (stoppedBy && unknown) break;
    }
    if (unknown) return null;
    return { status: attacking ? 'failure' : 'success', children };
  }
  const tree = visit(plies);
  const certificate = tree ? { schema: 'bounded-mate-certificate-v1', rootFen: taskBoard.fen(), rootPgn: taskBoard.pgn(), attacker, plies, tree } : null;
  const check = certificate ? checkMateCertificate(certificate, taskBoard, { attacker, plies, maxNodes })
    : { verified: false, status: 'unknown', nodes: 0, reason: 'No complete proof within construction budget' };
  const status = check.verified ? tree.status : 'unknown';
  return { status, reward: status === 'success' ? 1 : status === 'failure' ? -1 : null, nodes,
    attacker, criterion: `force_mate_within_${plies}_remaining_plies`, certificate, certificateCheck: check,
    bounds: { maxNodes, millisecondsPerStage: null, constructionStop: stoppedBy,
      checkingNodes: check.nodes, elapsedMs: performance.now() - started },
    meaning: 'Failure proves only that forced mate cannot be achieved within this horizon; it does not prove a full-game loss' };
}
