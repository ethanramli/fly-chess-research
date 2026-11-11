#!/usr/bin/env node
// Read-only diagnostic (journal item 18): does a Kenyon-cell firing threshold (negative per-KC bias) make gamma-KC codes sparse and move-specific? Worker build, arm off-local, no learning.
// Usage (repo root): node --max-old-space-size=512 .codebase/scripts/neural-learning/diagnose-kc-sparseness-v1.mjs --config "python actions/fly-connections-memory-v1-dryrun-step.json" --boards 3 --thresholds 0,0.005,0.01,0.015,0.02,0.03 --out DIR
import { createHash } from 'node:crypto';
import { createReadStream, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { neuronReaderCells } from '../../src/neural-learning/neuron-reader.mjs';
import { actualTeachingInputs, mapFlyConnectionsMemory } from '../../src/neural-learning/fly-connections-teaching-v1.mjs';
import { loadLocalAplPackage } from '../../src/neural-learning/fly-connections-apl-data-v1.mjs';
import { createFlyCondition } from '../../src/neural-learning/fly-connections-condition-v1.mjs';
import { inputHash } from '../../src/neural-learning/fly-connections-packet-v1.mjs';
const { values: args } = parseArgs({ options: { config: { type: 'string' }, boards: { type: 'string' }, thresholds: { type: 'string' }, out: { type: 'string' }, scope: { type: 'string', default: 'kc' }, gain: { type: 'string', default: '1' }, 'dump-all': { type: 'boolean', default: false } } });
const ACTIVE = 1e-6, sha256 = data => createHash('sha256').update(data).digest('hex');
const mean = xs => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const median = xs => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return !s.length ? null : s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// Relative L2 difference in [0, 1]: ||a-b|| / (||a|| + ||b||); 0 when both are zero. Median over all move pairs, on the given cells.
const relDiff = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += (a[i] - b[i]) ** 2; na += a[i] ** 2; nb += b[i] ** 2; } const den = Math.sqrt(na) + Math.sqrt(nb); return den === 0 ? 0 : Math.sqrt(d) / den; };
const pairMedian = (vs, cells) => median(vs.flatMap((a, i) => vs.slice(i + 1).map(b => relDiff(cells.map(k => a[k]), cells.map(k => b[k])))));
async function main() {
  if (!args.config || !args.boards || !args.thresholds || !args.out) throw Error('Usage: --config REG --boards N --thresholds 0,0.01 --out DIR');
  const rawConfig = readFileSync(args.config), config = JSON.parse(rawConfig.toString('utf8').replace(/^﻿/, ''));
  for (const [p, expected] of Object.entries(config.pins)) if (sha256(readFileSync(p)) !== expected) throw Error(`Changed input ${p}`);
  const thresholds = args.thresholds.split(',').map(Number), boardCount = Number(args.boards);
  if (!thresholds.every(t => Number.isFinite(t) && t >= 0) || !Number.isSafeInteger(boardCount) || boardCount < 1) throw Error('Invalid --boards or --thresholds');

  // Worker build order; the mapping must equal the one the passing mapping check certified.
  let passes = 0;
  const guard = ({ when } = {}) => { if (when === 'before') passes++; const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
    if (rssMiB > 2048 || freeMiB < 256) throw Error(`Guard: RSS ${rssMiB.toFixed(1)} MiB, free ${freeMiB.toFixed(1)} MiB`); };
  const graph = loadGraph(config.paths.graph), rootIds = readNpz(config.paths.graph, ['root_ids']).root_ids;
  const mapping = await mapFlyConnectionsMemory(graph, rootIds, config.paths.annotations, neuronReaderCells.cells.filter(c => c.type === 'MBON05'));
  const check = JSON.parse(readFileSync(config.paths.mappingCheck, 'utf8')); if (check.pass !== true || check.mappingIdentity !== sha256(JSON.stringify(mapping))) throw Error('Mapping check did not pass for this mapping');
  const model = new SparseTrainer(graph, config.model), eyes = createEyesV2(loadRetina(config.paths.graph));
  const condition = createFlyCondition({ model, mapping, eyes, aplPackage: await loadLocalAplPackage(config.paths.aplPackage), arm: 'off-local', guard });

  // KC cohort: every annotated Kenyon_Cell in the graph, streamed from the TSV the mapping reads.
  const indexOf = new Map(Array.from(rootIds, (id, i) => [id.toString(), i])), kcs = new Set();
  let header = null, rootCol = -1, clsCol = -1;
  for await (const line of createInterface({ input: createReadStream(config.paths.annotations), crlfDelay: Infinity })) {
    if (line === '') continue; const fields = line.split('\t');
    if (!header) { header = fields; rootCol = header.indexOf('root_id'); clsCol = header.indexOf('cell_class'); continue; }
    const index = fields[clsCol] === 'Kenyon_Cell' ? indexOf.get(BigInt(fields[rootCol]).toString()) : undefined;
    if (index !== undefined) kcs.add(index);
  }
  // First A-group records in boards.jsonl file order.
  const boards = readFileSync(join(config.paths.packet, 'boards.jsonl'), 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)).filter(r => r.group === 'A').slice(0, boardCount);
  if (boards.length !== boardCount) throw Error(`Only ${boards.length} A-group boards in boards.jsonl`);
  const rows = [], G = mapping.groups.reduce((n, g) => n + g.kc.length, 0), cells = Array.from({ length: G }, (_, k) => k), bias = model.params.bias, savedBias = Float32Array.from(bias);

  // rankBoard verifies the record, then throws at its fixed-state check (params.bias changed) before any forward.
  // Scores then come from the same forward as the KC rates: the condition's MBON05 endpoint mean.
  const observe = record => {
    let ranked = null;
    try { ranked = condition.rankBoard(record).ranked; } catch (error) { if (!/Fixed state changed/.test(error.message)) throw error; }
    const scores = {}, kc = {}, all = {}, kcList = [...kcs];
    for (const move of record.legal) {
      if (inputHash(eyes, record.fen, move) !== record.inputHashes[move]) throw Error(`Input hash differs for ${move}`);
      guard({ when: 'before' }); model.forward(new Float32Array(1), eyes.encode(record.fen, move).stimulation.map(({ index, current }) => ({ index, current: current * Number(args.gain) })), null); guard({ when: 'after' });
      const endpoint = model.h[model.steps];
      scores[move] = -(mapping.groups.reduce((sum, g) => sum + endpoint[g.mbon.index], 0) / mapping.groups.length);
      kc[move] = actualTeachingInputs(model, mapping).flatMap(g => Array.from(g.kcRates));
      if (args['dump-all']) all[move] = kcList.map(k => endpoint[k]); // every annotated KC, cohort order
    }
    return ranked ? { path: 'condition.rankBoard', scores: Object.fromEntries(ranked.map(e => [e.move, e.score])), kc, all } : { path: 'endpoint-mean', scores, kc, all };
  };
  const dumps = [];
  for (const theta of thresholds) {
    if (args.scope === 'all') for (let j = 0; j < bias.length; j++) bias[j] = savedBias[j] - theta; // scope all: lower every neuron's tonic drive
    else for (const k of kcs) bias[k] = savedBias[k] - theta; // threshold below the trainer's default drive (bias 0.01, trainer.mjs:44); theta 0 = dry run
    const passesBefore = passes, paths = new Set(), perBoard = [], fractions = [], activeRates = [];
    for (const record of boards) {
      const obs = observe(record);
      if (args['dump-all']) dumps.push({ theta, boardId: record.boardId, moves: record.legal, outcomes: record.outcomes, scores: record.legal.map(m => obs.scores[m]), allKc: record.legal.map(m => obs.all[m]) });
      const vectors = record.legal.map(m => obs.kc[m]), active = vectors.map(v => v.map(x => x > ACTIVE)); paths.add(obs.path);
      fractions.push(...active.map(a => a.filter(Boolean).length / G)); for (const v of vectors) for (const x of v) if (x > ACTIVE) activeRates.push(x);
      const union = cells.filter(k => active.some(a => a[k])), moveSpecific = cells.filter(k => active.some(a => a[k]) && !active.every(a => a[k])).length, values = record.legal.map(m => obs.scores[m]);
      perBoard.push({ boardId: record.boardId, legalMoves: vectors.length, medianRelDiff: pairMedian(vectors, cells), unionCells: union.length, medianRelDiffUnion: union.length ? pairMedian(vectors, union) : null, moveSpecificFrac: moveSpecific / G, scoreSpread: Math.max(...values) - Math.min(...values) });
    }
    const row = { theta, passes: passes - passesBefore, scorePath: [...paths].join('+'), fracActiveKc: mean(fractions), meanActiveRate: mean(activeRates), moveSpecificFrac: mean(perBoard.map(b => b.moveSpecificFrac)), medianRelDiff: median(perBoard.map(b => b.medianRelDiff)), perBoard };
    rows.push(row);
    console.log(`theta=${theta} passes=${row.passes} path=${row.scorePath} activeFrac=${row.fracActiveKc} meanActive=${row.meanActiveRate} moveSpecificFrac=${row.moveSpecificFrac} medianRelDiff=${row.medianRelDiff}`);
  }
  bias.set(savedBias); const report = { schema: 'kc-sparseness-diagnostic-v1', configSha256: sha256(rawConfig), boards: boards.map(b => b.boardId), cohortSize: kcs.size, mappedGammaKc: G, rows };
  mkdirSync(args.out, { recursive: true }); const target = join(args.out, 'kc-sparseness.json');
  writeFileSync(`${target}.partial`, `${JSON.stringify(report, null, 2)}\n`); renameSync(`${target}.partial`, target);
  if (args['dump-all']) { const t2 = join(args.out, 'all-kc.json'); writeFileSync(`${t2}.partial`, JSON.stringify({ schema: 'all-kc-dump-v1', cohortOrder: 'annotation file order', dumps })); renameSync(`${t2}.partial`, t2); }
}
main().catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
