// Engineered memory v6 worker (2026-11-05): one confirmation job builds one frozen store from the v6 run folder and scores the new test positions. Reads files only: cache rows come through openRowsMany and no brain runs. Design: documentation/design/neural-learning/memory-v6-proposal-2026-11-05.md; the run folder keeps the v5 layout (memory-v5-file-formats.md).
import assert from 'node:assert/strict';
import { createReadStream, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { makeRandomExpansion } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import { COLUMNS, openRowsMany } from '../../src/neural-learning/memory-v6-data.mjs';
import { buildStore, calibrationKeys, fitPipeline, retention, scorePositions, transformFor } from '../../src/neural-learning/engineered-memory-task-v5.mjs';
import { positionId, replayPosition } from '../../src/neural-learning/engineered-memory-v4-ledger.mjs';

const CAPACITY = 4096;
const SCORE_CHUNK = 10;
const RANDOM = { fanIn: 6, seed: 20261103, keep: 0.05 };
const SHARE = { quarter: 4, half: 2, eighth: 8 }; // arm -> the ledger is cut to 1/share of its slots

const stripBom = text => text.replace(/^﻿/, '');
const readJson = path => JSON.parse(stripBom(readFileSync(path, 'utf8')));
const readJsonl = path => stripBom(readFileSync(path, 'utf8')).split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
const writeAtomic = (path, text) => { writeFileSync(path + '.partial', text); renameSync(path + '.partial', path); };
async function readLedger(dir, seed) {
  const rows = [];
  for await (const line of createInterface({ input: createReadStream(`${dir}/ledger-${seed}.jsonl`), crlfDelay: Infinity })) if (line.trim()) rows.push(JSON.parse(line));
  return rows;
}
// Shuffled outcomes laid over the known slots of the ledger, in slot order. Unknown slots stay null.
function expandPermutation(ledger, permuted) {
  let j = 0;
  const values = ledger.map(slot => (slot.value === null ? null : permuted[j++]));
  assert.equal(j, permuted.length, 'Permutation length differs from the known slots');
  return values;
}

const { values: args } = parseArgs({ options: { run: { type: 'string' }, job: { type: 'string' }, config: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
const cpuDuty = Number(args['cpu-duty']);
assert([0.5, 0.75, 1].includes(cpuDuty), 'cpu-duty must be 0.5, 0.75 or 1');
assert(args.run && args.job && args.config, 'Missing --run, --job or --config');
const dir = args.run;
const job = JSON.parse(args.job);
assert.equal(job.phase, 'confirm', 'v6 runs confirmation jobs only');
const name = `${job.phase}-${job.key}-${job.direction}-${job.seed}-${job.arm}`;
const config = readJson(args.config);

// Resource guard and pacing as in the v5 worker.
const started = performance.now(), cpuStarted = process.cpuUsage(), sleep = new Int32Array(new SharedArrayBuffer(4));
let peakRssMiB = 0, applied = 0;
function guard() {
  const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
  peakRssMiB = Math.max(peakRssMiB, rssMiB);
  assert(rssMiB <= 1536 && freeMiB >= 1024, 'Worker resource guard');
}
function pace() {
  const cpu = process.cpuUsage(cpuStarted);
  let delay = (1 / cpuDuty) * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  while (delay > 0) {
    Atomics.wait(sleep, 0, 0, Math.min(delay, 100));
    delay = (1 / cpuDuty) * (cpu.user + cpu.system) / 1000 - (performance.now() - started);
  }
}
// Every cache read is paced; the guard runs every 100 reads, about every 10 positions.
const paced = fn => (id, uci) => { if (++applied % 100 === 0) guard(); pace(); return fn(id, uci); };

guard();
const partition = readJson(`${dir}/partition.json`);
const { row, blank } = openRowsMany([config.paths.v4Run, config.paths.v5Run, dir]);

// Certificate categories for every legal move of the practice and test positions. ponytail: certificates.jsonl is rescanned per job; cache per process only if a benchmark says so.
const category = new Map(), certUcis = new Map();
for await (const line of createInterface({ input: createReadStream(`${dir}/certificates.jsonl`), crlfDelay: Infinity })) {
  if (!line.trim()) continue;
  const c = JSON.parse(line);
  if (c.kind === 'verifier') continue;
  category.set(`${c.id}|${c.uci}`, c.category);
  if (!certUcis.has(c.id)) certUcis.set(c.id, []);
  certUcis.get(c.id).push(c.uci);
}
const categoryOf = (id, uci) => {
  const c = category.get(`${id}|${uci}`);
  assert(c !== undefined, `No certificate for ${id} ${uci}`);
  return c;
};

const byId = new Map([...readJsonl(config.paths.positionsAll), ...readJsonl(config.paths.positionsNew)].map(p => [positionId(p), p]));
const legalCache = new Map();
function legalOf(id) {
  if (!legalCache.has(id)) {
    const p = byId.get(id);
    assert(p, `Unknown position ${id}`);
    const legal = replayPosition(p).legal;
    assert.deepEqual(legal, [...(certUcis.get(id) ?? [])].sort(), `Certificates differ from the legal moves at ${id}`);
    legalCache.set(id, legal);
  }
  return legalCache.get(id);
}

// Raw and random features as in the v4 runner. transformFor passes keys as `${id}|${uci}`. Loaded only when a raw or random arm asks.
let eyes = null, retinaIdx = null, expand = null;
function rawOf(key) {
  if (eyes === null) {
    const retina = loadRetina('.cache/full.npz');
    eyes = createEyesV2(retina);
    retinaIdx = retina.retina_idx;
    expand = makeRandomExpansion({ inputs: retinaIdx.length, units: COLUMNS, fanIn: RANDOM.fanIn, seed: RANDOM.seed });
  }
  const i = key.lastIndexOf('|'), id = key.slice(0, i), uci = key.slice(i + 1);
  const m = new Map(Array.from(eyes.encode(byId.get(id).fen, uci).stimulation, x => [x.index, x.current]));
  return Float64Array.from(retinaIdx, idx => m.get(idx) ?? 0);
}
const randomOf = key => { const raw = rawOf(key); return expand(raw, RANDOM.keep); }; // rawOf creates expand on first use

const transform = transformFor(job.key, { row, blank, legalOf, rawOf, randomOf });
const ledger = await readLedger(dir, job.seed);
const n = ledger.length;
const slots = SHARE[job.arm] ? ledger.slice(0, Math.floor(n / SHARE[job.arm])) : ledger;
const values = job.arm === 'shuffled' ? expandPermutation(ledger, readJson(`${dir}/permutation-${job.seed}.json`).values) : slots.map(slot => slot.value);

const pipeline = fitPipeline(transform, calibrationKeys(partition.practice, legalOf));
const apply = paced(pipeline.apply);
let memory = null, counts = null;
if (job.arm !== 'none') ({ memory, counts } = buildStore({ slots, values, apply, capacity: CAPACITY, arm: job.arm }));
writeFileSync(`${dir}/jobs/${name}.steady`, '');

const positions = partition.freshTest.map(id => ({ id, moves: legalOf(id) }));
const scores = [];
for (let i = 0; i < positions.length; i += SCORE_CHUNK) {
  guard();
  scores.push(...scorePositions(memory, positions.slice(i, i + SCORE_CHUNK), apply, categoryOf));
}

// Retention probes: the known quarter-budget slots, in the same order in the quarter and full jobs.
let retained = null;
if (job.arm === 'quarter' || job.arm === 'full') {
  const probes = ledger.slice(0, Math.floor(n / 4)).filter(slot => slot.value !== null).map(slot => ({ vector: apply(slot.id, slot.uci), value: slot.value }));
  retained = { probes: probes.length, [job.arm === 'quarter' ? 'recalledQuarter' : 'recalledFull']: retention(memory, probes) };
}

writeAtomic(`${dir}/jobs/${name}.json`, JSON.stringify({
  job, scores, expectedTotal: scores.reduce((sum, s) => sum + s.expected, 0), counts,
  pipeline: { rmsSha256: pipeline.rmsSha256, zeroRmsFeatures: pipeline.zeroRmsFeatures },
  fingerprint: memory === null ? null : memory.fingerprint(),
  peakRssMiB: Math.max(peakRssMiB, process.resourceUsage().maxRSS / 1024),
  ...(retained === null ? {} : { retention: retained }),
}) + '\n');
