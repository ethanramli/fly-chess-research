import { Chess } from 'chess.js';
import { SparseTrainer } from './trainer.mjs';
import { encodeFen } from './positions.mjs';

export function createUntrainedFly(graph, seed = 47) {
  return new SparseTrainer(graph, { steps: 8, inputDim: 1280, outputs: 2, seed, normalization: 'global' });
}

export function choosePawnMove(fly, fen) {
  const game = new Chess(fen);
  const pawnMoves = game.moves({ verbose: true }).filter(move => move.piece === 'p');
  if (!pawnMoves.length) throw Error('The fly has no legal pawn move in this position');

  const whiteToMove = game.turn() === 'w';
  let chosen = null;
  for (const move of pawnMoves) {
    game.move(move);
    const score = fly.forward(encodeFen(game.fen()))[0];
    game.undo();
    if (!chosen || (whiteToMove ? score > chosen.score : score < chosen.score)) chosen = { move, score };
  }

  game.move(chosen.move);
  return {
    san: chosen.move.san,
    uci: `${chosen.move.from}${chosen.move.to}${chosen.move.promotion ?? ''}`,
    score: chosen.score,
    fen: game.fen(),
  };
}

// One-ply readout policy: random initialized output 0, interpreted in White's
// perspective. Legal move generation supplies rules, never a teacher score.
export async function chooseFlyMove(fly, game, pace = async () => {}) {
  if (game.isGameOver()) throw Error('The game is over');
  const whiteToMove = game.turn() === 'w';
  let chosen;
  for (const move of game.moves({ verbose: true })) {
    const begin = performance.now();
    let score;
    game.move(move);
    try { score = fly.forward(encodeFen(game.fen()))[0]; }
    finally { game.undo(); }
    if (!Number.isFinite(score)) throw Error('Nonfinite fly output');
    if (!chosen || (whiteToMove ? score > chosen.score : score < chosen.score)) chosen = { move, score };
    await pace(performance.now() - begin);
  }
  return { from: chosen.move.from, to: chosen.move.to, promotion: chosen.move.promotion, score: chosen.score };
}
