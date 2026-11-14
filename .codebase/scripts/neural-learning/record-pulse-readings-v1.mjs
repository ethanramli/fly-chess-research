#!/usr/bin/env node
// Pulse readings recorder (documentation/design/neural-learning/pulse-scale-check-2026-11-15.md). Graph machine only.
// Quiet circuit (zero drive), connection weights fixed: every legal move on the three development boards with no pulse, a reward pulse and a
// punishment pulse. Records the learnable cells' rates, the dopamine means and learning signals, and the mapping of the 6,046 learnable connections.
// Graph setup, pins and resource guard are copied from probe-wide-learning-v3.mjs, which stays unchanged because completed runs pin its hash.
// Usage (repo root): node --max-old-space-size=512 .codebase/scripts/neural-learning/record-pulse-readings-v1.mjs --config CONFIG --out DIR
import { createHash } from 'node:crypto';
import { closeSync, createReadStream, existsSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync, writeSync } from 'node:fs';
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
import { BOARD_IDS, CIRCUITS, DAN_TYPES, PULSE, PUNISH_TYPES, REWARD_TYPES, VALENCE } from '../../src/neural-learning/three-board-feedback-v1.mjs';
import { MASK_EDGES, captureReadings } from '../../src/neural-learning/pulse-readings-v1.mjs';
const { values: args } = parseArgs({ options: { config: { type: 'string' }, out: { type: 'string' } } });
const MiB = 2 ** 20;
let peakRss = 0;
// Resource guard around every forward: RSS <= 2048 MiB, free memory >= 256 MiB.
const guard = () => { const rss = process.memoryUsage().rss; peakRss = Math.max(peakRss, rss); if (rss > 2048 * MiB) throw Error('RSS above 2048 MiB'); if (os.freemem() < 256 * MiB) throw Error('Free memory below 256 MiB'); };
const avg = xs => xs.reduce((sum, x) => sum + x, 0) / xs.length;
const readJson = path => JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
const sha256 = path => new Promise((resolve, reject) => { const h = createHash('sha256'); createReadStream(path).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject); });
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
async function work(manifest, startedMs) {
  const { paths, model: modelConfig, pins = {} } = readJson(args.config);
  for (const [path, expected] of Object.entries(pins)) {
    const actual = await sha256(path);
    if (actual !== expected) throw Error(`Pin mismatch for ${path}: ${actual}, expected ${expected}`);
    manifest.pins[path] = actual;
  }
  const self = fileURLToPath(import.meta.url);
  const shared = ['three-board-feedback-v1.mjs', 'pulse-readings-v1.mjs'].map(f => fileURLToPath(new URL(`../../src/neural-learning/${f}`, import.meta.url)));
  for (const path of [args.config, self, ...shared]) manifest.pins[path] = await sha256(path);
  writeAtomic('manifest.json', manifest);
  const { bias } = CIRCUITS.quiet;
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
  const position = new Map(cells.map((j, k) => [j, k]));
  const eyes = createEyesV2(loadRetina(paths.graph)), apl = await loadLocalAplPackage(paths.aplPackage);
  const stim = types => types.flatMap(t => danCells[t].map(index => ({ index, current: PULSE })));
  const pulses = { reward: stim(REWARD_TYPES), punish: stim(PUNISH_TYPES) };
  const attraction = mbon.filter(c => VALENCE.get(c.type) > 0).map(c => c.index), avoidance = mbon.filter(c => VALENCE.get(c.type) < 0).map(c => c.index);
  const scoreOf = h => avg(attraction.map(j => h[j])) - avg(avoidance.map(j => h[j]));
  const model = new SparseTrainer(graph, modelConfig);
  model.params.bias.fill(bias);
  installLocalApl(model, apl, { mode: 'local' });
  writeAtomic('mapping.json', { maskEdges: mask.length, cells, cellRootIds: cells.map(j => rootIds[j].toString()), weights,
    edge: mask, type: maskType, cell: maskPre.map(j => position.get(j)), base: mask.map(e => model.params.magnitude[e]) });
  const zeros = new Float32Array(model.inputDim);
  const forward = (fen, move, pulse) => {
    guard();
    model.forward(zeros, [...eyes.encode(fen, move).stimulation, ...(pulse ? pulses[pulse] : [])], null);
    guard();
    return model.h[model.steps];
  };
  // Every weight the forward reads: magnitudes, their signed copy and the drive.
  const weightsDigest = () => { const h = createHash('sha256'); for (const a of [model.params.magnitude, model.signedMagnitude, model.params.bias]) h.update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)); return h.digest('hex'); };
  const recordsPath = join(args.out, 'records.jsonl'), fd = openSync(`${recordsPath}.partial`, 'w');
  let capture;
  try { capture = captureReadings({ boards: selected, forward, cells, danCells, scoreOf, weightsDigest, write: r => writeSync(fd, `${JSON.stringify(r)}\n`), log: line => console.log(line) }); }
  finally { closeSync(fd); }
  renameSync(`${recordsPath}.partial`, recordsPath);
  writeAtomic('summary.json', { schema: 'pulse-readings-summary-v1', circuit: 'quiet', bias, pulse: PULSE, ...capture, boards: selected.map(r => ({ boardId: r.boardId, legal: r.legal.length })),
    maskEdges: mask.length, learnableCells: cells.length, peakRssMiB: peakRss / MiB, elapsedSeconds: (Date.now() - startedMs) / 1000 });
}
async function main() {
  if (!args.config || !args.out) throw Error('Need --config CONFIG and --out DIR');
  if (existsSync(join(args.out, 'manifest.json'))) throw Error(`${args.out} already holds a run; use a new directory`);
  mkdirSync(args.out, { recursive: true });
  const startedMs = Date.now();
  const manifest = { schema: 'pulse-readings-run-v1', status: 'running', pid: process.pid, argv: process.argv, nodeVersion: process.version,
    volume: 2, chapter: '3 To Learn; 5 Evidence for Learning', circuit: 'quiet', learning: 'off: weights fixed', sealedBoards: 0, pins: {}, startedAt: new Date(startedMs).toISOString() };
  writeAtomic('manifest.json', manifest);
  try { await work(manifest, startedMs); manifest.status = 'complete'; }
  catch (error) { manifest.status = 'failed'; manifest.error = error.message; console.error(error.stack ?? error.message); process.exitCode = 1; }
  manifest.endedAt = new Date().toISOString();
  writeAtomic('manifest.json', manifest);
}
main().catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
