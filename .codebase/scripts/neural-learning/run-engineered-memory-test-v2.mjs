// Engineered memory test v2 (2026-11-03). Brain connections never change: one read-only brain pass per board. A disclosed external store keeps the fly's Kenyon-cell pattern for each chosen board with its verified outcome and scores new boards by similarity. Results are for the fly plus this store. Design: documentation/design/neural-learning/engineered-memory-test-v2.md
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
import { certifyLandingSquare } from '../../src/search-and-feedback/landing-square-certificate.mjs';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { restartSplit } from '../../src/puzzle-learning/twin-pair-generator-v1.mjs';
import { cueKey } from '../../src/neural-learning/transfer-evaluation-v1.mjs';
import { rmsScaler, makeRandomExpansion } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { ARMS, splitPairs, makeYoked, runArm, judge } from '../../src/neural-learning/engineered-memory-task-v2.mjs';

const { values: args } = parseArgs({ options: { config: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
assert.equal(args['cpu-duty'], '0.5');
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
  assert(rssMiB <= 2048 && freeMiB >= 256 && performance.now() - started <= 3600000, 'Resource guard');
}
// Pacing: keeps CPU use near the 0.5 duty.
function pace() {
  const cpu = process.cpuUsage(cpuStarted);
  let delay = 2 * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  while (delay > 0) {
    Atomics.wait(sleep, 0, 0, Math.min(delay, 100));
    delay = 2 * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  }
}
for (const [path, expected] of Object.entries(config.pins)) assert.equal(await fileHash(path), expected, `Changed input ${path}`);

guard(); mkdirSync(out, { recursive: true });
const manifest = { schema: 'engineered-memory-test-v2-run', status: 'running', pid: process.pid, argv: process.argv,
  registrationSha256: sha(registration), pins: config.pins,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty: .5, wallSeconds: 3600, passes: 280 },
  scope: 'read-only brain passes; brain connections never change; disclosed engineered memory; training-bucket data only; not chess learning by the brain' };
atomic(`${out}/manifest.json`, manifest);

const records = `${out}/records.jsonl`;
writeFileSync(records, '');
const log = record => appendFileSync(records, JSON.stringify(record) + '\n');

try {
  // Step 5: training-bucket pairs only.
  const pairsInfo = JSON.parse(readFileSync(config.paths.pairsManifest, 'utf8').replace(/^﻿/, ''));
  assert.equal(pairsInfo.bucket, 'train');
  assert.equal(pairsInfo.task, 'capture');
  const pairs = readFileSync(config.paths.pairs, 'utf8').split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
  for (const pair of pairs) {
    assert(restartSplit(pair.gameId) === 'train', 'Pair outside the training bucket');
    assert.equal(pair.kind, 'recapture');
  }
  assert.equal(new Set(pairs.map(p => p.gameId)).size, pairs.length, 'Game ids not unique');
  assert(pairs.length === 136, 'Need 136 pairs');

  // Step 6: recheck the teacher's certificates before any learning.
  const counts = { hashMismatch: 0, unknown: 0, labelMismatch: 0 }, outcomes = new Map();
  for (const pair of pairs) for (const side of ['good', 'bad']) {
    const key = `${pair.gameId}:${side}`;
    const landing = certifyLandingSquare(new Chess(pair[side].fen), pair.move);
    const retention = certifyCaptureRetention(new Chess(pair[side].fen), pair.move);
    let outcome = null;
    if (landing.certificateSha256 !== pair[side].certificateSha256) counts.hashMismatch++;
    else if (retention.status === 'unknown') counts.unknown++;
    else {
      const value = retention.status === 'success' ? 1 : -1;
      if ((side === 'good' ? 1 : -1) !== value) counts.labelMismatch++;
      else outcome = value;
    }
    outcomes.set(key, outcome);
    log({ kind: 'certificate', key, outcome });
  }

  // Step 7: split into 96 experience pairs and 40 new-board pairs.
  const taskPairs = pairs.map(p => ({ id: p.gameId, good: `${p.gameId}:good`, bad: `${p.gameId}:bad` }));
  const { experience, newBoards: splitNew } = splitPairs(taskPairs, 96);
  assert(experience.length === 96 && splitNew.length === 40, 'Split sizes');

  // Step 8: eye inputs. Remove new-board pairs whose eye input repeats an experienced or earlier kept one.
  const retina = loadRetina('.cache/full.npz'), eyes = createEyesV2(retina);
  const stimOf = new Map();
  for (const pair of pairs) for (const side of ['good', 'bad']) stimOf.set(`${pair.gameId}:${side}`, eyes.encode(pair[side].fen, pair.move).stimulation);
  const seenCues = new Set(experience.flatMap(p => [cueKey(stimOf.get(p.good)), cueKey(stimOf.get(p.bad))]));
  const droppedRepeats = [];
  const kept = splitNew.filter(p => {
    const ks = [cueKey(stimOf.get(p.good)), cueKey(stimOf.get(p.bad))];
    if (ks.some(k => seenCues.has(k))) { droppedRepeats.push(p.id); return false; }
    ks.forEach(k => seenCues.add(k));
    return true;
  });
  assert.equal(kept.length, 38, 'Expected 38 new-board pairs after removing repeats');
  const newBoards = kept;

  // Step 9: brain, loaded and wired as in the seeing test.
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
  const pass = stimulation => {
    guard();
    passes++;
    if (passes > 280) throw Error('Pass budget exceeded');
    model.forward([0], stimulation);
    return Float64Array.from(kcIndices, i => model.h[model.steps][i]);
  };
  const allKeys = [...stimOf.keys()];
  const graphVec = new Map(allKeys.map(key => [key, pass(stimOf.get(key))]));
  const first = `${pairs[0].gameId}:good`;
  assert.deepEqual(pass(stimOf.get(first)), graphVec.get(first), 'Brain pass is not deterministic');
  assert.equal(magnitudes(), before, 'Brain connections changed');

  // Step 10: raw eye vectors.
  const rawOf = stimulation => {
    const m = new Map(stimulation.map(x => [x.index, x.current]));
    return Float64Array.from(retina.retina_idx, i => m.get(i) ?? 0);
  };
  const rawVec = new Map(allKeys.map(key => [key, rawOf(stimOf.get(key))]));

  // Step 11: random expansion, keeping the same share of active units as the graph vectors.
  const expKeys = experience.flatMap(p => [p.good, p.bad]);
  const keepFraction = expKeys.reduce((sum, k) => sum + graphVec.get(k).filter(x => x !== 0).length / kcIndices.length, 0) / expKeys.length;
  const expand = makeRandomExpansion({ inputs: retina.retina_idx.length, units: kcIndices.length, fanIn: 6, seed: 20261103 });
  const randomVec = new Map(allKeys.map(key => [key, expand(rawVec.get(key), keepFraction)]));

  // Step 12: scalers fitted on training-board vectors only; labels unused.
  const spaces = { graph: graphVec, raw: rawVec, random: randomVec };
  const scaler = {}, scaled = {};
  for (const f of Object.keys(spaces)) {
    scaler[f] = rmsScaler(expKeys.map(k => spaces[f].get(k)));
    scaled[f] = new Map(allKeys.map(k => [k, scaler[f](spaces[f].get(k))]));
  }
  // Report only: new-board vectors (unscaled) identical to any experience vector, per feature space.
  const hex = v => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('hex');
  const newKeys = newBoards.flatMap(p => [p.good, p.bad]);
  const featureRepeats = {};
  for (const f of ['graph', 'raw', 'random']) {
    const seenHex = new Set(expKeys.map(k => hex(spaces[f].get(k))));
    featureRepeats[f] = newKeys.filter(k => seenHex.has(hex(spaces[f].get(k)))).length;
  }
  const SPACE = { graph: 'graph', raw: 'raw', random: 'random', mismatched: 'graph', none: 'graph' };

  // Step 13: run every arm for every seed.
  const SEEDS = [5101, 5102, 5103], rows = [];
  for (const seed of SEEDS) for (const arm of ARMS) {
    guard();
    const yokedValues = arm === 'mismatched' ? makeYoked(rows.find(r => r.seed === seed && r.arm === 'graph').writtenOutcomes, seed) : undefined;
    rows.push(runArm({ arm, seed, experience, newBoards, featureOf: key => scaled[SPACE[arm]].get(key), outcomeOf: key => outcomes.get(key), yokedValues, log: record => { log(record); if (record.kind === 'trial') pace(); } }));
    pace();
  }

  // Step 14: verdict.
  const verdict = judge(rows, { seeds: SEEDS, newGames: newBoards.map(p => p.id), minSeen: 77, minNew: 25, minMargin: 4 });

  // Step 15: summary.
  const cpu = process.cpuUsage(cpuStarted);
  atomic(`${out}/summary.json`, {
    schema: 'engineered-memory-test-v2', outcome: verdict.outcome, verdict,
    rows: rows.map(({ writtenOutcomes, ...row }) => ({ ...row, writtenCount: writtenOutcomes.length })),
    counts, split: { experience: experience.map(p => p.id), newBoards: newBoards.map(p => p.id) },
    keepFraction, featureRepeats, droppedRepeats, scaling: Object.fromEntries(Object.keys(spaces).map(f => [f, scaler[f].rmsSha256])),
    wiringSha256: expand.wiringSha256, passes, peakRssMiB,
    elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(3)),
    cpuSeconds: (cpu.user + cpu.system) / 1e6, memoryUnchanged: true,
    rule: 'pass: in all 3 seeds, graph seen-board pairs >= 77/96 (else store fault), graph new-board pairs >= 25/38, and graph beats raw, random, mismatched and none on new boards by >= 4 pairs with game-bootstrap 95% lower bound > 0',
    scope: 'safe-capture twin pairs from training-bucket games only; seen boards and 38 held-out training-bucket games (2 exact eye-input repeats removed); not sealed data; disclosed engineered memory; rewired-graph comparison not included' });
  atomic(`${out}/manifest.json`, { ...manifest, status: 'complete' });
} catch (error) {
  atomic(`${out}/manifest.json`, { ...manifest, status: 'failed', error: error.message });
  throw error;
}
