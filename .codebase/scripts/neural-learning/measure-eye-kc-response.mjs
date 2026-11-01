// Read-only: what Eyes v1 does to real KCs and reader MBONs. No learning, no gains, no sealed or puzzle data.
// Question and limits: research/journal/experiments/2026-10-31-memory-goal-continuation.md
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer, random } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV1, loadRetina } from '../../src/chess-input/eyes-v1.mjs';
import { neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';

const { values: { out, boards: boardsArg = '12', moves: movesArg = '4', steps: stepsArg = '8', scale: scaleArg = '0.9', norm = 'row' } } = parseArgs({ options: { scale: { type: 'string' }, norm: { type: 'string' }, out: { type: 'string' }, boards: { type: 'string' }, moves: { type: 'string' }, steps: { type: 'string' } } });
if (!out || existsSync(out)) throw Error('Require fresh --out DIR');
mkdirSync(out, { recursive: true });
const THETA = 0.2, SCALE = 1.5; // the candidate rule's eligibility threshold and activity scale
const guard = () => { if (process.memoryUsage().rss > 2048 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Resource guard'); };
const graph = loadGraph('.cache/full.npz'), roots = readNpz('.cache/full.npz', ['root_ids']).root_ids;
const indexOf = new Map(Array.from(roots, (r, i) => [r.toString(), i]));
const kcs = [];
let header;
for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
  const f = line.split('\t');
  if (!header) { header = f; continue; }
  if (f[header.indexOf('cell_class')] !== 'Kenyon_Cell') continue;
  const index = indexOf.get(f[header.indexOf('root_id')]);
  if (index !== undefined) kcs.push({ index, type: f[header.indexOf('hemibrain_type')] });
}
const model = new SparseTrainer(graph, { steps: Number(stepsArg), inputDim: 1, outputs: 1, seed: 47, recurrentScale: Number(scaleArg), normalization: norm });
const eyes = createEyesV1(loadRetina('.cache/full.npz'));
const t0 = performance.now(), cpu0 = process.cpuUsage();
model.forward([0]);
const rest = Float32Array.from(model.h[model.steps]);

// Boards: seeded legal play from the start position. No puzzle file is opened.
const rng = random(1031), samples = [];
for (let b = 0; b < Number(boardsArg); b++) {
  const board = new Chess();
  for (let p = 0, plies = 6 + b * 3; p < plies && !board.isGameOver(); p++) { const ms = board.moves({ verbose: true }); board.move(ms[Math.floor(rng() * ms.length)]); }
  const ms = board.moves({ verbose: true });
  for (let m = 0; m < Number(movesArg) && ms.length; m++) { const x = ms.splice(Math.floor(rng() * ms.length), 1)[0]; samples.push({ board: b, fen: board.fen(), uci: x.from + x.to + (x.promotion ?? '') }); }
}
const TYPES = [...new Set(kcs.map(k => k.type))].sort(), rows = [], kcVectors = [], stimVectors = [];
for (const s of samples) {
  guard();
  const stim = eyes.encode(s.fen, s.uci).stimulation;
  model.forward([0], stim);
  const h = model.h[model.steps], k = kcs.map(c => Math.min(1, Math.max(0, h[c.index] - rest[c.index]) / SCALE));
  const elig = k.filter(x => x > THETA).length;
  const byType = {};
  for (const t of TYPES) { const v = k.filter((_, i) => kcs[i].type === t); byType[t] = { n: v.length, moved: v.filter(x => x > 0).length, eligible: v.filter(x => x > THETA).length, max: Math.max(...v) }; }
  const mbon = {};
  for (const c of neuronReaderCells.cells) mbon[c.type] = (mbon[c.type] ?? 0) + (h[c.index] - rest[c.index]) / neuronReaderCells.cells.filter(x => x.type === c.type).length;
  let ceiling = 0; for (let i = 0; i < h.length; i++) if (h[i] >= 0.99 * model.saturation) ceiling++;
  rows.push({ ...s, stimCells: stim.length, kcMoved: k.filter(x => x > 0).length, kcOverOnePct: k.filter(x => x > 0.01).length, kcEligible: elig, kcMax: Math.max(...k), kcSum: k.reduce((a, b) => a + b, 0), byType, mbon, ceiling });
  kcVectors.push(Float32Array.from(k));
  const v = new Float32Array(model.n); for (const { index, current } of stim) v[index] = current; stimVectors.push(v);
}
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : null; };
const TOP = Math.round(0.05 * kcs.length), sets = kcVectors.map(v => new Set(Array.from(v.keys()).sort((a, b) => v[b] - v[a]).slice(0, TOP).filter(i => v[i] > 0)));
const jac = (a, b) => { const inter = [...a].filter(x => b.has(x)).length, u = a.size + b.size - inter; return u ? inter / u : null; };
const pairs = { sameBoard: [], otherBoard: [] };
for (let i = 0; i < samples.length; i++) for (let j = i + 1; j < samples.length; j++) pairs[samples[i].board === samples[j].board ? 'sameBoard' : 'otherBoard'].push({ kcCos: cos(kcVectors[i], kcVectors[j]), kcJaccard: jac(sets[i], sets[j]), stimCos: cos(stimVectors[i], stimVectors[j]) });
const median = xs => { const a = xs.filter(x => x !== null).sort((p, q) => p - q); return a.length ? a[a.length >> 1] : null; };
const stat = key => Object.fromEntries(['sameBoard', 'otherBoard'].map(g => [g, median(pairs[g].map(p => p[key]))]));
const wall = (performance.now() - t0) / 1000, cpu = process.cpuUsage(cpu0);
const summary = { schema: 'eye-kc-response-v1', scope: 'Read-only endpoint measurement; no learning', steps: Number(stepsArg), kcCount: kcs.length, kcTypes: TYPES, samples: samples.length, recurrentScale: Number(scaleArg), normalization: norm, restMean: rest.reduce((a, b) => a + b, 0) / rest.length,
  median: { stimCells: median(rows.map(r => r.stimCells)), kcMoved: median(rows.map(r => r.kcMoved)), kcOverOnePct: median(rows.map(r => r.kcOverOnePct)), kcEligible: median(rows.map(r => r.kcEligible)), kcMax: median(rows.map(r => r.kcMax)), ceiling: median(rows.map(r => r.ceiling)) },
  overlap: { kcCos: stat('kcCos'), kcJaccard: stat('kcJaccard'), stimCos: stat('stimCos') }, restFiniteMaxKC: Math.max(...kcs.map(c => rest[c.index])), byTypeFirst: rows[0].byType, mbonFirst: rows[0].mbon, identity: { eyes: eyes.identity, reader: neuronReaderCells.identity },
  resources: { wall, cpu: (cpu.user + cpu.system) / 1e6, maxRssMiB: process.resourceUsage().maxRSS / 1024 } };
writeFileSync(`${out}/rows.jsonl`, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 1) + '\n');
console.log(JSON.stringify(summary));
