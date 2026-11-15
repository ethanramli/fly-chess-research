// Shared helpers for the combination roadmap design checks (research/reports/combination-roadmap-2026-11-16/README.md). Design evidence only: no graph, no learner, no sealed games, no files written.
// Independent labellers: reach and pin are computed from board geometry only (no legal-move generator).
import { Chess } from 'chess.js';
import { certifyLandingSquare, combinedAnswer, PIECE_VALUES } from '../../../../.codebase/src/search-and-feedback/landing-square-certificate.mjs';

export { Chess, certifyLandingSquare, combinedAnswer, PIECE_VALUES };

const FILES = 'abcdefgh';
export const SQUARES = [...FILES].flatMap(f => [...'12345678'].map(r => f + r));
const xy = s => [FILES.indexOf(s[0]), Number(s[1]) - 1];
const name = (x, y) => (x >= 0 && x < 8 && y >= 0 && y < 8 ? FILES[x] + (y + 1) : null);
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
export const uciOf = m => m.from + m.to + (m.promotion ?? '');
export const other = c => (c === 'w' ? 'b' : 'w');

export function piecesOf(board, color) {
  return SQUARES.map(s => ({ square: s, ...(board.get(s) ?? {}) })).filter(p => p.type && (!color || p.color === color));
}

// Squares the piece on s attacks by its own movement rule, with blockers; kings and pins are ignored.
export function attacksFrom(board, s) {
  const p = board.get(s);
  if (!p) return [];
  const [x, y] = xy(s), out = [];
  const step = (dx, dy) => { const t = name(x + dx, y + dy); if (t) out.push(t); };
  const ray = (dx, dy) => { for (let k = 1; k < 8; k++) { const t = name(x + k * dx, y + k * dy); if (!t) break; out.push(t); if (board.get(t)) break; } };
  if (p.type === 'p') { const dy = p.color === 'w' ? 1 : -1; step(1, dy); step(-1, dy); }
  if (p.type === 'n') KNIGHT.forEach(([dx, dy]) => step(dx, dy));
  if (p.type === 'k') [...ORTH, ...DIAG].forEach(([dx, dy]) => step(dx, dy));
  if (p.type === 'r' || p.type === 'q') ORTH.forEach(([dx, dy]) => ray(dx, dy));
  if (p.type === 'b' || p.type === 'q') DIAG.forEach(([dx, dy]) => ray(dx, dy));
  return out;
}

// Reach records: every piece of `color` whose movement rule reaches t on this board. No legality, no pins.
export function reachRecords(board, color, t) {
  return piecesOf(board, color).filter(p => attacksFrom(board, p.square).includes(t))
    .map(p => ({ concept: 'reach', piece: p.square, type: p.type, to: t }));
}

// Pin records: a piece of `color` alone on a line between its own king and an enemy line piece.
// line = every square from next to the king up to and including the pinning piece.
export function pinRecords(board, color) {
  const king = piecesOf(board, color).find(p => p.type === 'k');
  if (!king) return [];
  const [kx, ky] = xy(king.square), out = [];
  for (const [dx, dy] of [...ORTH, ...DIAG]) {
    const diagonal = dx !== 0 && dy !== 0, line = [];
    let held = null;
    for (let k = 1; k < 8; k++) {
      const t = name(kx + k * dx, ky + k * dy);
      if (!t) break;
      line.push(t);
      const p = board.get(t);
      if (!p) continue;
      if (held === null) { if (p.color !== color) break; held = t; continue; }
      if (p.color !== color && (p.type === 'q' || p.type === (diagonal ? 'b' : 'r'))) out.push({ concept: 'pin', piece: held, by: t, line: [...line] });
      break;
    }
  }
  return out;
}

export function successor(fen, uci) {
  const board = new Chess(fen);
  const action = board.moves({ verbose: true }).find(m => uciOf(m) === uci);
  if (!action) throw Error(`Illegal ${uci} on ${fen}`);
  const mover = board.turn();
  board.move(action);
  return { board, action, mover, enemy: other(mover), to: action.to };
}

// The records a candidate move puts on the table. No record holds a move's goodness or a legal reply.
export function recordsFor(fen, uci, { kingAttackers = false } = {}) {
  const { board, action, enemy, to } = successor(fen, uci);
  const reach = reachRecords(board, enemy, to).filter(r => kingAttackers || r.type !== 'k');
  const pins = pinRecords(board, enemy);
  const worth = { moved: PIECE_VALUES[action.piece] ?? null, taken: action.captured ? PIECE_VALUES[action.captured] : 0 };
  return { move: uci, to, reach, pins, worth };
}

// The fixed match step. A reach record is cancelled when the same piece has a pin record whose line does not hold the landing square.
// lineAware = false gives the narrower rule ("pinned means cannot capture anywhere") that the pin-line board fools.
export function combine(records, { lineAware = true } = {}) {
  const live = records.reach.filter(r => {
    const pin = records.pins.find(p => p.piece === r.piece);
    if (!pin) return true;
    return lineAware ? pin.line.includes(records.to) : false;
  });
  const loss = live.length ? records.worth.moved : 0;
  return { live: live.map(r => r.piece), score: records.worth.taken - loss };
}

// The checker's answer, from legal replies. King moves are outside the checker.
export function truth(fen, uci) {
  const board = new Chess(fen);
  const action = board.moves({ verbose: true }).find(m => uciOf(m) === uci);
  if (action.piece === 'k') return null;
  const { certificate: c } = certifyLandingSquare(board, uci);
  return { recaptures: c.recaptures, attackers: c.attackers, pinnedAttackers: c.pinnedAttackers, inCheckAfter: c.inCheckAfter,
    moverValue: c.moverValue, capturedValue: c.capturedValue, score: c.capturedValue - (c.recaptures.length ? c.moverValue : 0), answer: combinedAnswer(c) };
}

export function legalStart(fen) {
  const board = new Chess(fen);
  const parts = fen.split(' ');
  parts[1] = other(parts[1]); parts[3] = '-';
  if (new Chess(parts.join(' ')).inCheck()) throw Error(`Side not to move is in check: ${fen}`);
  return board;
}

export const legalMoves = fen => new Chess(fen).moves({ verbose: true }).map(uciOf).sort();
export const material = (board, color) => piecesOf(board, color).filter(p => p.type !== 'k').reduce((s, p) => s + PIECE_VALUES[p.type], 0);
export const pieceCount = board => piecesOf(board).length;
export const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
