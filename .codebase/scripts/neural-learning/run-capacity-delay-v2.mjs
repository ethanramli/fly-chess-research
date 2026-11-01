// Capacity-delay assay v2 on seeds 3001-3012 (spec: research/reports/memory-retention-continuation-2026-10-31/capacity-delay-v2-spec.md).
// Usage: node --max-old-space-size=256 .codebase/scripts/neural-learning/run-capacity-delay-v2.mjs --out FRESH_DIR --report FRESH_DIR --cpu-duty 0.5
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { register as registerPredictionReservoirV11 } from '../../src/neural-learning/memory-assay-rule-prediction-reservoir-v1-1.mjs';
import { register as registerLocalReservoir } from '../../src/neural-learning/memory-assay-rule-local-reservoir.mjs';
import { register as registerLocalGated } from '../../src/neural-learning/memory-assay-rule-local-gated.mjs';
import { buildCapacityFixture, CHECKPOINTS, runCapacityArmV2, summarizeCapacityV2 } from '../../src/neural-learning/capacity-delay-assay-v2.mjs';

registerPredictionReservoirV11(registerRule);
registerLocalReservoir(registerRule);
registerLocalGated(registerRule);

const ROOT = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const SPEC = 'research/reports/memory-retention-continuation-2026-10-31/capacity-delay-v2-spec.md';
const SEEDS = Array.from({ length: 12 }, (_, i) => 3001 + i);
const RULES = ['prediction-reservoir-v1.1', 'local-reservoir-v1', 'local-gated-v1'];
const CONFIGS = [
  ...[[200, 20], [800, 20], [800, 80]].map(([nKC, s]) => ({ part: 'A', nKC, s, items: 32, reversalAt: null, jitter: 0, delayLevels: [] })),
  ...[[200, 20], [800, 20]].map(([nKC, s]) => ({ part: 'B', nKC, s, items: 16, reversalAt: 16, jitter: 0, delayLevels: [] })),
  ...[0, 0.01, 0.03, 0.1].map(jitter => ({ part: 'C', nKC: 800, s: 20, items: 8, reversalAt: null, jitter, delayLevels: [0, 400, 1600, 6400] })),
];
const SOURCES = ['.codebase/scripts/neural-learning/run-capacity-delay-v2.mjs',
  ...['capacity-delay-assay-v2', 'capacity-delay-assay', 'memory-assay-fixture', 'memory-assay-adapters', 'reversal-memory', 'alpha-lobe-memory', 'mushroom-body',
    'memory-assay-rule-prediction-scaled', 'memory-assay-rule-prediction-reservoir-v1-1', 'memory-assay-rule-local-reservoir', 'memory-assay-rule-local-gated',
    'local-reservoir-memory', 'local-gated-memory'].map(n => `.codebase/src/neural-learning/${n}.mjs`)];
const WALL_MS = 5400 * 1000, RSS_LIMIT = 2048 * 2 ** 20, FREE_MIN = 256 * 2 ** 20;
const clockStart = performance.now();
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

let manifest = null, out = null;
try {
  const { values: args } = parseArgs({ options: { out: { type: 'string' }, report: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
  const duty = Number(args['cpu-duty']);
  if (!args.out || !args.report || !(duty > 0 && duty <= 1)) throw Error('Require --out FRESH_DIR --report FRESH_DIR [--cpu-duty 0.5]');
  out = path.resolve(args.out);
  const report = path.resolve(args.report);
  if (out === report || existsSync(out) || existsSync(report)) throw Error('Refusing existing/equal output or report directory');
  mkdirSync(out, { recursive: true }); mkdirSync(report, { recursive: true });
  const guard = () => {
    if (process.memoryUsage().rss > RSS_LIMIT || os.freemem() < FREE_MIN) throw Error('Resource guard: RSS/free memory');
    if (performance.now() - clockStart > WALL_MS) throw Error('Resource guard: 5400-second wall limit');
  };
  guard();
  manifest = { schema: 'capacity-delay-assay-run-v2', status: 'running', argv: process.argv, node: process.version, started: new Date().toISOString(),
    seeds: SEEDS, rules: RULES, configs: CONFIGS, checkpoints: CHECKPOINTS, cpuDuty: duty, limits: { rssMiB: 2048, freeMiB: 256, wallSeconds: 5400 },
    spec: { path: SPEC, sha256: sha256(path.join(ROOT, SPEC)) }, sources: Object.fromEntries(SOURCES.map(f => [f, sha256(path.join(ROOT, f))])) };
  writeJson(path.join(out, 'manifest.json'), manifest);
  const recordsFile = path.join(out, 'records.jsonl');
  writeFileSync(recordsFile, '', { flag: 'wx' });
  // ponytail: records stay in memory for the summary (a few MB); the JSONL file is the record of truth.
  const records = [];
  for (const part of ['A', 'B', 'C']) {
    const configs = CONFIGS.filter(c => c.part === part);
    for (const ruleName of RULES) {
      for (const seed of SEEDS) {
        guard();
        const busyStart = performance.now();
        for (const c of configs) {
          const fixture = buildCapacityFixture({ seed, nKC: c.nKC, s: c.s, items: c.items });
          const record = { part, ...runCapacityArmV2({ ruleName, fixture, seed, checkpoints: CHECKPOINTS, reversalAt: c.reversalAt, jitter: c.jitter, delayLevels: c.delayLevels }) };
          appendFileSync(recordsFile, `${JSON.stringify(record)}\n`);
          records.push(record);
        }
        // ponytail: synchronous trials, so a bounded main-thread wait paces the duty cycle (as in v1).
        const restMs = (performance.now() - busyStart) * (1 - duty) / duty;
        if (restMs > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, restMs);
        guard();
      }
      process.stdout.write(`${JSON.stringify({ part, rule: ruleName, trajectories: configs.length * SEEDS.length, wallSeconds: Math.round((performance.now() - clockStart) / 1000) })}\n`);
    }
  }
  writeJson(path.join(report, 'summary.json'), summarizeCapacityV2(records));
  Object.assign(manifest, { status: 'complete', ended: new Date().toISOString(), wallSeconds: (performance.now() - clockStart) / 1000,
    records: { path: 'records.jsonl', lines: records.length, sha256: sha256(recordsFile) } });
  writeJson(path.join(out, 'manifest.json'), manifest);
} catch (error) {
  if (manifest && out) writeJson(path.join(out, 'manifest.json'), { ...manifest, status: 'failed', error: error.message, ended: new Date().toISOString() });
  process.stderr.write(`${JSON.stringify({ status: 'failed', error: error.message })}\n`);
  process.exitCode = 1;
}
