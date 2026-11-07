// Eyes v2 (2026-11-03) is Eyes v1 plus a dim picture of the piece removed by a capture, drawn on the square it was removed from
// (for en passant, the passed pawn's square, not the landing square). Reason: peer review 2026-11-02 found capture and
// non-capture moves gave identical input. It states no attack, pin, legality or safety fact.
import { Chess } from 'chess.js';
import { createHash } from 'node:crypto';
import { createEyesV1 } from './eyes-v1.mjs';

export { loadRetina } from './eyes-v1.mjs';

const CAPTURED = 0.25; // [choice] dimmer than the opponent's own pieces (0.5), fixed before any eye test.
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function createEyesV2(retina, pictures) {
  const v1 = createEyesV1(retina, pictures);
  const { retina_idx, retina_square } = retina;
  if (new Set(retina_idx).size !== retina_idx.length) throw Error('Eyes v2 needs unique photoreceptor indices');
  const identity = hash({ schema: 'eyes-v2', base: v1.identity, captured: CAPTURED });

  function encode(position, action) {
    const fen = typeof position === 'string' ? position : position.fen();
    const base = v1.encode(fen, action);
    const board = new Chess(fen);
    const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === action);
    const mover = board.turn();
    const current = new Map(base.stimulation.map(x => [x.index, x.current]));
    if (move.captured) {
      const removed = move.flags.includes('e') ? move.to[0] + move.from[1] : move.to;
      const ink = v1.pictureInk(move.captured);
      for (let k = 0; k < retina_idx.length; k++) {
        const s = retina_square[k];
        const rank = mover === 'w' ? Math.floor(s / 8) : 7 - Math.floor(s / 8);
        if ('abcdefgh'[s % 8] + (rank + 1) === removed) {
          current.set(retina_idx[k], (current.get(retina_idx[k]) ?? 0) + CAPTURED * ink[k]);
        }
      }
    }
    const stimulation = [];
    for (const index of retina_idx) {
      const c = current.get(index);
      if (c > 0) stimulation.push({ index, current: c });
    }
    const scope = 'Engineered rendering of the board after the candidate move plus a dim picture of any captured piece; no attack, pin, legality or safety fact; legal moves come from outside.';
    return { schema: 'eyes-v2', identity, action, stimulation, scope };
  }

  return Object.freeze({
    identity,
    config: Object.freeze({ ...v1.config, captured: CAPTURED }),
    encode,
    pictureInk: v1.pictureInk,
    cells: v1.cells,
  });
}

// Groups items whose eye input is identical; a group is reported only when its answers differ.
export function inputCollisions(eyes, items) {
  if (!Array.isArray(items)) throw Error('inputCollisions needs an array of items');
  const groups = new Map();
  items.forEach(({ fen, action }, i) => {
    const pairs = eyes.encode(fen, action).stimulation
      .map(({ index, current }) => [index, current])
      .sort((a, b) => a[0] - b[0]);
    const key = hash(pairs);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  });
  return [...groups].flatMap(([key, members]) => {
    const answers = [...new Set(members.map(i => items[i].answer))];
    return answers.length > 1 ? [{ hash: key, answers, items: members }] : [];
  });
}
