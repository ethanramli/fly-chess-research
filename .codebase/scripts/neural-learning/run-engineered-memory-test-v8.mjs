// Engineered memory v8 runner (2026-11-07): the v7 runner with the practice set replaced by a capture ledger. Per seed, every known-certificate capture of the 750 v5 practice positions is written once in seeded order (ledger-<seed>.jsonl), with a capture-value permutation for the shuffled arm. Key K3 (chosen on v5 practice games) is reused; new test positions (games 901-1200) are scored and probed for retention. Brain passes run only for the new test keys; brain connections never change. Design: documentation/design/neural-learning/memory-v8-proposal-2026-11-07.md (rev 2). Store jobs run in memory-v7-worker.mjs, reused unchanged.
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
import { splitPositions } from '../../src/neural-learning/engineered-memory-task-v3.mjs';
import { COLUMNS, buildTestSet, openRowsMany } from '../../src/neural-learning/memory-v6-data.mjs';
import { captureCandidates, permuteCaptureValues } from '../../src/neural-learning/engineered-memory-task-v7.mjs';
import { captureLedger, judgeV8 } from '../../src/neural-learning/engineered-memory-task-v8.mjs';
import { certifyPositions, classifyCollisions, positionId, positiveCount, replayPosition } from '../../src/neural-learning/engineered-memory-v4-ledger.mjs';

const WORKER = fileURLToPath(new URL('./memory-v7-worker.mjs', import.meta.url));
const SEEDS = [6101, 6102, 6103];
const KEY = 'K3';
const SECONDARY = ['raw-pc', 'random-pc'];
const ARMS = ['full', 'half', 'quarter', 'eighth', 'shuffled', 'none', 'raw-pc', 'random-pc'];
const GATE_ARMS = ['full', 'none', 'shuffled', 'quarter'];
// Earlier restart selections (games 1-300, 301-600, 601-900), pinned by SHA-256 (v8 proposal section 3).
const PRIOR_SELECTION_PINS = ['5c212e69f6e5bd99f67b02abb8b6b90c86b4327e23a7b64023d11980f93f4bdd', 'af0ce4c715392b31786035292a9aa15d02941b0438665b3db41df3960f127101', '54f70ed4cf886d5b36f905028a8c3a44637bedcdb48885aff22591656773fa7b'];
const WORKER_RESERVE_MIB = 1536, START_HEADROOM_MIB = 2560;
const VERIFIER_FILES = [
  '.codebase/src/neural-learning/engineered-memory-v4-ledger.mjs',
  '.codebase/src/search-and-feedback/capture-retention-action-domain.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs',
  '.codebase/src/search-and-feedback/puzzle-search.mjs', // imported by the three search-and-feedback files (uci)
];
const SCOPE = 'exploratory and outcome-informed (v8 proposal rev 2): memory v5 key K3 fixed (chosen on v5 practice games only); practice ledger = every known-certificate capture of the 750 v5 practice positions once, in a seeded order, a teacher-selected curriculum by move type and certificate status, never value; no quiet slots; candidates are known-certificate captures; verified labels stored in an engineered memory; brain connections never change; no neural delivery of feedback; new test positions from games 901-1200 scored from frozen stores; a label-conditioned fixture, not unaided all-legal choice or relational safety reasoning; exploratory until registered';

const { values: args } = parseArgs({
  options: {
    config: { type: 'string' },
    'cpu-duty': { type: 'string', default: '0.5' },
    workers: { type: 'string', default: '4' },
    'limit-positions': { type: 'string' },
    'resume-from': { type: 'string' },
  },
});
const cpuDuty = Number(args['cpu-duty']);
assert([0.5, 0.75, 1].includes(cpuDuty), 'cpu-duty must be 0.5, 0.75 or 1');
const workers = Number(args.workers);
assert([1, 3, 4].includes(workers), 'workers must be 1, 3 or 4');
assert(args.config, 'Missing --config');
const limit = args['limit-positions'] === undefined ? null : Number(args['limit-positions']);
assert(limit === null || (Number.isSafeInteger(limit) && limit >= 1), 'limit-positions must be a positive integer');
const dryRun = limit !== null;
// Resume (added 2026-11-06 after the first v7 launch was killed by a Windows shutdown at 12/24 jobs; same patch as the v6 runner): finished job outputs of a failed run with the same partition and cache are copied byte for byte; the audit rebuilds every job.
const resumeDir = args['resume-from'] ?? null;
assert.equal(os.endianness(), 'LE', 'The cache is written little-endian');

const stripBom = text => text.replace(/^﻿/, '');
const readJson = path => JSON.parse(stripBom(readFileSync(path, 'utf8')));
const readJsonl = path => stripBom(readFileSync(path, 'utf8')).split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
const registration = readFileSync(args.config);
const config = JSON.parse(stripBom(registration.toString('utf8')));
const out = config.paths.run;
const jobsDir = `${out}/jobs`;

const sha = data => createHash('sha256').update(data).digest('hex');
const fileHash = async path => { const h = createHash('sha256'); for await (const chunk of createReadStream(path)) h.update(chunk); return h.digest('hex'); };
const writeAtomic = (path, text) => { writeFileSync(path + '.partial', text); renameSync(path + '.partial', path); };
const atomicJson = (path, body) => { const text = JSON.stringify(body) + '\n'; writeAtomic(path, text); return sha(text); };
const keyOf = (id, uci) => `${id}|${uci}`;
const uciOf = move => move.from + move.to + (move.promotion ?? '');
const capturesOf = board => new Set(board.moves({ verbose: true }).filter(m => m.captured).map(uciOf));
const count = xs => xs.filter(Boolean).length;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

const started = performance.now(), sleep = new Int32Array(new SharedArrayBuffer(4));
const elapsed = () => Number(((performance.now() - started) / 1000).toFixed(3));
let peakRssMiB = 0, passes = 0;

// Resource guard: records the peak RSS seen so far.
function guard() {
  const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
  peakRssMiB = Math.max(peakRssMiB, rssMiB);
  assert(rssMiB <= 2048 && freeMiB >= 256 && performance.now() - started <= 43200000, 'Resource guard');
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

// Step 1: pins. Step 2: fresh output. Step 3: manifest.
for (const [path, expected] of Object.entries(config.pins)) assert.equal(await fileHash(path), expected, `Changed input ${path}`);
assert(!existsSync(out), 'Fresh output required');
mkdirSync(jobsDir, { recursive: true });
let manifest = {
  schema: 'engineered-memory-test-v8-run', status: 'running', pid: process.pid, argv: process.argv,
  startedAt: new Date().toISOString(), endedAt: null, exitStatus: null, volume: 2, chapter: 'To Learn; Evidence for Learning',
  registrationSha256: sha(registration), pins: config.pins, v4CacheSha256: config.v4CacheSha256, v5CacheSha256: config.v5CacheSha256,
  limits: { heapMiB: 256, rssMiB: 2048, freeMiB: 256, cpuDuty, workers, workerRssMiB: 1536, workerFreeMiB: 1024, reserveMiB: WORKER_RESERVE_MIB, startHeadroomMiB: START_HEADROOM_MIB, wallSeconds: 43200 },
  partitionSha256: null, cacheSha256: null,
};
const writeManifest = patch => { manifest = { ...manifest, ...patch }; atomicJson(`${out}/manifest.json`, manifest); };
writeManifest({ status: 'running' });

const writeSummary = (outcome, body) => atomicJson(`${out}/summary.json`, {
  schema: 'engineered-memory-test-v8', outcome, selectedKey: KEY, verdict: null, positives: {}, retention: null, jobs: [],
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
  const copied = [];
  if (resumeDir) {
    const old = readJson(`${resumeDir}/manifest.json`);
    assert.equal(old.status, 'failed', 'Only a failed run can be resumed');
    assert.equal(old.partitionSha256, manifest.partitionSha256, 'Resumed run has a different partition');
    assert.equal(old.cacheSha256, manifest.cacheSha256, 'Resumed run has a different cache');
    assert.deepEqual(old.ledgers, manifest.ledgers, 'Resumed run has different ledgers or permutations');
    assert.deepEqual(old.pins, manifest.pins, 'Resumed run has different code or data pins');
  }
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
      const done = resumeDir && queue.length > 0 ? `${resumeDir}/jobs/${jobName(queue[0])}.json` : null;
      if (done && existsSync(done)) {
        const bytes = readFileSync(done);
        writeAtomic(`${jobsDir}/${jobName(queue.shift())}.json`, bytes);
        copied.push({ file: done, sha256: sha(bytes) });
        continue;
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
  if (resumeDir) writeManifest({ resumedFrom: { run: resumeDir, copiedJobs: copied } });
  console.log(`${phase}: ${jobs.length} jobs complete (${copied.length} copied)`);
  return new Map(outputs.map(o => [jobName(o.job), o]));
}

// Brain passes for the new test keys only. Writes the v8 cache in the v4 format.
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
  assert.deepEqual(blank, v4Blank, 'v8 blank row differs from the v4 blank row');
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
  // Step 4: the v4 and v5 runs are complete and their caches are the registered ones.
  const v4Manifest = readJson(`${config.paths.v4Run}/manifest.json`);
  assert.equal(v4Manifest.status, 'complete', 'The v4 run is not complete');
  assert.equal(v4Manifest.cacheSha256, config.v4CacheSha256, 'The v4 cache differs from the registration');
  const v5Manifest = readJson(`${config.paths.v5Run}/manifest.json`);
  assert.equal(v5Manifest.status, 'complete', 'The v5 run is not complete');
  assert.equal(v5Manifest.cacheSha256, config.v5CacheSha256, 'The v5 cache differs from the registration');

  // Step 5: v5 inputs. Only partition.json (the practice ids) is read. No v5 schedules, ledgers or permutations are copied. Each file is hashed from the bytes that are read.
  assert.deepEqual(Object.keys(config.v5Files), ['partition.json'], 'v5Files must list exactly partition.json');
  const v5Bytes = {};
  for (const [name, expected] of Object.entries(config.v5Files)) {
    const bytes = readFileSync(`${config.paths.v5Run}/${name}`);
    assert.equal(sha(bytes), expected, `v5 file differs from the registration: ${name}`);
    v5Bytes[name] = bytes;
  }
  const v5Partition = JSON.parse(stripBom(v5Bytes['partition.json'].toString('utf8')));

  // Step 6: positions, the test set, and the partition. Written before any certificate or brain pass. Earlier test boards: v4 test, v5 fresh, v6 test and v7 test (the v6 and v7 test positions are in positionsV6 and positionsV7).
  const all = readJsonl(config.paths.positionsAll);
  const newPositions = readJsonl(config.paths.positionsNew);
  const v4Positions = readJsonl(config.paths.positionsV4);
  const v6Positions = readJsonl(config.paths.positionsV6);
  const v7Positions = readJsonl(config.paths.positionsV7);
  for (const p of newPositions) assert(restartSplit(p.gameId) === 'train', 'New position outside the training bucket');
  // v8 proposal section 3: the new games do not overlap any earlier selection (1-300, 301-600, 601-900). Each prior selection is pinned by SHA-256.
  const priorHashes = [], earlierGames = new Set();
  for (const path of config.paths.priorSelections) {
    const hash = await fileHash(path);
    assert(PRIOR_SELECTION_PINS.includes(hash), `Prior selection differs from its pin: ${path}`);
    priorHashes.push(hash);
    for (const id of readJson(path).ids) earlierGames.add(id);
  }
  for (const pin of PRIOR_SELECTION_PINS) assert(priorHashes.includes(pin), `Prior selection missing: ${pin}`);
  const newGames = new Set(readJson(config.paths.newSelection).ids);
  for (const p of newPositions) {
    assert(newGames.has(p.gameId), `New position not in the new selection: ${p.gameId}`);
    assert(!earlierGames.has(p.gameId), `New position from an earlier game: ${p.gameId}`);
  }
  const byId = new Map();
  for (const p of [...all, ...newPositions]) {
    const id = positionId(p);
    assert(!byId.has(id), `Duplicate position id ${id}`);
    byId.set(id, p);
  }
  const lookup = id => { const p = byId.get(id); assert(p, `No position for ${id}`); return p; };
  const v6ById = new Map(v6Positions.map(p => [positionId(p), p]));
  const v6Partition = readJson(`${config.paths.v6Run}/partition.json`);
  const v6TestP = v6Partition.freshTest.map(id => { const p = v6ById.get(id); assert(p, `No v6 position for ${id}`); return p; });
  const v7ById = new Map(v7Positions.map(p => [positionId(p), p]));
  const v7Partition = readJson(`${config.paths.v7Run}/partition.json`);
  const v7TestP = v7Partition.freshTest.map(id => { const p = v7ById.get(id); assert(p, `No v7 position for ${id}`); return p; });
  const practiceP = v5Partition.practice.map(lookup);
  const v5FreshP = v5Partition.freshTest.map(lookup);
  const v4TestP = splitPositions(v4Positions, 198).test;
  const boardOf = p => p.fen.split(' ')[0];
  const testSet = buildTestSet({
    newPositions,
    practiceBoards: practiceP.map(boardOf),
    earlierTestBoards: [...v4TestP, ...v5FreshP, ...v6TestP, ...v7TestP].map(boardOf),
  });
  const freshTest = dryRun ? testSet.freshTest.slice(0, limit) : testSet.freshTest;
  const partition = {
    practice: v5Partition.practice, foldA: [], foldB: [], freshTest, excluded: testSet.excluded,
    counts: { newPositions: newPositions.length, practice: practiceP.length, freshTest: freshTest.length, excluded: testSet.excluded.length },
  };
  writeManifest({ partitionSha256: atomicJson(`${out}/partition.json`, partition) });
  const newTestP = freshTest.map(lookup);

  // Step 7: replay the practice and new test positions. Legal moves come from the replayed board and must match the positions file. Practice captures drive the step 8 ledgers; test boards drive the candidate sets.
  const legal = new Map();
  const replayChecked = p => {
    const id = positionId(p);
    const replay = replayPosition(p);
    assert(replay.legal.length > 0, `No legal moves at ${id}`);
    assert.deepEqual(replay.legal, p.moves.map(m => m.uci).sort(), `Legal moves differ from the positions file at ${id}`);
    legal.set(id, replay.legal);
    return replay.board;
  };
  const practiceCaptures = new Map(practiceP.map(p => [positionId(p), capturesOf(replayChecked(p))]));
  const testBoards = new Map(newTestP.map(p => [positionId(p), replayChecked(p)]));

  // Step 8: certificates. The v5 header and every v5 practice line are copied as raw text, then new lines follow for every legal test move.
  guard();
  const testCerts = certifyPositions(newTestP);
  const verifierNow = {};
  for (const file of VERIFIER_FILES) verifierNow[file] = await fileHash(file);
  const certOut = createWriteStream(`${out}/certificates.jsonl`);
  const putCert = async line => { if (!certOut.write(line + '\n')) await once(certOut, 'drain'); };
  const practiceSet = new Set(v5Partition.practice);
  const valueOf = new Map(); // key -> value (null = unknown), for practice and test moves
  const v5Ucis = new Map(); // practice id -> moves certified in v5
  const copiedCerts = new Map();
  let headerSeen = false;
  for await (const line of createInterface({ input: createReadStream(`${config.paths.v5Run}/certificates.jsonl`), crlfDelay: Infinity })) {
    if (!line.trim()) continue;
    const c = JSON.parse(line);
    if (c.kind === 'verifier') {
      assert(!headerSeen, 'v5 certificates have two headers');
      assert.deepEqual(c.sources, verifierNow, 'Verifier sources differ from the v5 certificate header');
      headerSeen = true;
      await putCert(line);
    } else if (practiceSet.has(c.id)) {
      assert(headerSeen, 'v5 certificate header must come first');
      await putCert(line);
      valueOf.set(keyOf(c.id, c.uci), c.value);
      copiedCerts.set(keyOf(c.id, c.uci), { category: c.category, value: c.value, certificateSha256: c.certificateSha256 });
      if (!v5Ucis.has(c.id)) v5Ucis.set(c.id, []);
      v5Ucis.get(c.id).push(c.uci);
    }
  }
  for (const id of v5Partition.practice) {
    assert.deepEqual([...(v5Ucis.get(id) ?? [])].sort(), legal.get(id), `v5 certificates differ from the legal moves at ${id}`);
  }
  for (const id of [...testCerts.keys()].sort()) {
    for (const uci of [...testCerts.get(id).keys()].sort()) {
      const c = testCerts.get(id).get(uci);
      await putCert(JSON.stringify({ id, uci, category: c.category, value: c.value, status: c.status, proof: c.proof, certificateSha256: c.certificateSha256 }));
      valueOf.set(keyOf(id, uci), c.value);
    }
  }
  certOut.end();
  await finished(certOut);
  // Proofs are on disk now. The in-memory copy keeps the value and the category only (256 MiB JS heap limit).
  for (const perMove of testCerts.values()) for (const c of perMove.values()) c.proof = null;

  // Recheck the copied practice certificates before any ledger or brain pass. The v8 ledgers are built from the rechecked certificates (v8 proposal section 1).
  const practiceCerts = certifyPositions(practiceP);
  for (const [id, perMove] of practiceCerts) {
    for (const [uci, c] of perMove) {
      const copied = copiedCerts.get(keyOf(id, uci));
      assert(copied, `No copied certificate for ${id} ${uci}`);
      assert.equal(c.category, copied.category, `Checked category differs from the copied line at ${id} ${uci}`);
      assert.equal(c.value, copied.value, `Checked value differs from the copied line at ${id} ${uci}`);
      assert.equal(c.certificateSha256, copied.certificateSha256, `Checked hash differs from the copied line at ${id} ${uci}`);
    }
  }
  const ledgers = {};
  for (const seed of SEEDS) {
    const ledger = captureLedger({ practice: v5Partition.practice, capturesOf: id => [...practiceCaptures.get(id)], certificateOf: (id, uci) => practiceCerts.get(id)?.get(uci), seed });
    const text = ledger.map(slot => JSON.stringify(slot) + '\n').join('');
    writeAtomic(`${out}/ledger-${seed}.jsonl`, text);
    const permutationSha256 = atomicJson(`${out}/permutation-capture-${seed}.json`, permuteCaptureValues(ledger, () => true, seed));
    ledgers[seed] = { slots: ledger.length, ledgerSha256: sha(text), permutationSha256 };
  }
  writeManifest({ ledgers });
  for (const perMove of practiceCerts.values()) for (const c of perMove.values()) c.proof = null;

  // Candidate counts (v7 section 1). captureCandidates throws unless every test position has a safe and an unsafe capture, which stops the run before any brain pass.
  const categoryOfTest = (id, uci) => testCerts.get(id).get(uci).category;
  const candidateTotals = { candidates: 0, unknownShare: 0 };
  for (const p of newTestP) {
    const id = positionId(p);
    const board = testBoards.get(id);
    const captures = capturesOf(board);
    candidateTotals.candidates += captureCandidates(board, legal.get(id), categoryOfTest, id).length;
    // Safe and unsafe candidates exist after captureCandidates returns, so captures.size > 0.
    candidateTotals.unknownShare += [...captures].filter(uci => categoryOfTest(id, uci) === 'unknown').length / captures.size;
  }
  testBoards.clear();

  // Step 9: input collisions over every legal practice and test move. A +1 and a -1 sharing one eye input stop the run.
  guard();
  const retina = loadRetina('.cache/full.npz'), eyes = createEyesV2(retina);
  const items = [];
  for (const p of [...practiceP, ...newTestP]) {
    const id = positionId(p);
    for (const uci of legal.get(id)) items.push({ fen: p.fen, action: uci, answer: valueOf.get(keyOf(id, uci)) ?? 'unknown' });
  }
  const collisions = classifyCollisions(inputCollisions(eyes, items), items);
  atomicJson(`${out}/collisions.json`, collisions);
  if (collisions.stop.length > 0) { writeSummary('input-validity failure', {}); return; }

  // Descriptive exposure of the v8 ledgers. They come from the rechecked certificates, so no gate is repeated here.
  const exposure = { full: {}, quarter: {} };
  for (const seed of SEEDS) {
    const ledger = readJsonl(`${out}/ledger-${seed}.jsonl`);
    exposure.full[seed] = positiveCount(ledger);
    exposure.quarter[seed] = positiveCount(ledger.slice(0, Math.floor(ledger.length / 4)));
  }

  // Step 10: brain passes for the new test keys only (plus blank). A key already in the v4 or v5 cache stops the run.
  const earlier = openRowsMany([config.paths.v4Run, config.paths.v5Run]);
  const earlierKeys = new Set(earlier.keys());
  for (const seed of SEEDS) {
    for (const slot of readJsonl(`${out}/ledger-${seed}.jsonl`)) {
      const key = keyOf(slot.id, slot.uci);
      assert(earlierKeys.has(key), `Practice key missing from the v4/v5 caches: ${key}`);
    }
  }
  const newList = [];
  for (const p of newTestP) {
    const id = positionId(p);
    for (const uci of legal.get(id)) {
      const key = keyOf(id, uci);
      assert(!earlierKeys.has(key), `Test key is already in the v4 or v5 cache: ${key}`);
      newList.push({ key, fen: p.fen, uci });
    }
  }
  const cache = await buildNewCache(newList, earlier.blank(), eyes);
  atomicJson(`${out}/keys.json`, { rows: ['blank', ...newList.map(k => k.key)] });
  atomicJson(`${out}/cache-schema.json`, {
    rows: newList.length + 1, columns: COLUMNS, dtype: 'float32', byteOrder: 'little',
    kcIndices: cache.kcIndices, kcRootIds: cache.kcRootIds, fileSha256: cache.cacheSha256, pins: config.pins,
  });
  writeManifest({ cacheSha256: cache.cacheSha256 });

  // Step 11: confirmation jobs (24): eight arms per seed. Raw and random arms carry their own key.
  const jobFor = (seed, arm) => ({ phase: 'confirm', key: SECONDARY.includes(arm) ? arm : KEY, direction: '-', seed, arm });
  const confirmJobs = SEEDS.flatMap(seed => ARMS.map(arm => jobFor(seed, arm)));
  const confOut = await runBatch('confirm', confirmJobs);
  const at = job => confOut.get(jobName(job));

  // Step 12: judge. Scores are aligned to test order; retention compares the quarter store with the full store on the same probes.
  const perSeed = SEEDS.map(seed => {
    const scoresOf = arm => at(jobFor(seed, arm)).scores;
    for (const arm of GATE_ARMS) assert.deepEqual(scoresOf(arm).map(s => s.id), freshTest, `Scores are not in test order (${arm})`);
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
  const verdict = judgeV8(perSeed, { games: newTestP.map(p => p.gameId), n: freshTest.length });
  // Descriptive only: expected-score totals over the candidate set for each store size.
  const curves = SEEDS.map(seed => ({
    seed,
    eighth: at(jobFor(seed, 'eighth')).expectedTotal,
    quarter: at(jobFor(seed, 'quarter')).expectedTotal,
    half: at(jobFor(seed, 'half')).expectedTotal,
    full: at(jobFor(seed, 'full')).expectedTotal,
  }));
  // Descriptive only: the piece-value reference is computed by the none jobs and does not depend on the seed.
  const pieceValues = SEEDS.map(seed => at(jobFor(seed, 'none')).pieceValue);
  assert(pieceValues.every(v => v === pieceValues[0]), 'The piece-value reference differs between seeds');
  // Store counts per seed (v8 proposal section 2). The none arm has no store: its output carries counts null, so it is left out and no included count is null.
  const storeCounts = Object.fromEntries(SEEDS.map(seed => [seed, Object.fromEntries(ARMS.map(arm => [arm, at(jobFor(seed, arm)).counts]).filter(([, counts]) => counts !== null))]));
  writeSummary(verdict.outcome, {
    selectedKey: KEY, verdict, positives: exposure, margin: verdict.rule.margin, excluded: testSet.excluded,
    candidateCounts: {
      positions: freshTest.length, mean: candidateTotals.candidates / freshTest.length, unknownCaptureShareMean: candidateTotals.unknownShare / freshTest.length,
    },
    pieceValueTotal: pieceValues[0],
    allLegal: SEEDS.map(seed => ({ seed, full: at(jobFor(seed, 'full')).allLegalScores, none: at(jobFor(seed, 'none')).allLegalScores })),
    retention: perSeed.map(s => ({ seed: s.seed, ...s.retention })), curves, storeCounts, jobs: confirmJobs,
  });
}

try {
  await run();
  writeManifest({ status: 'complete', endedAt: new Date().toISOString(), exitStatus: 0 });
} catch (error) {
  writeManifest({ status: 'failed', endedAt: new Date().toISOString(), exitStatus: 1, error: error.message });
  throw error;
}
