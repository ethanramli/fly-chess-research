#!/usr/bin/env node
// Learning probe (journal item 30): can the source rule (models_base.py dopaminergic, D = max(v,0) . W, dw = eta D (k + w - 1)) on the revision-4 mask make a safe capture top on development boards? Not registration.
// Group A only. Fresh model per arm; gains persist across an arm's boards.
// Usage (repo root): node --max-old-space-size=512 .codebase/scripts/neural-learning/probe-wide-learning-v1.mjs --config CONFIG --boards 3 --repeats 6 --out DIR [--bias B]
import { createReadStream, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import os from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { installLocalApl } from '../../src/neural-learning/fly-connections-apl-v1.mjs';
import { loadLocalAplPackage } from '../../src/neural-learning/fly-connections-apl-data-v1.mjs';
const { values: args } = parseArgs({ options: { config: { type: 'string' }, boards: { type: 'string' }, repeats: { type: 'string' }, bias: { type: 'string' }, out: { type: 'string' } } });
const MiB = 2 ** 20, MIN_GAIN = 0.2, MAX_GAIN = 1.8, ACT = 1.5, ETA = 0.5, PULSE = 0.75, NOTE = 'learning probe on development boards';
const VALENCE = new Map([['MBON11', 1], ['MBON12', 1], ['MBON02', 1], ['MBON05', -1], ['MBON01', -1], ['MBON15', -1]]);
const DAN_TYPES = ['PAM07', 'PAM02', 'PAM03', 'PPL101', 'PPL103'], TEACH_TYPES = ['PAM07', 'PAM02'];
// Modulation W[dan][mbon] (revision 4 addendum item 1); PPL103 serves both cav and fat, so its entries are sums.
const W = { PAM07: { MBON05: -1 }, PPL101: { MBON11: -1 }, PAM02: { MBON01: -1, MBON02: 0.3 }, PPL103: { MBON12: -1 - 0.3, MBON15: 0.3 - 1 }, PAM03: { MBON02: -1, MBON01: -0.3 } };
// Resource guard around every forward: RSS <= 2048 MiB, free memory >= 256 MiB.
const guard = () => { if (process.memoryUsage().rss > 2048 * MiB) throw Error('RSS above 2048 MiB'); if (os.freemem() < 256 * MiB) throw Error('Free memory below 256 MiB'); };
const avg = xs => xs.reduce((sum, x) => sum + x, 0) / xs.length;
const readJson = path => JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
// Writes DIR/name atomically: partial file, then rename.
function writeAtomic(name, value) {
  mkdirSync(args.out, { recursive: true });
  const path = join(args.out, name);
  writeFileSync(`${path}.partial`, `${JSON.stringify(value)}\n`); renameSync(`${path}.partial`, path);
}
// One streamed pass over the annotation TSV. Exact type match; both sides' cells, as in the capacity probe.
async function annotate(path, indices) {
  const kc = new Set(), mbon = [], dan = [];
  let col;
  for await (const line of createInterface({ input: createReadStream(path), crlfDelay: Infinity })) {
    const fields = line.split('\t');
    if (!col) {
      if (!['root_id', 'cell_class', 'hemibrain_type'].every(key => fields.includes(key))) throw Error('Missing annotation column');
      col = { root_id: fields.indexOf('root_id'), cell_class: fields.indexOf('cell_class'), hemibrain_type: fields.indexOf('hemibrain_type') };
      continue;
    }
    const index = indices.get(fields[col.root_id]); if (index === undefined) continue;
    const cls = fields[col.cell_class], type = fields[col.hemibrain_type];
    if (cls === 'Kenyon_Cell') kc.add(index);
    else if (cls === 'DAN' && DAN_TYPES.includes(type)) dan.push({ index, type });
    else if (VALENCE.has(type)) mbon.push({ index, type });
  }
  return { kc, mbon: mbon.sort((a, b) => a.index - b.index), dan };
}
async function work() {
  const boards = Number(args.boards), repeats = Number(args.repeats);
  if (!args.config || !args.out || !Number.isSafeInteger(boards) || boards < 1 || !Number.isSafeInteger(repeats) || repeats < 0) throw Error('Missing --config or --out, or invalid --boards (>= 1) or --repeats (>= 0)');
  const { paths, model: modelConfig } = readJson(args.config);
  const bias = args.bias === undefined ? null : Number(args.bias); // null: trainer default (uniform 0.01)
  if (bias !== null && !Number.isFinite(bias)) throw Error('--bias must be a number');
  const records = readFileSync(join(paths.packet, 'boards.jsonl'), 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
  const selected = records.filter(r => r.group === 'A').slice(0, boards);
  if (selected.length < boards) throw Error(`Only ${selected.length} group A boards for --boards ${boards}`);
  const graph = loadGraph(paths.graph);
  const rootIds = readNpz(paths.graph, ['root_ids']).root_ids;
  if (!(rootIds instanceof BigInt64Array) || rootIds.length !== graph.row.length - 1) throw Error('Invalid root IDs');
  const { kc, mbon, dan } = await annotate(paths.annotations, new Map(Array.from(rootIds, (id, i) => [id.toString(), i])));
  const cellsOf = (list, types) => Object.fromEntries(types.map(t => [t, list.filter(c => c.type === t).map(c => c.index)]));
  const danCells = cellsOf(dan, DAN_TYPES), mbonCells = cellsOf(mbon, [...VALENCE.keys()]);
  const sizes = Object.fromEntries(Object.entries({ ...danCells, ...mbonCells }).map(([t, c]) => [t, c.length]));
  if (Object.values(sizes).includes(0)) throw Error(`Missing cells: ${JSON.stringify(sizes)}`);
  // graph.row[j]..graph.row[j+1] lists the incoming edges of cell j; keep the positive KC edges onto each MBON cell.
  const mask = [], maskType = [];
  for (const cell of mbon) for (let e = graph.row[cell.index]; e < graph.row[cell.index + 1]; e++) if (graph.sign[e] === 1 && kc.has(graph.col[e])) { mask.push(e); maskType.push(cell.type); }
  if (!mask.length) throw Error('Empty mask');
  const eyes = createEyesV2(loadRetina(paths.graph)), apl = await loadLocalAplPackage(paths.aplPackage);
  const pulseStim = TEACH_TYPES.flatMap(t => danCells[t].map(index => ({ index, current: PULSE })));
  const attraction = mbon.filter(c => VALENCE.get(c.type) > 0).map(c => c.index), avoidance = mbon.filter(c => VALENCE.get(c.type) < 0).map(c => c.index);
  const scoreOf = h => avg(attraction.map(j => h[j])) - avg(avoidance.map(j => h[j]));
  const rows = [];
  for (const arm of ['informative', 'absent']) {
    const model = new SparseTrainer(graph, modelConfig);
    if (bias !== null) model.params.bias.fill(bias);
    installLocalApl(model, apl, { mode: 'local' });
    const base = Float64Array.from(mask, e => model.params.magnitude[e]); // copied before any change
    const gains = new Float64Array(mask.length).fill(1), zeros = new Float32Array(model.inputDim);
    // Endpoint state of one forward; pulse adds the teaching current to every PAM07 and PAM02 cell.
    const run = (fen, move, pulse) => {
      guard();
      model.forward(zeros, [...eyes.encode(fen, move).stimulation, ...(pulse ? pulseStim : [])], null);
      guard();
      return model.h[model.steps];
    };
    // One teaching event: DAN means from the teaching forward, then the source rule on every mask gain.
    const teach = (fen, { move, pulse: designed }) => {
      const pulse = arm === 'informative' && designed, h = run(fen, move, pulse);
      const danMean = Object.fromEntries(DAN_TYPES.map(t => [t, avg(danCells[t].map(j => Math.max(0, h[j]) / ACT))]));
      const D = Object.fromEntries([...VALENCE.keys()].map(m => [m, DAN_TYPES.reduce((sum, t) => sum + (W[t][m] ?? 0) * danMean[t], 0)]));
      if (Object.values(D).some(d => ETA * Math.abs(d) > 1)) throw Error(`Teaching step exceeds bound: ${JSON.stringify(D)}`); // checked before any change
      mask.forEach((e, i) => {
        const k = Math.max(0, h[graph.col[e]]) / ACT;
        gains[i] = Math.min(MAX_GAIN, Math.max(MIN_GAIN, gains[i] + ETA * D[maskType[i]] * (k + gains[i] - 1)));
        model.setMagnitude(e, base[i] * gains[i]);
      });
      return { pulse, d05: D.MBON05, d01: D.MBON01 };
    };
    // Unaided ranking of all legal moves: plain forward, no pulse.
    const rank = record => {
      const scored = record.legal.map(move => ({ move, score: scoreOf(run(record.fen, move, false)) }));
      const best = list => [...list].sort((a, b) => b.score - a.score)[0];
      const bestSafe = best(scored.filter(s => record.outcomes[s.move] === true)), bestOther = best(scored.filter(s => record.outcomes[s.move] !== true));
      if (!bestSafe || !bestOther) throw Error(`Board ${record.boardId} needs a safe and an other legal move`);
      const practised = record.experiences.map(e => ({ move: e.move, pulse: e.pulse, score: scored.find(s => s.move === e.move).score }));
      return { bestSafe, bestOther, margin: bestSafe.score - bestOther.score, above: scored.filter(s => s.score > bestSafe.score).length, practised };
    };
    // Mean D over MBON05 and MBON01 cells, split by the event's effective pulse; null when that event type is absent.
    const dMean = events => {
      const summary = set => ({ MBON05: set.length ? avg(set.map(e => e.d05)) : null, MBON01: set.length ? avg(set.map(e => e.d01)) : null });
      return { pulse: summary(events.filter(e => e.pulse)), noPulse: summary(events.filter(e => !e.pulse)) };
    };
    const report = (record, pass, events) => {
      const ranked = rank(record);
      const gainsAtBound = [...gains].filter(g => g === MIN_GAIN || g === MAX_GAIN).length, meanAbsGainDev = avg(Array.from(gains, g => Math.abs(g - 1)));
      rows.push({ arm, boardId: record.boardId, pass, ...ranked, dMean: dMean(events), gainsAtBound, meanAbsGainDev });
      console.log(`${arm} ${record.boardId} pass ${pass}: safe ${ranked.bestSafe.move} ${ranked.bestSafe.score.toFixed(6)} other ${ranked.bestOther.move} ${ranked.bestOther.score.toFixed(6)} margin ${ranked.margin.toFixed(6)} above ${ranked.above} atBound ${gainsAtBound} meanAbsGainDev ${meanAbsGainDev.toFixed(6)}`);
    };
    for (const record of selected) {
      report(record, 0, []);
      for (let pass = 1; pass <= repeats; pass++) report(record, pass, record.experiences.map(e => teach(record.fen, e)));
    }
  }
  writeAtomic('probe.json', { schema: 'wide-learning-probe-v1', note: NOTE, bias, repeats, boards: selected.map(r => r.boardId), maskEdges: mask.length, modulation: W, rows });
}
work().catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
