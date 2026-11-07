// Engineered memory test v3 (2026-11-03): episodic memory without hints. Real unedited positions; the fly scores every legal move from a disclosed external store over its Kenyon-cell patterns; only the chosen move is checked and stored; one pass, fixed order. Brain connections never change. Design: documentation/design/neural-learning/engineered-memory-test-v3.md
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { restartSplit } from '../../src/puzzle-learning/twin-pair-generator-v1.mjs';
import { rmsScaler, makeRandomExpansion } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { ARMS, positionId, splitPositions, chanceRates, runArmV3, judgeV3 } from '../../src/neural-learning/engineered-memory-task-v3.mjs';
import { makeYoked } from '../../src/neural-learning/engineered-memory-task-v2.mjs';

const { values: args } = parseArgs({ options: { config: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
const cpuDuty = Number(args['cpu-duty']);
assert(cpuDuty === 0.5 || cpuDuty === 1, 'cpu-duty must be 0.5 or 1 (1 approved by the researcher 2026-11-04)');
assert(args.config, 'Missing --config');
const registration = readFileSync(args.config), config = JSON.parse(registration.toString('utf8').replace(/^﻿/, ''));
const out = config.paths.run;
assert(!existsSync(out), 'Fresh output required');
const sha = x => createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const fileHash = async p => { const h = createHash('sha256'); for await (const b of createReadStream(p)) h.update(b); return h.digest('hex'); };
const atomic = (path, body) => { writeFileSync(path + '.partial', JSON.stringify(body) + '\n'); renameSync(path + '.partial', path); };
const started = performance.now(), cpuStarted = process.cpuUsage(), sleep = new Int32Array(new SharedArrayBuffer(4));
let peakRssMiB = 0;

// Resource guard: records the peak RSS seen so far.
function guard() {
  const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
  peakRssMiB = Math.max(peakRssMiB, rssMiB);
  assert(rssMiB <= 2048 && freeMiB >= 256 && performance.now() - started <= 18000000, 'Resource guard');
}
// Pacing: keeps CPU use near the chosen duty.
function pace() {
  const cpu = process.cpuUsage(cpuStarted);
  let delay = (1 / cpuDuty) * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  while (delay > 0) {
    Atomics.wait(sleep, 0, 0, Math.min(delay, 100));
    delay = (1 / cpuDuty) * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  }
}
for (const [path, expected] of Object.entries(config.pins)) assert.equal(await fileHash(path), expected, `Changed input ${path}`);

guard(); mkdirSync(out, { recursive: true });
const manifest = { schema: 'engineered-memory-test-v3-run', status: 'running', pid: process.pid, argv: process.argv,
  registrationSha256: sha(registration), pins: config.pins,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty, wallSeconds: 18000, passes: 21100 },
  scope: 'read-only brain passes; brain connections never change; disclosed engineered memory; training-bucket games only; no hints: real positions, all legal moves, feedback on the chosen move only' };
atomic(`${out}/manifest.json`, manifest);

const records = `${out}/records.jsonl`;
writeFileSync(records, '');
const log = record => appendFileSync(records, JSON.stringify(record) + '\n');

try {
  // Step 2: training-bucket positions only.
  const posInfo = JSON.parse(readFileSync(config.paths.positionsManifest, 'utf8').replace(/^﻿/, ''));
  assert.equal(posInfo.bucket, 'train');
  assert.equal(posInfo.schema, 'capture-choice-positions-v1');
  const positions = readFileSync(config.paths.positions, 'utf8').split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
  for (const p of positions) assert(restartSplit(p.gameId) === 'train', 'Position outside the training bucket');
  assert(positions.length === 572, 'Need 572 positions');

  // Step 3: split into 388 practice and 184 test positions.
  const { practice, test, droppedRepeats } = splitPositions(positions, 198);
  assert(practice.length === 388 && test.length === 184 && droppedRepeats.length === 0, 'Split sizes');
  const chance = chanceRates(test);
  log({ kind: 'split', practice: practice.length, test: test.length, chance });

  // Step 4: eye inputs for every legal move of every position. Legal moves come from chess.js, sorted by UCI.
  const key = (p, uci) => `${positionId(p)}|${uci}`;
  const legalOf = p => new Chess(p.fen).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? '')).sort();
  const retina = loadRetina('.cache/full.npz'), eyes = createEyesV2(retina);
  // Typed arrays sit outside the 256 MiB JS heap; 21,053 lists of {index, current} objects ran out of heap (2026-11-04). Values are kept exactly (Float64).
  const pack = s => ({ index: Int32Array.from(s, x => x.index), current: Float64Array.from(s, x => x.current) });
  const unpack = s => Array.from(s.index, (index, j) => ({ index, current: s.current[j] }));
  const stimOf = new Map(), keysOfPosition = new Map();
  for (const p of [...practice, ...test]) {
    const legal = legalOf(p);
    assert.deepEqual(legal, p.moves.map(m => m.uci).sort(), `Legal moves differ from the positions file at ${positionId(p)}`);
    assert(legal.length > 0, 'Position has no legal moves');
    keysOfPosition.set(positionId(p), legal.map(uci => key(p, uci)));
    for (const uci of legal) stimOf.set(key(p, uci), pack(eyes.encode(p.fen, uci).stimulation));
  }
  const allKeys = [...stimOf.keys()];
  assert.equal(allKeys.length, 21053, 'Expected 21053 move keys');
  const sample = eyes.encode(practice[0].fen, keysOfPosition.get(positionId(practice[0]))[0].split('|').pop()).stimulation;
  assert.deepEqual(unpack(pack(sample)), sample, 'Packing changed the eye input');

  // Step 5: brain, loaded and wired as in v2.
  const graph = loadGraph('.cache/full.npz'), roots = readNpz('.cache/full.npz', ['root_ids']).root_ids;
  const indices = new Map(Array.from(roots, (root, i) => [root.toString(), i]));
  const kcs = [];
  let header;
  for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
    const fields = line.split('\t'); if (!header) { header = fields; continue; }
    const index = indices.get(fields[header.indexOf('root_id')]);
    if (index !== undefined && fields[header.indexOf('cell_class')] === 'Kenyon_Cell') kcs.push(index);
  }
  const kcIndices = [...new Set(kcs)].sort((a, b) => a - b);
  const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
  const rawForward = model.forward.bind(model);
  model.forward = (...values) => { const result = rawForward(...values); pace(); return result; };
  const magnitudes = () => {
    const m = model.params.magnitude;
    return createHash('sha256').update(Buffer.from(m.buffer, m.byteOffset, m.byteLength)).digest('hex');
  };
  const before = magnitudes();
  let passes = 0;
  // One read-only brain pass; returns Kenyon-cell activity as Float32.
  const pass = stimulation => {
    guard();
    passes++;
    if (passes > 21100) throw Error('Pass budget exceeded');
    if (passes % 500 === 0) log({ kind: 'progress', passes, peakRssMiB, elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)) });
    model.forward([0], stimulation);
    return Float32Array.from(kcIndices, i => model.h[model.steps][i]);
  };
  const graphCache = new Map(allKeys.map(k => [k, pass(unpack(stimOf.get(k)))]));
  const first = allKeys[0];
  assert.deepEqual(pass(unpack(stimOf.get(first))), graphCache.get(first), 'Brain pass is not deterministic');
  assert.equal(magnitudes(), before, 'Brain connections changed');

  // Step 6: raw and random features, computed on demand.
  const raw = k => {
    const s = stimOf.get(k), m = new Map(Array.from(s.index, (index, j) => [index, s.current[j]]));
    return Float64Array.from(retina.retina_idx, i => m.get(i) ?? 0);
  };
  const expand = makeRandomExpansion({ inputs: retina.retina_idx.length, units: kcIndices.length, fanIn: 6, seed: 20261103 });
  const random = k => expand(raw(k), 0.05);

  // Step 7: scalers fitted on practice positions only, one vector each (first legal move in UCI order); labels unused.
  const firstMoveKeys = practice.map(p => keysOfPosition.get(positionId(p))[0]);
  const spaceVec = { graph: k => Float64Array.from(graphCache.get(k)), raw, random };
  const scaler = {};
  for (const f of Object.keys(spaceVec)) scaler[f] = rmsScaler(firstMoveKeys.map(k => spaceVec[f](k)));

  // Step 8: feature per arm.
  const featureOf = {
    graph: (p, u) => scaler.graph(spaceVec.graph(key(p, u))),
    raw: (p, u) => scaler.raw(raw(key(p, u))),
    random: (p, u) => scaler.random(random(key(p, u))),
  };
  const SPACE = { graph: 'graph', raw: 'raw', random: 'random', mismatched: 'graph', none: 'graph' };

  // Step 9: run every arm for every seed.
  const SEEDS = [6101, 6102, 6103], rows = [];
  for (const seed of SEEDS) for (const arm of ARMS) {
    guard();
    const yokedValues = arm === 'mismatched' ? makeYoked(rows.find(r => r.seed === seed && r.arm === 'graph').writtenOutcomes, seed) : undefined;
    const row = runArmV3({ arm, seed, practice, test, featureOf: featureOf[SPACE[arm]], yokedValues, log: record => { log(record); if (record.kind === 'trial') pace(); } });
    rows.push(row);
    pace();
    log({ kind: 'arm-done', arm, seed, testCorrect: row.testCorrect, elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)) });
  }

  // Step 10: verdict.
  const verdict = judgeV3(rows, { seeds: SEEDS, testGames: test.map(p => p.gameId), minCorrect: 96, minMargin: 9 });

  // Step 11: summary.
  const cpu = process.cpuUsage(cpuStarted);
  atomic(`${out}/summary.json`, {
    schema: 'engineered-memory-test-v3', outcome: verdict.outcome, verdict,
    rows: rows.map(({ writtenOutcomes, ...row }) => ({ ...row, writtenCount: writtenOutcomes.length })),
    chance,
    split: { practiceGames: [...new Set(practice.map(p => p.gameId))], testGames: [...new Set(test.map(p => p.gameId))], practice: practice.length, test: test.length },
    wiringSha256: expand.wiringSha256, passes, peakRssMiB,
    elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)),
    cpuSeconds: (cpu.user + cpu.system) / 1e6, memoryUnchanged: true,
    rule: 'pass: in all 3 seeds, graph top move is a safe capture on >= 96 of 184 new positions (random capture 42.0%, so 77), and graph beats raw, random, mismatched and none by >= 9 positions with game-bootstrap 95% lower bound > 0',
    scope: 'real training-bucket positions; no twin boards, no move pre-selection, feedback on the chosen move only, one pass; disclosed engineered memory; not brain-only learning; rewired-graph comparison not included' });
  atomic(`${out}/manifest.json`, { ...manifest, status: 'complete' });
} catch (error) {
  atomic(`${out}/manifest.json`, { ...manifest, status: 'failed', error: error.message });
  throw error;
}
