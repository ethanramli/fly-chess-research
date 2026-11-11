#!/usr/bin/env node
// Fly connections memory v1 runner: one registered run. Checks every pin, runs each (seed, arm) job in a worker process
// (at most `workers` at once, no retries), copies finished jobs on --resume-from, computes the graph-free baselines per
// seed in this process, judges the run, and writes summary.json, the records index and the terminal manifest.
// Usage (repo root): node --max-old-space-size=256 .codebase/scripts/neural-learning/run-fly-connections-memory-v1.mjs --config REG [--cpu-duty 1] [--resume-from OLDRUN]
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { closeSync, copyFileSync, createReadStream, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { createEyesV2, loadRetina } from '../../src/chess-input/eyes-v2.mjs';
import { runStoreBaseline, uniformBaselines } from '../../src/neural-learning/fly-connections-baselines-v1.mjs';
import { judgeRun } from '../../src/neural-learning/fly-connections-judge-v1.mjs';

const WORKER = fileURLToPath(new URL('./fly-connections-memory-v1-worker.mjs', import.meta.url));
const STORE_KEYS = ['raw-pc', 'random-pc'];
const CHESS_GROUPS = ['A', 'B', 'testA', 'testB'];

const { values: args } = parseArgs({ options: { config: { type: 'string' }, 'cpu-duty': { type: 'string', default: '1' }, 'resume-from': { type: 'string' } } });
assert.equal(args['cpu-duty'], '1', 'cpu-duty must be 1');
assert(args.config, 'Missing --config');

const sha = data => createHash('sha256').update(data).digest('hex');
const fileSha = async path => { const h = createHash('sha256'); for await (const chunk of createReadStream(path)) h.update(chunk); return h.digest('hex'); };
const writeAtomic = (path, text) => { writeFileSync(`${path}.partial`, text); renameSync(`${path}.partial`, path); };
const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };

// Byte copy of a job directory; every copied file's SHA-256 is compared with its source.
function copyTree(src, dst, prefix = '') {
  mkdirSync(dst, { recursive: true });
  return readdirSync(src, { withFileTypes: true }).flatMap(entry => {
    const from = join(src, entry.name), to = join(dst, entry.name), name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return copyTree(from, to, `${name}/`);
    copyFileSync(from, to);
    const expected = sha(readFileSync(from));
    assert.equal(sha(readFileSync(to)), expected, `Copy differs from its source: ${name}`);
    return [{ file: name, sha256: expected }];
  });
}

const registration = readFileSync(args.config);
const config = JSON.parse(registration.toString('utf8').replace(/^﻿/, ''));
assert.equal(config.paused, false, 'Refusing a registration that is paused or does not declare paused: false');
assert(Number.isSafeInteger(config.workers) && config.workers >= 1, 'workers must be a positive integer');
for (const [path, expected] of Object.entries(config.pins)) assert.equal(await fileSha(path), expected, `Changed input ${path}`);
const out = config.paths.run, jobsDir = join(out, 'jobs');
assert(!existsSync(out), 'Fresh output required');
mkdirSync(jobsDir, { recursive: true });

let manifest = { schema: 'fly-connections-memory-v1-run', status: 'running', pid: process.pid, argv: process.argv,
  registrationSha256: sha(registration), pins: config.pins, volume: config.volume, chapter: config.chapter,
  startedAt: new Date().toISOString(), endedAt: null, resumedFrom: null, jobs: [] };
const writeManifest = patch => { manifest = { ...manifest, ...patch }; writeAtomic(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n'); };
writeManifest({});

// Runner-process guard: every process stays within the registered RSS and free-memory limits.
function guard() {
  const rssMiB = process.memoryUsage().rss / 2 ** 20, freeMiB = os.freemem() / 2 ** 20;
  assert(rssMiB <= config.limits.rssMiB && freeMiB >= config.limits.freeMiB,
    `Runner resource guard: ${rssMiB.toFixed(0)} MiB RSS, ${freeMiB.toFixed(0)} MiB free`);
}

const jobs = config.seeds.flatMap(seed => config.arms.map(arm => ({ seed, arm, name: `${seed}-${arm}`, exitCode: null, status: 'queued' })));
const jobList = () => jobs.map(({ seed, arm, name, exitCode, status }) => ({ seed, arm, name, exitCode, status }));
const anyFailed = () => jobs.some(job => job.status === 'failed');

// Launcher: at most config.workers worker processes. A nonzero exit starts no new worker; running ones are waited for.
function startWorker(job) {
  const dir = join(jobsDir, job.name);
  mkdirSync(dir, { recursive: true });
  const stdout = openSync(join(dir, 'stdout.txt'), 'a'), stderr = openSync(join(dir, 'stderr.txt'), 'a');
  const child = spawn(process.execPath, ['--max-old-space-size=256', WORKER, '--config', args.config, '--seed', String(job.seed), '--arm', job.arm, '--dir', dir],
    { stdio: ['ignore', stdout, stderr] });
  closeSync(stdout);
  closeSync(stderr);
  job.status = 'running';
  const done = new Promise(resolve => {
    child.once('error', () => resolve({ job, code: -1 }));
    child.once('exit', code => resolve({ job, code }));
  });
  return { job, child, done };
}

async function runWorkers(queue) {
  const active = [];
  try {
    while (active.length > 0 || (!anyFailed() && queue.length > 0)) {
      guard();
      while (!anyFailed() && queue.length > 0 && active.length < config.workers) active.push(startWorker(queue.shift()));
      const { job, code } = await Promise.race(active.map(w => w.done));
      active.splice(active.findIndex(w => w.job === job), 1);
      job.exitCode = code;
      job.status = code === 0 ? 'complete' : 'failed';
      writeManifest({ jobs: jobList() });
    }
  } catch (error) {
    for (const w of active) w.child.kill();
    throw error;
  }
  for (const job of queue) job.status = 'not-started';
  if (anyFailed()) throw Error(`Worker failed; exit codes: ${jobs.map(j => `${j.name}=${j.exitCode}`).join(' ')}`);
}

// Resume: finished jobs are copied byte for byte; unfinished job directories are copied so their worker resumes from state.json.
const resumedFrom = { run: null, finished: [], unfinished: [] };
const queue = [];

try {
  if (args['resume-from']) {
    const old = args['resume-from'];
    const oldManifest = JSON.parse(readFileSync(join(old, 'manifest.json'), 'utf8'));
    assert.equal(oldManifest.registrationSha256, manifest.registrationSha256, 'Resume: the registration differs from the old run');
    assert.notEqual(oldManifest.status, 'complete', 'Resume: the old run is complete');
    assert(!(oldManifest.status === 'running' && alive(oldManifest.pid)), 'Resume: the old run still has a live process');
    resumedFrom.run = old;
  }
  for (const job of jobs) {
    const from = args['resume-from'] ? join(args['resume-from'], 'jobs', job.name) : null;
    if (from && existsSync(join(from, 'result.json'))) {
      resumedFrom.finished.push({ job: job.name, files: copyTree(from, join(jobsDir, job.name)) });
      job.status = 'copied';
    } else {
      if (from && existsSync(from)) resumedFrom.unfinished.push({ job: job.name, files: copyTree(from, join(jobsDir, job.name)) });
      queue.push(job);
    }
  }
  writeManifest({ resumedFrom: args['resume-from'] ? resumedFrom : null, jobs: jobList() });

  await runWorkers(queue);
  guard();

  // Baselines per seed (graph-free). baselines.perSeed[seed][storeKey][shuffled] = runStoreBaseline output; baselines.uniform[boardId] = uniformBaselines output.
  const retina = loadRetina(config.paths.graph), eyes = createEyesV2(retina);
  const boards = new Map();
  for (const line of readFileSync(join(config.paths.packet, 'boards.jsonl'), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    boards.set(record.boardId, record);
  }
  const evaluate = [...boards.values()].filter(r => CHESS_GROUPS.includes(r.group)).map(r => r.boardId);
  const packet = JSON.parse(readFileSync(join(config.paths.packet, 'packet.json'), 'utf8'));
  const tapes = new Map();
  for (const seed of config.seeds) {
    const tape = JSON.parse(readFileSync(join(config.paths.packet, 'tapes', `${seed}.json`), 'utf8'));
    assert.equal(tape.sha256, packet.tapes[seed]?.sha256, `Tape ${seed} differs from packet.json`);
    tapes.set(seed, tape);
  }
  const perSeed = {};
  for (const seed of config.seeds) {
    perSeed[seed] = Object.fromEntries(STORE_KEYS.map(key => [key, Object.fromEntries([false, true].map(shuffled => [shuffled,
      runStoreBaseline({ key, records: boards, tape: tapes.get(seed), eyes, retinaIdx: retina.retina_idx, evaluate, shuffled })]))]));
  }
  const uniform = Object.fromEntries(evaluate.map(id => [id, uniformBaselines(boards.get(id))]));
  const baselines = { perSeed, uniform };
  guard();

  const judged = await judgeRun({ runDir: out, registration: config, records: boards, tapes, baselines });
  writeAtomic(join(out, 'summary.json'), JSON.stringify({ schema: 'fly-connections-memory-v1-summary', perSeed: judged.perSeed,
    baselines, verdict: judged.verdict, pass: judged.pass }, null, 2) + '\n');
  writeAtomic(join(out, 'records.jsonl'), jobs.map(job => JSON.stringify({ seed: job.seed, arm: job.arm,
    resultSha256: sha(readFileSync(join(jobsDir, job.name, 'result.json'))) }) + '\n').join(''));
  writeManifest({ status: 'complete', endedAt: new Date().toISOString(), verdict: judged.verdict, pass: judged.pass,
    runnerPeakRssMiB: process.resourceUsage().maxRSS / 1024, jobs: jobList() });
} catch (error) {
  writeManifest({ status: 'failed', endedAt: new Date().toISOString(), error: error.message, jobs: jobList() });
  throw error;
}
