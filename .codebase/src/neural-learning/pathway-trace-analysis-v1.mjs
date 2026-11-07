// Pure analysis helpers for pathway traces (twin pairs). No brain code, no file I/O.
// Vectors are Float64Array. Nearest-neighbour scoring reuses NearestEpisodeMemory.
import { NearestEpisodeMemory } from './kc-episodic-memory-v2.mjs';

// Median of a non-empty list of numbers. Throws on empty input.
export function median(xs) {
  if (xs.length === 0) throw new Error('median needs at least one value');
  const s = Float64Array.from(xs).sort();
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Euclidean distance between two equal-length vectors.
function dist(a, b) {
  let s = 0;
  for (let j = 0; j < a.length; j++) {
    const d = a[j] - b[j];
    s += d * d;
  }
  return Math.sqrt(s);
}

// Scale features. 'none' copies. 'rms' divides by train RMS. 'zscore' uses train mean and population std.
// Returns new arrays in the order of `all`. Fit statistics come from `train` only.
export function scaleVectors(train, all, mode) {
  if (mode === 'none') return all.map((v) => Float64Array.from(v));
  if (mode !== 'rms' && mode !== 'zscore') throw new Error(`Unknown scale mode: ${mode}`);
  if (train.length === 0) throw new Error('train must be non-empty for scaling');

  const n = train[0].length;
  const out = all.map((v) => new Float64Array(v.length));
  const sc = new Float64Array(n);
  const shift = new Float64Array(n);

  if (mode === 'rms') {
    // Mean of squares per feature, then square root.
    for (const v of train) for (let j = 0; j < n; j++) sc[j] += v[j] * v[j];
    for (let j = 0; j < n; j++) sc[j] = Math.sqrt(sc[j] / train.length) + 1e-6;
  } else {
    for (const v of train) for (let j = 0; j < n; j++) shift[j] += v[j];
    for (let j = 0; j < n; j++) shift[j] /= train.length;
    for (const v of train) for (let j = 0; j < n; j++) sc[j] += (v[j] - shift[j]) ** 2;
    for (let j = 0; j < n; j++) sc[j] = Math.sqrt(sc[j] / train.length) + 1e-6;
  }

  all.forEach((v, i) => {
    for (let j = 0; j < n; j++) out[i][j] = (v[j] - shift[j]) / sc[j];
  });
  return out;
}

// Keep the round(fraction * length) largest values (at least 1). Ties: lower index first. Others set to 0.
export function sparsifyTop(v, fraction) {
  const keep = Math.min(v.length, Math.max(1, Math.round(fraction * v.length)));
  const order = Array.from(v.keys()).sort((a, b) => v[b] - v[a] || a - b);
  const out = new Float64Array(v.length);
  for (let i = 0; i < keep; i++) out[order[i]] = v[order[i]];
  return out;
}

// Mean over vectors of the fraction of entries that are not zero.
export function activeFraction(vectors) {
  if (vectors.length === 0) return 0;
  let total = 0;
  for (const v of vectors) {
    let count = 0;
    for (let j = 0; j < v.length; j++) if (v[j] !== 0) count++;
    total += count / v.length;
  }
  return total / vectors.length;
}

// How far apart good/bad twins are, compared with how far apart different pairs' good boards are.
export function twinSeparation(pairs) {
  if (pairs.length < 2) throw new Error('twinSeparation needs at least 2 pairs');
  const within = median(pairs.map((p) => dist(p.good, p.bad)));
  const acrossList = [];
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) acrossList.push(dist(pairs[i].good, pairs[j].good));
  }
  const across = median(acrossList);
  return { within, across, ratio: across === 0 ? 0 : within / across };
}

// Build a store from practice boards with true labels (good +1, bad -1).
function buildStore(pairs, k) {
  const store = new NearestEpisodeMemory({ capacity: 100000, k });
  pairs.forEach((p, i) => {
    store.write(p.good, 1, `${i}:good`);
    store.write(p.bad, -1, `${i}:bad`);
  });
  return store;
}

// Correct when the test good board scores higher than the test bad board. Ties count as wrong.
function countCorrect(store, pairs) {
  let correct = 0;
  for (const p of pairs) if (store.score(p.good) > store.score(p.bad)) correct++;
  return { correct, total: pairs.length };
}

// Store all practice boards, then test each new pair.
export function oracleKnn(practicePairs, testPairs, k) {
  return countCorrect(buildStore(practicePairs, k), testPairs);
}

// For each practice pair, store all other practice pairs and test the held-out pair.
export function leaveOneOut(practicePairs, k) {
  let correct = 0;
  practicePairs.forEach((held, i) => {
    const others = practicePairs.filter((_, j) => j !== i);
    const r = countCorrect(buildStore(others, k), [held]);
    correct += r.correct;
  });
  return { correct, total: practicePairs.length };
}

// Brightness shortcut: correct when good has a larger sum of entries than bad.
export function inkRule(pairs) {
  const sum = (v) => v.reduce((a, b) => a + b, 0);
  let correct = 0;
  for (const p of pairs) if (sum(p.good) > sum(p.bad)) correct++;
  return { correct, total: pairs.length };
}
