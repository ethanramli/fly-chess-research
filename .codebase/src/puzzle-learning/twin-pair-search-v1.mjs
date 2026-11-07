// Finds twin pairs for one board and move by trying every single-square edit (brute force, bounded). Each candidate is checked by makeTwinPair; nothing here decides an answer itself.
import { Chess } from 'chess.js';
import { makeTwinPair } from './twin-pair-generator-v1.mjs';

const FILES = 'abcdefgh';
const TYPES = ['p', 'n', 'b', 'r', 'q'];
const COLORS = ['w', 'b'];
const uciOf = move => move.from + move.to + (move.promotion ?? '');
const noPawnOn = square => square[1] === '1' || square[1] === '8';

// shortcut: brute-force single-square edits (~1,300 checks per move), upgrade to targeted line/attacker edits if generation is too slow.
export function findTwinPairs({ fen, move, task, kinds = ['pin', 'recapture', 'value'], eyes, limitPerKind = 1 }) {
  const board = new Chess(fen);
  const legal = board.moves({ verbose: true }).find(m => uciOf(m) === move);
  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const isCapture = legal?.captured !== undefined;
  const accepted = Object.fromEntries(kinds.map(kind => [kind, 0]));
  const pairs = [];
  let tried = 0;
  const open = () => kinds.some(kind => accepted[kind] < limitPerKind);

  // Opponent piece on a capture's to-square may change type (value edits only); everything else except from/to is open.
  const editsFor = square => {
    const current = board.get(square);
    if (current?.type === 'k' || square === from) return [];
    if (square === to) {
      if (!isCapture || !current) return [];
      return TYPES.filter(type => type !== current.type && !(type === 'p' && noPawnOn(square)))
        .map(type => ({ piece: { type, color: current.color }, editKinds: ['value'] }));
    }
    const edits = current ? [{ piece: null, editKinds: kinds }] : [];
    for (const color of COLORS) {
      for (const type of TYPES) {
        if (type === 'p' && noPawnOn(square)) continue;
        if (current?.type === type && current.color === color) continue;
        edits.push({ piece: { type, color }, editKinds: kinds });
      }
    }
    return edits;
  };

  search: for (const file of FILES) {
    for (let rank = 1; rank <= 8; rank++) {
      const square = file + rank;
      for (const { piece, editKinds } of editsFor(square)) {
        for (const kind of kinds) {
          if (!open()) break search;
          if (!editKinds.includes(kind) || accepted[kind] >= limitPerKind) continue;
          tried++;
          const result = makeTwinPair({ fen, move, edit: { kind, square, piece }, task, eyes });
          if (result.accepted) {
            accepted[kind]++;
            pairs.push({ ...result, edit: { kind, square, piece } });
          }
        }
      }
    }
  }
  return { pairs, tried };
}
