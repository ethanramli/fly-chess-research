// Eyes v1 (2026-10-31): a fixed, engineered renderer of the board after a candidate move onto the
// fly's photoreceptors. Nothing here is trained, and it states no attack, pin, legality or safety fact.
// Legal moves come from outside; the renderer only maps the position reached by one move.
// Credit: the photoreceptor-to-square placement (retina_idx, retina_square, retina_uv in .cache/full.npz)
// and the mirror-when-Black-moves convention (the board is seen from the side to move, rank 1 at the
// bottom of the field) come from Esposito, C. (2026), fly-chess, commit
// 3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf, MIT (research/literature/cesp99-retina-2026-10-28/README.md;
// docs/RETINA.md section 1). His trained weights w_ret and W_in and his gains are not used.
// This is an engineered interface, not a measured model of fly vision.
// Picture digits come from the DejaVu Sans glyphs (licence: eyes-v1-pictures-LICENSE.txt), generated
// once by .codebase/scripts/chess-input/build-eyes-v1-pictures.py.
import { Chess } from 'chess.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readNpz } from '../runtime/graph.mjs';

const MOVER = 1, OPPONENT = 0.5, MARK = 0.5;
const TYPES = 'pnbrqk';
const bundled = JSON.parse(readFileSync(new URL('./eyes-v1-pictures.json', import.meta.url), 'utf8'));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytesOf = array => new Uint8Array(array.buffer, array.byteOffset, array.byteLength);

// Hash of the raw retina bytes, in the order retina_idx, retina_square, retina_uv.
function retinaHash({ retina_idx, retina_square, retina_uv }) {
  const h = createHash('sha256');
  for (const array of [retina_idx, retina_square, retina_uv]) h.update(bytesOf(array));
  return h.digest('hex');
}

export function loadRetina(path) {
  return readNpz(path, ['retina_idx', 'retina_square', 'retina_uv']);
}

export function createEyesV1(retina, pictures = bundled) {
  const { retina_idx, retina_square, retina_uv } = retina;
  const n = retina_idx.length, size = pictures.size;
  if (retina_square.length !== n || retina_uv.length !== 2 * n) throw Error('Eyes retina length mismatch');
  for (const s of retina_square) if (!Number.isInteger(s) || s < 0 || s > 63) throw Error('Eyes retina square outside 0..63');
  for (const t of TYPES) {
    const rows = pictures.pictures?.[t];
    if (!Array.isArray(rows) || rows.length !== size
      || rows.some(r => typeof r !== 'string' || r.length !== size || !/^[0-9]+$/.test(r)))
      throw Error(`Invalid eyes picture ${t}`);
  }
  const identity = hash({ schema: 'eyes-v1', mover: MOVER, opponent: OPPONENT, mark: MARK,
    pictures: pictures.pictures, retina: retinaHash(retina) });

  // Viewing cell per photoreceptor. Photoreceptors of one square are split by their distinct u and v values.
  // y goes down the picture, so v = 1 (top of the field) is the top of the picture.
  const digits = TYPES.split('').map(t => Uint8Array.from(pictures.pictures[t].join(''), c => c.charCodeAt(0) - 48));
  const bySquare = Array.from({ length: 64 }, () => []);
  for (let k = 0; k < n; k++) bySquare[retina_square[k]].push(k);
  const cellArr = new Float32Array(4 * n), ink = new Float32Array(TYPES.length * n);
  for (const members of bySquare) {
    const us = [...new Set(members.map(k => retina_uv[2 * k]))].sort((a, b) => a - b);
    const vs = [...new Set(members.map(k => retina_uv[2 * k + 1]))].sort((a, b) => a - b);
    const nx = us.length, ny = vs.length;
    for (const k of members) {
      const ix = us.indexOf(retina_uv[2 * k]), iy = vs.indexOf(retina_uv[2 * k + 1]);
      const x0 = ix / nx, x1 = (ix + 1) / nx, y0 = 1 - (iy + 1) / ny, y1 = 1 - iy / ny;
      cellArr.set([x0, x1, y0, y1], 4 * k);
      // Ink: mean of digit/9 over the picture pixels inside the cell (at least one pixel per axis).
      const px0 = Math.floor(x0 * size), px1 = Math.min(size, Math.max(Math.ceil(x1 * size), px0 + 1));
      const py0 = Math.floor(y0 * size), py1 = Math.min(size, Math.max(Math.ceil(y1 * size), py0 + 1));
      const count = (px1 - px0) * (py1 - py0);
      for (let t = 0; t < TYPES.length; t++) {
        let sum = 0;
        for (let y = py0; y < py1; y++) for (let x = px0; x < px1; x++) sum += digits[t][y * size + x] / 9;
        ink[t * n + k] = sum / count;
      }
    }
  }

  const pictureInk = type => {
    if (typeof type !== 'string' || type.length !== 1 || !TYPES.includes(type)) throw Error('Unknown eyes picture type');
    const t = TYPES.indexOf(type);
    return ink.subarray(t * n, (t + 1) * n);
  };

  const scope = 'Engineered rendering of the board after the candidate move; no attack, pin, legality or safety fact; legal moves come from outside.';

  function encode(position, action) {
    const fen = typeof position === 'string' ? position : position.fen();
    const board = new Chess(fen);
    const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === action);
    if (!move) throw Error('Illegal eye action');
    const mover = board.turn();
    const after = new Chess(fen);
    after.move(move);
    // Board square seen by each seat index: rank * 8 + file, ranks flipped when Black moves. Files are not mirrored.
    const squareOfSeat = Array.from({ length: 64 }, (_, s) => {
      const rank = mover === 'w' ? Math.floor(s / 8) : 7 - Math.floor(s / 8);
      return 'abcdefgh'[s % 8] + (rank + 1);
    });
    const stimulation = [];
    for (let k = 0; k < n; k++) {
      const q = squareOfSeat[retina_square[k]];
      const piece = after.get(q);
      const pieceInk = piece ? (piece.color === mover ? MOVER : OPPONENT) * ink[TYPES.indexOf(piece.type) * n + k] : 0;
      const current = pieceInk + (q === move.from || q === move.to ? MARK : 0);
      if (current > 0) stimulation.push({ index: retina_idx[k], current });
    }
    return { schema: 'eyes-v1', identity, action, stimulation, scope };
  }

  return Object.freeze({
    identity,
    config: Object.freeze({ mover: MOVER, opponent: OPPONENT, mark: MARK, pictureSize: size }),
    encode,
    pictureInk,
    cells: () => cellArr.slice(),
  });
}
