import { uci } from './experimental-puzzle-search.mjs';
import { Chess } from 'chess.js';

const squareSet = board => new Map(board.board().flat().filter(Boolean).map(p => [p.square, `${p.color}${p.type}`]));
const pieceValue = Object.freeze({ p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 });
const pieceName = Object.freeze({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' });
const namedPieceValue = Object.freeze({ pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9 });

// Public-state delta only. This is an input/search hypothesis, not a visual
// pathway and not a teacher label.
export function positionDelta(before, after) {
  const a = squareSet(before), b = squareSet(after);
  const changedSquares = [...new Set([...a.keys(), ...b.keys()])].filter(s => a.get(s) !== b.get(s)).sort();
  // A vacated origin is a changed square, not a captured piece. The side that
  // just moved is before.turn(); only enemy pieces removed/replaced count.
  const mover = before.turn();
  const captures = changedSquares.filter(s => {
    const previous = a.get(s), current = b.get(s);
    if (!previous || previous[0] === mover) return false;
    return !current || current[0] !== previous[0] || current[1] !== previous[1];
  });
  const arrivals = changedSquares.filter(s => b.has(s) && (!a.has(s) || a.get(s) !== b.get(s)));
  return { changedSquares, captures, arrivals, sideToMove: after.turn(),
    check: after.isCheck(), realHistoryPlies: after.history().length };
}

function candidateTags(board, move, delta) {
  const tags = new Set();
  const actor = board.turn(), enemy = actor === 'w' ? 'b' : 'w';
  if (move.captured) tags.add('capture');
  if (delta.captures.includes(move.to)) tags.add('recapture-or-capture-on-changed-square');
  if (delta.changedSquares.includes(move.from) || delta.changedSquares.includes(move.to)) tags.add('touches-delta');
  const next = new Chess(board.fen()); next.move(move);
  if (next.isCheck()) tags.add('check');
  if (move.captured && delta.captures.includes(move.to)) tags.add('recapture');
  // Include newly created direct or discovered attacks on enemy pieces. This is
  // a public board-geometry feature, not evidence that an attack is sound or
  // that the target cannot be defended.
  let newlyAttackedCount = 0;
  for (const row of next.board()) for (const piece of row) {
    if (!piece || piece.color !== enemy || piece.type === 'k') continue;
    const attackedBefore = new Set(board.attackers(piece.square, actor));
    const newAttackers = next.attackers(piece.square, actor).filter(square => !attackedBefore.has(square));
    if (newAttackers.length) {
      newlyAttackedCount++;
      tags.add('new-attack');
      tags.add(`attack-${pieceName[piece.type]}`);
    }
  }
  if (newlyAttackedCount >= 2) tags.add('double-attack');
  return [...tags].sort();
}

function forcingPriority(row) {
  const tags = new Set(row.tags);
  let score = 0;
  if (tags.has('check')) score += 10_000;
  if (tags.has('capture')) score += 1_000 + 10 * (pieceValue[row.move.captured] ?? 0)
    - (pieceValue[row.move.piece] ?? 0);
  if (tags.has('recapture')) score += 25;
  if (tags.has('new-attack')) {
    const attackedValue = Math.max(0, ...row.tags.filter(tag => tag.startsWith('attack-'))
      .map(tag => namedPieceValue[tag.slice(7)] ?? 0));
    score += 100 + attackedValue * 10;
  }
  if (tags.has('double-attack')) score += 250;
  if (tags.has('touches-delta')) score += 50;
  return score;
}

// Return a bounded forcing shortlist, retaining quiet legal moves as an
// explicit escape hatch. Callers must evaluate all legal moves separately when
// measuring candidate omission.
export function forcingCandidates(board, delta, { maxCandidates = 16, quietReserve = 2 } = {}) {
  if (!Number.isSafeInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 64
    || !Number.isSafeInteger(quietReserve) || quietReserve < 0 || quietReserve > maxCandidates)
    throw Error('Invalid forcing-candidate bound');
  const legal = board.moves({ verbose: true });
  const rows = legal.map(move => ({ move, uci: uci(move), tags: candidateTags(board, move, delta) }));
  const forcing = rows.filter(r => r.tags.some(t => ['check', 'capture', 'recapture', 'new-attack', 'touches-delta'].includes(t)))
    .map((row, order) => Object.assign(row, { priority: forcingPriority(row), order }))
    .sort((a, b) => b.priority - a.priority || a.order - b.order);
  const quiet = rows.filter(r => r.tags.length === 0);
  const chosen = [...forcing.slice(0, maxCandidates - quietReserve), ...quiet.slice(0, quietReserve)];
  // If fewer forcing moves exist, fill from remaining legal moves deterministically.
  for (const row of rows) if (chosen.length < maxCandidates && !chosen.includes(row)) chosen.push(row);
  return { candidates: chosen.slice(0, maxCandidates), legalCount: legal.length,
    omitted: legal.length - Math.min(maxCandidates, legal.length), delta };
}
