// Capacity-delay assay on seeds 3001-3012 (spec: research/reports/memory-retention-continuation-2026-10-31/capacity-delay-spec.md).
// Usage: node --max-old-space-size=256 .codebase/scripts/neural-learning/run-capacity-delay.mjs --out FRESH_DIR --report FRESH_DIR --cpu-duty 0.5
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { register as registerPredictionReservoir } from '../../src/neural-learning/memory-assay-rule-prediction-reservoir.mjs';
import { register as registerLocalReservoir } from '../../src/neural-learning/memory-assay-rule-local-reservoir.mjs';
import { register as registerLocalReservoirRate } from '../../src/neural-learning/memory-assay-rule-local-reservoir-rate.mjs';
import { register as registerLocalGated } from '../../src/neural-learning/memory-assay-rule-local-gated.mjs';
import { makePredictionRule } from '../../src/neural-learning/memory-assay-rule-prediction-scaled.mjs';
import { runCapacitySeed, evaluateCapacity } from '../../src/neural-learning/capacity-delay-assay.mjs';

registerPredictionReservoir(registerRule);
registerLocalReservoir(registerRule);
registerLocalReservoirRate(registerRule);
registerLocalGated(registerRule);
registerRule('prediction-gated-capacity', fixture => makePredictionRule('prediction-gated-capacity', fixture, { store: 'gated', eta: 2, V0: 1.2 }));

const ROOT = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const SPEC = 'research/reports/memory-retention-continuation-2026-10-31/capacity-delay-spec.md';
const SEEDS = Array.from({ length: 12 }, (_, i) => 3001 + i);
const RULES = ['prediction-reservoir-v1', 'local-reservoir-v1', 'local-reservoir-rate-v1', 'local-gated-v1', 'prediction-gated-capacity', 'SeparateTable'];
const CONTROL_RULE = 'prediction-reservoir-v1';
const SOURCES = ['.codebase/scripts/neural-learning/run-capacity-delay.mjs',
  ...['capacity-delay-assay', 'memory-assay-fixture', 'memory-assay-adapters', 'reversal-memory', 'alpha-lobe-memory', 'mushroom-body',
    'memory-assay-rule-prediction-scaled', 'memory-assay-rule-prediction-reservoir', 'memory-assay-rule-local-reservoir', 'memory-assay-rule-local-reservoir-rate',
    'memory-assay-rule-local-gated', 'local-reservoir-memory', 'local-gated-memory'].map(n => `.codebase/src/neural-learning/${n}.mjs`)];
const WALL_MS = 1800 * 1000, RSS_LIMIT = 2048 * 2 ** 20, FREE_MIN = 256 * 2 ** 20;
const clockStart = performance.now();
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const median = xs => { const a = [...xs].sort((p, q) => p - q), h = a.length >> 1; return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2; };

// Age = number of items learned after this one (0 = most recent).
function medianByAge(records) {
  const inf = records.filter(r => r.arm === 'informative'), N = inf[0].items;
  const at = test => Array.from({ length: N }, (_, j) => ({ age: N - 1 - j, item: j + 1,
    medianMNorm: median(inf.map(r => r.tests[test][j].mNorm)), greedyShare: inf.filter(r => r.tests[test][j].greedy).length / inf.length }))
    .sort((a, b) => a.age - b.age);
  return { T16: at(`T${N}`), D6400: at('D6400') };
}

let manifest = null, out = null, report = null;
try {
  const { values: args } = parseArgs({ options: { out: { type: 'string' }, report: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
  const duty = Number(args['cpu-duty']);
  if (!args.out || !args.report || !(duty > 0 && duty <= 1)) throw Error('Require --out FRESH_DIR --report FRESH_DIR [--cpu-duty 0.5]');
  out = path.resolve(args.out); report = path.resolve(args.report);
  if (out === report || existsSync(out) || existsSync(report)) throw Error('Refusing existing/equal output or report directory');
  mkdirSync(out, { recursive: true }); mkdirSync(report, { recursive: true });
  const guard = () => {
    if (process.memoryUsage().rss > RSS_LIMIT || os.freemem() < FREE_MIN) throw Error('Resource guard: RSS/free memory');
    if (performance.now() - clockStart > WALL_MS) throw Error('Resource guard: 1800-second wall limit');
  };
  guard();
  manifest = { schema: 'capacity-delay-assay-run-v1', status: 'running', argv: process.argv, node: process.version, started: new Date().toISOString(),
    seeds: SEEDS, rules: RULES, controlRule: CONTROL_RULE, cpuDuty: duty, limits: { rssMiB: 2048, freeMiB: 256, wallSeconds: 1800 },
    spec: { path: SPEC, sha256: sha256(path.join(ROOT, SPEC)) }, sources: Object.fromEntries(SOURCES.map(f => [f, sha256(path.join(ROOT, f))])) };
  writeJson(path.join(out, 'manifest.json'), manifest);
  const recordsFile = path.join(out, 'records.jsonl');
  writeFileSync(recordsFile, '', { flag: 'wx' });
  const byRule = {};
  let lines = 0;
  for (const ruleName of RULES) {
    const records = [];
    for (const seed of SEEDS) {
      guard();
      const busyStart = performance.now();
      for (const record of runCapacitySeed({ ruleName, seed, withControls: ruleName === CONTROL_RULE })) {
        appendFileSync(recordsFile, `${JSON.stringify(record)}\n`);
        records.push(record); lines++;
      }
      // ponytail: synchronous trials, so a bounded main-thread wait paces the duty cycle (as in the frozen runner).
      const restMs = (performance.now() - busyStart) * (1 - duty) / duty;
      if (restMs > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, restMs);
      guard();
    }
    const evaluation = evaluateCapacity(records);
    byRule[ruleName] = { evaluation, medianByAge: medianByAge(records) };
    const pass = Object.fromEntries(Object.entries(evaluation).map(([k, v]) => [k, v.pass]));
    process.stdout.write(`${JSON.stringify({ rule: ruleName, trajectories: records.length, pass, wallSeconds: Math.round((performance.now() - clockStart) / 1000) })}\n`);
  }
  const summary = { schema: 'capacity-delay-assay-summary-v1', rules: Object.fromEntries(Object.entries(byRule).map(([name, { evaluation }]) =>
    [name, Object.fromEntries(Object.entries(evaluation).map(([k, v]) => [k, v.pass]))])) };
  writeJson(path.join(out, 'summary.json'), summary);
  writeJson(path.join(report, 'report.json'), { schema: 'capacity-delay-assay-report-v1', spec: manifest.spec, rules: byRule });
  Object.assign(manifest, { status: 'complete', ended: new Date().toISOString(), wallSeconds: (performance.now() - clockStart) / 1000,
    records: { path: 'records.jsonl', lines, sha256: sha256(recordsFile) } });
  writeJson(path.join(out, 'manifest.json'), manifest);
} catch (error) {
  if (manifest && out) writeJson(path.join(out, 'manifest.json'), { ...manifest, status: 'failed', error: error.message, ended: new Date().toISOString() });
  process.stderr.write(`${JSON.stringify({ status: 'failed', error: error.message })}\n`);
  process.exitCode = 1;
}
