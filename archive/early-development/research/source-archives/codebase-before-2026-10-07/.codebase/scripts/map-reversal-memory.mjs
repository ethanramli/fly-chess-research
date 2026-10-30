import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../src/lowram/graph.mjs';
import { mapReversalMemory } from '../src/lowram/reversal-memory.mjs';
import { annotationHash } from '../src/lowram/mushroom-body.mjs';
import { sha256, graphHash } from './fetch-graph.mjs';
const { values: args } = parseArgs({ options: { out: { type: 'string' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
const duty = Number(args['cpu-duty']);
if (!args.out || existsSync(args.out) || !(duty >= 0.1 && duty <= 1)) throw Error('Require new output and valid duty');
const start = performance.now(), cpu = process.cpuUsage(); let segment = start;
function guard() { if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Soft memory guard; mapping incomplete, rerun to new output'); }
async function pace() { guard(); await new Promise(r => setTimeout(r, Math.min(30000, (performance.now() - segment) * (1 / duty - 1)))); segment = performance.now(); guard(); }
guard();
const inputs = { graph: await sha256('.cache/full.npz'), annotations: await sha256('.cache/flywire-annotations-v2.1.0.tsv') };
if (inputs.graph !== graphHash || inputs.annotations !== annotationHash) throw Error('Pinned input mismatch');
const graph = loadGraph('.cache/full.npz'), ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
const mapping = await mapReversalMemory(graph, ids, '.cache/flywire-annotations-v2.1.0.tsv', pace);
await pace();
const upstream = { commit: '1610c80072fe8bb59bd397e7a61f716393a509b9', repository: 'https://github.com/InsectRobotics/IncentiveCircuit', files: {} };
for (const file of ['models_base.py', 'circuit.py', 'imaging.py', 'LICENSE', 'README.md']) upstream.files[file] = await sha256(`.cache/incentive-circuit-1610c800/${file}`);
const used = process.cpuUsage(cpu);
const report = { inputs, upstream, mapping, command: process.argv, executableOptions: process.execArgv,
  moduleSha256: await sha256('.codebase/src/lowram/reversal-memory.mjs'),
  scope: 'Coarse candidate mask only; no new learning experiment or validated compartment/receptor physiology',
  resources: { peakRssMiB: process.resourceUsage().maxRSS / 1024, elapsedSeconds: (performance.now() - start) / 1000, cpuSeconds: (used.user + used.system) / 1e6, cpuDuty: duty } };
mkdirSync(dirname(args.out), { recursive: true }); writeFileSync(`${args.out}.partial`, JSON.stringify(report, null, 2), { flag: 'wx' }); renameSync(`${args.out}.partial`, args.out);
console.log(JSON.stringify({ groups: mapping.groups.map(g => ({ side: g.side, mbonType: g.mbonType, danType: g.danType, dan: g.dan.length, edges: g.edges.length })), excluded: mapping.excluded, resources: report.resources }));
