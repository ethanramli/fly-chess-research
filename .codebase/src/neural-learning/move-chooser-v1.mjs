// The fly's move chooser over all legal moves (restart plan revision 2026-11-03, problem 5).
// Every move is scored from unchanged memory; the choice uses fixed randomness.
// It does not learn and does not compute scores itself.
import { frozenScores } from './transfer-evaluation-v1.mjs';
import { mulberry32 } from './memory-assay-fixture.mjs';

export function choiceTemperature(activities) {
  const xs = Array.isArray(activities) ? [...activities] : [];
  if (xs.length === 0 || !xs.every(Number.isFinite)) throw Error('Invalid activities');
  const mean = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((sum, x) => sum + (x - mean) ** 2, 0) / xs.length);
  if (sd === 0) throw Error('Zero activity spread');
  return 0.1 * sd;
}

export function chooseMove({ moves, score, fingerprint, temperature, seed, trial }) {
  const list = Array.isArray(moves) ? [...moves] : [];
  if (list.length === 0 || !list.every(m => typeof m === 'string') || new Set(list).size !== list.length) throw Error('Invalid moves');
  if (!Number.isFinite(temperature) || temperature <= 0) throw Error('Invalid temperature');
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(trial)) throw Error('Invalid seed or trial');
  const ordered = list.sort();
  const scores = frozenScores(ordered, score, fingerprint);
  const m = Math.max(...scores);
  const w = scores.map(s => Math.exp((s - m) / temperature));
  const total = w.reduce((sum, x) => sum + x, 0);
  const probabilities = w.map(x => x / total);
  const draw = mulberry32((seed ^ trial) >>> 0)();
  let cumulative = 0;
  let index = ordered.length - 1;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (draw < cumulative) { index = i; break; }
  }
  return { move: ordered[index], index, moves: ordered, scores, probabilities, draw, temperature };
}
