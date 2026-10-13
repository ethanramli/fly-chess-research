import { existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { sha256 } from '../runtime/fetch-graph.mjs';
import { searchMonteCarlo } from '../../src/search-and-feedback/monte-carlo-puzzle-search.mjs';
import { reviewTracedExperience } from '../../src/search-and-feedback/trace-consequence-review.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
if (!args.out || existsSync(args.out)) throw Error('Require fresh --out directory');
const start = performance.now(), cpuStart = process.cpuUsage();
const guard = () => {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20)
    throw Error('Resource guard: no graph is loaded by this software probe');
};
guard(); mkdirSync(args.out, { recursive: true });
const sources = {};
for (const path of ['.codebase/scripts/search-and-feedback/probe-monte-carlo-review.mjs',
  '.codebase/src/search-and-feedback/monte-carlo-puzzle-search.mjs',
  '.codebase/src/search-and-feedback/trace-consequence-review.mjs',
  '.codebase/src/search-and-feedback/experimental-puzzle-search.mjs',
  '.codebase/src/search-and-feedback/experience-feedback.mjs',
  '.codebase/src/search-and-feedback/mate-certificate.mjs',
  '.codebase/src/search-and-feedback/mate-certificate-check.mjs']) sources[path] = await sha256(path);
const fixtures = [
  { name: 'white-mate-one', fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1', plies: 1 },
  { name: 'black-mate-one', fen: '8/8/8/8/8/6k1/5q2/7K b - - 0 1', plies: 1 },
  { name: 'bounded-no-mate-opening', fen: new Chess().fen(), plies: 3 },
];
const results = [];
for (const fixture of fixtures) {
  const board = new Chess(fixture.fen), history = board.pgn(), traces = [];
  const path = join(args.out, fixture.name + '.jsonl');
  // Bounded software fixture policy; this is explicitly not a fly evaluation.
  const brain = { evaluate: async (_board, moves) => ({ priors: moves.map(() => 1), value: 0 }) };
  const calculation = await searchMonteCarlo(brain, board, { seed: 17, simulations: 32,
    maxEvaluations: 16, maxDepth: 3, maxNodes: 1024, milliseconds: 10000, guard,
    onSimulation: async trace => {
      traces.push(trace); guard();
      // Small fixture panel is bounded to 32 traces. Larger runners stream each
      // record and feed a bounded coverage summary instead of accumulating it.
    } });
  writeFileSync(path + '.partial', traces.map(t => JSON.stringify(t)).join('\n') + '\n');
  renameSync(path + '.partial', path);
  const review = reviewTracedExperience(board, calculation, traces,
    { objective: 'forced-mate', plies: fixture.plies }, { maxTraces: 32, maxTraceDepth: 3 });
  if (board.pgn() !== history) throw Error('Task history changed');
  results.push({ fixture, calculation, review, traceFile: path, traceSha256: await sha256(path),
    taskHistoryPreserved: true });
}
const cpu = process.cpuUsage(cpuStart);
const report = { schema: 'monte-carlo-review-software-probe-v1', sources, results,
  resources: { peakRssMiB: process.resourceUsage().maxRSS / 1024,
    elapsedSeconds: (performance.now() - start) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6 },
  scope: 'Bounded synthetic policy probe; no graph, fly inference, teaching pulse, persistent neural learning or transfer ran' };
writeFileSync(join(args.out, 'report.json.partial'), JSON.stringify(report, null, 2));
renameSync(join(args.out, 'report.json.partial'), join(args.out, 'report.json'));
console.log(JSON.stringify({ results: results.map(r => ({ fixture: r.fixture.name,
  simulations: r.calculation.simulations, diagnostics: r.review.diagnostics.map(d => d.kind) })),
  resources: report.resources, scope: report.scope }));
