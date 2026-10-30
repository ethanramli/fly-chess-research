// Stage 2 counterfactual pair verifier, v1, 2026-10-29.
// Purpose: certify that one legal root move has a different bounded outcome in two
// positions that differ by exactly one edit (principles-curriculum.md Stage 2,
// "Changed-question/counterfactual experience").
// Rules:
// - Same side to move; castling and en-passant fields equal (placement excluded).
// - Board difference as sets of (square, piece): exactly {+p@s}, {-p@s}, or
//   {-p@s1, +p@s2} for the same piece p. Anything else is rejected.
// - `move` (UCI) must be legal in both positions.
// - Outcomes come only from the deterministic v2 verifiers with node budgets:
//   forced-mate: certifyMate (mate-certificate-v2.mjs) on the position after the move
//     with plies = task.plies - 1 and attacker = the mover. success = mate forced
//     within task.plies; failure = not certified as forced within that horizon.
//   avoid-mate (plies 3): certifyAvoidMateAction (avoid-mate-action-domain-v2.mjs).
//     success = no opponent-forced mate within two plies after the action;
//     failure = an opponent-forced mate is certified.
// - verified: both outcomes certified and different.
//   rejected: a precondition fails, or both outcomes are certified and equal.
//   unknown: any certificate is unknown (node budget exhausted).
// - editClass ('escape-square' | 'interposition-route' | 'supporting-piece') is a
//   descriptive label only. It is not part of the verdict.
// No wall-clock time, engine score, search estimate or teacher score enters a decision.
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { certifyMate } from './mate-certificate-v2.mjs';
import { certifyAvoidMateAction } from './avoid-mate-action-domain-v2.mjs';

const FILES = 'abcdefgh';
const uci = move => move.from + move.to + (move.promotion ?? '');
const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const coords = square => [FILES.indexOf(square[0]), Number(square[1]) - 1];

// Map of square -> colour+type code (e.g. 'wk', 'br') for occupied squares.
function pieceMap(board) {
  const map = new Map();
  board.board().forEach((row, r) => row.forEach((piece, c) => {
    if (piece) map.set(FILES[c] + (8 - r), piece.color + piece.type);
  }));
  return map;
}

// Exactly one (square, piece) edit, or null.
function singleEdit(first, second) {
  const a = pieceMap(first), b = pieceMap(second);
  const removed = [...a].filter(([s, p]) => b.get(s) !== p).map(([square, piece]) => ({ square, piece }));
  const added = [...b].filter(([s, p]) => a.get(s) !== p).map(([square, piece]) => ({ square, piece }));
  if (removed.length === 1 && added.length === 0) return { kind: 'remove', piece: removed[0].piece, square: removed[0].square };
  if (removed.length === 0 && added.length === 1) return { kind: 'add', piece: added[0].piece, square: added[0].square };
  if (removed.length === 1 && added.length === 1 && removed[0].piece === added[0].piece) {
    return { kind: 'move', piece: removed[0].piece, from: removed[0].square, to: added[0].square };
  }
  return null;
}

// Strictly between slider square s and king square k, on a line the slider type can travel.
function sliderLine(type, s, k, e) {
  const [sx, sy] = coords(s), [kx, ky] = coords(k), [ex, ey] = coords(e);
  const dx = kx - sx, dy = ky - sy;
  const straight = dx === 0 || dy === 0, diagonal = Math.abs(dx) === Math.abs(dy);
  const travels = type === 'q' ? straight || diagonal : type === 'r' ? straight : diagonal;
  if (!travels || e === s || e === k) return false;
  const collinear = (ex - sx) * dy === (ey - sy) * dx;
  return collinear && Math.min(sx, kx) <= ex && ex <= Math.max(sx, kx) && Math.min(sy, ky) <= ey && ey <= Math.max(sy, ky);
}

function classifyEdit(edit, first, second) {
  const squares = edit.kind === 'move' ? [edit.from, edit.to] : [edit.square];
  const kings = [], sliders = [];
  for (const board of [first, second]) {
    for (const [square, code] of pieceMap(board)) {
      if (code[1] === 'k') kings.push(square);
      if ('brq'.includes(code[1])) sliders.push({ square, type: code[1] });
    }
  }
  const adjacent = (e, k) => Math.max(Math.abs(coords(e)[0] - coords(k)[0]), Math.abs(coords(e)[1] - coords(k)[1])) <= 1;
  if (squares.some(e => kings.some(k => adjacent(e, k)))) return 'escape-square';
  const interposes = squares.some(e => sliders.some(sl => kings.some(k => sliderLine(sl.type, sl.square, k, e))));
  return interposes ? 'interposition-route' : 'supporting-piece';
}

function forcedMateOutcome(board, action, plies, maxNodes) {
  const child = new Chess(board.fen());
  child.move(action);
  const cert = certifyMate(child, board.turn(), { plies: plies - 1, maxNodes });
  return cert.status === 'unknown' ? { status: 'unknown', certificate: null } : { status: cert.status, certificate: cert.certificate };
}

function avoidMateOutcome(board, move, maxNodes) {
  const cert = certifyAvoidMateAction(board, move, { maxNodes });
  return cert.status === 'unknown' ? { status: 'unknown', certificate: null } : { status: cert.status, certificate: cert.proof };
}

export function verifyStage2CounterfactualPair({ first, second, move, task, maxNodes } = {}) {
  if (typeof first !== 'string' || typeof second !== 'string' || typeof move !== 'string') throw new TypeError('first, second and move must be strings');
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > 100000) throw new RangeError('maxNodes must be an integer from 1 to 100000');
  const supported = (task?.objective === 'forced-mate' && [1, 3].includes(task.plies)) || (task?.objective === 'avoid-mate' && task.plies === 3);
  if (!supported || Object.keys(task).sort().join() !== 'objective,plies') throw new TypeError('Unsupported task');

  const bounds = { maxNodes };
  const rejected = (reason, extra = {}) => ({ status: 'rejected', reason, edit: null, editClass: null, outcomes: null, certificates: null, bounds, ...extra });

  let a, b;
  try { a = new Chess(first); b = new Chess(second); } catch { return rejected('invalid-fen'); }
  const fa = a.fen().split(' '), fb = b.fen().split(' ');
  if (fa[1] !== fb[1]) return rejected('side-to-move-differs');
  if (fa[2] !== fb[2] || fa[3] !== fb[3]) return rejected('castling-or-en-passant-differs');

  const edit = singleEdit(a, b);
  if (!edit) return rejected('not-exactly-one-edit');
  const editClass = classifyEdit(edit, a, b);

  const legalAction = board => board.moves({ verbose: true }).find(candidate => uci(candidate) === move);
  const actionA = legalAction(a), actionB = legalAction(b);
  if (!actionA || !actionB) return rejected(actionA ? 'illegal-in-second' : 'illegal-in-first', { edit, editClass });

  const outcome = task.objective === 'forced-mate'
    ? (board, action) => forcedMateOutcome(board, action, task.plies, maxNodes)
    : (board, action) => avoidMateOutcome(board, move, maxNodes);
  const oa = outcome(a, actionA), ob = outcome(b, actionB);
  const outcomes = { first: oa.status, second: ob.status };
  const certificates = { first: oa.certificate ? sha256(oa.certificate) : null, second: ob.certificate ? sha256(ob.certificate) : null };
  const base = { edit, editClass, outcomes, certificates, bounds };

  if (oa.status === 'unknown' || ob.status === 'unknown') return { status: 'unknown', reason: 'certificate-unknown-within-node-budget', ...base };
  if (oa.status === ob.status) return { status: 'rejected', reason: 'outcomes-equal', ...base };
  return { status: 'verified', reason: 'certified-outcomes-differ', ...base };
}
