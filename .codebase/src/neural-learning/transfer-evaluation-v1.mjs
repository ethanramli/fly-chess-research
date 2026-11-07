// Checks for the later transfer and combination tests.
// Protocol: documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md
// Nothing here learns or runs the brain model. Added after peer review 2026-11-02.
import { mulberry32 } from './memory-assay-fixture.mjs';

// Scores every candidate from one unchanged memory state, forward and then reversed.
export function frozenScores(candidates, score, fingerprint) {
  if (!Array.isArray(candidates) || candidates.length === 0) throw Error('No candidates');
  const before = fingerprint();
  const scoreOne = candidate => {
    const s = score(candidate);
    if (!Number.isFinite(s)) throw Error('Score is not finite');
    if (fingerprint() !== before) throw Error('Memory changed during scoring');
    return s;
  };
  const forward = candidates.map(scoreOne);
  const reverse = new Array(candidates.length);
  for (let i = candidates.length - 1; i >= 0; i--) reverse[i] = scoreOne(candidates[i]);
  if (forward.some((s, i) => !Object.is(s, reverse[i]))) throw Error('Candidate order changed a score');
  return forward;
}

// Same key rule as cue() in audit-long-term-memory-v1-live.mjs: [index, current] pairs sorted by index.
export const cueKey = cue => JSON.stringify(cue.map(x => [x.index, x.current]).sort((a, b) => a[0] - b[0]));

export function exactRepeats(testCues, trainingCues) {
  const seen = new Set(trainingCues.map(cueKey));
  return testCues.flatMap((cue, i) => seen.has(cueKey(cue)) ? [i] : []);
}

// Sparse cosine similarity keyed by index. Answers by similarity only; never learns.
const vector = cue => new Map(cue.map(x => [x.index, x.current]));
const norm = v => Math.sqrt([...v.values()].reduce((sum, x) => sum + x * x, 0));
const dot = (a, b) => [...a].reduce((sum, [k, x]) => sum + (b.has(k) ? x * b.get(k) : 0), 0);
const cosine = (a, b) => { const na = norm(a), nb = norm(b); return na === 0 || nb === 0 ? 0 : dot(a, b) / (na * nb); };

export function similarBoardRecall(cue, stored) {
  if (stored.some(({ value }) => value !== -1 && value !== 1)) throw Error('Stored value must be -1 or +1');
  const query = vector(cue);
  let best = null;
  for (const entry of stored) {
    const similarity = cosine(query, vector(entry.cue));
    if (best === null || similarity > best.similarity) best = { value: entry.value, similarity };
  }
  return best === null || best.similarity === 0 ? { value: 0, similarity: 0 } : best;
}

// Locked pass rule for twin pairs. Game-level bootstrap of primary-minus-comparator pair wins.
export function pairGate({ arms, games, primary, comparators, minCorrect, minMargin, resamples = 10000, seed = 20261103 }) {
  if (games.length === 0) throw Error('No games');
  if (comparators.length === 0) throw Error('No comparators');
  for (const name of [primary, ...comparators]) if (!Array.isArray(arms[name])) throw Error(`Missing arm ${name}`);
  for (const [name, values] of Object.entries(arms)) if (values.length !== games.length) throw Error(`Arm ${name} length differs from games`);
  const count = xs => xs.filter(Boolean).length;
  const P = arms[primary], correct = count(P);
  const groups = new Map();
  games.forEach((game, i) => { if (!groups.has(game)) groups.set(game, []); groups.get(game).push(i); });
  const G = [...groups.values()];
  const result = {};
  comparators.forEach((c, k) => {
    const C = arms[c], rand = mulberry32(seed ^ k);
    const sums = Array.from({ length: resamples }, () => {
      let sum = 0;
      for (let d = 0; d < G.length; d++) {
        for (const i of G[Math.floor(rand() * G.length)]) sum += (P[i] ? 1 : 0) - (C[i] ? 1 : 0);
      }
      return sum;
    });
    sums.sort((a, b) => a - b);
    result[c] = { margin: correct - count(C), lower: sums[Math.floor(0.025 * resamples)] };
  });
  const pass = correct >= minCorrect && Object.values(result).every(r => r.margin >= minMargin && r.lower > 0);
  return { pass, correct, total: games.length, comparators: result };
}
