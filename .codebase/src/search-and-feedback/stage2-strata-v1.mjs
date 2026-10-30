// Stage 2 (king safety, check and mate) stratum predicates, v1. 2026-10-29.
// Purpose: deterministic verdicts that a position belongs to one of the four Stage 2 strata
// (actual-mate, escapable-check, mandatory-defense, misleading-improving-move) before it is
// considered for a Stage 2 experience. The verifier gap audit found no predicate for these.
//
// Evidence rule: every verdict is backed by v2 certificates (mate-certificate-v2.mjs,
// avoid-mate-action-domain-v2.mjs) or by exhaustive legal-move enumeration with chess.js.
// Budgets are node counts only (maxNodes, default 4096). No wall-clock time, search estimate,
// engine score or heuristic is used as a verdict.
//
// Status: 'verified' = the stratum claim is certified; 'rejected' = certified not in the
// stratum (or structurally excluded by the rules); 'unknown' = a node budget was exhausted
// before a verdict. Unknown is never reported as rejected and produces no teaching event.
//
// Horizons: mate certificates at plies 1 cover mate in one only. The avoid-mate domain
// covers an opponent mate in one after the learner's move; quiet mate-in-two threats are NOT
// covered (see documentation/design/puzzle-learning/stage2-prep-2026-10-29/verifier-gap-audit.md).
// Escapable-check checks only that each reply avoids an opponent mate in one.
//
// Not enforced here: the six-piece limit (the data chain's job). pieceCount() is exposed for it.
//
// ENGINEERING DEFINITION, pending researcher review: the curriculum does not define "improving".
// The default 'capture-or-check' lure treats a failing move as attractive if it captures a piece
// or gives check. This is an engineering choice, not a researcher-approved definition.
import { Chess } from 'chess.js';
import { certifyMate } from './mate-certificate-v2.mjs';
import { certifyAvoidMateAction } from './avoid-mate-action-domain-v2.mjs';

const DEFAULT_MAX_NODES = 4096;
const uci = move => move.from + move.to + (move.promotion ?? '');
const cloneBoard = board => { const copy = new Chess(); copy.loadPgn(board.pgn()); return copy; };
const toBoard = input => (typeof input === 'string' ? new Chess(input) : input);
// Removes wall-clock metadata so results are identical across machines and runs.
const plain = value => JSON.parse(JSON.stringify(value, (key, v) => (key === 'elapsedMs' || key === 'millisecondsPerStage' ? undefined : v)));
const result = (stratum, status, reason, evidence) => ({ stratum, status, reason, evidence: plain(evidence) });

const ATTRACTIVE = {
  'capture-or-check': {
    definition: 'A failing move is attractive if it captures a piece (including en passant) or gives check.',
    status: 'engineering definition pending researcher review; the curriculum does not define "improving"',
  },
};

export function pieceCount(input) {
  return toBoard(input).board().flat().filter(Boolean).length;
}

function findKingSquare(board, color) {
  for (const row of board.board()) for (const square of row) if (square && square.type === 'k' && square.color === color) return square.square;
  throw Error(`Side ${color} has no king`);
}

// Squares of the opponent's pieces that give check to the side to move.
function attackingSquares(board) {
  return board.attackers(findKingSquare(board, board.turn()), board.turn() === 'w' ? 'b' : 'w');
}

export function classifyActualMate(input, { maxNodes = DEFAULT_MAX_NODES } = {}) {
  const board = toBoard(input), side = board.turn(), stratum = 'actual-mate';
  const root = certifyMate(board, side, { plies: 1, maxNodes });
  if (root.status === 'unknown') return result(stratum, 'unknown', 'Mate-in-one certificate exhausted its node budget', { side, rootCertificate: root });
  // Each legal move is certified separately: the post-move position is checked at plies 0,
  // which is exactly "this move gives checkmate". A plies-1 certificate cannot be restricted to one root move.
  const moves = board.moves({ verbose: true }).map(move => {
    const after = cloneBoard(board); after.move(move);
    const certificate = certifyMate(after, side, { plies: 0, maxNodes });
    return { move: uci(move), san: move.san, status: certificate.status, certificate };
  });
  if (moves.some(m => m.status === 'unknown')) return result(stratum, 'unknown', 'A post-move mate certificate exhausted its node budget', { side, rootCertificate: root, moves });
  const matingMoves = moves.filter(m => m.status === 'success').map(m => m.move);
  if ((root.status === 'success') !== (matingMoves.length > 0)) throw Error('Root and per-move mate certificates disagree (internal invariant)');
  const evidence = { side, rootCertificate: root, matingMoves, moves };
  if (root.status === 'success') return result(stratum, 'verified', `Side to move has a mate in one (${matingMoves.length} certified mating move(s))`, evidence);
  return result(stratum, 'rejected', 'Certified: no mate in one', evidence);
}

export function classifyEscapableCheck(input, { maxNodes = DEFAULT_MAX_NODES } = {}) {
  const board = toBoard(input), stratum = 'escapable-check';
  if (!board.inCheck()) return result(stratum, 'rejected', 'Side to move is not in check', { inCheck: false });
  const replies = board.moves({ verbose: true });
  if (replies.length === 0) return result(stratum, 'rejected', 'Side to move is checkmated: no legal reply', { inCheck: true, replies: [] });
  const checkers = attackingSquares(board);
  const entries = replies.map(move => {
    const after = cloneBoard(board); after.move(move);
    // En passant captures the pawn beside the destination square, not on it.
    const captured = move.captured ? (move.flags.includes('e') ? move.to[0] + move.from[1] : move.to) : null;
    const type = captured && checkers.includes(captured) ? 'capture-checker' : move.piece === 'k' ? 'king-move' : 'interposition';
    const certificate = certifyMate(after, after.turn(), { plies: 1, maxNodes });
    return { move: uci(move), san: move.san, type, checkmatesOpponent: after.isCheckmate(), opponentMateInOne: certificate.status, certificate };
  });
  const evidence = { inCheck: true, checkerSquares: checkers, replies: entries };
  if (entries.some(e => e.opponentMateInOne === 'failure')) return result(stratum, 'verified', 'At least one legal reply leaves the opponent with no certified mate in one', evidence);
  if (entries.some(e => e.opponentMateInOne === 'unknown')) return result(stratum, 'unknown', 'A reply certificate exhausted its node budget before an escape was certified', evidence);
  return result(stratum, 'rejected', 'Every legal reply permits a certified opponent mate in one', evidence);
}

export function classifyMandatoryDefense(input, { maxNodes = DEFAULT_MAX_NODES } = {}) {
  const board = toBoard(input), stratum = 'mandatory-defense';
  if (board.inCheck()) return result(stratum, 'rejected', 'Side to move is in check: an escapable-check position, not a quiet defense', { inCheck: true });
  const legal = board.moves({ verbose: true });
  if (legal.length === 0) return result(stratum, 'rejected', 'No legal move (stalemate)', { inCheck: false, moves: [] });
  const moves = legal.map(move => {
    const proof = certifyAvoidMateAction(board, uci(move), { maxNodes });
    return { move: uci(move), san: move.san, status: proof.status, proof };
  });
  const evidence = {
    inCheck: false,
    horizon: 'opponent mate in one after the action (avoid-mate-action-domain-v2, child plies 2)',
    moves,
    avoidingMoves: moves.filter(m => m.status === 'success').map(m => m.move),
    permittingMoves: moves.filter(m => m.status === 'failure').map(m => m.move),
  };
  if (moves.some(m => m.status === 'unknown')) return result(stratum, 'unknown', 'An avoid-mate certificate exhausted its node budget for at least one legal move', evidence);
  if (evidence.avoidingMoves.length === 0) return result(stratum, 'rejected', 'Every legal move permits a certified forced opponent mate: no defense exists', evidence);
  if (evidence.permittingMoves.length === 0) return result(stratum, 'rejected', 'No legal move permits an opponent mate: no mandatory-defense threat', evidence);
  return result(stratum, 'verified', 'Some legal moves avoid the certified opponent mate and some do not', evidence);
}

export function classifyMisleadingImprovingMove(input, { attractive = 'capture-or-check', maxNodes = DEFAULT_MAX_NODES } = {}) {
  const stratum = 'misleading-improving-move';
  if (!Object.hasOwn(ATTRACTIVE, attractive)) throw Error(`Unknown attractive definition: ${attractive}`);
  const board = toBoard(input);
  const defense = classifyMandatoryDefense(board, { maxNodes });
  const definition = { id: attractive, ...ATTRACTIVE[attractive] };
  if (defense.status !== 'verified') return result(stratum, defense.status, `Precondition (mandatory-defense) not verified: ${defense.reason}`, { attractiveDefinition: definition, mandatoryDefense: defense.evidence });
  const legal = board.moves({ verbose: true });
  const attractiveFailingMoves = defense.evidence.moves.filter(m => m.status === 'failure').flatMap(m => {
    const move = legal.find(candidate => uci(candidate) === m.move);
    const after = cloneBoard(board); after.move(move);
    const reasons = [...(move.captured ? ['capture'] : []), ...(after.inCheck() ? ['check'] : [])];
    return reasons.length ? [{ move: m.move, san: m.san, reasons }] : [];
  });
  const evidence = { attractiveDefinition: definition, mandatoryDefense: defense.evidence, attractiveFailingMoves };
  if (attractiveFailingMoves.length) return result(stratum, 'verified', `${attractiveFailingMoves.length} failing move(s) are attractive under ${attractive}`, evidence);
  return result(stratum, 'rejected', 'No failing move is attractive under the lure definition', evidence);
}

export const CLASSIFIERS = {
  'actual-mate': classifyActualMate,
  'escapable-check': classifyEscapableCheck,
  'mandatory-defense': classifyMandatoryDefense,
  'misleading-improving-move': classifyMisleadingImprovingMove,
};

export function classifyStage2(input, options = {}) {
  const board = toBoard(input);
  return Object.fromEntries(Object.entries(CLASSIFIERS).map(([name, classify]) => [name, classify(board, options)]));
}
