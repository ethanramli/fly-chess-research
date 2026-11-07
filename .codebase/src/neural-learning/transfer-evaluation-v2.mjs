// Numeric version of v1 pairGate for memory v4. Protocol: documentation/design/neural-learning/memory-v4-proposal-2026-11-04.md section 7.
import { mulberry32 } from './memory-assay-fixture.mjs';

const sumOf = xs => xs.reduce((sum, x) => sum + x, 0);

export function numericPairGate({ arms, games, primary, comparators, minCorrect, minMargin, resamples = 10000, seed = 20261103, lowerQuantile = 0.025 }) {
  if (games.length === 0) throw Error('No games');
  if (comparators.length === 0) throw Error('No comparators');
  for (const name of [primary, ...comparators]) if (!Array.isArray(arms[name])) throw Error(`Missing arm ${name}`);
  for (const [name, values] of Object.entries(arms)) if (values.length !== games.length) throw Error(`Arm ${name} length differs from games`);
  for (const name of [primary, ...comparators]) {
    for (const x of arms[name]) if (!(Number.isFinite(x) && x >= 0 && x <= 1)) throw Error('Score must be a finite number in [0, 1]');
  }
  if (!(Number.isFinite(lowerQuantile) && lowerQuantile > 0 && lowerQuantile < 0.5)) throw Error('lowerQuantile must be in (0, 0.5)');
  if (!Number.isSafeInteger(resamples) || resamples <= 0) throw Error('resamples must be a positive safe integer');
  const P = arms[primary], correct = sumOf(P);
  const groups = new Map();
  games.forEach((game, i) => { if (!groups.has(game)) groups.set(game, []); groups.get(game).push(i); });
  const G = [...groups.values()];
  const result = {};
  comparators.forEach((c, k) => {
    const C = arms[c], rand = mulberry32(seed ^ k);
    const sums = Array.from({ length: resamples }, () => {
      let sum = 0;
      for (let d = 0; d < G.length; d++) {
        for (const i of G[Math.floor(rand() * G.length)]) sum += P[i] - C[i];
      }
      return sum;
    });
    sums.sort((a, b) => a - b);
    result[c] = { margin: correct - sumOf(C), lower: sums[Math.floor(lowerQuantile * resamples)] };
  });
  const pass = correct >= minCorrect && Object.values(result).every(r => r.margin >= minMargin && r.lower > 0);
  return { pass, correct, total: games.length, comparators: result };
}
