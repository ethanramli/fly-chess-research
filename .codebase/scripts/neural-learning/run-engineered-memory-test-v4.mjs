// Engineered memory v4 (2026-11-04): externally scheduled representation assay. Read-only brain passes; brain connections never change; every arm stores the same verified ledger. Design: documentation/design/neural-learning/memory-v4-proposal-2026-11-04.md. File contract: documentation/design/neural-learning/memory-v4-file-formats.md.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, inputCollisions, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { restartSplit } from '../../src/puzzle-learning/twin-pair-generator-v1.mjs';
import { rmsScaler, makeRandomExpansion } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { splitPositions, chanceRates } from '../../src/neural-learning/engineered-memory-task-v3.mjs';
import { V4_ARMS, FEATURE_OF_ARM, centred, sparse, sparseDensity, runArmV4, judgeV4 } from '../../src/neural-learning/engineered-memory-task-v4.mjs';
import { TASK, MAX_REPLIES, positionId, replayPosition, buildSchedules, certifyPositions, classifyCollisions, buildLedger, permuteKnownValues, positiveCount } from '../../src/neural-learning/engineered-memory-v4-ledger.mjs';

const SEEDS = [6101, 6102, 6103];
const SPARSE_KEEP = 259; // round(0.05 x 5177)
const MIN_POSITIVES = 40;
const VERIFIER_FILES = [
  '.codebase/src/neural-learning/engineered-memory-v4-ledger.mjs',
  '.codebase/src/search-and-feedback/capture-retention-action-domain.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs',
  '.codebase/src/search-and-feedback/puzzle-search.mjs', // imported by the three search-and-feedback files (uci)
];
const SCOPE = 'externally scheduled representation assay: fixed seeded practice schedule (not own choice); verified labels stored in an engineered memory; brain connections never change; no neural delivery of feedback; test positions scored from frozen stores; exploratory until registered';

const { values: args } = parseArgs({ options: { config: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' }, 'limit-positions': { type: 'string' } } });
const cpuDuty = Number(args['cpu-duty']);
assert([0.5, 0.75, 1].includes(cpuDuty), 'cpu-duty must be 0.5, 0.75 or 1');
assert(args.config, 'Missing --config');
const limit = args['limit-positions'] === undefined ? null : Number(args['limit-positions']);
assert(limit === null || (Number.isSafeInteger(limit) && limit >= 1), 'limit-positions must be a positive integer');
const dryRun = limit !== null;
const minPositives = dryRun ? 1 : MIN_POSITIVES;
assert.equal(os.endianness(), 'LE', 'The cache is written little-endian');

const registration = readFileSync(args.config);
const config = JSON.parse(registration.toString('utf8').replace(/^﻿/, ''));
const out = config.paths.run;
assert(!existsSync(out), 'Fresh output required');

const sha = data => createHash('sha256').update(data).digest('hex');
const fileHash = async path => { const h = createHash('sha256'); for await (const chunk of createReadStream(path)) h.update(chunk); return h.digest('hex'); };
const writeAtomic = (path, text) => { writeFileSync(path + '.partial', text); renameSync(path + '.partial', path); };
const atomicJson = (path, body) => writeAtomic(path, JSON.stringify(body) + '\n');
// JSONL is streamed with backpressure, so the write queue never holds a whole file.
async function writeJsonl(path, records) {
  const ws = createWriteStream(path);
  for (const record of records) if (!ws.write(JSON.stringify(record) + '\n')) await once(ws, 'drain');
  ws.end();
  await finished(ws);
}

const started = performance.now(), cpuStarted = process.cpuUsage(), sleep = new Int32Array(new SharedArrayBuffer(4));
const elapsed = () => Number(((performance.now() - started) / 1000).toFixed(3));
const cpuSeconds = () => { const cpu = process.cpuUsage(cpuStarted); return (cpu.user + cpu.system) / 1e6; };
let peakRssMiB = 0, passes = 0;

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

let manifest = {
  schema: 'engineered-memory-test-v4-run', status: 'running', pid: process.pid, argv: process.argv,
  startedAt: new Date().toISOString(), endedAt: null, exitStatus: null, volume: 2, chapter: 'To Learn; Evidence for Learning',
  registrationSha256: sha(registration), pins: config.pins,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty, wallSeconds: 18000 },
  scheduleSha256: null, cacheSha256: null,
};
const writeManifest = patch => { manifest = { ...manifest, ...patch }; atomicJson(`${out}/manifest.json`, manifest); };
mkdirSync(out, { recursive: true });
writeManifest({ status: 'running' });
const recordsPath = `${out}/records.jsonl`;
writeFileSync(recordsPath, '');
const log = record => appendFileSync(recordsPath, JSON.stringify(record) + '\n');

const writeSummary = (outcome, body) => atomicJson(`${out}/summary.json`, {
  schema: 'engineered-memory-test-v4', outcome, verdict: null, rows: [], positives: {}, density: null, sparseZeroRmsTestCoords: null,
  passes, peakRssMiB: Math.max(peakRssMiB, process.resourceUsage().maxRSS / 1024), elapsedSeconds: elapsed(), cpuSeconds: cpuSeconds(),
  scope: SCOPE, dryRun, ...body,
});
const keyOf = (id, uci) => `${id}|${uci}`;

async function run() {
  guard();
  for (const [path, expected] of Object.entries(config.pins)) assert.equal(await fileHash(path), expected, `Changed input ${path}`);

  // Step 2: training-bucket positions and the split. Count asserts are skipped in a dry run.
  const posInfo = JSON.parse(readFileSync(config.paths.positionsManifest, 'utf8').replace(/^﻿/, ''));
  assert.equal(posInfo.bucket, 'train');
  assert.equal(posInfo.schema, 'capture-choice-positions-v1');
  const positions = readFileSync(config.paths.positions, 'utf8').split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
  for (const p of positions) assert(restartSplit(p.gameId) === 'train', 'Position outside the training bucket');
  if (!dryRun) assert.equal(positions.length, 572, 'Need 572 positions');
  const split = splitPositions(positions, 198);
  if (!dryRun) assert(split.practice.length === 388 && split.test.length === 184, 'Split sizes');
  assert.equal(split.droppedRepeats.length, 0, 'Repeated boards were dropped');
  const practice = dryRun ? split.practice.slice(0, limit) : split.practice;
  const test = dryRun ? split.test.slice(0, limit) : split.test;
  const ids = [...practice, ...test].map(positionId);
  assert.equal(new Set(ids).size, ids.length, 'Duplicate position ids');
  const splitRecord = { practice: practice.map(positionId), test: test.map(positionId), testGames: test.map(p => p.gameId) };
  atomicJson(`${out}/split.json`, splitRecord);

  // Step 3: replay every history. Legal moves come from the replayed board and must match the positions file.
  const legal = new Map();
  for (const p of [...practice, ...test]) {
    const id = positionId(p);
    const replayed = replayPosition(p).legal;
    assert(replayed.length > 0, `No legal moves at ${id}`);
    assert.deepEqual(replayed, p.moves.map(m => m.uci).sort(), `Legal moves differ from the positions file at ${id}`);
    legal.set(id, replayed);
  }

  // Step 4: commit the schedules before any certificate is computed or any outcome is read.
  const committed = buildSchedules(SEEDS, practice);
  const scheduleText = JSON.stringify(committed.schedules);
  writeAtomic(`${out}/schedules.json`, scheduleText);
  assert.equal(sha(scheduleText), committed.sha256, 'Schedule hash differs from buildSchedules');
  writeManifest({ scheduleSha256: sha(scheduleText) });
  const { schedules } = committed;
  // Chance rates read outcomes, so split.json gets its chance field only now, after the commitment.
  atomicJson(`${out}/split.json`, { ...splitRecord, chance: chanceRates(test) });

  // Step 5: certificates for every legal move of every practice and test position.
  guard();
  const certs = certifyPositions([...practice, ...test]);
  const sources = {};
  for (const file of VERIFIER_FILES) sources[file] = await fileHash(file);
  const certLines = function* () {
    yield { kind: 'verifier', task: TASK, maxReplies: MAX_REPLIES, sources };
    for (const id of [...certs.keys()].sort()) {
      for (const uci of [...certs.get(id).keys()].sort()) {
        const c = certs.get(id).get(uci);
        yield { id, uci, category: c.category, value: c.value, status: c.status, proof: c.proof, certificateSha256: c.certificateSha256 };
      }
    }
  };
  await writeJsonl(`${out}/certificates.jsonl`, certLines());
  // Proofs are on disk now. The in-memory copy keeps category, value and hash only (256 MiB JS heap limit).
  for (const perMove of certs.values()) for (const c of perMove.values()) c.proof = null;

  // Step 6: input collisions. A +1 and a -1 sharing one eye input stop the run.
  guard();
  const retina = loadRetina('.cache/full.npz'), eyes = createEyesV2(retina);
  const items = [];
  for (const p of [...practice, ...test]) {
    const id = positionId(p);
    for (const uci of legal.get(id)) items.push({ fen: p.fen, action: uci, answer: certs.get(id).get(uci).value ?? 'unknown' });
  }
  const collisions = classifyCollisions(inputCollisions(eyes, items), items);
  atomicJson(`${out}/collisions.json`, collisions);
  if (collisions.stop.length > 0) { writeSummary('input-validity failure', {}); return; }

  // Step 7: one ledger per seed. Each seed needs enough verified +1 events before any brain pass.
  const ledgers = Object.fromEntries(SEEDS.map(seed => [seed, buildLedger(schedules[seed], certs)]));
  const positives = Object.fromEntries(SEEDS.map(seed => [seed, positiveCount(ledgers[seed])]));
  for (const seed of SEEDS) await writeJsonl(`${out}/ledger-${seed}.jsonl`, ledgers[seed]);
  if (SEEDS.some(seed => positives[seed] < minPositives)) { writeSummary('insufficient experience', { positives }); return; }
  const permutations = Object.fromEntries(SEEDS.map(seed => [seed, permuteKnownValues(ledgers[seed], seed)]));
  for (const seed of SEEDS) atomicJson(`${out}/permutation-${seed}.json`, permutations[seed]);

  // Step 8: packed eye inputs for every key, then one read-only brain pass per row (blank first).
  guard();
  const pack = s => ({ index: Int32Array.from(s, x => x.index), current: Float64Array.from(s, x => x.current) });
  const unpack = s => Array.from(s.index, (index, j) => ({ index, current: s.current[j] }));
  const stimOf = new Map(), keys = [];
  for (const p of [...practice, ...test]) {
    const id = positionId(p);
    for (const uci of legal.get(id)) {
      const k = keyOf(id, uci);
      keys.push(k);
      stimOf.set(k, pack(eyes.encode(p.fen, uci).stimulation));
    }
  }
  if (!dryRun) assert.equal(keys.length, 21053, 'Expected 21053 move keys');
  const sample = eyes.encode(practice[0].fen, legal.get(positionId(practice[0]))[0]).stimulation;
  assert.deepEqual(unpack(pack(sample)), sample, 'Packing changed the eye input');

  const graph = loadGraph('.cache/full.npz'), roots = readNpz('.cache/full.npz', ['root_ids']).root_ids;
  const indices = new Map(Array.from(roots, (root, i) => [root.toString(), i]));
  const kcs = [];
  let header;
  for await (const line of createInterface({ input: createReadStream('.cache/flywire-annotations-v2.1.0.tsv'), crlfDelay: Infinity })) {
    const fields = line.split('\t');
    if (!header) { header = fields; continue; }
    const index = indices.get(fields[header.indexOf('root_id')]);
    if (index !== undefined && fields[header.indexOf('cell_class')] === 'Kenyon_Cell') kcs.push(index);
  }
  const kcIndices = [...new Set(kcs)].sort((a, b) => a - b);
  assert.equal(kcIndices.length, 5177, 'Expected 5177 Kenyon cells');
  const kcRootIds = kcIndices.map(i => roots[i].toString());
  const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
  const rawForward = model.forward.bind(model);
  model.forward = (...values) => { const result = rawForward(...values); pace(); return result; };
  const magnitudes = () => { const m = model.params.magnitude; return sha(Buffer.from(m.buffer, m.byteOffset, m.byteLength)); };
  const magnitudesBefore = magnitudes();
  // One read-only brain pass; returns Kenyon-cell activity as Float32.
  const pass = stimulation => {
    guard();
    passes++;
    if (passes > 21100) throw Error('Pass budget exceeded');
    if (passes % 500 === 0) log({ kind: 'progress', passes, peakRssMiB, elapsedSeconds: elapsed() });
    model.forward([0], stimulation);
    return Float32Array.from(kcIndices, i => model.h[model.steps][i]);
  };

  // Rows stream to disk as they are made. The Float32 rows also stay in memory for scoring.
  const cachePath = `${out}/kc-cache.f32`, cache = createWriteStream(cachePath);
  const writeRow = async row => { if (!cache.write(Buffer.from(row.buffer, row.byteOffset, row.byteLength))) await once(cache, 'drain'); };
  const blank = pass([]);
  await writeRow(blank);
  const rowOf = new Map();
  for (const k of keys) {
    const row = pass(unpack(stimOf.get(k)));
    rowOf.set(k, row);
    await writeRow(row);
  }
  cache.end();
  await finished(cache);
  assert.deepEqual(pass(unpack(stimOf.get(keys[0]))), rowOf.get(keys[0]), 'Brain pass is not deterministic');
  assert.equal(magnitudes(), magnitudesBefore, 'Brain connections changed');
  const fileSha256 = await fileHash(cachePath);
  writeManifest({ cacheSha256: fileSha256 });
  atomicJson(`${out}/keys.json`, { rows: ['blank', ...keys] });
  atomicJson(`${out}/cache-schema.json`, { rows: keys.length + 1, columns: 5177, dtype: 'float32', byteOrder: 'little', kcIndices, kcRootIds, fileSha256, pins: config.pins });

  // Step 9: features. Scalers are fitted on the first sorted legal move of each practice position.
  const rawOf = k => {
    const s = stimOf.get(k), m = new Map(Array.from(s.index, (index, j) => [index, s.current[j]]));
    return Float64Array.from(retina.retina_idx, i => m.get(i) ?? 0);
  };
  const expand = makeRandomExpansion({ inputs: retina.retina_idx.length, units: kcIndices.length, fanIn: 6, seed: 20261103 });
  const FEATURE = {
    graph: k => Float64Array.from(rowOf.get(k)),
    'graph-sparse': k => sparse(rowOf.get(k), blank, SPARSE_KEEP),
    'graph-centred': k => centred(rowOf.get(k), blank),
    raw: rawOf,
    random: k => expand(rawOf(k), 0.05),
  };
  // Same formula as rmsScaler (kc-episodic-memory-v2.mjs), kept here to count zero-RMS coordinates.
  const rmsOf = vectors => {
    const rms = new Float64Array(vectors[0].length);
    for (let i = 0; i < rms.length; i++) {
      let s = 0;
      for (const v of vectors) s += v[i] * v[i];
      rms[i] = Math.sqrt(s / vectors.length);
    }
    return rms;
  };
  const zeros = xs => xs.reduce((n, x) => (x === 0 ? n + 1 : n), 0);
  const firstKeys = practice.map(p => keyOf(positionId(p), legal.get(positionId(p))[0]));
  const scale = {}, rms = {}, scalers = {};
  for (const name of Object.keys(FEATURE)) {
    const vectors = firstKeys.map(k => FEATURE[name](k));
    scale[name] = rmsScaler(vectors);
    rms[name] = rmsOf(vectors);
    assert.equal(sha(Buffer.from(rms[name].buffer)), scale[name].rmsSha256, `RMS formula differs for ${name}`);
    scalers[name] = { rmsSha256: scale[name].rmsSha256, zeroRmsFeatures: zeros(rms[name]) };
  }
  atomicJson(`${out}/scalers.json`, { ...scalers, randomWiringSha256: expand.wiringSha256 });

  // Test moves: graph-sparse density, and coordinates whose practice RMS is 0 but whose test value is nonzero.
  const testKeys = test.flatMap(p => legal.get(positionId(p)).map(u => keyOf(positionId(p), u)));
  let densitySum = 0, sparseZeroRmsTestCoords = 0;
  for (const k of testKeys) {
    const v = FEATURE['graph-sparse'](k);
    densitySum += sparseDensity(v);
    for (let i = 0; i < v.length; i++) if (rms['graph-sparse'][i] === 0 && v[i] !== 0) sparseZeroRmsTestCoords++;
  }
  const density = { 'graph-sparse': densitySum / testKeys.length };

  // Step 10: every arm for every seed, one store at a time. Only test records reach records.jsonl.
  // Zero-RMS mask (post-cutoff change, 2026-11-04): a coordinate that is 0 in every scaler-fit vector is set to 0, not divided by 1e-6. Label-free; see proposal section 4 addendum.
  const featureOf = name => (id, uci) => {
    const v = scale[name](FEATURE[name](keyOf(id, uci))), r = rms[name];
    for (let i = 0; i < v.length; i++) if (r[i] === 0) v[i] = 0;
    return v;
  };
  const categoryOf = (id, uci) => certs.get(id).get(uci).category;
  const testSet = test.map(p => ({ id: positionId(p), moves: legal.get(positionId(p)) }));
  const judgeRows = [], armDone = [];
  for (const seed of SEEDS) {
    for (const arm of V4_ARMS) {
      guard();
      const feature = FEATURE_OF_ARM[arm];
      const res = runArmV4({
        arm, ledger: ledgers[seed], permutedValues: permutations[seed].values, test: testSet,
        featureOf: feature === null ? () => { throw Error('The none arm reads no features'); } : featureOf(feature),
        categoryOf, capacity: 2048, k: 3,
        log: r => {
          guard();
          if (r.kind === 'test') log({ kind: 'test', seed, arm: r.arm, id: r.id, c: r.c, s: r.s, expected: r.expected });
          pace();
        },
      });
      const { test: _scores, ...done } = res;
      judgeRows.push({ seed, ...res });
      armDone.push({ kind: 'arm-done', seed, ...done });
      log(armDone[armDone.length - 1]);
      pace();
    }
  }

  // Step 11: judge and summary.
  const verdict = judgeV4(judgeRows, { seeds: SEEDS, testGames: test.map(p => p.gameId), minCorrect: 96, minMargin: 9, resamples: 10000 });
  writeSummary(verdict.outcome, { verdict, rows: armDone, positives, density, sparseZeroRmsTestCoords });
}

try {
  await run();
  writeManifest({ status: 'complete', endedAt: new Date().toISOString(), exitStatus: 0 });
} catch (error) {
  writeManifest({ status: 'failed', endedAt: new Date().toISOString(), exitStatus: 1, error: error.message });
  throw error;
}
