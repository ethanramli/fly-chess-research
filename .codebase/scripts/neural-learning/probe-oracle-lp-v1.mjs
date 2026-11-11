#!/usr/bin/env node
// Journal item 24: multi-rival oracle bound for the registered KC-to-MBON05 gains. ORACLE CONSTRUCTION, NOT LEARNING.
// dump: gains all 1; per-legal-move scores, per-edge KC rates and base efficacies, plus scores at gains 0.9.
// verify: ranks one board under a supplied gain vector (every gain must lie in [0.2, 1.8]).
// Development boards only (groups A and B; testA and testB are never selected).
// Usage (repo root), node --max-old-space-size=256 is the AGENTS.md default:
//   node --max-old-space-size=256 .codebase/scripts/neural-learning/probe-oracle-lp-v1.mjs --mode dump --config CONFIG --bias B --board BOARDID --out DIR
//   node --max-old-space-size=256 .codebase/scripts/neural-learning/probe-oracle-lp-v1.mjs --mode verify --config CONFIG --bias B --board BOARDID --gains FILE --out DIR
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';
import { actualTeachingInputs, mapFlyConnectionsMemory } from '../../src/neural-learning/fly-connections-teaching-v1.mjs';
import { loadLocalAplPackage } from '../../src/neural-learning/fly-connections-apl-data-v1.mjs';
import { createFlyCondition } from '../../src/neural-learning/fly-connections-condition-v1.mjs';

const { values: args } = parseArgs({ options: { mode: { type: 'string' }, config: { type: 'string' }, bias: { type: 'string' }, board: { type: 'string' }, gains: { type: 'string' }, out: { type: 'string' } } });
const MiB = 2 ** 20, MIN_GAIN = 0.2, MAX_GAIN = 1.8, ARM = 'informative-local', NOTE = 'oracle construction, not learning';
// Resource guard, called before and after every forward: RSS <= 2048 MiB and free memory >= 256 MiB.
const guard = () => {
  if (process.memoryUsage().rss / MiB > 2048) throw Error('RSS above 2048 MiB');
  if (os.freemem() / MiB < 256) throw Error('Free memory below 256 MiB');
};
// Writes DIR/name atomically: partial file, then rename.
function writeAtomic(name, value) {
  mkdirSync(args.out, { recursive: true });
  const path = join(args.out, name);
  writeFileSync(`${path}.partial`, `${JSON.stringify(value)}\n`);
  renameSync(`${path}.partial`, path);
}

async function work() {
  if (!['dump', 'verify'].includes(args.mode)) throw Error('--mode must be dump or verify');
  const config = JSON.parse(readFileSync(args.config, 'utf8').replace(/^﻿/, ''));
  const { paths } = config, bias = Number(args.bias);
  if (!Number.isFinite(bias)) throw Error('--bias must be a number');
  const record = readFileSync(join(paths.packet, 'boards.jsonl'), 'utf8').split('\n').filter(l => l.trim())
    .map(l => JSON.parse(l)).find(r => r.boardId === args.board && (r.group === 'A' || r.group === 'B'));
  if (!record) throw Error(`No development (group A or B) board ${args.board}`);
  const graph = loadGraph(paths.graph);
  const rootIds = readNpz(paths.graph, ['root_ids']).root_ids;
  const readerCells = neuronReaderCells.cells.filter(cell => cell.type === 'MBON05');
  const mapping = await mapFlyConnectionsMemory(graph, rootIds, paths.annotations, readerCells);
  const check = JSON.parse(readFileSync(paths.mappingCheck, 'utf8'));
  if (check.pass !== true || check.mappingIdentity !== createHash('sha256').update(JSON.stringify(mapping)).digest('hex')) throw Error('Mapping check did not pass for this mapping');
  const eyes = createEyesV2(loadRetina(paths.graph));
  const model = new SparseTrainer(graph, config.model);
  model.params.bias.fill(bias); // before createFlyCondition: the fixed-state digest includes the bias
  const aplPackage = await loadLocalAplPackage(paths.aplPackage);
  const condition = createFlyCondition({ model, mapping, eyes, aplPackage, arm: ARM, guard });
  const initial = condition.snapshot();
  if (initial.memory.gains.some(g => g !== 1)) throw Error('Fresh condition gains are not all 1');
  const withGains = gains => condition.restore({ ...initial, memory: { ...initial.memory, gains } });
  // Presynaptic KC rates for one legal move, aligned with memory.edges (group order, then group.kc order).
  const kcRates = move => {
    guard();
    model.forward(new Float32Array(model.inputDim), eyes.encode(record.fen, move).stimulation, null);
    guard();
    return actualTeachingInputs(model, mapping).flatMap(g => Array.from(g.kcRates));
  };

  if (args.mode === 'dump') {
    const r0 = condition.rankBoard(record); // gains all 1; ranked is UCI-sorted
    const moves = r0.ranked.map(e => e.move);
    const rates = moves.map(move => kcRates(move));
    withGains(initial.memory.gains.map(() => 0.9));
    const s09 = condition.rankBoard(record).ranked.map(e => e.score);
    condition.restore(initial); // gains back to 1
    writeAtomic('dump.json', { schema: 'oracle-lp-dump-v1', note: NOTE, bias, boardId: record.boardId, moves, outcomes: record.outcomes,
      scores: r0.ranked.map(e => e.score), scores09: s09, base: Array.from(condition.memory.base), rates, tolerance: r0.tolerance });
    console.log(`${NOTE}: dump ${record.boardId} moves=${moves.length} edges=${condition.memory.edges.length} tolerance=${r0.tolerance}`);
  } else {
    const { gains } = JSON.parse(readFileSync(args.gains, 'utf8').replace(/^﻿/, ''));
    if (!Array.isArray(gains) || !gains.every(g => typeof g === 'number' && g >= MIN_GAIN && g <= MAX_GAIN)) throw Error(`Every gain must be a number in [${MIN_GAIN}, ${MAX_GAIN}]`);
    withGains(gains);
    const r = condition.rankBoard(record);
    writeAtomic('verify.json', { schema: 'oracle-lp-verify-v1', note: NOTE, boardId: record.boardId, bias, success: r.success, s: r.s, c: r.c,
      margin: r.margin, tolerance: r.tolerance, topMoves: r.topMoves, scores: r.ranked.map(e => e.score) });
    console.log(`${NOTE}: verify ${record.boardId} success=${r.success} s=${r.s} c=${r.c} margin=${r.margin} tolerance=${r.tolerance}`);
  }
}

work().catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
