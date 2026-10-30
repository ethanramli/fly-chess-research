import { uci } from './experimental-puzzle-search.mjs';
import { Chess } from 'chess.js';

const squareSet = board => new Map(board.board().flat().filter(Boolean).map(p => [p.square, `${p.color}${p.type}`]));

// Public-state delta only. This is an input/search hypothesis, not a visual
// pathway and not a teacher label.
export function positionDelta(before, after) {
  const a = squareSet(before), b = squareSet(after);
  const changedSquares = [...new Set([...a.keys(), ...b.keys()])].filter(s => a.get(s) !== b.get(s)).sort();
  const captures = changedSquares.filter(s => a.has(s) && !b.has(s));
  const arrivals = changedSquares.filter(s => b.has(s) && (!a.has(s) || a.get(s) !== b.get(s)));
  return { changedSquares, captures, arrivals, sideToMove: after.turn(),
    check: after.isCheck(), realHistoryPlies: after.history().length };
}

function candidateTags(board, move, delta) {
  const tags = new Set();
  if (move.captured) tags.add('capture');
  if (delta.captures.includes(move.to)) tags.add('recapture-or-capture-on-changed-square');
  if (delta.changedSquares.includes(move.from) || delta.changedSquares.includes(move.to)) tags.add('touches-delta');
  const next = new Chess(board.fen()); next.move(move);
  if (next.isCheck()) tags.add('check');
  if (move.captured && delta.captures.includes(move.to)) tags.add('recapture');
  return [...tags].sort();
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
  const forcing = rows.filter(r => r.tags.some(t => ['check', 'capture', 'recapture', 'touches-delta'].includes(t)));
  const quiet = rows.filter(r => r.tags.length === 0);
  const chosen = [...forcing.slice(0, maxCandidates - quietReserve), ...quiet.slice(0, quietReserve)];
  // If fewer forcing moves exist, fill from remaining legal moves deterministically.
  for (const row of rows) if (chosen.length < maxCandidates && !chosen.includes(row)) chosen.push(row);
  return { candidates: chosen.slice(0, maxCandidates), legalCount: legal.length,
    omitted: legal.length - Math.min(maxCandidates, legal.length), delta };
}
