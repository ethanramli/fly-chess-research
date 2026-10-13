// Diagnostic only: call the unchanged browser move policy with its actual
// compute/rest callback and measure each component without updating the model.
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { createUntrainedFly, chooseFlyMove } from '../../src/evaluation-and-performance/fly-policy.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
if (!args.out) throw Error('Require --out NEW_REPORT_JSON');
const started = performance.now(), cpuStart = process.cpuUsage();
function guard() {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Soft memory guard triggered');
}
guard();
const sourcePaths = ['.codebase/scripts/evaluation-and-performance/profile-play-latency.mjs', '.codebase/scripts/browser/play-server.mjs', '.codebase/src/evaluation-and-performance/fly-policy.mjs', '.codebase/src/supervised-baselines/trainer.mjs', '.codebase/src/supervised-baselines/positions.mjs'];
const sources = {};
for (const path of sourcePaths) sources[path] = await sha256(path);
const hashBegin = performance.now();
const actualGraphHash = await sha256('.cache/full.npz');
if (actualGraphHash !== graphHash) throw Error('Pinned graph checksum mismatch');
const graphHashMs = performance.now() - hashBegin;
const loadBegin = performance.now(), graph = loadGraph('.cache/full.npz');
const graphLoadMs = performance.now() - loadBegin;
const createBegin = performance.now(), fly = createUntrainedFly(graph, 47);
const modelCreationMs = performance.now() - createBegin;
function identity() {
  const hash = createHash('sha256');
  for (const a of [...Object.values(graph), ...Object.values(fly.params)]) hash.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  return hash.digest('hex');
}
const before = identity();
const cases = [
  { id: 'black-after-e4', moves: ['e4'] },
  { id: 'opening-six-plies', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'] },
  { id: 'rook-endgame', fen: '8/8/8/3k4/8/3K4/8/7R w - - 0 1' },
];
const results = [], originalForward = fly.forward;
let active;
fly.forward = function (...arguments_) {
  const t = performance.now(), value = originalForward.apply(this, arguments_);
  active.forwardMs.push(performance.now() - t); return value;
};
for (const fixture of cases) {
  guard();
  const game = fixture.fen ? new Chess(fixture.fen) : new Chess();
  for (const move of fixture.moves ?? []) game.move(move);
  const fen = game.fen(), pgn = game.pgn(), legalMoves = game.moves().length;
  active = { id: fixture.id, fen, legalMoves, forwardMs: [], requestedRestMs: [], actualRestMs: [] };
  const begin = performance.now(), cpu = process.cpuUsage();
  const chosen = await chooseFlyMove(fly, game, async ms => {
    guard(); const duration = Math.max(1, ms); active.requestedRestMs.push(duration);
    const t = performance.now(); await new Promise(resolve => setTimeout(resolve, duration));
    active.actualRestMs.push(performance.now() - t);
  });
  const usage = process.cpuUsage(cpu);
  active.elapsedMs = performance.now() - begin;
  active.cpuMs = (usage.user + usage.system) / 1000;
  active.forwardTotalMs = active.forwardMs.reduce((a, b) => a + b, 0);
  active.restTotalMs = active.actualRestMs.reduce((a, b) => a + b, 0);
  active.otherMs = active.elapsedMs - active.forwardTotalMs - active.restTotalMs;
  active.meanForwardMs = active.forwardTotalMs / active.forwardMs.length;
  active.chosen = chosen;
  active.edgeAccumulations = legalMoves * fly.steps * graph.col.length;
  if (game.fen() !== fen || game.pgn() !== pgn || active.forwardMs.length !== legalMoves || identity() !== before) throw Error('Policy changed the real board/model or did not evaluate all legal moves');
  results.push(active);
  console.log(JSON.stringify({ id: active.id, legalMoves, elapsedMs: active.elapsedMs, forwardTotalMs: active.forwardTotalMs, restTotalMs: active.restTotalMs, otherMs: active.otherMs }));
}
fly.forward = originalForward;
const cpu = process.cpuUsage(cpuStart);
const report = {
  scope: 'Unchanged browser policy, full graph, same per-candidate compute/rest callback. Offline diagnostic; excludes browser/network rendering and does not reproduce the original human game session.',
  timestamp: new Date().toISOString(), sources, graphSHA256: actualGraphHash,
  fixtureHash: createHash('sha256').update(JSON.stringify(cases)).digest('hex'), fixtures: cases,
  neurons: fly.n, edges: graph.col.length, config: fly.config,
  coldStart: { graphHashMs, graphLoadMs, modelCreationMs }, results,
  invariantsPreserved: identity() === before,
  command: { executable: process.execPath, options: process.execArgv, argv: process.argv.slice(1), node: process.version },
  resources: { peakResidentMiB: process.resourceUsage().maxRSS / 1024, elapsedSeconds: (performance.now() - started) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6, cpu: os.cpus()[0].model },
};
mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(`${args.out}.partial`, JSON.stringify(report, null, 2), { flag: 'wx' }); renameSync(`${args.out}.partial`, args.out);
console.log(JSON.stringify({ complete: true, graph: { neurons: report.neurons, edges: report.edges }, resources: report.resources, invariantsPreserved: report.invariantsPreserved }));
