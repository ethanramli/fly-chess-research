import { mkdirSync, readFileSync, writeFileSync, renameSync, createWriteStream, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../src/lowram/graph.mjs';
import { SparseTrainer, random } from '../src/lowram/trainer.mjs';
import { Gamma4Memory, mapGamma4, digest, annotationURL, annotationHash } from '../src/lowram/mushroom-body.mjs';
import { sha256, graphHash } from './fetch-graph.mjs';

const { values: args } = parseArgs({ options: {
  out: { type: 'string' }, resume: { type: 'string' },
  annotations: { type: 'string', default: '.cache/flywire-annotations-v2.1.0.tsv' },
  'cpu-duty': { type: 'string', default: '0.5' }, seed: { type: 'string', default: '47' },
  'max-events': { type: 'string', default: '1000' },
} });
const duty = Number(args['cpu-duty']), seed = Number(args.seed), maxEvents = Number(args['max-events']);
if (!args.out || !Number.isFinite(duty) || duty < 0.1 || duty > 1 || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || !Number.isSafeInteger(maxEvents) || maxEvents < 1 || maxEvents > 10000) throw Error('Require --out NEW_DIRECTORY and valid bounded options');
const started = performance.now(), cpuStart = process.cpuUsage();
function guard() {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Soft memory guard; resume last completed state.json in a new directory');
}
async function pace(ms) { await new Promise(resolve => setTimeout(resolve, Math.min(30000, ms * (1 / duty - 1)))); }
guard();
if (!existsSync(args.annotations)) {
  mkdirSync(dirname(args.annotations), { recursive: true });
  const response = await fetch(annotationURL, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw Error(`Annotation download HTTP ${response.status}`);
  await pipeline(response.body, createWriteStream(`${args.annotations}.partial`, { flags: 'wx' }));
  if (await sha256(`${args.annotations}.partial`) !== annotationHash) throw Error('Annotation download checksum mismatch');
  renameSync(`${args.annotations}.partial`, args.annotations);
}
const inputs = { graph: await sha256('.cache/full.npz'), annotations: await sha256(args.annotations) };
if (inputs.graph !== graphHash || inputs.annotations !== annotationHash) throw Error('Pinned input checksum mismatch');
const sources = {};
for (const path of ['.codebase/scripts/condition-fly.mjs', '.codebase/src/lowram/mushroom-body.mjs', '.codebase/src/lowram/trainer.mjs', '.codebase/src/lowram/graph.mjs']) sources[path] = await sha256(path);
const graph = loadGraph('.cache/full.npz');
const mapping = await mapGamma4(graph, readNpz('.cache/full.npz', ['root_ids']).root_ids, args.annotations);
const mappingHash = digest(mapping);
const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed });
const memory = new Gamma4Memory(model, mapping), naive = memory.snapshot();
const rng = random(seed), shuffled = mapping.cells.kc.map(c => c.index);
for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
const size = Math.max(1, Math.floor(shuffled.length * 0.05));
const cues = { A: shuffled.slice(0, size), B: shuffled.slice(size, 2 * size) };
const protocol = { trials: 4, interPulse: 0.5, interTrial: 10, retention: 60, current: 1.5, cueFraction: 0.05, timeUnit: 'unfitted model units', cues };
// Hash everything that learning is NOT allowed to alter, including graph data.
function fixedHash() {
  const h = createHash('sha256'), add = a => h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  for (const a of Object.values(graph)) add(a);
  for (const [key, a] of Object.entries(model.params)) {
    if (key !== 'magnitude') { add(a); continue; }
    let from = 0;
    for (const edge of [...mapping.edges].sort((a, b) => a - b)) { add(a.subarray(from, edge)); from = edge + 1; }
    add(a.subarray(from));
  }
  return h.digest('hex');
}
const invariant = fixedHash();
model.forward([0]);
const baseline = Float32Array.from(model.h[model.steps]);
const schedule = [];
for (const condition of ['paired', 'no-feedback', 'plasticity-disabled']) {
  schedule.push({ condition, type: 'start' }, { condition, type: 'probe', phase: 'baseline' });
  for (const phase of ['acquisition', 'reversal']) {
    const order = phase === 'acquisition' ? ['A', null, 'B'] : ['B', null, 'A'];
    for (let trial = 0; trial < protocol.trials; trial++) for (let pulse = 0; pulse < order.length; pulse++) schedule.push({
      condition, type: 'pulse', phase, trial, cue: order[pulse], dan: pulse === 1 && condition !== 'no-feedback',
      dt: pulse === 0 ? protocol.interTrial : protocol.interPulse,
    });
    schedule.push({ condition, type: 'probe', phase });
    if (phase === 'acquisition') schedule.push({ condition, type: 'wait', dt: protocol.retention }, { condition, type: 'probe', phase: 'retention' });
  }
}
const identity = { schema: 'gamma4-conditioning-v1', inputs, sources, mappingHash, model: model.config, plasticity: memory.config, protocol, invariant, duty, scheduleHash: digest(schedule) };
let state = { identity, nextEvent: 0, memory: naive, observations: [], pulseEvidence: [], completedConditions: [] };
if (args.resume) {
  const prior = JSON.parse(readFileSync(args.resume, 'utf8'));
  if (digest(prior.identity) !== digest(identity) || !Number.isSafeInteger(prior.nextEvent) || prior.nextEvent < 0 || prior.nextEvent > schedule.length || !Array.isArray(prior.observations) || !Array.isArray(prior.pulseEvidence) || !Array.isArray(prior.completedConditions)) throw Error('Incompatible experiment checkpoint');
  memory.restore(prior.memory); state = prior;
}
mkdirSync(dirname(args.out), { recursive: true }); mkdirSync(args.out);
writeFileSync(join(args.out, 'mapping.json'), JSON.stringify(mapping, null, 2));
function save(name) {
  state.memory = memory.snapshot();
  const temp = join(args.out, `${name}.partial`), dest = join(args.out, name);
  mkdirSync(temp); writeFileSync(join(temp, 'state.json'), JSON.stringify(state)); renameSync(temp, dest);
}
save('initial');
let stop = false;
process.on('SIGINT', () => { stop = true; });
async function evoke(cue, dan) {
  guard();
  const t = performance.now();
  const drive = (cue ? cues[cue] : []).map(index => ({ index, current: protocol.current }));
  if (dan) drive.push(...mapping.cells.dan.map(c => ({ index: c.index, current: protocol.current })));
  model.forward([0], drive);
  const h = model.h[model.steps];
  const mbon = mapping.cells.mbon.reduce((s, c) => s + h[c.index], 0) / mapping.cells.mbon.length;
  // Reduced experimentally gated signal: only directly evoked PAM pulses enter
  // this plasticity model. Endogenous dopamine release is NOT reconstructed.
  const dopamine = dan ? mapping.cells.dan.reduce((s, c) => s + Math.max(0, h[c.index] - baseline[c.index]) / protocol.current, 0) / mapping.cells.dan.length : 0;
  const kc = Float64Array.from(mapping.edges, k => cue ? Math.max(0, h[graph.col[k]] - baseline[graph.col[k]]) / protocol.current : 0);
  await pace(performance.now() - t); guard();
  return { mbon, dopamine, kc };
}
let processed = 0;
for (; state.nextEvent < schedule.length && processed < maxEvents && !stop; processed++) {
  guard(); const event = schedule[state.nextEvent];
  if (event.type === 'start') memory.restore(naive);
  if (event.type === 'wait') memory.advance(event.dt);
  if (event.type === 'pulse') {
    memory.advance(event.dt);
    const response = await evoke(event.cue, event.dan);
    if (event.condition !== 'plasticity-disabled') memory.pair(response.kc, response.dopamine);
    state.pulseEvidence.push({ event: state.nextEvent, ...event, evokedDopamine: response.dopamine, maxEvokedKC: Math.max(...response.kc) });
  }
  if (event.type === 'probe') {
    // Non-invasive diagnostics: probes do not advance learning traces or modify memory.
    const A = (await evoke('A', false)).mbon, B = (await evoke('B', false)).mbon;
    const observation = { condition: event.condition, phase: event.phase, A, B, avoidanceContrast: B - A, time: memory.time, gainMin: Math.min(...memory.gains), gainMax: Math.max(...memory.gains) };
    state.observations.push(observation); console.log(JSON.stringify(observation));
    if (event.phase === 'reversal') state.completedConditions.push({ condition: event.condition, memory: memory.snapshot() });
  }
  if (fixedHash() !== invariant) throw Error('Fixed graph or nonplastic parameter changed');
  state.nextEvent++; save(`event-${String(state.nextEvent).padStart(4, '0')}`);
}
const complete = state.nextEvent === schedule.length;
const gates = {};
if (complete) for (const condition of ['paired', 'no-feedback', 'plasticity-disabled']) {
  const stages = Object.fromEntries(state.observations.filter(o => o.condition === condition).map(o => [o.phase, o]));
  const delta = phase => stages[phase].avoidanceContrast - stages.baseline.avoidanceContrast;
  gates[condition] = condition === 'paired' ? {
    acquisition: delta('acquisition') > 1e-7,
    retention: Math.abs(delta('retention') - delta('acquisition')) < 1e-7,
    temporalReversal: delta('reversal') < -1e-7,
  } : { unchanged: ['acquisition', 'retention', 'reversal'].every(phase => Math.abs(delta(phase)) < 1e-7) };
}
const cpu = process.cpuUsage(cpuStart);
const report = { complete, nextEvent: state.nextEvent, totalEvents: schedule.length, identity,
  mappingSummary: { kc: mapping.cells.kc.length, dan: mapping.cells.dan.length, mbon: mapping.cells.mbon.length, plasticEdges: mapping.edges.length, excludedNegativeEdges: mapping.excludedNegativeEdges.length },
  observations: state.observations, gates, fixedInvariantsPreserved: fixedHash() === invariant,
  learningClaim: 'Reduced stimulation-based gamma4 association model; not natural reward circuitry, fitted biology, behavioral choice, or chess learning',
  command: { executable: process.execPath, options: process.execArgv, argv: process.argv.slice(1), node: process.version },
  resources: { peakResidentMiB: process.resourceUsage().maxRSS / 1024, elapsedSeconds: (performance.now() - started) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6 },
};
writeFileSync(join(args.out, 'report.json.partial'), JSON.stringify(report, null, 2));
renameSync(join(args.out, 'report.json.partial'), join(args.out, 'report.json'));
console.log(JSON.stringify({ complete, gates, mapping: report.mappingSummary, resources: report.resources }));
if (complete && !Object.values(gates).every(g => Object.values(g).every(Boolean))) process.exitCode = 2;
