// Engineered memory v5 runner (2026-11-05): development selects one key; fresh-test confirmation scores frozen engineered memories and probes their retention. Brain passes run only for keys v4 did not compute; brain connections never change. Design: documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md (rev 3). File contract: documentation/design/neural-learning/memory-v5-file-formats.md. Store jobs run in memory-v5-worker.mjs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { finished } from 'node:stream/promises';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { createEyesV2, inputCollisions, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { restartSplit } from '../../src/puzzle-learning/twin-pair-generator-v1.mjs';
import { COLUMNS, buildPartition, openRows } from '../../src/neural-learning/memory-v5-data.mjs';
import { judgeV5, selectKey } from '../../src/neural-learning/engineered-memory-task-v5.mjs';
import { TASK, MAX_REPLIES, positionId, replayPosition, buildSchedules, certifyPositions, classifyCollisions, buildLedger, permuteKnownValues, positiveCount } from '../../src/neural-learning/engineered-memory-v4-ledger.mjs';

const WORKER = fileURLToPath(new URL('./memory-v5-worker.mjs', import.meta.url));
const SEEDS = [6101, 6102, 6103];
const KEYS = ['K1', 'K2', 'K3'];
const SECONDARY = ['raw-pc', 'random-pc'];
const CONFIRM_ARMS = ['full', 'half', 'quarter', 'shuffled', 'none', 'raw-pc', 'random-pc'];
const GATE_ARMS = ['full', 'none', 'shuffled', 'quarter'];
const MIN_FULL = 80, MIN_QUARTER = 20;
const WORKER_RESERVE_MIB = 1536, START_HEADROOM_MIB = 2560;
const VERIFIER_FILES = [
  '.codebase/src/neural-learning/engineered-memory-v4-ledger.mjs',
  '.codebase/src/search-and-feedback/capture-retention-action-domain.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs',
  '.codebase/src/search-and-feedback/puzzle-search.mjs', // imported by the three search-and-feedback files (uci)
];
const SCOPE = 'externally scheduled memory assay with a development-selected key: fixed seeded practice schedule (not own choice); verified labels stored in an engineered memory; brain connections never change; no neural delivery of feedback; fresh-test positions scored from frozen stores; exploratory until registered';

const { values: args } = parseArgs({
  options: {
    config: { type: 'string' },
    'cpu-duty': { type: 'string', default: '0.5' },
    workers: { type: 'string', default: '3' },
    'limit-positions': { type: 'string' },
  },
});
const cpuDuty = Number(args['cpu-duty']);
assert([0.5, 0.75, 1].includes(cpuDuty), 'cpu-duty must be 0.5, 0.75 or 1');
const workers = Number(args.workers);
assert([1, 3].includes(workers), 'workers must be 1 or 3');
assert(args.config, 'Missing --config');
const limit = args['limit-positions'] === undefined ? null : Number(args['limit-positions']);
assert(limit === null || (Number.isSafeInteger(limit) && limit >= 1), 'limit-positions must be a positive integer');
const dryRun = limit !== null;
const minFull = dryRun ? 1 : MIN_FULL, minQuarter = dryRun ? 1 : MIN_QUARTER;
assert.equal(os.endianness(), 'LE', 'The cache is written little-endian');

const stripBom = text => text.replace(/^﻿/, '');
const readJson = path => JSON.parse(stripBom(readFileSync(path, 'utf8')));
const readJsonl = path => stripBom(readFileSync(path, 'utf8')).split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
const registration = readFileSync(args.config);
const config = JSON.parse(stripBom(registration.toString('utf8')));
const out = config.paths.run;
assert(!existsSync(out), 'Fresh output required');
const jobsDir = `${out}/jobs`;

const sha = data => createHash('sha256').update(data).digest('hex');
const fileHash = async path => { const h = createHash('sha256'); for await (const chunk of createReadStream(path)) h.update(chunk); return h.digest('hex'); };
const writeAtomic = (path, text) => { writeFileSync(path + '.partial', text); renameSync(path + '.partial', path); };
const atomicJson = (path, body) => { const text = JSON.stringify(body) + '\n'; writeAtomic(path, text); return sha(text); };
// JSONL is streamed with backpressure, so the write queue never holds a whole file.
async function writeJsonl(path, records) {
  const ws = createWriteStream(path);
  for (const record of records) if (!ws.write(JSON.stringify(record) + '\n')) await once(ws, 'drain');
  ws.end();
  await finished(ws);
}
const keyOf = (id, uci) => `${id}|${uci}`;
const count = xs => xs.filter(Boolean).length;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

const started = performance.now(), sleep = new Int32Array(new SharedArrayBuffer(4));
const elapsed = () => Number(((performance.now() - started) / 1000).toFixed(3));
let peakRssMiB = 0, passes = 0;

// Resource guard: records the peak RSS seen so far.
function guard() {
  const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
  peakRssMiB = Math.max(peakRssMiB, rssMiB);
  assert(rssMiB <= 2048 && freeMiB >= 256 && performance.now() - started <= 18000000, 'Resource guard');
}
// Pacing: keeps CPU use near the chosen duty.
function pace() {
  const cpu = process.cpuUsage();
  let delay = (1 / cpuDuty) * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  while (delay > 0) {
    Atomics.wait(sleep, 0, 0, Math.min(delay, 100));
    delay = (1 / cpuDuty) * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  }
}

let manifest = {
  schema: 'engineered-memory-test-v5-run', status: 'running', pid: process.pid, argv: process.argv,
  startedAt: new Date().toISOString(), endedAt: null, exitStatus: null, volume: 2, chapter: 'To Learn; Evidence for Learning',
  registrationSha256: sha(registration), pins: config.pins, v4CacheSha256: config.v4CacheSha256,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty, workers, workerRssMiB: 1536, workerFreeMiB: 1024, reserveMiB: WORKER_RESERVE_MIB, startHeadroomMiB: START_HEADROOM_MIB, wallSeconds: 18000 },
  partitionSha256: null, scheduleSha256: null, cacheSha256: null,
};
const writeManifest = patch => { manifest = { ...manifest, ...patch }; atomicJson(`${out}/manifest.json`, manifest); };
mkdirSync(jobsDir, { recursive: true });
writeManifest({ status: 'running' });

const writeSummary = (outcome, body) => atomicJson(`${out}/summary.json`, {
  schema: 'engineered-memory-test-v5', outcome, selectedKey: null, verdict: null, positives: {}, retention: null, jobs: [],
  passes, peakRssMiB: Math.max(peakRssMiB, process.resourceUsage().maxRSS / 1024), elapsedSeconds: elapsed(), scope: SCOPE, dryRun, ...body,
});

const jobName = job => `${job.phase}-${job.key}-${job.direction}-${job.seed}-${job.arm}`;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byJob = (a, b) => (a.phase === b.phase ? 0 : a.phase === 'dev' ? -1 : 1)
  || cmp(a.key, b.key) || cmp(a.direction, b.direction) || a.seed - b.seed || cmp(a.arm, b.arm);

function startWorker(job) {
  const name = jobName(job);
  const child = spawn(process.execPath, ['--max-old-space-size=256', WORKER, '--run', out, '--job', JSON.stringify(job), '--config', args.config, '--cpu-duty', String(cpuDuty)], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2000); });
  const worker = { name, child, result: null };
  worker.done = new Promise(resolve => {
    child.on('error', error => resolve({ name, code: -1, stderr: error.message }));
    child.on('close', code => resolve({ name, code, stderr }));
  }).then(result => { worker.result = result; });
  return worker;
}

// Launcher. At most `workers` children run. A new child starts only when free memory, minus the reservation of children not yet steady, leaves the headroom. Any failure stops the run; there is no retry.
async function runBatch(phase, jobs) {
  assert.equal(new Set(jobs.map(jobName)).size, jobs.length, 'Duplicate job identities');
  const queue = [...jobs];
  const active = [];
  const canStart = () => {
    const unsteady = active.filter(w => !existsSync(`${jobsDir}/${w.name}.steady`)).length;
    return os.freemem() / 2 ** 20 - unsteady * WORKER_RESERVE_MIB >= START_HEADROOM_MIB;
  };
  try {
    while (queue.length > 0 || active.length > 0) {
      guard();
      for (const w of active.filter(w => w.result !== null)) {
        active.splice(active.indexOf(w), 1);
        assert.equal(w.result.code, 0, `Worker ${w.name} exited ${w.result.code}: ${w.result.stderr}`);
      }
      if (queue.length > 0 && active.length < workers && canStart()) {
        active.push(startWorker(queue.shift()));
        continue;
      }
      // ponytail: fixed 2 s recheck, woken early when a child exits.
      await Promise.race([pause(2000), ...active.map(w => w.done)]);
    }
  } catch (error) {
    for (const w of active) w.child.kill();
    throw error;
  }
  const names = readdirSync(jobsDir).filter(f => f.startsWith(`${phase}-`) && f.endsWith('.json')).sort();
  assert.deepEqual(names, jobs.map(j => `${jobName(j)}.json`).sort(), `${phase} output file set differs from the job list`);
  const outputs = jobs.map(j => readJson(`${jobsDir}/${jobName(j)}.json`)).sort((a, b) => byJob(a.job, b.job));
  console.log(`${phase}: ${jobs.length} jobs complete`);
  return new Map(outputs.map(o => [jobName(o.job), o]));
}

// Step 6 helper: read-only brain passes for the new keys only. Writes the v5 cache in the v4 format.
async function buildNewCache(newList, v4Blank, eyes) {
  guard();
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
  assert.equal(kcIndices.length, COLUMNS, 'Expected 5177 Kenyon cells');
  const kcRootIds = kcIndices.map(i => roots[i].toString());
  const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
  const rawForward = model.forward.bind(model);
  model.forward = (...values) => { const result = rawForward(...values); pace(); return result; };
  const magnitudes = () => { const m = model.params.magnitude; return sha(Buffer.from(m.buffer, m.byteOffset, m.byteLength)); };
  const magnitudesBefore = magnitudes();
  const passLimit = passes + newList.length + 3;
  // One read-only brain pass; returns Kenyon-cell activity as Float32.
  const pass = stimulation => {
    guard();
    passes++;
    assert(passes <= passLimit, 'Pass budget exceeded');
    model.forward([0], stimulation);
    return Float32Array.from(kcIndices, i => model.h[model.steps][i]);
  };
  const cachePath = `${out}/kc-cache.f32`, cache = createWriteStream(cachePath);
  const writeRow = async row => { if (!cache.write(Buffer.from(row.buffer, row.byteOffset, row.byteLength))) await once(cache, 'drain'); };
  const blank = pass([]);
  assert.deepEqual(blank, v4Blank, 'v5 blank row differs from the v4 blank row');
  await writeRow(blank);
  let firstRow = null;
  for (const { fen, uci } of newList) {
    const row = pass(eyes.encode(fen, uci).stimulation);
    if (firstRow === null) firstRow = row;
    await writeRow(row);
  }
  if (newList.length > 0) assert.deepEqual(pass(eyes.encode(newList[0].fen, newList[0].uci).stimulation), firstRow, 'Brain pass is not deterministic');
  cache.end();
  await finished(cache);
  assert.equal(magnitudes(), magnitudesBefore, 'Brain connections changed');
  return { kcIndices, kcRootIds, cacheSha256: await fileHash(cachePath) };
}

async function run() {
  guard();
  for (const [path, expected] of Object.entries(config.pins)) assert.equal(await fileHash(path), expected, `Changed input ${path}`);
  const v4Manifest = readJson(`${config.paths.v4Run}/manifest.json`);
  assert.equal(v4Manifest.status, 'complete', 'The v4 run is not complete');
  assert.equal(v4Manifest.cacheSha256, config.v4CacheSha256, 'The v4 cache differs from the registration');

  // Step 2: partition. The max-50 file holds the 572 v4 positions as an exact subset (checked by buildPartition).
  const all = readJsonl(config.paths.positionsAll);
  const v4Positions = readJsonl(config.paths.positionsV4);
  for (const p of all) assert(restartSplit(p.gameId) === 'train', 'Position outside the training bucket');
  if (!dryRun) assert.equal(v4Positions.length, 572, 'Need 572 v4 positions');
  const built = buildPartition({ all, v4: v4Positions });
  let partition = built;
  if (dryRun) {
    const practice = built.practice.slice(0, limit), keep = new Set(practice);
    partition = { ...built, practice, foldA: built.foldA.filter(id => keep.has(id)), foldB: built.foldB.filter(id => keep.has(id)), freshTest: built.freshTest.slice(0, limit) };
  }
  writeManifest({ partitionSha256: atomicJson(`${out}/partition.json`, partition) });
  const byId = new Map(all.map(p => [positionId(p), p]));
  const practiceP = partition.practice.map(id => byId.get(id));
  const freshP = partition.freshTest.map(id => byId.get(id));
  assert(practiceP.every(Boolean) && freshP.every(Boolean), 'A partition id has no position');

  // Step 3: replay every history. Legal moves come from the replayed board and must match the positions file.
  const legal = new Map();
  for (const p of [...practiceP, ...freshP]) {
    const id = positionId(p);
    const replayed = replayPosition(p).legal;
    assert(replayed.length > 0, `No legal moves at ${id}`);
    assert.deepEqual(replayed, p.moves.map(m => m.uci).sort(), `Legal moves differ from the positions file at ${id}`);
    legal.set(id, replayed);
  }

  // Step 3b: commit the schedules before any outcome is read.
  const committed = buildSchedules(SEEDS, practiceP);
  const scheduleText = JSON.stringify(committed.schedules);
  writeAtomic(`${out}/schedules.json`, scheduleText);
  assert.equal(sha(scheduleText), committed.sha256, 'Schedule hash differs from buildSchedules');
  writeManifest({ scheduleSha256: committed.sha256 });
  const { schedules } = committed;

  // Step 4: certificates for every legal move of every practice and fresh position.
  guard();
  const certs = certifyPositions([...practiceP, ...freshP]);
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

  // Step 4b: input collisions over every legal move. A +1 and a -1 sharing one eye input stop the run.
  guard();
  const retina = loadRetina('.cache/full.npz'), eyes = createEyesV2(retina);
  const items = [];
  for (const p of [...practiceP, ...freshP]) {
    const id = positionId(p);
    for (const uci of legal.get(id)) items.push({ fen: p.fen, action: uci, answer: certs.get(id).get(uci).value ?? 'unknown' });
  }
  const collisions = classifyCollisions(inputCollisions(eyes, items), items);
  atomicJson(`${out}/collisions.json`, collisions);
  if (collisions.stop.length > 0) { writeSummary('input-validity failure', {}); return; }

  // Step 5: ledgers, exposure stop, permutations.
  const ledgers = Object.fromEntries(SEEDS.map(seed => [seed, buildLedger(schedules[seed], certs)]));
  const quarterOf = ledger => ledger.slice(0, Math.floor(ledger.length / 4));
  const positives = Object.fromEntries(SEEDS.map(seed => [seed, positiveCount(ledgers[seed])]));
  const quarterPositives = Object.fromEntries(SEEDS.map(seed => [seed, positiveCount(quarterOf(ledgers[seed]))]));
  const exposure = { full: positives, quarter: quarterPositives };
  for (const seed of SEEDS) await writeJsonl(`${out}/ledger-${seed}.jsonl`, ledgers[seed]);
  if (SEEDS.some(seed => positives[seed] < minFull || quarterPositives[seed] < minQuarter)) {
    writeSummary('insufficient experience', { positives: exposure });
    return;
  }
  const permutations = Object.fromEntries(SEEDS.map(seed => [seed, permuteKnownValues(ledgers[seed], seed)]));
  for (const seed of SEEDS) atomicJson(`${out}/permutation-${seed}.json`, permutations[seed]);
  const foldLedger = ids => { const keep = new Set(ids); return ledgers[6101].filter(slot => keep.has(slot.id)); };
  for (const [source, ids] of [['A', partition.foldA], ['B', partition.foldB]]) {
    atomicJson(`${out}/permutation-dev-${source}.json`, permuteKnownValues(foldLedger(ids), 6101));
  }

  // Step 6: brain passes for keys v4 did not compute (every legal move of the new practice and fresh positions), plus blank.
  const v4Rows = readJson(`${config.paths.v4Run}/keys.json`).rows;
  assert.equal(v4Rows[0], 'blank', 'v4 keys.json row 0 must be blank');
  const v4Keys = new Set(v4Rows.slice(1));
  const newList = [];
  for (const p of [...practiceP, ...freshP]) {
    const id = positionId(p);
    for (const uci of legal.get(id)) if (!v4Keys.has(keyOf(id, uci))) newList.push({ key: keyOf(id, uci), fen: p.fen, uci });
  }
  const v4Blank = openRows({ v4Dir: config.paths.v4Run }).blank();
  const cache = await buildNewCache(newList, v4Blank, eyes);
  atomicJson(`${out}/keys.json`, { rows: ['blank', ...newList.map(k => k.key)] });
  atomicJson(`${out}/cache-schema.json`, {
    rows: newList.length + 1, columns: COLUMNS, dtype: 'float32', byteOrder: 'little',
    kcIndices: cache.kcIndices, kcRootIds: cache.kcRootIds, fileSha256: cache.cacheSha256, pins: config.pins,
  });
  writeManifest({ cacheSha256: cache.cacheSha256 });

  // Step 7: development jobs (12). Each store is one fold's ledger; the selected key is the one with the largest margin.
  const devJobs = KEYS.flatMap(key => ['AB', 'BA'].flatMap(direction => ['store', 'shuffled'].map(arm => ({ phase: 'dev', key, direction, seed: 6101, arm }))));
  const devOut = await runBatch('dev', devJobs);
  const devTotal = (key, direction, arm) => devOut.get(jobName({ phase: 'dev', key, direction, seed: 6101, arm })).expectedTotal;
  const dev = Object.fromEntries(KEYS.map(key => [key, Object.fromEntries(['AB', 'BA'].map(direction => [
    direction, { store: devTotal(key, direction, 'store'), shuffled: devTotal(key, direction, 'shuffled') },
  ]))]));
  const { margins, selected } = selectKey(dev);
  atomicJson(`${out}/selection.json`, { dev, margins, selected });
  if (selected === null) {
    writeSummary('no learning key found in development', { positives: exposure, jobs: devJobs });
    return;
  }

  // Step 8: confirmation jobs (21) on the fresh-test set, with the selected key.
  const jobFor = (seed, arm) => ({ phase: 'confirm', key: SECONDARY.includes(arm) ? arm : selected, direction: '-', seed, arm });
  const confirmJobs = SEEDS.flatMap(seed => CONFIRM_ARMS.map(arm => jobFor(seed, arm)));
  const confOut = await runBatch('confirm', confirmJobs);
  const at = job => confOut.get(jobName(job));

  // Step 10: judge. Scores are aligned to fresh-test order; retention compares the quarter store with the full store on the same probes.
  const freshIds = partition.freshTest;
  const perSeed = SEEDS.map(seed => {
    const scoresOf = arm => at(jobFor(seed, arm)).scores;
    for (const arm of GATE_ARMS) assert.deepEqual(scoresOf(arm).map(s => s.id), freshIds, `Scores are not in fresh-test order (${arm})`);
    const quarterRecall = at(jobFor(seed, 'quarter')).retention.recalledQuarter;
    const fullRecall = at(jobFor(seed, 'full')).retention.recalledFull;
    assert.equal(fullRecall.length, quarterRecall.length, 'Probe lists differ');
    return {
      seed,
      scores: Object.fromEntries(GATE_ARMS.map(arm => [arm, scoresOf(arm).map(s => s.expected)])),
      retention: {
        probes: quarterRecall.length,
        previouslyRecalled: count(quarterRecall),
        recalledFull: count(fullRecall),
        lost: quarterRecall.filter((recalled, i) => recalled && !fullRecall[i]).length,
      },
    };
  });
  const verdict = judgeV5(perSeed, { games: freshP.map(p => p.gameId) });
  writeSummary(verdict.outcome, {
    selectedKey: selected, verdict, positives: exposure,
    retention: perSeed.map(s => ({ seed: s.seed, ...s.retention })),
    jobs: [...devJobs, ...confirmJobs],
  });
}

try {
  await run();
  writeManifest({ status: 'complete', endedAt: new Date().toISOString(), exitStatus: 0 });
} catch (error) {
  writeManifest({ status: 'failed', endedAt: new Date().toISOString(), exitStatus: 1, error: error.message });
  throw error;
}
