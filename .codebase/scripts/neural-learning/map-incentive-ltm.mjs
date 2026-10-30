// Read-only: maps the charging-to-LTM edges (incentive-ltm-memory.mjs) on the pinned
// graph and reports how many KCs of the existing restrained cue pools also feed them.
import { writeFileSync, mkdirSync, renameSync, existsSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { mapIncentiveLtm } from '../../src/neural-learning/incentive-ltm-memory.mjs';
import { annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';
const { values: args } = parseArgs({ options: { out: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
const duty = Number(args['cpu-duty']);
if (!args.out || existsSync(args.out) || !(duty >= 0.1 && duty <= 1)) throw Error('Require new output and valid duty');
const start = performance.now(), cpu = process.cpuUsage(); let segment = start;
function guard() { if (process.memoryUsage().rss > 2048 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Soft memory guard; mapping incomplete, rerun to new output'); }
async function pace() { guard(); await new Promise(r => setTimeout(r, Math.min(30000, (performance.now() - segment) * (1 / duty - 1)))); segment = performance.now(); guard(); }
guard();
const restrainedPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const inputs = { graph: await sha256('.cache/full.npz'), annotations: await sha256('.cache/flywire-annotations-v2.1.0.tsv'), restrainedMapping: await sha256(restrainedPath) };
if (inputs.graph !== graphHash || inputs.annotations !== annotationHash) throw Error('Pinned input mismatch');
const graph = loadGraph('.cache/full.npz'), ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
const mapping = await mapIncentiveLtm(graph, ids, '.cache/flywire-annotations-v2.1.0.tsv', pace);
await pace();
const restrained = JSON.parse(readFileSync(restrainedPath, 'utf8')).mapping;
const pools = Object.fromEntries(['MBON01', 'MBON12'].map(t => [t, new Set(restrained.groups.filter(g => g.mbonType === t).flatMap(g => g.kc))]));
const coverage = mapping.groups.map(g => {
  const kc = new Set(g.kc);
  return { side: g.side, mbonType: g.mbonType, danType: g.danType, dan: g.dan.length, edges: g.edges.length, uniqueKC: kc.size,
    sharedWithMBON01Pool: [...kc].filter(i => pools.MBON01.has(i)).length, sharedWithMBON12Pool: [...kc].filter(i => pools.MBON12.has(i)).length,
    observedKCTypes: g.observedKCTypes };
});
const upstream = { commit: '1610c80072fe8bb59bd397e7a61f716393a509b9', repository: 'https://github.com/InsectRobotics/IncentiveCircuit', files: {} };
for (const file of ['models_base.py', 'circuit.py']) upstream.files[file] = await sha256(`.cache/incentive-circuit-1610c800/${file}`);
const used = process.cpuUsage(cpu);
const report = { inputs, upstream, mapping, coverage, poolSizes: { MBON01: pools.MBON01.size, MBON12: pools.MBON12.size },
  command: process.argv, executableOptions: process.execArgv, moduleSha256: await sha256('.codebase/src/neural-learning/incentive-ltm-memory.mjs'),
  scope: 'Coarse candidate mask only; no learning experiment or validated compartment/receptor physiology',
  resources: { peakRssMiB: process.resourceUsage().maxRSS / 1024, elapsedSeconds: (performance.now() - start) / 1000, cpuSeconds: (used.user + used.system) / 1e6, cpuDuty: duty } };
mkdirSync(dirname(args.out), { recursive: true }); writeFileSync(`${args.out}.partial`, JSON.stringify(report, null, 2), { flag: 'wx' }); renameSync(`${args.out}.partial`, args.out);
console.log(JSON.stringify({ ready: mapping.readyForCandidateExperiment, coverage: coverage.map(({ observedKCTypes, ...c }) => c),
  readouts: Object.fromEntries(Object.entries(mapping.readouts).map(([k, v]) => [k, v.length])), excluded: mapping.excluded, resources: report.resources }));
