// Real Eyes v1 KC responses through the frozen rule and assay, with declared representation transforms (journal 2026-10-31).
// shortcut: readout and base weights stay the fixture's linear stand-in; replace with a closed-loop graph run if a transform works.
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer, random } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV1, loadRetina } from '../../src/chess-input/eyes-v1.mjs';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { register } from '../../src/neural-learning/memory-assay-rule-prediction-supralinear.mjs';
import { runCapacityArmV2 } from '../../src/neural-learning/capacity-delay-assay-v2.mjs';

register(registerRule);
const RULE = 'prediction-supralinear-v1', ITEMS = 8, THETA_K = 0.2, TOP_FRACTION = 0.05;
const { values: { out, only } } = parseArgs({ options: { out: { type: 'string' }, only: { type: 'string' } } });
if (!out || existsSync(out)) throw Error('Require fresh --out DIR');
mkdirSync(out, { recursive: true });
const graph = loadGraph('.cache/full.npz'), roots = readNpz('.cache/full.npz', ['root_ids']).root_ids;
const indexOf = new Map(Array.from(roots, (r, i) => [r.toString(), i])), kcs = [];
let header;
for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
  const f = line.split('\t');
  if (!header) { header = f; continue; }
  if (f[header.indexOf('cell_class')] === 'Kenyon_Cell' && indexOf.has(f[header.indexOf('root_id')])) kcs.push(indexOf.get(f[header.indexOf('root_id')]));
}
const model = new SparseTrainer(graph, { steps: 32, inputDim: 1, outputs: 1, seed: 47 }), eyes = createEyesV1(loadRetina('.cache/full.npz'));
model.forward([0]);
const rest = Float32Array.from(model.h[model.steps]);
const rise = (fen, uci) => {
  model.forward([0], eyes.encode(fen, uci).stimulation);
  const h = model.h[model.steps];
  return Float64Array.from(kcs, i => Math.max(0, h[i] - rest[i]));
};
// Seeded legal play from the start position; two distinct moves per board. No puzzle file is opened.
function boards(seed, count) {
  const rng = random(seed), list = [];
  while (list.length < count) {
    const b = new Chess();
    for (let p = 0, plies = 6 + Math.floor(rng() * 40); p < plies && !b.isGameOver(); p++) { const ms = b.moves({ verbose: true }); b.move(ms[Math.floor(rng() * ms.length)]); }
    const ms = b.moves({ verbose: true });
    if (b.isGameOver() || ms.length < 2) continue;
    const a = ms.splice(Math.floor(rng() * ms.length), 1)[0], c = ms[Math.floor(rng() * ms.length)];
    list.push({ fen: b.fen(), moves: [a, c].map(m => m.from + m.to + (m.promotion ?? '')), rest: ms.filter(m => m !== c).map(m => m.from + m.to + (m.promotion ?? '')) });
  }
  return list;
}
const scale = v => { const m = Math.max(...v); return m > 0 ? v.map(x => 1.5 * x / m) : v; };
const keepTop = v => { const cut = [...v].sort((a, b) => b - a)[Math.round(TOP_FRACTION * kcs.length) - 1]; return v.map(x => (x >= cut && x > 0 ? x : 0)); };
// Rank code: fixed activity by rank, so one large cell cannot set the scale of all others.
const winners = (v, board, count) => {
  const a = v.map((x, i) => Math.max(0, x - board[i])), order = Array.from(a.keys()).filter(i => a[i] > 0).sort((p, q) => a[q] - a[p]).slice(0, count), out = new Float64Array(a.length);
  order.forEach((i, r) => { out[i] = 1.5 - 0.6 * r / Math.max(1, order.length - 1); });
  return out;
};
const TRANSFORMS = {
  T0: v => v,
  T1: v => scale(v),
  T2: v => scale(keepTop(v)),
  T3: (v, b) => scale(v.map((x, i) => Math.max(0, x - b[i]))),
  T4: (v, b) => scale(keepTop(v.map((x, i) => Math.max(0, x - b[i])))),
  T5: (v, b, pair) => scale(v.map((x, i) => Math.max(0, x - pair[i]))),
  T6: (v, b, pair, board) => scale(v.map((x, i) => Math.max(0, x - board[i]))),
  T7: (v, b, pair, board) => scale(v.map((x, i) => Math.max(0, x - board[i]))).map(x => (x / 1.5 > THETA_K ? x : 0)),
  T8a: (v, b, pair, board) => winners(v, board, 20),
  T8b: (v, b, pair, board) => winners(v, board, 40),
  T8c: (v, b, pair, board) => winners(v, board, 80),
};
const median = xs => { const a = xs.filter(Number.isFinite).sort((p, q) => p - q); return a.length ? (a.length % 2 ? a[a.length >> 1] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; };
const results = [];
for (let seed = 4001; seed <= 4012; seed++) {
  if (process.memoryUsage().rss > 2048 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Resource guard');
  const t0 = performance.now();
  const listed = boards(seed, ITEMS), items = listed.map(({ fen, moves }) => moves.map(m => rise(fen, m)));
  const mean = vs => { const out = new Float64Array(kcs.length); for (const v of vs) for (let i = 0; i < v.length; i++) out[i] += v[i] / vs.length; return out; };
  const pairMeans = items.map(mean), boardMeans = listed.map(({ fen, rest: others }, j) => mean([...items[j], ...others.slice(0, 10).map(m => rise(fen, m))]));
  const baseline = new Float64Array(kcs.length);
  const adapt = boards(seed + 1000, 8).flatMap(({ fen, moves }) => moves.map(m => rise(fen, m)));
  for (const v of adapt) for (let i = 0; i < v.length; i++) baseline[i] += v[i] / adapt.length;
  for (const [name, T] of Object.entries(TRANSFORMS).filter(([n]) => !only || only.split(',').includes(n))) {
    const vectors = items.map((pair, j) => pair.map(v => T(v, baseline, pairMeans[j], boardMeans[j])));
    // Cells that any image activates; the rest cannot learn, so dropping them saves time and changes nothing.
    const used = Array.from(kcs.keys()).filter(i => vectors.some(p => p.some(v => v[i] > 0))), n = used.length;
    if (!n) { results.push({ seed, name, error: 'no active cells' }); continue; }
    const rng = mulberry32(seed), baseP = new Float64Array(n), baseR = new Float64Array(n);
    for (let i = 0; i < n; i++) { baseP[i] = 0.5 + rng(); baseR[i] = 0.5 + rng(); }
    const images = {}, totals = [];
    vectors.forEach((pair, j) => pair.forEach((v, k) => {
      const id = `X${j}${k ? '-' : '+'}`, h = Float64Array.from(used, i => v[i]);
      images[id] = { id, h, focal: Int32Array.from(h.keys()).filter(i => h[i] > 0) };
      totals.push(h.reduce((a, x) => a + x / 1.5, 0));
    }));
    const s = Math.max(1e-12, median(totals) / 0.8); // total activity equals s fixture cells at mean .8
    const fixture = { id: createHash('sha256').update(name + seed).digest('hex'), seed, nKC: n, s, items: ITEMS, w: 0, bg: 0, baseP, baseR, images };
    const k = id => new Set(Array.from(images[id].h.keys()).filter(i => images[id].h[i] / 1.5 > THETA_K));
    const jac = (a, b) => { const x = k(a), y = k(b), inter = [...x].filter(i => y.has(i)).length, u = x.size + y.size - inter; return u ? inter / u : null; };
    const r = runCapacityArmV2({ ruleName: RULE, fixture, seed, checkpoints: [4, 8], reversalAt: 8, jitter: 0.1, delayLevels: [6400] });
    const T8 = r.tests.T8, D = r.tests.D6400, Rev = r.tests.Rev, m = e => e.margin / 1.6;
    const old = [0, 1, 2, 3];
    results.push({ seed, name, cells: n, eligible: median(Object.keys(images).map(id => k(id).size)), jacPair: jac('X0+', 'X0-'), jacItem: median([jac('X0+', 'X1+'), jac('X2+', 'X3+'), jac('X4+', 'X5+')]),
      acqFirst: r.acq[0] / 1.6, acqLast: r.acq[7] / 1.6, oldT8: median(old.map(j => m(T8[j]))), oldGreedy: old.filter(j => T8[j].greedy).length / 4, delay: median(T8.map((_, j) => m(D[j]))), delayGreedy: D.filter(e => e.greedy).length / 8,
      revItem: m(Rev[0]), revOthers: median([1, 2, 3, 4, 5, 6, 7].map(j => m(Rev[j]) / Math.max(1e-9, m(T8[j])))) });
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, performance.now() - t0); // duty 0.5
  console.error('seed', seed, Math.round(performance.now() - t0), 'ms');
}
const summary = Object.fromEntries(Object.keys(TRANSFORMS).filter(n => !only || only.split(',').includes(n)).map(name => {
  const rows = results.filter(r => r.name === name && !r.error);
  return [name, rows.length ? Object.fromEntries(Object.keys(rows[0]).filter(k => !['seed', 'name'].includes(k)).map(k => [k, median(rows.map(r => r[k]))])) : { error: 'no active cells' }];
}));
writeFileSync(`${out}/rows.json`, JSON.stringify(results, null, 1) + '\n');
writeFileSync(`${out}/summary.json`, JSON.stringify({ schema: 'eye-pattern-memory-v1', rule: RULE, seeds: [4001, 4012], items: ITEMS, eyes: eyes.identity, node: process.version, maxRssMiB: process.resourceUsage().maxRSS / 1024, summary }, null, 1) + '\n');
for (const [k, v] of Object.entries(summary)) console.log(k, JSON.stringify(v, (_, x) => (typeof x === 'number' ? +x.toFixed(3) : x)));
