// Independent replay checker. It never calls the certificate solver, search,
// a brain evaluator, or a teacher score. Chess rules provide legal transitions.
import { Chess } from 'chess.js';

export function checkMateCertificate(cert, taskBoard, { attacker, plies, maxNodes = 100000, milliseconds = 2000 } = {}) {
  if (!taskBoard || !['w','b'].includes(attacker) || !Number.isSafeInteger(plies) || plies < 0 || plies > 15 || !Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > 100000 || !Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > 60000) throw Error('Invalid checker contract');
  let nodes = 0; const started = performance.now(), seen = new WeakSet();
  const reject = reason => { throw Error(reason); };
  try {
    if (!cert || cert.schema !== 'bounded-mate-certificate-v1' || cert.attacker !== attacker || cert.plies !== plies || cert.rootFen !== taskBoard.fen() || cert.rootPgn !== taskBoard.pgn()) reject('Certificate is not bound to the requested position, history, actor and horizon');
    const board = new Chess(); board.loadPgn(taskBoard.pgn());
    function replay(node, remaining) {
      if (nodes >= maxNodes || performance.now() - started >= milliseconds) reject('Checker budget exhausted; consequence remains unknown');
      nodes++;
      if (!node || typeof node !== 'object' || seen.has(node) || !['success','failure'].includes(node.status) || !Array.isArray(node.children)) reject('Malformed or repeated proof node');
      seen.add(node);
      let leaf = null;
      if (board.isCheckmate()) leaf = board.turn() === attacker ? 'failure' : 'success';
      else if (board.isDraw() || remaining === 0) leaf = 'failure';
      if (leaf !== null) {
        if (node.status !== leaf || node.children.length !== 0) reject('Terminal/horizon consequence does not match certificate');
        return;
      }
      const legal = board.moves({ verbose: true });
      const moves = new Map(legal.map(m => [m.from + m.to + (m.promotion ?? ''), m]));
      const universal = (board.turn() === attacker && node.status === 'failure') || (board.turn() !== attacker && node.status === 'success');
      const entries = node.children;
      if (!entries.length || entries.length !== (universal ? legal.length : 1) || new Set(entries.map(e => e?.move)).size !== entries.length) reject('Required legal alternatives are missing or duplicated');
      for (const e of entries) {
        if (!moves.has(e.move) || e.node?.status !== node.status) reject('Illegal move or inconsistent branch consequence');
        board.move(moves.get(e.move));
        try { replay(e.node, remaining - 1); } finally { board.undo(); }
      }
    }
    replay(cert.tree, plies);
    return { verified: true, status: cert.tree.status, nodes, elapsedMs: performance.now() - started };
  } catch (error) {
    return { verified: false, status: 'unknown', nodes, elapsedMs: performance.now() - started, reason: error.message };
  }
}
