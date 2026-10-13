import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, appendFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { SparseTrainer as Oracle } from './oracle-trainer.mjs';
import { SparseTrainer as Candidate } from './candidate-trainer.mjs';
import { chooseFlyMove } from '../../../.codebase/src/evaluation-and-performance/fly-policy.mjs';
import { encodeFen } from '../../../.codebase/src/supervised-baselines/positions.mjs';
import { loadGraph } from '../../../.codebase/src/runtime/graph.mjs';
import { graphHash, sha256 } from '../../../.codebase/scripts/runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, 'cpu-duty': { type: 'string' } } });
assert.ok(args.out && !existsSync(args.out), 'Require --out NEW_DIRECTORY');
assert.ok(process.execArgv.includes('--max-old-space-size=256'), 'Require node --max-old-space-size=256');
assert.equal(Number(args['cpu-duty']), .5, 'Require --cpu-duty 0.5');
const dir = fileURLToPath(new URL('.', import.meta.url));
const protocol = JSON.parse(readFileSync(join(dir, 'protocol.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(dir, 'source-manifest.json'), 'utf8'));
// ponytail: fail closed on this Windows workspace; inspect real processes,
// never infer termination from a lock, checkpoint or observation timeout.
assert.equal(process.platform, 'win32', 'Authoritative serial-run guard is Windows-specific');
const processResult = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command',
  "@(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress"],
{ encoding: 'utf8', windowsHide: true, timeout: 15000 }));
const processes = Array.isArray(processResult) ? processResult : [processResult];
const conflicts = processes.filter(p => p.ProcessId !== process.pid &&
  /(?:\.codebase[\\/]scripts[\\/]|move-latency-zero-reset.*benchmark\.mjs)/i.test(p.CommandLine ?? ''));
assert.equal(conflicts.length, 0, `Live graph/experiment process: ${conflicts.map(p => p.ProcessId).join(', ')}`);

const started = performance.now(), cpuStarted = process.cpuUsage();
function guard() {
  assert.ok(process.memoryUsage().rss <= protocol.maxRssMiB * 2 ** 20, 'RSS guard');
  assert.ok(os.freemem() >= protocol.minFreeMiB * 2 ** 20, 'Free-memory guard');
}
const pace = async ms => { guard(); await new Promise(r => setTimeout(r, Math.max(1, ms))); guard(); };
const digest = arrays => {
  const hash = createHash('sha256');
  for (const a of arrays) hash.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  return hash.digest('hex');
};
guard();
const sourcePaths = ['oracle-trainer.mjs', 'candidate-trainer.mjs', 'benchmark.mjs', 'protocol.json', 'source-manifest.json'].map(p => join(dir, p));
sourcePaths.push(manifest.sourcePath, '.codebase/src/evaluation-and-performance/fly-policy.mjs',
  '.codebase/src/supervised-baselines/positions.mjs', '.codebase/src/runtime/graph.mjs',
  '.codebase/scripts/runtime/fetch-graph.mjs', 'package.json', 'package-lock.json');
const sources = {};
for (const path of sourcePaths) sources[resolve(path)] = await sha256(path);
assert.equal(sources[resolve(join(dir, 'oracle-trainer.mjs'))], manifest.oracleSHA256);
assert.equal(sources[resolve(join(dir, 'candidate-trainer.mjs'))], manifest.candidateSHA256);
assert.equal(sources[resolve(manifest.sourcePath)], manifest.oracleSHA256, 'Active trainer no longer matches staged oracle');
const cold = performance.now();
assert.equal(await sha256('.cache/full.npz'), graphHash);
const hashed = performance.now(), graph = loadGraph('.cache/full.npz'), loaded = performance.now();
const model = new Candidate(graph, { ...protocol.model, seed: protocol.seed });
const coldStart = { hashMs: hashed - cold, loadMs: loaded - hashed, modelMs: performance.now() - loaded };
guard();
const fixedHash = () => digest([...Object.values(graph), ...Object.values(model.params), model.signedMagnitude]);
const fixed = fixedHash(), samples = [], equivalence = [];
const out = resolve(args.out);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'protocol.json'), JSON.stringify({ ...protocol, sources, graphSHA256: graphHash }, null, 2), { flag: 'wx' });
const methods = { oracle: Oracle.prototype.forward, candidate: Candidate.prototype.forward };
function summary(values) {
  const s = [...values].sort((a, b) => a - b);
  return { count: s.length, medianMs: s[Math.ceil(s.length * .5) - 1],
    p95Ms: s[Math.ceil(s.length * .95) - 1], maxMs: s.at(-1) };
}
for (const fixture of protocol.fixtures) {
  const game = fixture.fen ? new Chess(fixture.fen) : new Chess();
  for (const move of fixture.moves ?? []) game.move(move);
  const fen = game.fen(), pgn = game.pgn(), legal = game.moves({ verbose: true });
  // Untimed correctness pass: hash every activity for every candidate.
  // Do not include hashing overhead in the move-latency samples.
  for (const move of legal) {
    game.move(move);
    try {
      const begin = performance.now();
      const x = encodeFen(game.fen());
      const expected = Array.from(methods.oracle.call(model, x));
      const activity = digest([...model.h, ...model.activity, model.drive, model.alpha]);
      assert.deepEqual(Array.from(methods.candidate.call(model, x)), expected);
      assert.equal(digest([...model.h, ...model.activity, model.drive, model.alpha]), activity);
      equivalence.push({ fixture: fixture.id, move: move.lan, activitySHA256: activity, prediction: expected });
      await pace(performance.now() - begin);
    } finally { game.undo(); }
  }
  let reference;
  for (let pair = -protocol.warmupPairsPerFixture; pair < protocol.measuredPairsPerFixture; pair++) {
    const order = pair % 2 ? ['candidate', 'oracle'] : ['oracle', 'candidate'];
    for (const name of order) {
      guard();
      const outputs = [], forwards = [];
      let restMs = 0;
      model.forward = function (...params) {
        const t = performance.now(), result = methods[name].apply(this, params);
        forwards.push(performance.now() - t); outputs.push(Array.from(result)); return result;
      };
      const begin = performance.now(), cpu = process.cpuUsage();
      const chosen = await chooseFlyMove(model, game, async ms => {
        const t = performance.now(); await pace(ms); restMs += performance.now() - t;
      });
      const elapsedMs = performance.now() - begin, usage = process.cpuUsage(cpu);
      const result = { chosen, outputs };
      if (reference) assert.deepEqual(result, reference); else reference = result;
      assert.equal(outputs.length, legal.length); assert.equal(game.fen(), fen); assert.equal(game.pgn(), pgn);
      assert.equal(fixedHash(), fixed);
      if (pair >= 0) {
        const sample = { fixture: fixture.id, pair, name, elapsedMs, cpuMs: (usage.user + usage.system) / 1000,
          forwardMs: forwards.reduce((a, b) => a + b, 0), restMs, candidates: outputs.length, chosen, outputs };
        samples.push(sample); appendFileSync(join(out, 'samples.jsonl'), JSON.stringify(sample) + '\n');
        console.log(JSON.stringify({ fixture: fixture.id, pair, name, elapsedMs, cpuMs: sample.cpuMs }));
      }
    }
  }
}
const summaries = protocol.fixtures.map(f => ({ fixture: f.id,
  oracle: summary(samples.filter(s => s.fixture === f.id && s.name === 'oracle').map(s => s.elapsedMs)),
  candidate: summary(samples.filter(s => s.fixture === f.id && s.name === 'candidate').map(s => s.elapsedMs)) }));
const aggregate = Object.fromEntries(Object.keys(methods).map(name => [name, summary(samples.filter(s => s.name === name).map(s => s.elapsedMs))]));
const passed = aggregate.candidate.medianMs < aggregate.oracle.medianMs &&
  summaries.every(s => s.candidate.medianMs < s.oracle.medianMs && s.candidate.p95Ms <= s.oracle.p95Ms);
guard();
const cpu = process.cpuUsage(cpuStarted);
const report = { timestamp: new Date().toISOString(), protocol, sources, graphSHA256: graphHash,
  datasetSHA256: sources[resolve(join(dir, 'protocol.json'))], parametersAndGraphSHA256: fixed,
  neurons: model.n, edges: graph.col.length, coldStart, exactEquivalence: true, fixedIdentities: fixedHash() === fixed,
  equivalence, summaries, aggregate, latencyGatePassed: passed, adopted: false,
  resources: { peakRssMiB: process.resourceUsage().maxRSS / 1024, freeMiBAtEnd: os.freemem() / 2 ** 20,
    elapsedSeconds: (performance.now() - started) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6,
    cpuDuty: .5, cpu: os.cpus()[0].model, hostname: os.hostname() },
  command: { executable: process.execPath, execArgv: process.execArgv, argv: process.argv.slice(1), node: process.version },
  limits: protocol.limits };
writeFileSync(join(out, 'report.json.partial'), JSON.stringify(report, null, 2), { flag: 'wx' });
renameSync(join(out, 'report.json.partial'), join(out, 'report.json'));
console.log(JSON.stringify({ complete: true, latencyGatePassed: passed, aggregate }));
