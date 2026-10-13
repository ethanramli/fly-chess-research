import { Chess } from 'chess.js';

// Glicko-1, one colour-swapped opening pair per rating period. No inactivity
// inflation: the evaluated snapshot remains frozen during this benchmark.
export function updateRating({ rating, rd }, opponents) {
  if (!Number.isFinite(rating) || !Number.isFinite(rd) || rd <= 0 || !opponents.length) throw Error('Invalid rating period');
  const q = Math.log(10) / 400;
  let information = 0, correction = 0;
  for (const { rating: other, rd: otherRD, score } of opponents) {
    if (!Number.isFinite(other) || !Number.isFinite(otherRD) || otherRD < 0 || ![0, 0.5, 1].includes(score)) throw Error('Invalid opponent result');
    const g = 1 / Math.sqrt(1 + 3 * q * q * otherRD * otherRD / Math.PI ** 2);
    const expected = 1 / (1 + 10 ** (-g * (rating - other) / 400));
    information += q * q * g * g * expected * (1 - expected);
    correction += g * (score - expected);
  }
  const precision = 1 / rd ** 2 + information;
  return { rating: rating + q * correction / precision, rd: Math.sqrt(1 / precision) };
}

export function nearestOpponent(ladder, rating) {
  return ladder.reduce((best, row) => Math.abs(row.rating - rating) < Math.abs(best.rating - rating) ? row : best);
}

export function replayGame(opening, moves = []) {
  const game = new Chess();
  for (const move of [...opening, ...moves]) game.move(move);
  return game;
}

export function outcome(game, flyColor) {
  if (!game.isGameOver()) return null;
  if (game.isCheckmate()) return game.turn() === flyColor ? 0 : 1;
  return 0.5;
}

export function ratingReport(state) {
  const scores = state.results.map(row => row.score);
  const extreme = scores.length && (scores.every(s => s === 0) || scores.every(s => s === 1));
  return {
    benchmark: state.protocol.version === 'flybench-v2' ? 'FlyBench v2' : 'FlyBench v1', scale: state.protocol.scale,
    status: extreme ? 'One-sided results: strength not bracketed; estimate depends on prior' : 'Provisional rating estimate',
    gamesCompleted: scores.length, gamesIncludedInRating: Math.floor(scores.length / 2) * 2, gamesPlanned: state.protocol.games,
    wins: scores.filter(s => s === 1).length, draws: scores.filter(s => s === 0.5).length, losses: scores.filter(s => s === 0).length,
    estimate: Number(state.rating.rating.toFixed(1)), ratingDeviation: state.rating.rd,
    approximate95Interval: [state.rating.rating - 1.96 * state.rating.rd, state.rating.rating + 1.96 * state.rating.rd],
    intervalScope: 'Glicko approximation; excludes opening-pair correlation and systematic reference calibration error',
    decimalAccuracyEstablished: false, complete: scores.length === state.protocol.games,
  };
}
