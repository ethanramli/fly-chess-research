// Probes for stage 1 (documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md, section 7.2):
// the case-recall lookup and the two simple learners. Pure functions only; no graph code, no chess code.
import { Stream } from './replay-diary-v1.mjs';

// Dense vector of one code (a list of {index, current}) over a fixed column order (Map from index to column).
export function dense(code, columns) {
  const v = new Float64Array(columns.size);
  for (const { index, current } of code) v[columns.get(index)] = current;
  return v;
}

export function unit(v) {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n);
  return n > 0 ? v.map(x => x / n) : v;
}

// Random projection (section 7.2, case recall key c): W has one row per output unit, entries standard normal,
// filled row by row from the `features` stream. Output: array of rows.
export function projection(runSeed, rows, cols) {
  const s = new Stream(runSeed, 'features');
  const W = [];
  for (let r = 0; r < rows; r++) {
    const row = new Float64Array(cols);
    for (let c = 0; c < cols; c++) row[c] = s.normal();
    W.push(row);
  }
  return W;
}

// Random feature key: z = Wx, keep the k largest (ties to the lower unit), kept units carry max(z, 0), rest zero, then unit length.
export function randomKey(x, W, k) {
  const z = W.map(row => { let t = 0; for (let c = 0; c < x.length; c++) t += row[c] * x[c]; return t; });
  const order = z.map((value, i) => ({ value, i })).sort((p, q) => q.value - p.value || p.i - q.i).slice(0, k);
  const key = new Float64Array(z.length);
  for (const { value, i } of order) key[i] = Math.max(value, 0);
  return unit(key);
}

// Mean active count rounded half up, computed once before data.
export const keepCount = meanActive => Math.floor(meanActive + 0.5);

const euclid = (p, q) => { let t = 0; for (let i = 0; i < p.length; i++) t += (p[i] - q[i]) ** 2; return Math.sqrt(t); };

// Case recall score (section 7.2): store is [{ key, sign }] in insertion order. Exact matches (distance below 1e-12)
// decide alone by their mean sign; otherwise the inverse-distance-weighted mean sign of the 3 nearest stored lessons.
export function caseScore(store, key) {
  const d = store.map(e => ({ dist: euclid(e.key, key), sign: e.sign }));
  const exact = d.filter(x => x.dist < 1e-12);
  if (exact.length) return exact.reduce((s, x) => s + x.sign, 0) / exact.length;
  const top = d.slice().sort((p, q) => p.dist - q.dist).slice(0, 3);
  let num = 0, den = 0;
  for (const t of top) { const w = 1 / (t.dist + 1e-9); num += w * t.sign; den += w; }
  return den > 0 ? num / den : 0;
}

// Simple learner (section 7.2): w starts at zero; on each lesson or replay with sign s: w += s * phi / (|phi|^2 + 1e-9).
export class SimpleLearner {
  constructor(dim) { this.w = new Float64Array(dim); }
  score(phi) { let t = 0; for (let i = 0; i < phi.length; i++) t += this.w[i] * phi[i]; return t; }
  update(phi, sign) {
    if (sign !== 1 && sign !== -1) throw Error('sign must be +1 or -1');
    let n = 0;
    for (let i = 0; i < phi.length; i++) n += phi[i] * phi[i];
    const c = sign / (n + 1e-9);
    for (let i = 0; i < phi.length; i++) this.w[i] += c * phi[i];
  }
}
