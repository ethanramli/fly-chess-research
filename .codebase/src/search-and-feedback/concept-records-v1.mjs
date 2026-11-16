// Geometry and the hand-written match step for the Volume 3 development benchmark.
import { Chess } from 'chess.js';

const FILES = 'abcdefgh';
export const SQUARES = [...FILES].flatMap(file => [...'12345678'].map(rank => file + rank));
export const coordinates = square => [FILES.indexOf(square[0]), Number(square[1]) - 1];
export const squareAt = (x, y) => (x >= 0 && x < 8 && y >= 0 && y < 8 ? FILES[x] + (y + 1) : null);
export const opposite = color => color === 'w' ? 'b' : 'w';
const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAGONAL = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
export const DIRECTIONS = [...ORTHOGONAL, ...DIAGONAL];
const WORTH = { p: 1, n: 3, b: 3, r: 5, q: 9 };

class CandidateBoard extends Chess {
  // chess.js 1.4.0 otherwise searches opponent replies to add the mate suffix
  // to SAN. The benchmark uses coordinates and the successor FEN only.
  isCheckmate() {
    return false;
  }
}

export function legalCandidates(fen) {
  return new CandidateBoard(fen).moves({ verbose: true })
    .filter(action => action.piece !== 'k')
    .map(({ from, to, promotion, after, piece, captured }) => ({
      move: from + to + (promotion ?? ''), to, after, piece, captured,
    }));
}

export function reachRecords(board, color, to) {
  return board.attackers(to, color)
    .filter(piece => board.get(piece).type !== 'k')
    .map(piece => ({ concept: 'reach', piece, to }));
}

export function pinRecords(board, color) {
  const king = board.findPiece({ type: 'k', color })[0];
  if (!king) return [];
  const [x, y] = coordinates(king);
  const pins = [];

  for (const [dx, dy] of DIRECTIONS) {
    const pinner = dx && dy ? 'b' : 'r';
    const line = [];
    let piece;
    for (let step = 1; step < 8; step++) {
      const square = squareAt(x + step * dx, y + step * dy);
      if (!square) break;
      line.push(square);
      const occupant = board.get(square);
      if (!occupant) continue;
      if (!piece && occupant.color === color) {
        piece = square;
        continue;
      }
      if (piece && occupant.color !== color && [pinner, 'q'].includes(occupant.type))
        pins.push({ concept: 'pin', piece, by: square, line });
      break;
    }
  }
  return pins;
}

export function recordsForCandidate(candidate) {
  const { move, to, after, piece, captured } = candidate;
  const board = new Chess(after);
  const enemy = board.turn();
  return {
    move,
    to,
    reach: reachRecords(board, enemy, to),
    pins: pinRecords(board, enemy),
    worth: { taken: captured ? WORTH[captured] : 0, moved: WORTH[piece] },
  };
}

export function recordsFor(fen, move) {
  const candidate = legalCandidates(fen).find(action => action.move === move);
  if (!candidate) throw Error(`Expected a legal non-king move: ${move}`);
  return recordsForCandidate(candidate);
}

export function combine({ to, reach, pins, worth }) {
  const live = reach.filter(record => {
    if (record.to !== to) return false;
    const pin = pins.find(held => held.piece === record.piece);
    return !pin || pin.line.includes(to);
  }).map(record => record.piece);
  return { live, score: worth.taken - (live.length ? worth.moved : 0) };
}

export function singleConceptNumbers({ reach, pins, worth }) {
  return [reach.length, pins.length, worth.taken, worth.moved];
}

export function extraConceptsFor({ after, to }) {
  const board = new Chess(after);
  const enemy = board.turn();
  const king = board.findPiece({ type: 'k', color: enemy })[0];
  const extra = [];
  if (board.attackers(to, enemy).includes(king)) extra.push('king reply and guard');
  if (board.attackers(king, opposite(enemy)).some(square => square !== to)) extra.push('check answer');
  return extra;
}
