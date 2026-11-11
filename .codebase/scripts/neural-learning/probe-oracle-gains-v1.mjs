#!/usr/bin/env node
// Journal item 22 oracle: can ANY KC-to-MBON05 mask gains in [0.2, 1.8] make a safe non-king capture the top choice?
// ORACLE CONSTRUCTION, NOT LEARNING: gains are set here from forward passes, never by teaching. Development boards only.
// Writes only DIR/oracle.json.
// Usage (repo root): node --max-old-space-size=512 .codebase/scripts/neural-learning/probe-oracle-gains-v1.mjs --config CONFIG --boards 3 --bias B --iterations 6 --out DIR
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

const { values: args } = parseArgs({ options: { config: { type: 'string' }, boards: { type: 'string' }, bias: { type: 'string' }, iterations: { type: 'string' }, out: { type: 'string' } } });
const MiB = 2 ** 20, MIN_GAIN = 0.2, MAX_GAIN = 1.8, ARM = 'informative-local';
// Resource guard, called before and after every forward: RSS <= 2048 MiB and free memory >= 256 MiB.
const guard = () => {
  if (process.memoryUsage().rss / MiB > 2048) throw Error('RSS above 2048 MiB');
  if (os.freemem() / MiB < 256) throw Error('Free memory below 256 MiB');
};
const fmt = x => Number(x).toPrecision(4);
const best = xs => xs.reduce((a, b) => (b.score > a.score ? b : a)); // ties keep the earliest UCI (ranked is UCI-sorted)
const line = r => (r.skipped ? `${r.boardId} skipped: ${r.skipped}`
  : `${r.boardId} it=${r.iteration} s*=${r.sStar.move} score=${fmt(r.sStar.score)} f*=${r.fStar.move} score=${fmt(r.fStar.score)} margin=${fmt(r.margin)} tolerance=${fmt(r.tolerance)} `
  + `s=${r.s} c=${r.c} success=${fmt(r.success)} gains(0.2=${r.gains.atMin} 1.8=${r.gains.atMax} unchanged=${r.gains.unchanged}) passes=${r.passes} solved=${r.solved}`);

async function work() {
  const config = JSON.parse(readFileSync(args.config, 'utf8').replace(/^﻿/, ''));
  const { paths } = config, bias = Number(args.bias), iterations = Number(args.iterations);
  if (!Number.isSafeInteger(iterations) || iterations < 0) throw Error('--iterations must be a nonnegative integer');
  const boards = readFileSync(join(paths.packet, 'boards.jsonl'), 'utf8').split('\n').filter(l => l.trim())
    .map(l => JSON.parse(l)).filter(r => r.group === 'A').slice(0, Number(args.boards));
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

  // Presynaptic KC rates for one legal move, aligned with memory.edges (group order, then group.kc order).
  const kcRates = (record, move) => {
    guard();
    model.forward(new Float32Array(model.inputDim), eyes.encode(record.fen, move).stimulation, null);
    guard();
    return actualTeachingInputs(model, mapping).flatMap(g => Array.from(g.kcRates));
  };

  const rows = [];
  const report = row => { rows.push(row); console.log(line(row)); };
  for (const record of boards) {
    condition.restore(initial); // gains back to all 1; events unchanged
    let r = condition.rankBoard(record);
    for (let it = 0; ; it++) {
      const safe = r.ranked.filter(e => record.outcomes[e.move] === true);
      const unsafe = r.ranked.filter(e => record.outcomes[e.move] !== true);
      if (!safe.length || !unsafe.length) { report({ boardId: record.boardId, skipped: 'no safe and unsafe legal moves' }); break; }
      const sStar = best(safe), fStar = best(unsafe);
      const gains = condition.snapshot().memory.gains;
      const solved = sStar.score - fStar.score > r.tolerance;
      report({ boardId: record.boardId, iteration: it, sStar: { move: sStar.move, score: sStar.score }, fStar: { move: fStar.move, score: fStar.score },
        margin: r.margin, tolerance: r.tolerance, s: r.s, c: r.c, success: r.success, passes: r.passes, solved,
        gains: { atMin: gains.filter(g => g === MIN_GAIN).length, atMax: gains.filter(g => g === MAX_GAIN).length, unchanged: gains.filter(g => g === 1).length } });
      if (solved || it === iterations) break;
      // Oracle step: 0.2 where s* drives a KC harder than f*, 1.8 where f* does, current gain where equal.
      const a = kcRates(record, sStar.move), b = kcRates(record, fStar.move);
      const next = Array.from(gains, (g, e) => (a[e] > b[e] ? MIN_GAIN : a[e] < b[e] ? MAX_GAIN : g));
      condition.restore({ ...initial, memory: { ...initial.memory, gains: next } });
      r = condition.rankBoard(record);
    }
  }
  mkdirSync(args.out, { recursive: true });
  const path = join(args.out, 'oracle.json');
  writeFileSync(`${path}.partial`, `${JSON.stringify({ schema: 'oracle-gains-probe-v1', note: 'oracle construction, not learning', bias, boards: boards.map(b => b.boardId), rows }, null, 2)}\n`);
  renameSync(`${path}.partial`, path);
}

work().catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
