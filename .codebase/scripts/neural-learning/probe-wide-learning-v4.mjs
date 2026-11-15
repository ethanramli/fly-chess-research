#!/usr/bin/env node
// Three-board test with the reading before feedback (documentation/design/neural-learning/three-board-reading-before-feedback-2026-11-15.md):
// one circuit, one condition, three development boards. A copy of probe-wide-learning-v3.mjs, which stays unchanged because completed runs pin its hash.
// The one change is the lesson, from reading-before-feedback-v1.mjs: a pulse-free pass supplies the Kenyon-cell reading, then the pulsed pass supplies
// the learning signal. The result also records the rule and the number of output cells per type.
// Usage (repo root): node --max-old-space-size=512 .codebase/scripts/neural-learning/probe-wide-learning-v4.mjs --config CONFIG --circuit current|quiet --condition correct|swapped|off --out DIR
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import os from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { installLocalApl } from '../../src/neural-learning/fly-connections-apl-v1.mjs';
import { loadLocalAplPackage } from '../../src/neural-learning/fly-connections-apl-data-v1.mjs';
import { BOARD_IDS, CIRCUITS, CONDITIONS, DAN_TYPES, PULSE, PUNISH_TYPES, REWARD_TYPES, VALENCE, W } from '../../src/neural-learning/three-board-feedback-v1.mjs';
import { RULE, runBoard } from '../../src/neural-learning/reading-before-feedback-v1.mjs';
const { values: args } = parseArgs({ options: { config: { type: 'string' }, circuit: { type: 'string' }, condition: { type: 'string' }, out: { type: 'string' } } });
const MiB = 2 ** 20, MASK_EDGES = 6046;
// Resource guard around every forward: RSS <= 2048 MiB, free memory >= 256 MiB.
const guard = () => { if (process.memoryUsage().rss > 2048 * MiB) throw Error('RSS above 2048 MiB'); if (os.freemem() < 256 * MiB) throw Error('Free memory below 256 MiB'); };
const avg = xs => xs.reduce((sum, x) => sum + x, 0) / xs.length;
const readJson = path => JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
const sha256 = path => new Promise((resolve, reject) => { const h = createHash('sha256'); createReadStream(path).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject); });
// Writes DIR/name atomically: partial file, then rename.
function writeAtomic(name, value) {
  const path = join(args.out, name);
  writeFileSync(`${path}.partial`, `${JSON.stringify(value, null, 1)}\n`); renameSync(`${path}.partial`, path);
}
// One streamed pass over the annotation TSV. Exact type match; both sides' cells, as in v2 and v3.
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
async function work(manifest) {
  const { paths, model: modelConfig, pins = {} } = readJson(args.config);
  // Every pinned input must match before any graph work.
  for (const [path, expected] of Object.entries(pins)) {
    const actual = await sha256(path);
    if (actual !== expected) throw Error(`Pin mismatch for ${path}: ${actual}, expected ${expected}`);
    manifest.pins[path] = actual;
  }
  const self = fileURLToPath(import.meta.url);
  const shared = ['three-board-feedback-v1.mjs', 'reading-before-feedback-v1.mjs'].map(f => fileURLToPath(new URL(`../../src/neural-learning/${f}`, import.meta.url)));
  for (const path of [args.config, self, ...shared]) manifest.pins[path] = await sha256(path);
  writeAtomic('manifest.json', manifest);
  const { bias, kcScale } = CIRCUITS[args.circuit];
  const records = readFileSync(join(paths.packet, 'boards.jsonl'), 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
  const selected = BOARD_IDS.map(id => records.find(r => r.boardId === id && r.group === 'A'));
  if (selected.some(r => !r)) throw Error(`Missing a development board: ${BOARD_IDS.join(', ')}`); // only these three; no sealed games are read
  const graph = loadGraph(paths.graph);
  const rootIds = readNpz(paths.graph, ['root_ids']).root_ids;
  if (!(rootIds instanceof BigInt64Array) || rootIds.length !== graph.row.length - 1) throw Error('Invalid root IDs');
  const { kc, mbon, dan } = await annotate(paths.annotations, new Map(Array.from(rootIds, (id, i) => [id.toString(), i])));
  const cellsOf = (list, types) => Object.fromEntries(types.map(t => [t, list.filter(c => c.type === t).map(c => c.index)]));
  const danCells = cellsOf(dan, DAN_TYPES), mbonCells = cellsOf(mbon, [...VALENCE.keys()]);
  const sizes = Object.fromEntries(Object.entries({ ...danCells, ...mbonCells }).map(([t, c]) => [t, c.length]));
  if (Object.values(sizes).includes(0)) throw Error(`Missing cells: ${JSON.stringify(sizes)}`);
  // graph.row[j]..graph.row[j+1] lists the incoming edges of cell j; keep the positive KC edges onto each MBON cell.
  const mask = [], maskType = [], maskPre = [];
  for (const cell of mbon) for (let e = graph.row[cell.index]; e < graph.row[cell.index + 1]; e++) if (graph.sign[e] === 1 && kc.has(graph.col[e])) { mask.push(e); maskType.push(cell.type); maskPre.push(graph.col[e]); }
  if (mask.length !== MASK_EDGES) throw Error(`Mask has ${mask.length} edges, expected ${MASK_EDGES}`);
  const count = new Map(); for (const j of maskPre) count.set(j, (count.get(j) ?? 0) + 1);
  const cells = [...count.keys()].sort((a, b) => a - b), weights = cells.map(j => count.get(j)); // each cell counted once per learnable edge, as in check_scale.mjs
  const eyes = createEyesV2(loadRetina(paths.graph)), apl = await loadLocalAplPackage(paths.aplPackage);
  const stim = types => types.flatMap(t => danCells[t].map(index => ({ index, current: PULSE })));
  const pulses = { reward: stim(REWARD_TYPES), punish: stim(PUNISH_TYPES) };
  const attraction = mbon.filter(c => VALENCE.get(c.type) > 0).map(c => c.index), avoidance = mbon.filter(c => VALENCE.get(c.type) < 0).map(c => c.index);
  const scoreOf = h => avg(attraction.map(j => h[j])) - avg(avoidance.map(j => h[j]));
  const model = new SparseTrainer(graph, modelConfig);
  if (bias !== null) model.params.bias.fill(bias);
  installLocalApl(model, apl, { mode: 'local' });
  const base = Float64Array.from(mask, e => model.params.magnitude[e]); // copied before any change; runBoard restores it for every board
  const zeros = new Float32Array(model.inputDim);
  const forward = (fen, move, pulse) => {
    guard();
    model.forward(zeros, [...eyes.encode(fen, move).stimulation, ...(pulse ? pulses[pulse] : [])], null);
    guard();
    return model.h[model.steps];
  };
  const boards = selected.map(record => runBoard({ record, condition: args.condition, kcScale, forward, setMagnitude: (e, v) => model.setMagnitude(e, v),
    base, mask, maskType, maskPre, cells, weights, danCells, scoreOf, log: line => console.log(`${args.circuit} ${args.condition} ${line}`) }));
  writeAtomic('result.json', { schema: 'three-board-feedback-v2', rule: RULE, circuit: args.circuit, condition: args.condition, bias, kcScale, maskEdges: mask.length,
    learnableCells: cells.length, outputCells: Object.fromEntries([...VALENCE.keys()].map(t => [t, sizes[t]])), modulation: W, pulse: PULSE, boards });
}
async function main() {
  if (!args.config || !args.out || !(args.circuit in CIRCUITS) || !CONDITIONS.includes(args.condition)) throw Error(`Need --config, --out, --circuit (${Object.keys(CIRCUITS).join('|')}) and --condition (${CONDITIONS.join('|')})`);
  if (existsSync(join(args.out, 'manifest.json'))) throw Error(`${args.out} already holds a run; use a new directory`);
  mkdirSync(args.out, { recursive: true });
  const manifest = { schema: 'three-board-feedback-run-v2', status: 'running', pid: process.pid, argv: process.argv, nodeVersion: process.version,
    volume: 2, chapter: '3 To Learn; 5 Evidence for Learning', rule: RULE, circuit: args.circuit, condition: args.condition, sealedBoards: 0, pins: {}, startedAt: new Date().toISOString() };
  writeAtomic('manifest.json', manifest);
  try { await work(manifest); manifest.status = 'complete'; }
  catch (error) { manifest.status = 'failed'; manifest.error = error.message; console.error(error.stack ?? error.message); process.exitCode = 1; }
  manifest.endedAt = new Date().toISOString();
  writeAtomic('manifest.json', manifest);
}
main().catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
