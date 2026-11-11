#!/usr/bin/env node
// Journal item 18, question 2: with zero tonic drive, can the source rule change a within-board ranking? Development boards only;
// writes only DIR/probe.json. Builds the stack as the worker does; the registration pin check is not repeated.
// Usage (repo root): node --max-old-space-size=512 .codebase/scripts/neural-learning/probe-zero-drive-learning-v1.mjs --config CONFIG --boards 2 --repeats 4 --bias 0 --out DIR
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';
import { mapFlyConnectionsMemory } from '../../src/neural-learning/fly-connections-teaching-v1.mjs';
import { loadLocalAplPackage } from '../../src/neural-learning/fly-connections-apl-data-v1.mjs';
import { createFlyCondition } from '../../src/neural-learning/fly-connections-condition-v1.mjs';

const { values: args } = parseArgs({ options: { config: { type: 'string' }, boards: { type: 'string' }, repeats: { type: 'string' }, bias: { type: 'string' }, out: { type: 'string' } } });
const MiB = 2 ** 20, ARMS = ['informative-local', 'off-local'];
// Resource guard, called before and after every forward: RSS <= 2048 MiB and free memory >= 256 MiB.
const guard = () => {
  if (process.memoryUsage().rss / MiB > 2048) throw Error('RSS above 2048 MiB');
  if (os.freemem() / MiB < 256) throw Error('Free memory below 256 MiB');
};
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = x => (x === null || x === undefined ? 'null' : Number(x).toPrecision(4));
const pick = (row, pulse, key) => mean(row.practised.filter(p => p.pulse === pulse).map(p => p[key]));

// Practised moves with score and standard-competition rank (1 = best; ties share a rank).
function practised(ranked, record) {
  return record.experiences.map(({ move, pulse }) => {
    const score = ranked.find(e => e.move === move).score;
    return { move, pulse, score, rank: 1 + ranked.filter(e => e.score > score).length };
  });
}

// One row per (arm, board, pass): ranking metrics, practised scores, mean D and k over active KCs in this pass's receipts.
function rowOf(arm, record, pass, ranking, receipts) {
  const scores = ranking.ranked.map(e => e.score);
  const dOf = pulse => mean(receipts.filter(r => r.pulse === pulse).flatMap(r => r.teaching.map(g => g.factor)));
  const kActive = receipts.flatMap(r => r.teaching.flatMap(g => g.k.filter(v => v > 0)));
  return { arm, boardId: record.boardId, pass, s: ranking.s, c: ranking.c, success: ranking.success, margin: ranking.margin,
    choice: ranking.choice, spread: Math.max(...scores) - Math.min(...scores), practised: practised(ranking.ranked, record),
    D: { pulse: dOf(true), noPulse: dOf(false) }, k: { mean: mean(kActive), max: kActive.length ? Math.max(...kActive) : null, count: kActive.length } };
}

const line = r => `${r.arm} ${r.boardId} pass=${r.pass} s=${r.s} c=${r.c} success=${fmt(r.success)} margin=${fmt(r.margin)} spread=${fmt(r.spread)} `
  + `practisedPulse(score=${fmt(pick(r, true, 'score'))} rank=${fmt(pick(r, true, 'rank'))}) practisedNoPulse(score=${fmt(pick(r, false, 'score'))} rank=${fmt(pick(r, false, 'rank'))}) `
  + `D+=${fmt(r.D.pulse)} D-=${fmt(r.D.noPulse)} kMean=${fmt(r.k.mean)} kMax=${fmt(r.k.max)}`;

async function work() {
  const config = JSON.parse(readFileSync(args.config, 'utf8').replace(/^﻿/, ''));
  const { paths } = config, repeats = Number(args.repeats), bias = Number(args.bias);
  const boards = readFileSync(join(paths.packet, 'boards.jsonl'), 'utf8').split('\n').filter(l => l.trim())
    .map(l => JSON.parse(l)).filter(r => r.group === 'A').slice(0, Number(args.boards));
  const graph = loadGraph(paths.graph);
  const rootIds = readNpz(paths.graph, ['root_ids']).root_ids;
  const readerCells = neuronReaderCells.cells.filter(cell => cell.type === 'MBON05');
  const mapping = await mapFlyConnectionsMemory(graph, rootIds, paths.annotations, readerCells);
  const check = JSON.parse(readFileSync(paths.mappingCheck, 'utf8'));
  if (check.pass !== true || check.mappingIdentity !== createHash('sha256').update(JSON.stringify(mapping)).digest('hex')) throw Error('Mapping check did not pass for this mapping');
  const eyes = createEyesV2(loadRetina(paths.graph));
  const rows = [];
  for (const arm of ARMS) {
    const model = new SparseTrainer(graph, config.model);
    model.params.bias.fill(bias); // before createFlyCondition: the fixed-state digest includes the bias
    const aplPackage = await loadLocalAplPackage(paths.aplPackage);
    const condition = createFlyCondition({ model, mapping, eyes, aplPackage, arm, guard });
    let sequence = 0;
    for (const record of boards) {
      const emit = (pass, receipts) => { rows.push(rowOf(arm, record, pass, condition.rankBoard(record), receipts)); console.log(line(rows.at(-1))); };
      emit(0, []);
      for (let pass = 1; pass <= repeats; pass++) {
        const receipts = record.experiences.map(experience => {
          const n = sequence++;
          return condition.teach(record, { ...experience, sequence: n, eventId: `${arm}:${n}`, phase: 'A', boardId: record.boardId, criterion: record.criterion }).receipt;
        });
        emit(pass, receipts);
      }
    }
  }
  mkdirSync(args.out, { recursive: true });
  const path = join(args.out, 'probe.json');
  writeFileSync(`${path}.partial`, `${JSON.stringify({ schema: 'zero-drive-learning-probe-v1', bias, repeats, boards: boards.map(b => b.boardId), rows }, null, 2)}\n`);
  renameSync(`${path}.partial`, path);
}

work().catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
