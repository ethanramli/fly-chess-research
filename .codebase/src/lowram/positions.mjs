import { Chess } from 'chess.js';

export const encoding = 'white-fen-1280-v1';
export const criteria = ['white_material_balance_div16', 'side_to_move_best_capture_after_recapture_white_signed_div9'];
const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Fixed WHITE perspective for both inputs and targets. No game history is used.
// planes 0..11 pieces, 12..15 KQkq, 16 legal EP, 17 white to move,
// 18 halfmove/100 capped at one, 19 zero (history explicitly unavailable).
export function encodeFen(fen) {
  const game = new Chess(fen), x = new Float32Array(1280);
  for (const rank of game.board()) for (const p of rank) if (p) {
    const sq = (Number(p.square[1]) - 1) * 8 + p.square.charCodeAt(0) - 97;
    const plane = 'pnbrqk'.indexOf(p.type) + (p.color === 'b' ? 6 : 0);
    x[plane * 64 + sq] = 1;
  }
  const fields = game.fen().split(' ');
  for (let i = 0; i < 4; i++) if (fields[2].includes('KQkq'[i])) x.fill(1, (12 + i) * 64, (13 + i) * 64);
  if (fields[3] !== '-') {
    const sq = (Number(fields[3][1]) - 1) * 8 + fields[3].charCodeAt(0) - 97;
    x[16 * 64 + sq] = 1;
  }
  if (fields[1] === 'w') x.fill(1, 17 * 64, 18 * 64);
  x.fill(Math.min(Number(fields[4]), 100) / 100, 18 * 64, 19 * 64);
  return x;
}

export function material(game) {
  let score = 0;
  for (const row of game.board()) for (const p of row) if (p) score += (p.color === 'w' ? 1 : -1) * values[p.type];
  return score;
}

export function labelFen(fen) {
  const game = new Chess(fen), sign = game.turn() === 'w' ? 1 : -1, base = material(game);
  let best = 0;
  for (const move of game.moves({ verbose: true }).filter(m => m.isCapture() || m.isEnPassant())) {
    game.move(move);
    const after = material(game);
    let worst = sign * (after - base);
    // Only immediate legal recaptures onto the capturing piece's square.
    // This is an explicitly bounded exchange label, not an engine evaluation.
    for (const reply of game.moves({ verbose: true }).filter(m => m.to === move.to && (m.isCapture() || m.isEnPassant()))) {
      game.move(reply); worst = Math.min(worst, sign * (material(game) - base)); game.undo();
    }
    game.undo(); best = Math.max(best, worst);
  }
  return [base / 16, sign * best / 9];
}

export function positionKey(fen) { return fen.split(' ').slice(0, 4).join(' '); }
