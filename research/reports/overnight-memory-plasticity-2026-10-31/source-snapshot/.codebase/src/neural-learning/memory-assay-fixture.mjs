// Synthetic rate fixtures for the memory assay. Seeded patterns only; no graph data.
import { createHash } from 'node:crypto';

export const GRID = { q: [0, 0.1, 0.25, 0.5, 0.75, 0.9], relation: ['congruent', 'conflicting'], w: [0, 0.5, 0.9], bg: [0, 0.1, 0.3] };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const SEEDS = { dev: range(1001, 1012), h1: range(9001, 9024), h2: range(9101, 9112) };
const IMAGE_IDS = ['A+', 'A-', 'B+', 'B-', 'C+', 'C-', 'E+', 'E-'];
const PHASES = [['ACQ_A', 'T1'], ['ACQ_BC', 'T2'], ['REV1', 'T3'], ['REV2', 'T4'], ['REV3', 'T5']];
// Sorted keys at every level, so a hash does not depend on property insertion order.
const canon = v => JSON.stringify(v, (_, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const sha256 = v => createHash('sha256').update(canon(v)).digest('hex');

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(xs, rng) {
  for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  return xs;
}

export function gridCells() {
  return GRID.q.flatMap(q => GRID.relation.flatMap(relation => GRID.w.flatMap(w => GRID.bg.map(bg => ({ q, relation, w, bg })))));
}

export function isGatedCell({ q, relation, w, bg }) {
  return [0, 0.5].includes(w) && [0, 0.1].includes(bg) && ([0, 0.1, 0.25].includes(q) || (q === 0.5 && relation === 'congruent'));
}

export function buildFixture({ seed, nKC = 200, s = 20, q, relation, w, bg }) {
  if (relation !== 'congruent' && relation !== 'conflicting') throw Error(`Unknown relation ${relation}`);
  const rng = mulberry32(seed);
  const baseP = new Float64Array(nKC), baseR = new Float64Array(nKC);
  for (let i = 0; i < nKC; i++) { baseP[i] = 0.5 + rng(); baseR[i] = 0.5 + rng(); }
  const pool = shuffle(Array.from({ length: nKC }, (_, i) => i), rng);
  let next = 0;
  const take = k => { if (next + k > pool.length) throw Error('Unused KC pool exhausted'); next += k; return pool.slice(next - k, next); };
  const W = Math.round(w * s), d = s - W, Q = Math.round(q * s), n1 = Math.min(Q, d), n2 = Q - n1;
  const congruent = relation === 'congruent';
  const focal = {};
  const WA = take(W), DAp = take(d), DAm = take(d);
  focal['A+'] = [...WA, ...DAp]; focal['A-'] = [...WA, ...DAm];
  const [srcP, srcM] = congruent ? [DAp, DAm] : [DAm, DAp];
  const WB = [...WA.slice(0, n2), ...take(W - n2)];
  focal['B+'] = [...WB, ...srcP.slice(0, n1), ...take(d - n1)];
  focal['B-'] = [...WB, ...srcM.slice(0, n1), ...take(d - n1)];
  for (const x of ['C', 'E']) { const Wx = take(W), a = take(d), b = take(d); focal[`${x}+`] = [...Wx, ...a]; focal[`${x}-`] = [...Wx, ...b]; }
  const images = {};
  for (const name of IMAGE_IDS) {
    const f = Int32Array.from(focal[name]).sort(), h = new Float64Array(nKC).fill(1.5 * bg);
    for (const k of f) h[k] = 0.9 + 0.6 * rng();
    images[name] = { id: name, focal: f, h };
  }
  const plain = Object.fromEntries(IMAGE_IDS.map(name => [name, { focal: [...images[name].focal], h: [...images[name].h] }]));
  const id = sha256({ seed, nKC, s, q, relation, w, bg, baseP: [...baseP], baseR: [...baseR], images: plain });
  const overlap = (x, y) => { const S = new Set(images[x].focal); return [...images[y].focal].filter(k => S.has(k)).length / s; };
  const cos = (x, y) => { const a = images[x].h, b = images[y].h; let dot = 0, na = 0, nb = 0; for (let i = 0; i < nKC; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return dot / Math.sqrt(na * nb); };
  const srcOf = congruent ? { 'B+': 'A+', 'B-': 'A-' } : { 'B+': 'A-', 'B-': 'A+' };
  // Largest pairwise focal overlap, as a fraction of s.
  const maxOverlap = (xs, ys) => Math.max(...xs.flatMap(x => ys.map(y => overlap(x, y))));
  const actual = { qFocal: overlap('B+', srcOf['B+']), wFocal: { A: overlap('A+', 'A-'), B: overlap('B+', 'B-'), C: overlap('C+', 'C-') },
    cosineSrcPlus: cos('B+', srcOf['B+']), cosineSrcMinus: cos('B-', srcOf['B-']),
    bcFocalOverlap: maxOverlap(['B+', 'B-'], ['C+', 'C-']), acFocalOverlap: maxOverlap(['A+', 'A-'], ['C+', 'C-']) };
  return { id, seed, nKC, s, q, relation, w, bg, baseP, baseR, images, flip: seed % 2 === 1, actual };
}

function trialsOf(itemsByPhase) {
  let g = 0;
  return PHASES.map(([name, test]) => ({ name, test, trials: itemsByPhase[name].map(item => { const global = g++; return { item, global, unknown: (global + 1) % 8 === 0 }; }) }));
}

export function buildSchedule({ seed }) {
  const bc = shuffle([...Array(24).fill('B'), ...Array(24).fill('C')], mulberry32(seed ^ 0x5bd1e995));
  const phases = trialsOf({ ACQ_A: Array(24).fill('A'), ACQ_BC: bc, REV1: Array(24).fill('A'), REV2: Array(24).fill('A'), REV3: Array(24).fill('A') });
  return { hash: sha256(phases), phases };
}

export function buildConflictSchedule({ seed }) {
  const situations = shuffle([...Array(24).fill('E1'), ...Array(24).fill('E2')], mulberry32(seed ^ 0x2545f491));
  const phases = [{ name: 'CONFLICT', trials: situations.map((situation, global) => ({ item: 'E', global, unknown: false, situation })), test: null }];
  return { hash: sha256(phases), phases };
}
