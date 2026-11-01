// Cubic-exit development comparison, cubic-exit-spec.md; generated from the preserved v1 runner.
// Closed-loop real-graph memory through Eyes v1 (eye-graph-memory-spec.md). Arbitrary consequences, no chess meaning. Development only.
// shortcut: the rank code is computed from an eye pass at naive gains and relayed as KC current; replace with a modelled KC threshold/APL stage if this path holds.
import { createHash } from 'node:crypto';
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer, random } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV1, loadRetina } from '../../src/chess-input/eyes-v1.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { LocalCubicReservoirMemory } from '../../src/neural-learning/local-cubic-reservoir-memory.mjs';
import { predictionScale } from '../../src/neural-learning/memory-assay-rule-prediction-scaled.mjs';
import { neuronReaderCells, readNeurons } from '../../src/neural-learning/neuron-reader.mjs';

const { values: a } = parseArgs({ options: { out: { type: 'string' }, seeds: { type: 'string', default: '6' }, first: { type: 'string', default: '4101' }, items: { type: 'string', default: '4' }, 'delay-steps': { type: 'string', default: '400' }, 'cpu-duty': { type: 'string', default: '0.5' }, probe: { type: 'boolean' } } });
if (a['cpu-duty'] !== '0.5') throw Error('This registration requires --cpu-duty 0.5');
if (!a.out || existsSync(a.out)) throw Error('Require fresh --out DIR');
mkdirSync(a.out, { recursive: true });
const WINNERS = 20, ITEMS = Number(a.items), TEMPERATURE = 0.1, TONIC = 0.75, ETA = 2, V0 = 1.2, TRIALS = 24, DELAY_STEPS = Number(a['delay-steps']);
const COMPARTMENTS = [['MBON05', 'PAM08'], ['MBON07', 'PAM11']];
const started = performance.now();
const guard = () => { if (process.memoryUsage().rss > 2048 * 2 ** 20 || os.freemem() < 256 * 2 ** 20 || performance.now() - started > 10800000) throw Error('Resource guard'); };
const sha = v => createHash('sha256').update(v).digest('hex');
const atomic = (file, value) => { writeFileSync(file + '.partial', JSON.stringify(value) + '\n'); renameSync(file + '.partial', file); };
const sleepWord = new Int32Array(new SharedArrayBuffer(4));
const paceModel = model => {
  const raw = model.forward.bind(model);
  model.forward = (...args) => { guard(); const t = performance.now(), r = raw(...args); Atomics.wait(sleepWord, 0, 0, performance.now() - t); return r; };
};
const localHash = memory => { const h = createHash('sha256'); for (const x of [memory.gains, memory.traces, memory.states]) h.update(Buffer.from(x.buffer, x.byteOffset, x.byteLength)); return h.update(JSON.stringify([memory.time, memory.pulses])).digest('hex'); };
const pins = Object.fromEntries(['.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv',
  '.codebase/src/chess-input/eyes-v1.mjs', '.codebase/src/chess-input/eyes-v1-pictures.json',
  '.codebase/src/neural-learning/neuron-reader.mjs', '.codebase/src/neural-learning/neuron-reader-cells.json',
  '.codebase/src/neural-learning/local-cubic-reservoir-memory.mjs', '.codebase/src/neural-learning/local-reservoir-memory.mjs',
  '.codebase/src/neural-learning/local-gated-memory.mjs', '.codebase/src/neural-learning/local-supralinear-reservoir-memory.mjs',
  '.codebase/src/neural-learning/memory-assay-rule-prediction-scaled.mjs', '.codebase/src/neural-learning/memory-assay-fixture.mjs',
  '.codebase/src/neural-learning/mushroom-body.mjs', '.codebase/src/supervised-baselines/trainer.mjs',
  '.codebase/src/runtime/sparse-accumulator.mjs', '.codebase/src/runtime/graph.mjs',
  'research/reports/memory-retention-continuation-2026-11-01/cubic-exit-spec.md',
  '.codebase/scripts/neural-learning/run-eye-graph-memory-cubic.mjs', 'package-lock.json'].map(p => [p, sha(readFileSync(p))]));
atomic(`${a.out}/manifest.json`, { schema: 'eye-graph-memory-cubic-v1', status: 'running', argv: process.argv, node: process.version, started: new Date().toISOString(), pins, limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5, wallSeconds: 10800 } });

const graph = loadGraph('.cache/full.npz'), roots = readNpz('.cache/full.npz', ['root_ids']).root_ids;
const indexOf = new Map(Array.from(roots, (r, i) => [r.toString(), i])), kcs = [], dans = new Map();
let header;
for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
  const f = line.split('\t');
  if (!header) { header = f; continue; }
  const i = indexOf.get(f[header.indexOf('root_id')]), c = f[header.indexOf('cell_class')], t = f[header.indexOf('hemibrain_type')];
  if (i === undefined) continue;
  if (c === 'Kenyon_Cell') kcs.push(i);
  if (c === 'DAN') { if (!dans.has(t)) dans.set(t, []); dans.get(t).push(i); }
}
const kcSet = new Set(kcs), reader = {};
for (const c of neuronReaderCells.cells) (reader[c.type] ??= []).push(c.index);
const eyes = createEyesV1(loadRetina('.cache/full.npz'));
const eyeModel = new SparseTrainer(graph, { steps: 32, inputDim: 1, outputs: 1, seed: 47 });
paceModel(eyeModel);
eyeModel.forward([0]);
const eyeRest = Float32Array.from(eyeModel.h[32]);
const rise = (fen, uci) => { eyeModel.forward([0], eyes.encode(fen, uci).stimulation); const h = eyeModel.h[32]; return Float64Array.from(kcs, i => Math.max(0, h[i] - eyeRest[i])); };
// Seeded legal play from the start position; two moves per board, baseline over up to 12 legal moves. No puzzle file is opened.
function buildItems(seed) {
  const rng = random(seed), list = [];
  while (list.length < ITEMS) {
    const b = new Chess();
    for (let p = 0, plies = 6 + Math.floor(rng() * 40); p < plies && !b.isGameOver(); p++) { const ms = b.moves({ verbose: true }); b.move(ms[Math.floor(rng() * ms.length)]); }
    const ms = b.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ''));
    if (b.isGameOver() || ms.length < 2) continue;
    const pair = [ms.splice(Math.floor(rng() * ms.length), 1)[0], ms.splice(Math.floor(rng() * ms.length), 1)[0]];
    const vs = [...pair, ...ms.slice(0, 10)].map(m => rise(b.fen(), m)), base = new Float64Array(kcs.length);
    for (const v of vs) for (let i = 0; i < v.length; i++) base[i] += v[i] / vs.length;
    const sd = new Float64Array(kcs.length);
    for (const v of vs) for (let i = 0; i < v.length; i++) sd[i] += (v[i] - base[i]) ** 2 / vs.length;
    const code = v => {
      const floor = 0.01 * Math.max(...v), c = v.map((x, i) => (sd[i] > 0 && x >= floor ? Math.max(0, x - base[i]) / Math.sqrt(sd[i]) : 0)), order = Array.from(c.keys()).filter(i => c[i] > 0).sort((p, q) => c[q] - c[p]).slice(0, WINNERS);
      return order.map((i, r) => ({ index: kcs[i], current: 1.5 - 0.6 * r / Math.max(1, order.length - 1) }));
    };
    list.push({ fen: b.fen(), moves: pair, images: [code(vs[0]), code(vs[1])] });
  }
  return list;
}
function makeWorld(seed) {
  const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
  paceModel(model);
  const groups = COMPARTMENTS.map(([m, d]) => {
    const edges = [], kc = [];
    for (const j of reader[m]) for (let e = graph.row[j]; e < graph.row[j + 1]; e++) if (kcSet.has(graph.col[e]) && graph.sign[e] === 1) { edges.push(e); kc.push(graph.col[e]); }
    return { mbonType: m, danType: d, edges, kc, dan: dans.get(d).map(index => ({ index })) };
  });
  const memory = new LocalCubicReservoirMemory(model, { groups }, { eta: ETA, V0 });
  const tonic = (level = TONIC) => COMPARTMENTS.flatMap(([, d]) => dans.get(d).map(index => ({ index, current: level })));
  model.forward([0], tonic());
  const rest = Float32Array.from(model.h[8]);
  return { model, memory, tonic, rest };
}
// Value: relative MBON response, mapped so naive is -.32 and a fully depressed response (gain .2) is +.32.
function makeReadout(world, images) {
  const { model, tonic, rest } = world, naive = new Map();
  const raw = code => {
    model.forward([0], [...tonic(), ...code]);
    return COMPARTMENTS.map(([m]) => reader[m].reduce((s, i) => s + model.h[8][i] - rest[i], 0) / reader[m].length);
  };
  for (const c of images) naive.set(c, raw(c));
  return code => { const r = raw(code), n = naive.get(code); return 0.8 * (1 - (r[0] + r[1]) / (n[0] + n[1])) - 0.32; };
}
function runArm(seed, items, arm, yoked, opts = {}) {
  let w = makeWorld(seed), { model, memory, tonic, rest } = w;
  const images = items.flatMap(x => x.images);
  let value = makeReadout(w, images);
  const suffix = `${seed}-${arm}${opts.restore ? '-restored' : ''}`, frameFile = `${a.out}/frames-${suffix}.jsonl`;
  let frame = 0, context = { phase: 'initial' };
  const log = record => appendFileSync(frameFile, JSON.stringify(record) + '\n');
  log({ kind: 'start', seed, arm, config: memory.config, identity: memory.identity, mapping: memory.mapping, initial: memory.snapshot(), items, localHash: localHash(memory) });
  const localKcs = [...new Set(memory.mapping.groups.flatMap(g => g.kc))];
  const observe = dt => {
    const t = performance.now(), h = model.h[model.steps], c = memory.config, before = localHash(memory);
    const ks = localKcs.map(i => [i, Math.min(1, Math.max(0, h[i] - rest[i]) / c.activityScale)]).filter(([, k]) => k > c.theta);
    const ds = memory.mapping.groups.map(g => {
      let excess = 0, deficit = 0;
      for (const { index } of g.dan) { excess += Math.max(0, h[index] - rest[index]) / c.activityScale; deficit += Math.max(0, rest[index] - h[index]) / c.activityScale; }
      return { excess: excess / g.dan.length, deficit: deficit / g.dan.length };
    });
    memory.observe(rest, dt);
    log({ kind: 'frame', frame: frame++, context, dt, ks, ds, before, after: localHash(memory) });
    if (frame % 50 === 0) atomic(`${a.out}/progress.json`, { seed, arm, restored: !!opts.restore, frame, context, time: memory.time });
    Atomics.wait(sleepWord, 0, 0, performance.now() - t);
  };
  const rng = mulberry32((seed ^ { informative: 0x11, absent: 0x22, shuffled: 0x33, disabled: 0x44 }[arm]) >>> 0), delayRng = mulberry32((seed ^ 0x6a09e667) >>> 0);
  const learns = arm !== 'disabled', tests = {}, realized = {}, pulses = {};
  const gainsHash = () => sha(Buffer.from(memory.gains.buffer));
  const stateHash = () => sha(JSON.stringify(memory.snapshot()));
  const initialGains = gainsHash();
  const look = (code, level, dt) => { model.forward([0], [...tonic(level), ...code]); if (learns) observe(dt); };
  const gap = dt => { model.h[8].set(rest); if (learns) observe(dt); }; // nothing active, so the settled rest pattern needs no graph pass
  const test = (name, goodOf) => {
    const before = stateHash();
    tests[name] = items.map((x, j) => { const good = goodOf(j), m = value(x.images[good]) - value(x.images[1 - good]); return { mNorm: m / 1.6, greedy: m > 0 }; });
    if (stateHash() !== before) throw Error('Test changed persistent state');
    atomic(`${a.out}/snapshot-${suffix}-${name}.json`, { seed, arm, phase: name, snapshot: memory.snapshot(), localHash: localHash(memory), tests: tests[name] });
    log({ kind: 'test', name, results: tests[name], localHash: localHash(memory) });
  };
  let trial = 0, cursor = {};
  const block = (name, j, good) => {
    pulses[name] = { reward: 0, punish: 0, none: 0 }; realized[name] = []; cursor[name] = 0;
    for (let t = 0; t < TRIALS; t++) {
      guard();
      const unknown = (trial + 1) % 8 === 0; trial++;
      context = { phase: name, trial, item: j, step: 'choice', chosen: null };
      // value() has just run this image's graph pass at tonic level, so the rest frame can observe it directly.
      const scores = items[j].images.map(code => { const v = value(code); if (learns) observe(1); gap(4); return v; });
      const choice = rng() < 1 / (1 + Math.exp((scores[1] - scores[0]) / TEMPERATURE)) ? 0 : 1, code = items[j].images[choice];
      let valence = null;
      if (!unknown && learns && arm !== 'absent') valence = arm === 'shuffled' ? yoked[name][cursor[name]++] : choice === good ? 'reward' : 'punish';
      if (valence) { pulses[name][valence]++; realized[name].push(valence); } else pulses[name].none++;
      context = { ...context, step: 'chosen', chosen: choice };
      const now = value(code); if (learns) observe(1);
      const pulse = valence === 'reward' ? 1.5 : valence === 'punish' ? 0 : TONIC;
      const f = valence ? predictionScale(now, valence === 'reward' ? 1 : -1, V0) : 0;
      log({ kind: 'trial', context, scores, choice, unknown, good, valence, now, scale: f, level: TONIC + (pulse - TONIC) * f,
        certificate: { criterion: 'assigned-action-association-v1', scope: 'arbitrary association only; no chess consequence', fen: items[j].fen, moves: items[j].moves, chosenMove: items[j].moves[choice], known: !unknown, goodMove: items[j].moves[good] } });
      context = { ...context, step: 'feedback' };
      look(code, TONIC + (pulse - TONIC) * f, 1);
      gap(4);
    }
  };
  for (let j = 0; j < ITEMS; j++) { block(`B${j}`, j, 0); test(`T${j}`, () => 0); }
  const gainsBefore = gainsHash();
  // Delay: ongoing noise. Random 10% of visual-pool cells (those any image uses, plus none beyond) with DAN jitter, all arms that learn.
  const pool = [...new Set(images.flat().map(c => c.index))], noiseRng = delayRng;
  for (let s = 0; s < DELAY_STEPS; s++) {
    guard(); context = { phase: 'Delay', step: s };
    const code = pool.filter(() => noiseRng() < 0.1).map(index => ({ index, current: 0.9 + 0.6 * noiseRng() }));
    const dan = COMPARTMENTS.flatMap(([, d]) => { const e = 0.1 * (2 * noiseRng() - 1); return dans.get(d).map(index => ({ index, current: TONIC * (1 + e) })); });
    model.forward([0], [...dan, ...code]); if (learns) observe(4);
  }
  test('Delay', () => 0);
  if (opts.restore) {
    const saved = JSON.parse(JSON.stringify(memory.snapshot())), before = localHash(memory);
    w = makeWorld(seed); const freshValue = makeReadout(w, images); w.memory.restore(saved);
    ({ model, memory, tonic, rest } = w); value = freshValue;
    if (localHash(memory) !== before) throw Error('Fresh-model restore changed local state');
    log({ kind: 'fresh-restore', before, after: localHash(memory) });
  }
  block('REV', 0, 1); test('Rev', j => (j === 0 ? 1 : 0));
  const obs = readNeurons(model.h[8], { roster: neuronReaderCells, config: { ...model.config }, memoryIdentity: memory.identity });
  log({ kind: 'end', frames: frame, finalState: localHash(memory) });
  return { seed, arm, tests, pulses, realized, initialGains, gainsBefore, frames: frame, finalLocalState: localHash(memory), finalState: stateHash(), readerZero: obs.zeroCount, readerCeiling: obs.ceilingCount, kcEdges: memory.edges.length, fixtures: items.map(x => ({ fen: x.fen, moves: x.moves })) };
}
if (a.probe) {
  const typeOf = new Map(); header = null;
  for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) { const f = line.split('	'); if (!header) { header = f; continue; } if (f[header.indexOf('cell_class')] === 'Kenyon_Cell') typeOf.set(indexOf.get(f[header.indexOf('root_id')]), f[header.indexOf('hemibrain_type')]); }
  const edgesTo = {}; for (const [t, cells] of Object.entries(reader)) { edgesTo[t] = new Map(); for (const j of cells) for (let e = graph.row[j]; e < graph.row[j + 1]; e++) if (graph.sign[e] === 1) edgesTo[t].set(graph.col[e], (edgesTo[t].get(graph.col[e]) ?? 0) + 1); }
  for (let seed = Number(a.first), end = seed + Number(a.seeds); seed < end; seed++) for (const [j, x] of buildItems(seed).entries()) for (const [k, code] of x.images.entries()) {
    const types = {}; for (const c of code) { const t = typeOf.get(c.index); types[t] = (types[t] ?? 0) + 1; }
    const reach = Object.fromEntries(Object.keys(reader).map(t => [t, code.filter(c => edgesTo[t].has(c.index)).length]));
    const other = x.images[1 - k], shared = code.filter(c => other.some(o => o.index === c.index)).length;
    console.log(seed, j, k, x.moves[k], 'n', code.length, 'shared', shared, JSON.stringify(types), JSON.stringify(reach));
  }
  process.exit(0);
}
const seeds = Array.from({ length: Number(a.seeds) }, (_, i) => Number(a.first) + i), rows = [];
for (const seed of seeds) {
  guard();
  const items = buildItems(seed), t0 = performance.now(), inf = runArm(seed, items, 'informative');
  const yoked = Object.fromEntries(Object.entries(inf.realized).map(([k, l], b) => { const x = [...l], r = mulberry32((seed ^ 0x77 ^ b) >>> 0); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return [k, x]; }));
  for (const name of ['informative', 'absent', 'shuffled', 'disabled']) {
    const rec = name === 'informative' ? inf : runArm(seed, items, name, yoked);
    rows.push(rec); appendFileSync(`${a.out}/records.jsonl`, JSON.stringify(rec) + '\n');
    atomic(`${a.out}/completed.json`, { seed, arm: name, records: rows.length, finalState: rec.finalLocalState });
    console.log(JSON.stringify({ seed, arm: name, completedRecords: rows.length, last: rec.tests[`T${ITEMS - 1}`].map(x => x.mNorm), delay: rec.tests.Delay.map(x => x.mNorm) }));
  }
  if (seed === seeds[0] && runArm(seed, items, 'informative', null, { restore: true }).finalState !== inf.finalState) throw Error('Saved and restored run differs from the uninterrupted run');
  // Graph passes and local observation/receipt work are paced individually at duty .5.
  console.log(JSON.stringify({ seed, ms: Math.round(performance.now() - t0), T: inf.tests[`T${ITEMS - 1}`].map(e => +e.mNorm.toFixed(3)), Delay: inf.tests.Delay.map(e => +e.mNorm.toFixed(3)), Rev: inf.tests.Rev.map(e => +e.mNorm.toFixed(3)), pulses: inf.pulses.B0 }));
}
const med = xs => { const s = xs.filter(Number.isFinite).sort((p, q) => p - q); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const arm = n => rows.filter(r => r.arm === n), I = arm('informative'), share = (r, t, js) => js.filter(j => r.tests[t][j].greedy).length / js.length;
const ALL = Array.from({ length: ITEMS }, (_, j) => j), OLD = ALL.slice(0, ITEMS / 2), LAST = `T${ITEMS - 1}`;
const ratio = (n, d) => (d > 0 ? n / d : 0);
const own = ALL.map(j => ({ m: med(I.map(r => r.tests[`T${j}`][j].mNorm)), g: I.filter(r => r.tests[`T${j}`][j].greedy).length / I.length }));
const marks = {
  R1: { pass: own.every(x => x.m >= 0.20 && x.g >= 0.9), observed: own },
  R2: { pass: med(I.map(r => share(r, LAST, OLD))) >= 0.9 && med(I.map(r => med(OLD.map(j => ratio(r.tests[LAST][j].mNorm, r.tests[`T${j}`][j].mNorm))))) >= 0.5, observed: { share: med(I.map(r => share(r, LAST, OLD))), ratio: med(I.map(r => med(OLD.map(j => ratio(r.tests[LAST][j].mNorm, r.tests[`T${j}`][j].mNorm))))) } },
  R3: { pass: med(I.map(r => r.tests.Rev[0].mNorm)) >= 0.15 && I.filter(r => r.tests.Rev[0].greedy).length / I.length >= 0.9 && med(I.map(r => med(ALL.slice(1).map(j => ratio(r.tests.Rev[j].mNorm, r.tests.Delay[j].mNorm))))) >= 0.8, observed: { item: med(I.map(r => r.tests.Rev[0].mNorm)), greedy: I.filter(r => r.tests.Rev[0].greedy).length / I.length, others: med(I.map(r => med(ALL.slice(1).map(j => ratio(r.tests.Rev[j].mNorm, r.tests.Delay[j].mNorm))))) } },
  R4: { pass: med(I.map(r => share(r, 'Delay', ALL))) >= 0.9 && med(I.map(r => med(ALL.map(j => ratio(r.tests.Delay[j].mNorm, r.tests[LAST][j].mNorm))))) >= 0.7, observed: { share: med(I.map(r => share(r, 'Delay', ALL))), ratio: med(I.map(r => med(ALL.map(j => ratio(r.tests.Delay[j].mNorm, r.tests[LAST][j].mNorm))))) } },
  R5: { pass: arm('disabled').every(r => r.gainsBefore === r.initialGains) && med(arm('shuffled').map(r => share(r, LAST, ALL))) < 0.75 && med(I.map(r => share(r, LAST, ALL))) >= med(arm('shuffled').map(r => share(r, LAST, ALL))) + 0.25,
    observed: { disabledUnchanged: arm('disabled').every(r => r.gainsBefore === r.initialGains), absentUnchanged: arm('absent').every(r => r.gainsBefore === r.initialGains), shuffled: med(arm('shuffled').map(r => share(r, LAST, ALL))), informative: med(I.map(r => share(r, LAST, ALL))), absentShare: med(arm('absent').map(r => share(r, LAST, ALL))) } },
};
const summary = { schema: 'eye-graph-memory-cubic-v1', seeds, items: ITEMS, marks, wall: (performance.now() - started) / 1000, maxRssMiB: process.resourceUsage().maxRSS / 1024, eyes: eyes.identity, spec: pins['research/reports/memory-retention-continuation-2026-11-01/cubic-exit-spec.md'], self: sha(readFileSync(new URL(import.meta.url))) };
for (const [p, expected] of Object.entries(pins)) if (sha(readFileSync(p)) !== expected) throw Error(`Input/source changed during run: ${p}`);
writeFileSync(`${a.out}/summary.json`, JSON.stringify(summary, null, 1) + '\n');
atomic(`${a.out}/manifest.json`, { schema: summary.schema, status: 'complete', argv: process.argv, node: process.version, pins, summary: sha(readFileSync(`${a.out}/summary.json`)), wall: summary.wall, maxRssMiB: summary.maxRssMiB });
console.log(JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, { pass: v.pass, observed: v.observed }])), (_, x) => (typeof x === 'number' ? +x.toFixed(3) : x)));
