// Frozen read-only circuit probe. No learning, parameter ablation, or chess label.
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { annotationHash, digest } from '../../src/neural-learning/mushroom-body.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: {
  out: { type: 'string' }, resume: { type: 'string' },
  'cpu-duty': { type: 'string', default: '0.5' },
  'max-probes': { type: 'string', default: '40' },
} });
const duty = Number(args['cpu-duty']), limit = Number(args['max-probes']);
if (!args.out || existsSync(args.out) || !(duty >= 0.1 && duty <= 1) || !Number.isSafeInteger(limit) || limit < 1 || limit > 40) throw Error('Require new --out, bounded --max-probes and valid duty');
const start = performance.now(), cpuStart = process.cpuUsage();
function guard() {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Soft memory guard; resume last completed checkpoint into new directory');
}
async function pace(since) {
  guard();
  await new Promise(resolve => setTimeout(resolve, Math.min(30000, (performance.now() - since) * (1 / duty - 1))));
  guard();
}
guard();
const protocolPath = 'research/data/relay-probe-v1/protocol.json';
const anatomyPath = 'research/reports/instinct-design-2026-10-05/anatomy-with-relay.json';
const protocol = JSON.parse(readFileSync(protocolPath)), anatomy = JSON.parse(readFileSync(anatomyPath));
const inputs = {};
for (const path of ['.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv', protocolPath, anatomyPath]) inputs[path] = await sha256(path);
if (inputs['.cache/full.npz'] !== graphHash || inputs['.cache/flywire-annotations-v2.1.0.tsv'] !== annotationHash ||
  anatomy.inputs.hashes.graph !== graphHash || anatomy.inputs.hashes.annotations !== annotationHash) throw Error('Pinned mapping/input mismatch');
const sources = {};
for (const path of ['.codebase/scripts/diagnostics/probe-learning-relay.mjs', '.codebase/src/supervised-baselines/trainer.mjs', '.codebase/src/runtime/graph.mjs', '.codebase/src/neural-learning/association-validation.mjs']) sources[path] = await sha256(path);
const loadStart = performance.now();
const graph = loadGraph('.cache/full.npz'), ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
const cells = [...anatomy.candidateRelay.cells, ...anatomy.giantFibers].filter(c => protocol.readTypes.includes(c.type === 'DNp01' ? 'GF' : c.type));
for (const c of cells) {
  if (ids[c.index]?.toString() !== c.rootId) throw Error('Mapping root/index mismatch');
  if (c.kind === 'GF') c.type = 'GF';
}
if (new Set(cells.map(c => c.index)).size !== cells.length || protocol.readTypes.some(type => !cells.some(c => c.type === type))) throw Error('Missing or duplicate mapped cells');
const groups = [];
for (const type of protocol.individualStimulusTypes) for (const c of cells.filter(c => c.type === type).sort((a, b) => a.index - b.index)) groups.push({ name: `${type}/${c.rootId}`, indices: [c.index] });
for (const type of protocol.groupStimulusTypes) groups.push({ name: `${type}/all`, indices: cells.filter(c => c.type === type).map(c => c.index) });
if (protocol.includeDirectGFControl) groups.push({ name: 'GF/direct-control', indices: cells.filter(c => c.type === 'GF').map(c => c.index) });
const schedule = [{ group: 'rest', indices: [], current: 0 }];
for (const g of groups) for (const current of protocol.currents) schedule.push({ group: g.name, indices: g.indices, current });
if (schedule.length > protocol.maximumProbes) throw Error('Frozen pulse budget exceeded');
const model = new SparseTrainer(graph, { inputDim: 1, outputs: 1, seed: protocol.modelSeed, steps: protocol.steps });
const invariant = fixedStateHash(model, []);
const identity = { schema: protocol.schema, inputs, sources, model: model.config, invariant, duty, scheduleHash: digest(schedule) };
await pace(loadStart);
let state = { identity, nextProbe: 0, observations: [] };
if (args.resume) {
  const prior = JSON.parse(readFileSync(args.resume));
  if (digest(prior.identity) !== digest(identity) || !Number.isSafeInteger(prior.nextProbe) || prior.nextProbe < 0 || prior.nextProbe > schedule.length ||
    !Array.isArray(prior.observations) || prior.observations.length !== prior.nextProbe || prior.observations.some((o, i) => digest(o.stimulus) !== digest(schedule[i]) || o.cells.length !== cells.length || o.cells.some((c, j) => c.rootId !== cells[j].rootId || !Number.isFinite(c.response)))) throw Error('Incompatible checkpoint');
  state = prior;
}
mkdirSync(dirname(args.out), { recursive: true }); mkdirSync(args.out);
function save(name) {
  const temporary = join(args.out, `${name}.partial`);
  mkdirSync(temporary); writeFileSync(join(temporary, 'state.json'), JSON.stringify(state));
  renameSync(temporary, join(args.out, name));
}
save('initial');
let stop = false; process.on('SIGINT', () => { stop = true; });
let processed = 0;
while (state.nextProbe < schedule.length && processed < limit && !stop) {
  guard(); const t = performance.now(), stimulus = schedule[state.nextProbe];
  model.forward([0], stimulus.indices.map(index => ({ index, current: stimulus.current })));
  if (fixedStateHash(model, []) !== invariant) throw Error('Fixed graph/parameters changed');
  const h = model.h[model.steps], baseline = state.observations[0]?.cells;
  const observation = { stimulus, cells: cells.map((c, i) => ({ rootId: c.rootId, index: c.index, type: c.type, side: c.side,
    response: h[c.index], deltaFromRest: baseline ? h[c.index] - baseline[i].response : 0 })) };
  await pace(t);
  state.observations.push(observation); state.nextProbe++; processed++;
  save(`probe-${String(state.nextProbe).padStart(3, '0')}`);
}
for (const [path, hash] of Object.entries(inputs)) if (await sha256(path) !== hash) throw Error('Input changed during probe');
const used = process.cpuUsage(cpuStart);
const report = { complete: state.nextProbe === schedule.length, identity, protocol, cells, observations: state.observations,
  nextProbe: state.nextProbe, totalProbes: schedule.length, allParametersAndGraphPreserved: fixedStateHash(model, []) === invariant,
  interpretation: protocol.interpretation,
  command: { executable: process.execPath, execArgv: process.execArgv, argv: process.argv.slice(1), node: process.version },
  resources: { peakRssMiB: process.resourceUsage().maxRSS / 1024, elapsedSeconds: (performance.now() - start) / 1000,
    cpuSeconds: (used.user + used.system) / 1e6, cpuDuty: duty, scope: 'This invocation through report preparation' } };
writeFileSync(join(args.out, 'report.json.partial'), JSON.stringify(report, null, 2));
renameSync(join(args.out, 'report.json.partial'), join(args.out, 'report.json'));
console.log(JSON.stringify({ complete: report.complete, totalProbes: report.totalProbes, nextProbe: state.nextProbe,
  allParametersAndGraphPreserved: report.allParametersAndGraphPreserved, resources: report.resources }));
