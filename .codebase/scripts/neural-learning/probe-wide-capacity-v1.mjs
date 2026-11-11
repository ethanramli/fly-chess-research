#!/usr/bin/env node
// Wide-capacity gate, revision 4 addendum item 6: exact capacity of the full incentive-circuit mask (six valence MBON types).
// ORACLE CONSTRUCTION, NOT LEARNING. Sets synapse magnitudes directly on a SparseTrainer; no condition object.
// dump: per-legal-move scores at gains 1 and 0.9, and presynaptic KC rates per mask edge. verify: ranks one board under a gain vector in [0.2, 1.8].
// Development boards only (groups A and B). Usage (repo root):
//   node --max-old-space-size=256 .codebase/scripts/neural-learning/probe-wide-capacity-v1.mjs --mode dump --config CONFIG --board BOARDID --out DIR [--bias B]
//   node --max-old-space-size=256 .codebase/scripts/neural-learning/probe-wide-capacity-v1.mjs --mode verify --config CONFIG --board BOARDID --gains FILE --out DIR [--bias B]
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

const { values: args } = parseArgs({ options: { mode: { type: 'string' }, config: { type: 'string' }, bias: { type: 'string' }, board: { type: 'string' }, gains: { type: 'string' }, out: { type: 'string' } } });
const MiB = 2 ** 20, MIN_GAIN = 0.2, MAX_GAIN = 1.8, NOTE = 'oracle construction, not learning';
const VALENCE = new Map([['MBON11', 1], ['MBON12', 1], ['MBON02', 1], ['MBON05', -1], ['MBON01', -1], ['MBON15', -1]]);
// Resource guard, called around every forward: RSS <= 2048 MiB and free memory >= 256 MiB.
const guard = () => { if (process.memoryUsage().rss > 2048 * MiB) throw Error('RSS above 2048 MiB'); if (os.freemem() < 256 * MiB) throw Error('Free memory below 256 MiB'); };
const toleranceOf = scores => 1e-9 + 1e-7 * Math.max(...scores.map(Math.abs));
const readJson = path => JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
// Writes DIR/name atomically: partial file, then rename.
function writeAtomic(name, value) {
  mkdirSync(args.out, { recursive: true });
  const path = join(args.out, name);
  writeFileSync(`${path}.partial`, `${JSON.stringify(value)}\n`);
  renameSync(`${path}.partial`, path);
}
// One streamed pass over the annotation TSV. Exact type match: MBON15 never matches MBON31.
// ponytail: both sides' cells of each type are used, as the revision specifies (no side filter).
async function annotate(path, indices) {
  const kc = new Set(), mbon = [];
  let col; // no header line leaves mbon empty, and the cell-count check in work() throws
  for await (const line of createInterface({ input: createReadStream(path), crlfDelay: Infinity })) {
    const fields = line.split('\t');
    if (!col) {
      col = Object.fromEntries(['root_id', 'cell_class', 'hemibrain_type'].map(key => {
        if (!fields.includes(key)) throw Error(`Missing annotation column ${key}`);
        return [key, fields.indexOf(key)];
      }));
      continue;
    }
    const index = indices.get(fields[col.root_id]);
    if (index === undefined) continue;
    if (fields[col.cell_class] === 'Kenyon_Cell') kc.add(index);
    else if (VALENCE.has(fields[col.hemibrain_type])) mbon.push({ index, type: fields[col.hemibrain_type] });
  }
  return { kc, mbon: mbon.sort((a, b) => a.index - b.index) };
}

async function work() {
  if (!['dump', 'verify'].includes(args.mode)) throw Error('--mode must be dump or verify');
  if (!args.config || !args.board || !args.out || (args.mode === 'verify' && !args.gains)) throw Error('Missing --config, --board, --out or (verify) --gains');
  const { paths, model: modelConfig } = readJson(args.config);
  const bias = args.bias === undefined ? null : Number(args.bias); // null: trainer default (uniform 0.01)
  if (bias !== null && !Number.isFinite(bias)) throw Error('--bias must be a number');
  const record = readFileSync(join(paths.packet, 'boards.jsonl'), 'utf8').split('\n').filter(l => l.trim())
    .map(l => JSON.parse(l)).find(r => r.boardId === args.board && (r.group === 'A' || r.group === 'B'));
  if (!record) throw Error(`No development (group A or B) board ${args.board}`);
  const graph = loadGraph(paths.graph);
  const rootIds = readNpz(paths.graph, ['root_ids']).root_ids;
  if (!(rootIds instanceof BigInt64Array) || rootIds.length !== graph.row.length - 1) throw Error('Invalid root IDs');
  const { kc, mbon } = await annotate(paths.annotations, new Map(Array.from(rootIds, (id, i) => [id.toString(), i])));
  const cellsPerType = Object.fromEntries([...VALENCE.keys()].map(type => [type, mbon.filter(c => c.type === type).length]));
  if (Object.values(cellsPerType).includes(0)) throw Error(`Missing MBON cells: ${JSON.stringify(cellsPerType)}`);
  // graph.row[j]..graph.row[j+1] lists the incoming edges of cell j; keep the positive ones from KCs.
  const mask = [];
  for (const cell of mbon) for (let e = graph.row[cell.index]; e < graph.row[cell.index + 1]; e++) if (graph.sign[e] === 1 && kc.has(graph.col[e])) mask.push(e);
  if (!mask.length) throw Error('Empty mask');
  const model = new SparseTrainer(graph, modelConfig);
  if (bias !== null) model.params.bias.fill(bias);
  installLocalApl(model, await loadLocalAplPackage(paths.aplPackage), { mode: 'local' });
  const eyes = createEyesV2(loadRetina(paths.graph));
  const base = Float64Array.from(mask, e => model.params.magnitude[e]); // copied before any change
  const setGains = gains => mask.forEach((e, m) => model.setMagnitude(e, base[m] * gains[m]));
  const uniform = value => new Float64Array(mask.length).fill(value);
  const attraction = mbon.filter(c => VALENCE.get(c.type) > 0).map(c => c.index), avoidance = mbon.filter(c => VALENCE.get(c.type) < 0).map(c => c.index);
  const mean = (h, cells) => cells.reduce((sum, j) => sum + h[j], 0) / cells.length;
  const scoreOf = h => mean(h, attraction) - mean(h, avoidance);
  // Endpoint state after one forward of the candidate's rendered input (zero input vector, Eyes v2 stimulation).
  const run = move => { guard(); model.forward(new Float32Array(model.inputDim), eyes.encode(record.fen, move).stimulation, null); guard(); return model.h[model.steps]; };
  const moves = record.legal;

  if (args.mode === 'dump') {
    // Optional --gains: dump around a current gain vector (sequential surrogate steps); default all gains 1.
    const g0 = args.gains ? readJson(args.gains).gains : Array.from(uniform(1));
    if (!Array.isArray(g0) || g0.length !== mask.length || !g0.every(g => Number.isFinite(g) && g >= MIN_GAIN && g <= MAX_GAIN)) throw Error('dump --gains out of range');
    setGains(g0);
    const scores = [], rates = [];
    for (const move of moves) {
      const h = run(move);
      scores.push(scoreOf(h));
      rates.push(mask.map(e => h[graph.col[e]])); // ponytail: held in memory (moves x mask); stream if the mask grows
    }
    setGains(g0.map(g => g * 0.9));
    const scores09 = moves.map(move => scoreOf(run(move)));
    setGains(uniform(1));
    const tolerance = toleranceOf(scores);
    writeAtomic('dump.json', { schema: 'wide-capacity-dump-v1', note: NOTE, bias, boardId: record.boardId, moves, outcomes: record.outcomes,
      scores, scores09, base: Array.from(base), rates, maskEdges: mask, cellsPerType, tolerance, gains0: g0 });
    console.log(`${NOTE}: dump ${record.boardId} moves=${moves.length} mask=${mask.length} tolerance=${tolerance}`);
  } else {
    const { gains } = readJson(args.gains);
    if (!Array.isArray(gains) || gains.length !== mask.length || !gains.every(g => Number.isFinite(g) && g >= MIN_GAIN && g <= MAX_GAIN)) throw Error(`gains needs ${mask.length} numbers in [${MIN_GAIN}, ${MAX_GAIN}]`);
    setGains(gains);
    const scores = moves.map(move => scoreOf(run(move)));
    setGains(uniform(1));
    const ranked = moves.map((move, i) => ({ move, score: scores[i], safe: record.outcomes[move] === true }));
    const best = list => [...list].sort((a, b) => b.score - a.score)[0];
    const bestSafe = best(ranked.filter(e => e.safe)), bestOther = best(ranked.filter(e => !e.safe));
    if (!bestSafe || !bestOther) throw Error('Board needs at least one safe and one other legal move');
    const tolerance = toleranceOf(scores), margin = bestSafe.score - bestOther.score, success = margin > tolerance ? 1 : 0;
    writeAtomic('verify.json', { schema: 'wide-capacity-verify-v1', note: NOTE, boardId: record.boardId, bias, margin, success, tolerance, bestSafe, bestOther, scores });
    console.log(`${NOTE}: verify ${record.boardId} success=${success} margin=${margin} tolerance=${tolerance}`);
  }
}

work().catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
