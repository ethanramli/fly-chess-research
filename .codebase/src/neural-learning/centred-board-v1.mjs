// Board descriptions for the retrieval check (2026-11-03). Symbolic chess only: no brain, no eyes.
// Each function takes a FEN before the move and a UCI move, and returns a Float64Array.
// The board is shown AFTER the move, from the mover's side: own pieces are planes 0-5, opponent planes 6-11.
import { Chess } from 'chess.js';

const PIECES = 'pnbrqk';

// Apply the UCI move to the FEN. Returns the chess.js game and the mover's colour ('w' or 'b').
function afterMove(fen, uci) {
  const game = new Chess(fen);
  const move = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
  if (uci.length === 5) move.promotion = 'q';
  const result = game.move(move);
  if (!result) throw new Error(`Illegal move ${uci} in ${fen}`);
  return { game, mover: result.color, target: uci.slice(2, 4) };
}

// Rank after colour normalisation. Black's view is flipped so its own pieces start at the bottom.
function viewRank(rank, mover) {
  return mover === 'b' ? 9 - rank : rank;
}

// Plane index: own pieces 0-5, opponent 6-11, by piece type order 'pnbrqk'.
function planeOf(piece, mover) {
  return (piece.color === mover ? 0 : 6) + PIECES.indexOf(piece.type);
}

// Whole board, 8x8 per plane. Square index = (rank-1)*8 + file, after the flip.
export function planesWhole(fen, move) {
  const { game, mover } = afterMove(fen, move);
  const out = new Float64Array(12 * 64);
  for (let r = 1; r <= 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = game.get(String.fromCharCode(97 + f) + r);
      if (!piece) continue;
      const vr = viewRank(r, mover);
      out[planeOf(piece, mover) * 64 + (vr - 1) * 8 + f] = 1;
    }
  }
  return out;
}

// 15x15 grid centred on the landing square, so the moved piece sits at (7,7).
export function planesCentred(fen, move) {
  const { game, mover, target } = afterMove(fen, move);
  const tf = target.charCodeAt(0) - 97;
  const tr = viewRank(Number(target[1]), mover);
  const out = new Float64Array(12 * 225);
  for (let r = 1; r <= 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = game.get(String.fromCharCode(97 + f) + r);
      if (!piece) continue;
      const dx = f - tf;
      const dy = viewRank(r, mover) - tr;
      out[planeOf(piece, mover) * 225 + (dy + 7) * 15 + (dx + 7)] = 1;
    }
  }
  return out;
}

// Centred planes plus 12 counts: how many pieces of each (own/opponent, type) attack the landing square.
// CHEAT REFERENCE: this hands over the attack relation directly. It shows an upper bound when the
// relation is given, not a description the fly could build from its own eyes.
export function planesCentredAttack(fen, move) {
  const { game, mover, target } = afterMove(fen, move);
  const base = planesCentred(fen, move);
  const out = new Float64Array(12 * 225 + 12);
  out.set(base);
  const attackerColours = [mover, mover === 'w' ? 'b' : 'w'];
  attackerColours.forEach((colour, side) => {
    for (const sq of game.attackers(target, colour)) {
      const piece = game.get(sq);
      const plane = (side === 0 ? 0 : 6) + PIECES.indexOf(piece.type);
      out[12 * 225 + plane] += 1;
    }
  });
  return out;
}
