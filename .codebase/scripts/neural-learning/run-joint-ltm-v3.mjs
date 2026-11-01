// Joint long-term-memory assay v3 on seeds 3101-3124 (spec: research/reports/memory-retention-continuation-2026-10-31/joint-ltm-v3-spec.md).
// Usage: node --max-old-space-size=256 .codebase/scripts/neural-learning/run-joint-ltm-v3.mjs --out FRESH_DIR --report FRESH_DIR --cpu-duty 0.5
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { register as registerSupralinear } from '../../src/neural-learning/memory-assay-rule-prediction-supralinear.mjs';
import { register as registerReservoirV11 } from '../../src/neural-learning/memory-assay-rule-prediction-reservoir-v1-1.mjs';
import { evaluateJoint, runJointSeed } from '../../src/neural-learning/joint-ltm-assay-v3.mjs';

registerSupralinear(registerRule);
registerReservoirV11(registerRule);

const ROOT = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const SPEC = 'research/reports/memory-retention-continuation-2026-10-31/joint-ltm-v3-spec.md';
const SEEDS = Array.from({ length: 24 }, (_, i) => 3101 + i);
const SIZES = [{ nKC: 400, s: 20, items: 8 }, { nKC: 800, s: 20, items: 16 }];
const RULES = [{ name: 'prediction-supralinear-v1', frozen: true }, { name: 'prediction-reservoir-v1.1', frozen: false }];
const DELAYS = { delay: 6400, laterDelay: 1600 };
const SOURCES = ['.codebase/scripts/neural-learning/run-joint-ltm-v3.mjs',
  ...['joint-ltm-assay-v3', 'capacity-delay-assay', 'memory-assay-fixture', 'memory-assay-adapters', 'reversal-memory', 'alpha-lobe-memory', 'mushroom-body',
    'memory-assay-rule-prediction-scaled', 'memory-assay-rule-prediction-supralinear', 'memory-assay-rule-prediction-reservoir-v1-1', 'memory-assay-rule-local-reservoir',
    'memory-assay-rule-local-gated', 'local-reservoir-memory', 'local-supralinear-reservoir-memory', 'local-gated-memory'].map(n => `.codebase/src/neural-learning/${n}.mjs`)];
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
  manifest = { schema: 'joint-ltm-assay-run-v3', status: 'running', argv: process.argv, node: process.version, started: new Date().toISOString(),
    seeds: SEEDS, sizes: SIZES, rules: RULES.map(r => r.name), delays: DELAYS, cpuDuty: duty, limits: { rssMiB: 2048, freeMiB: 256, wallSeconds: 5400 },
    spec: { path: SPEC, sha256: sha256(path.join(ROOT, SPEC)) }, sources: Object.fromEntries(SOURCES.map(f => [f, sha256(path.join(ROOT, f))])) };
  writeJson(path.join(out, 'manifest.json'), manifest);
  const recordsFile = path.join(out, 'records.jsonl');
  writeFileSync(recordsFile, '', { flag: 'wx' });
  const evaluations = {};
  let lines = 0;
  for (const { nKC, s, items } of SIZES) {
    const size = `${nKC}x${s}`;
    evaluations[size] = { items, rules: {} };
    for (const { name, frozen } of RULES) {
      const group = [];
      for (const seed of SEEDS) {
        guard();
        const busyStart = performance.now();
        for (const record of runJointSeed({ ruleName: name, nKC, s, items, seed, frozen })) {
          appendFileSync(recordsFile, `${JSON.stringify(record)}\n`);
          group.push(record);
          lines++;
        }
        // ponytail: synchronous trials, so a bounded main-thread wait paces the duty cycle (as in v1 and v2).
        const restMs = (performance.now() - busyStart) * (1 - duty) / duty;
        if (restMs > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, restMs);
        guard();
      }
      const marks = evaluateJoint(group);
      evaluations[size].rules[name] = marks;
      process.stdout.write(`${JSON.stringify({ size, rule: name, trajectories: group.length, marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, v.pass])), wallSeconds: Math.round((performance.now() - clockStart) / 1000) })}\n`);
    }
  }
  writeJson(path.join(report, 'summary.json'), { schema: 'joint-ltm-assay-summary-v3', evaluations });
  Object.assign(manifest, { status: 'complete', ended: new Date().toISOString(), wallSeconds: (performance.now() - clockStart) / 1000,
    records: { path: 'records.jsonl', lines, sha256: sha256(recordsFile) } });
  writeJson(path.join(out, 'manifest.json'), manifest);
} catch (error) {
  if (manifest && out) writeJson(path.join(out, 'manifest.json'), { ...manifest, status: 'failed', error: error.message, ended: new Date().toISOString() });
  process.stderr.write(`${JSON.stringify({ status: 'failed', error: error.message })}\n`);
  process.exitCode = 1;
}
