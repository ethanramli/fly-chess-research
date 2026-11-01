// Bounded recording/replay of the unchanged predeclared development cell. No graph data or held-out fixtures.
import { createHash } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync, statSync, writeFileSync } from 'node:fs';
import { StringDecoder } from 'node:string_decoder';
import { parseArgs, isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { SEEDS } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { register } from '../../src/neural-learning/memory-assay-rule-local-gated.mjs';
import { runCellSeed } from '../../src/neural-learning/memory-assay-recorded.mjs';
import { auditRecordedEvents } from '../../src/neural-learning/memory-assay-record-audit.mjs';
import { evaluateCell } from '../../src/neural-learning/memory-assay-gates.mjs';

register(registerRule);
const ROOT = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const PROFILE = { ruleName: 'local-gated-v1', seeds: SEEDS.dev, nKC: 200, s: 20,
  cell: { q: 0.25, relation: 'conflicting', w: 0, bg: 0 }, temperature: 0.1, danDip: 0 };
const SOURCES = ['.codebase/scripts/neural-learning/run-memory-assay-recorded.mjs',
  ...['memory-assay-recorded', 'memory-assay-record-audit', 'memory-assay-checker-v2', 'memory-assay-checker',
    'memory-assay-fixture', 'memory-assay-truth', 'memory-assay-adapters', 'memory-assay-gates',
    'memory-assay-rule-local-gated', 'local-gated-memory', 'reversal-memory', 'alpha-lobe-memory', 'mushroom-body']
    .map(n => `.codebase/src/neural-learning/${n}.mjs`)];
const clockStart = performance.now(), cpuStart = process.cpuUsage();
let openFd = null, reader = null, out = null, report = null, manifest = null, checkedLines = 0;
const json = (p, x) => writeFileSync(p, `${JSON.stringify(x, null, 2)}\n`);
function fileHash(file) {
  const h = createHash('sha256'), fd = openSync(file, 'r'), buffer = Buffer.alloc(65536);
  try { let count; while ((count = readSync(fd, buffer, 0, buffer.length, null)) > 0) h.update(buffer.subarray(0, count)); }
  finally { closeSync(fd); }
  return h.digest('hex');
}
function readLines(file) {
  const fd = openSync(file, 'r'), bytes = Buffer.alloc(65536), decoder = new StringDecoder('utf8');
  let pending = '', ended = false;
  return { close: () => closeSync(fd), next() {
    for (;;) {
      const split = pending.indexOf('\n');
      if (split >= 0) {
        const line = pending.slice(0, split); pending = pending.slice(split + 1);
        if (!line || line.length > 1048576) throw Error('Invalid/oversized evidence line');
        return JSON.parse(line);
      }
      if (ended) { if (pending.length) throw Error('Truncated evidence line'); return null; }
      const n = readSync(fd, bytes, 0, bytes.length, null);
      if (n) pending += decoder.write(bytes.subarray(0, n));
      else { pending += decoder.end(); ended = true; }
      if (pending.length > 1114112 && !pending.includes('\n')) throw Error('Oversized evidence line');
    }
  } };
}
function resources() {
  const cpu = process.cpuUsage(cpuStart);
  return { wallSeconds: (performance.now() - clockStart) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6,
    processHighWaterRssMiB: process.resourceUsage().maxRSS / 1024 };
}

try {
  const { values: args } = parseArgs({ options: { mode: { type: 'string' }, out: { type: 'string' }, report: { type: 'string' },
    run: { type: 'string' }, registration: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
  const duty = Number(args['cpu-duty']);
  if (!['run', 'audit'].includes(args.mode) || !args.out || !args.report || !args.registration
    || !(duty > 0 && duty <= 1) || (args.mode === 'audit' && !args.run)) throw Error('Require --mode run|audit --out FRESH --report FRESH --registration CONFIG [--run ORIGINAL] [--cpu-duty 0.5]');
  out = path.resolve(args.out); report = path.resolve(args.report);
  if (out === report || existsSync(out) || existsSync(report)) throw Error('Refusing existing/equal output or report directory');
  mkdirSync(out, { recursive: true }); mkdirSync(report, { recursive: true });
  const guard = () => {
    if (process.memoryUsage().rss > 2048 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Resource guard: RSS/free memory');
    if (performance.now() - clockStart > 300000) throw Error('Resource guard: 300-second wall limit');
  };
  let chunkStart = performance.now();
  const pace = () => {
    guard();
    const restMs = (performance.now() - chunkStart) * (1 - duty) / duty;
    // ponytail: synchronous bounded work, so a short main-thread wait avoids an async trajectory rewrite.
    if (restMs > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, restMs);
    guard(); chunkStart = performance.now();
  };
  guard();
  manifest = { schema: 'memory-assay-recorded-run-v2', mode: args.mode, status: 'running', argv: process.argv,
    node: process.version, started: new Date().toISOString(), profile: PROFILE, cpuDuty: duty,
    limits: { rssMiB: 2048, freeMiB: 256, wallSeconds: 300 },
    registration: { path: path.resolve(args.registration), sha256: fileHash(args.registration) }, sources: {} };
  for (const file of SOURCES) {
    const actual = path.join(ROOT, file), snapshot = path.join(out, 'source', file);
    mkdirSync(path.dirname(snapshot), { recursive: true }); copyFileSync(actual, snapshot);
    const sha256 = fileHash(actual);
    if (fileHash(snapshot) !== sha256) throw Error(`Source changed during snapshot: ${file}`);
    manifest.sources[file] = sha256;
  }
  copyFileSync(args.registration, path.join(out, 'registration.json'));
  if (fileHash(path.join(out, 'registration.json')) !== manifest.registration.sha256) throw Error('Registration changed during snapshot');
  json(path.join(out, 'manifest.json'), manifest);
  let result;
  if (args.mode === 'run') {
    const events = path.join(out, 'events.jsonl'); openFd = openSync(events, 'wx');
    const summaries = [];
    for (const seed of PROFILE.seeds) {
      summaries.push(...runCellSeed({ ...PROFILE, seed, writeRecord: row => {
        writeFileSync(openFd, `${JSON.stringify(row)}\n`);
        if (++checkedLines % 256 === 0) guard();
      } }));
      pace();
    }
    closeSync(openFd); openFd = null;
    const summariesFile = path.join(out, 'summaries.jsonl');
    writeFileSync(summariesFile, summaries.map(s => JSON.stringify(s)).join('\n') + '\n', { flag: 'wx' });
    manifest.records = { path: 'events.jsonl', sha256: fileHash(events), bytes: statSync(events).size, lines: checkedLines };
    manifest.summaries = { path: 'summaries.jsonl', sha256: fileHash(summariesFile) };
    result = { status: 'recorded', trajectories: summaries.length, trialRecords: checkedLines,
      evaluation: evaluateCell(summaries), scope: 'Unchanged development learning with streamed evidence; recording is not a memory repair.' };
  } else {
    const run = path.resolve(args.run), original = JSON.parse(readFileSync(path.join(run, 'manifest.json'), 'utf8'));
    if (original.schema !== manifest.schema || original.mode !== 'run' || original.status !== 'complete'
      || !isDeepStrictEqual(original.profile, PROFILE)) throw Error('Original run is incomplete or profile differs');
    if (fileHash(path.join(run, 'registration.json')) !== original.registration?.sha256) throw Error('Registration snapshot identity mismatch');
    if (!isDeepStrictEqual(Object.keys(original.sources).sort(), SOURCES.slice().sort())) throw Error('Original source coverage differs');
    for (const [file, hash] of Object.entries(original.sources)) {
      if (fileHash(path.join(ROOT, file)) !== hash || fileHash(path.join(run, 'source', file)) !== hash) throw Error(`Source identity mismatch: ${file}`);
    }
    if (original.records?.path !== 'events.jsonl' || original.summaries?.path !== 'summaries.jsonl') throw Error('Invalid original evidence paths');
    const eventFile = path.join(run, 'events.jsonl'), summariesFile = path.join(run, 'summaries.jsonl');
    if (fileHash(eventFile) !== original.records.sha256 || fileHash(summariesFile) !== original.summaries.sha256) throw Error('Evidence file hash mismatch');
    reader = readLines(eventFile);
    const audit = auditRecordedEvents(() => { const row = reader.next(); if (++checkedLines % 256 === 0) guard(); return row; }, PROFILE, { onTrajectory: pace });
    reader.close(); reader = readLines(summariesFile);
    for (const summary of audit.summaries) if (!isDeepStrictEqual(reader.next(), summary)) throw Error('Published summary mismatch');
    if (reader.next() !== null) throw Error('Extra published summary');
    reader.close(); reader = null;
    if (audit.checkedRecords !== original.records.lines) throw Error('Record count mismatch');
    const { summaries, ...counts } = audit;
    result = { status: 'passed', ...counts, evaluation: evaluateCell(summaries) };
    manifest.originalRun = { path: run, manifestSha256: fileHash(path.join(run, 'manifest.json')), recordsSha256: original.records.sha256 };
  }
  guard();
  for (const [file, hash] of Object.entries(manifest.sources)) if (fileHash(path.join(ROOT, file)) !== hash) throw Error(`Source changed during execution: ${file}`);
  Object.assign(manifest, { status: 'complete', ended: new Date().toISOString(), ...resources() });
  json(path.join(out, 'result.json'), result); json(path.join(report, 'result.json'), result);
  json(path.join(report, 'manifest.json'), manifest);
  json(path.join(out, 'manifest.json'), manifest); // publish terminal status after result artifacts
  process.stdout.write(`${JSON.stringify({ mode: args.mode, status: result.status, trajectories: result.trajectories,
    checkedTrials: result.checkedTrials, records: result.trialRecords ?? result.checkedRecords, ...resources() })}\n`);
} catch (error) {
  if (openFd !== null) closeSync(openFd);
  if (reader) reader.close();
  // Refused pre-existing output is never rewritten. A newly created output preserves its terminal failure.
  if (manifest && out && report) {
    const failure = { ...manifest, status: 'failed', error: error.message, ended: new Date().toISOString(), ...resources() };
    json(path.join(out, 'manifest.json'), failure); json(path.join(report, 'manifest.json'), failure);
  }
  process.stderr.write(`${JSON.stringify({ status: 'failed', error: error.message })}\n`); process.exitCode = 1;
}
