// Memory-assay runner (assay spec section 6). Records stream to --out; compact results go to --report.
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { createGzip } from 'node:zlib';
import { SEEDS, gridCells, buildFixture, buildConflictSchedule } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { TEMPERATURE, runCellSeed, runConflict } from '../../src/neural-learning/memory-assay-run.mjs';
import { RULES, registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { evaluateCell, summarizeGrid, validityCheck } from '../../src/neural-learning/memory-assay-gates.mjs';

const USAGE = 'Usage: node --max-old-space-size=256 .codebase/scripts/neural-learning/run-memory-assay.mjs --mode validity|grid --rule NAME --seeds dev|h1|h2 --out DIR --report DIR [--cpu-duty 0.5] [--temperature X] [--dan-dip=X] [--import PATH_TO_RULE_MODULE]';
const MiB = 2 ** 20, RSS_LIMIT = 2048 * MiB, FREE_MIN = 256 * MiB;
const VALID_CELL = { q: 0, relation: 'congruent', w: 0, bg: 0 };
const VALIDITY_RULES = ['ReversalMemory', 'AlphaLobeMemory', 'SeparateTable'];
const SRC = new URL('../../src/neural-learning/', import.meta.url);
const SELF = new URL(import.meta.url);
const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const die = (code, message) => { process.stderr.write(`${message}\n`); process.exit(code); };

let args;
try {
  ({ values: args } = parseArgs({ options: {
    mode: { type: 'string' }, rule: { type: 'string' }, seeds: { type: 'string' }, out: { type: 'string' }, report: { type: 'string' },
    'cpu-duty': { type: 'string', default: '0.5' }, temperature: { type: 'string', default: String(TEMPERATURE) },
    'dan-dip': { type: 'string', default: '0' }, import: { type: 'string' }, help: { type: 'boolean' },
  } }));
} catch (error) { die(2, `${error.message}\n${USAGE}`); }
if (args.help) { process.stdout.write(`${USAGE}\n`); process.exit(0); }
if (!['validity', 'grid'].includes(args.mode)) die(2, `--mode must be validity or grid\n${USAGE}`);
if (!Object.hasOwn(SEEDS, args.seeds)) die(2, `--seeds must be dev, h1 or h2\n${USAGE}`);
if (!args.out || !args.report) die(2, `--out and --report are required\n${USAGE}`);
if (args.mode === 'validity' && (args.rule !== undefined || args.seeds !== 'dev')) die(2, 'validity runs fixed rules on dev seeds: omit --rule and use --seeds dev');
if (args.mode === 'grid' && args.rule === undefined) die(2, '--rule is required for grid');
const duty = Number(args['cpu-duty']), temperature = Number(args.temperature), danDip = Number(args['dan-dip']);
if (!(duty > 0 && duty <= 1)) die(2, '--cpu-duty must be in (0, 1]');
if (!(temperature > 0 && Number.isFinite(temperature))) die(2, '--temperature must be a positive number');
if (!Number.isFinite(danDip)) die(2, '--dan-dip must be a number');

let imported = null;
if (args.import !== undefined) {
  const file = path.resolve(args.import), mod = await import(pathToFileURL(file).href);
  if (typeof mod.register !== 'function') die(2, '--import module must export register(registerRule)');
  mod.register(registerRule);
  imported = { path: file, sha256: sha256(readFileSync(file)) };
}
if (args.mode === 'grid' && !Object.hasOwn(RULES, args.rule)) die(2, `Unknown rule ${args.rule}`);

const outDir = path.resolve(args.out), reportDir = path.resolve(args.report);
if (existsSync(outDir)) die(2, `Refusing to write: --out ${outDir} already exists`);
for (const f of ['summary.json', 'validity.json']) if (existsSync(path.join(reportDir, f))) die(2, `Refusing to overwrite ${path.join(reportDir, f)}`);
mkdirSync(outDir, { recursive: true });
mkdirSync(reportDir, { recursive: true });

const seeds = SEEDS[args.seeds], big = args.seeds === 'h2', nKC = big ? 400 : 200, s = big ? 40 : 20;
function sourceHashes() {
  const names = readdirSync(SRC).filter(f => f.startsWith('memory-assay-') && f.endsWith('.mjs')).concat('reversal-memory.mjs', 'alpha-lobe-memory.mjs');
  const out = Object.fromEntries(names.map(f => [`src/neural-learning/${f}`, sha256(readFileSync(new URL(f, SRC)))]));
  out['scripts/neural-learning/run-memory-assay.mjs'] = sha256(readFileSync(SELF));
  if (imported) out[imported.path] = imported.sha256;
  return out;
}
const t0 = performance.now();
let peakRss = process.memoryUsage().rss;
const runInfo = { argv: process.argv, node: process.version, mode: args.mode, rule: args.rule ?? null, seeds: args.seeds, nKC, s,
  temperature, danDip, cpuDuty: duty, started: new Date().toISOString(), import: imported?.path ?? null, sources: sourceHashes(), status: 'running' };
const writeRun = patch => writeFileSync(path.join(outDir, 'run.json'), `${JSON.stringify({ ...runInfo, ...patch }, null, 2)}\n`);

const gz = createGzip(), recordFile = createWriteStream(path.join(outDir, 'records.jsonl.gz'));
gz.pipe(recordFile);
async function writeRows(rows) {
  for (const row of rows) if (!gz.write(`${JSON.stringify(row)}\n`)) await once(gz, 'drain');
}
async function closeRecords() {
  gz.end();
  await once(recordFile, 'close');
}
async function stop(message) {
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  await closeRecords();
  writeRun({ status: `stopped: ${message}`, ended: new Date().toISOString(), peakRssMiB: peakRss / MiB });
  die(3, `Memory guard: ${message}`);
}
async function guard() {
  const rss = process.memoryUsage().rss;
  peakRss = Math.max(peakRss, rss);
  if (rss > RSS_LIMIT) await stop(`RSS ${(rss / MiB).toFixed(0)} MiB is above 2048 MiB`);
  if (os.freemem() < FREE_MIN) await stop(`free system memory ${(os.freemem() / MiB).toFixed(0)} MiB is below 256 MiB`);
}

const evals = [], kept = { ReversalMemory: [], AlphaLobeMemory: [], SeparateTable: [], conflict: [] };
const seedRuns = (ruleName, cell, extra = {}) => seeds.flatMap(seed => runCellSeed({ ruleName, cell, seed, nKC, s, temperature, danDip, ...extra }));
const units = args.mode === 'grid'
  ? gridCells().map(cell => ({ rows: () => seedRuns(args.rule, cell), keep: recs => { evals.push(evaluateCell(recs)); } }))
  : [
    ...['ReversalMemory', 'AlphaLobeMemory'].map(rule => ({ rows: () => seedRuns(rule, VALID_CELL, { captureGains: true }), keep: recs => kept[rule].push(...recs) })),
    ...gridCells().map(cell => ({ rows: () => seedRuns('SeparateTable', cell), keep: recs => kept.SeparateTable.push(...recs) })),
    ...VALIDITY_RULES.map(rule => ({
      rows: () => seeds.map(seed => runConflict({ ruleName: rule, fixture: buildFixture({ seed, nKC, s, ...VALID_CELL }), schedule: buildConflictSchedule({ seed }), temperature })),
      keep: rows => kept.conflict.push(...rows),
    })),
  ];

writeRun({});
let done = 0, lastDecile = 0;
for (const unit of units) {
  const u0 = performance.now();
  const rows = unit.rows();
  await writeRows(rows);
  unit.keep(rows);
  const elapsed = (performance.now() - u0) / 1000;
  await guard();
  await sleep(elapsed * (1 - duty) / duty * 1000);
  done++;
  const decile = Math.floor(done * 10 / units.length);
  if (decile > lastDecile) {
    lastDecile = decile;
    process.stdout.write(`${JSON.stringify({ progress: `${decile * 10}%`, done, total: units.length })}\n`);
  }
}

await closeRecords();
let summary, verdict;
if (args.mode === 'grid') {
  summary = { mode: 'grid', rule: args.rule, seeds: args.seeds, ...summarizeGrid(evals) };
  verdict = { gatedCells: summary.gatedCells, gatedCellsPassingAll: summary.gatedCellsPassingAll };
} else {
  const result = validityCheck({ reversal: kept.ReversalMemory, alpha: kept.AlphaLobeMemory, control: kept.SeparateTable, conflict: kept.conflict });
  summary = { mode: 'validity', seeds: args.seeds, valid: result.valid, checks: result.checks };
  writeFileSync(path.join(reportDir, 'validity.json'), `${JSON.stringify(result, null, 2)}\n`);
  verdict = result.valid ? 'valid' : 'invalid';
}
writeFileSync(path.join(reportDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
peakRss = Math.max(peakRss, process.memoryUsage().rss);
writeRun({ status: 'complete', ended: new Date().toISOString(), wallSeconds: (performance.now() - t0) / 1000, peakRssMiB: peakRss / MiB });
process.stdout.write(`${JSON.stringify({ done: true, out: outDir, report: reportDir, verdict })}\n`);
