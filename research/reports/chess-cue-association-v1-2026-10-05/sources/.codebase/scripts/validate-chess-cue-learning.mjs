import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { createChessCueEncoder } from '../src/lowram/chess-cue.mjs';
import { readGF } from '../src/lowram/gf-readout.mjs';
import { loadGraph, readNpz } from '../src/lowram/graph.mjs';
import { SparseTrainer } from '../src/lowram/trainer.mjs';
import { ReversalMemory } from '../src/lowram/reversal-memory.mjs';
import { digest, annotationHash } from '../src/lowram/mushroom-body.mjs';
import { shuffledFeedback, fixedStateHash, signTest } from '../src/lowram/association-validation.mjs';
import { sha256, graphHash } from './fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, resume: { type: 'string' },
  'cpu-duty': { type: 'string', default: '0.5' }, 'max-trials': { type: 'string', default: '384' } } });
const duty = Number(args['cpu-duty']), limit = Number(args['max-trials']);
if (!args.out || existsSync(args.out) || !(duty >= 0.1 && duty <= 1) || !Number.isSafeInteger(limit) || limit < 1 || limit > 384) throw Error('Require new --out and bounded options');
const start = performance.now(), cpuStart = process.cpuUsage();
function guard() { if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Soft memory guard; resume last completed checkpoint to new directory'); }
async function pace(t) { guard(); await new Promise(r => setTimeout(r, Math.min(30000, (performance.now() - t) * (1 / duty - 1)))); guard(); }
guard();
const protocolPath = 'research/data/chess-cue-association-v1/protocol.json';
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const anatomyPath = 'research/reports/instinct-design-2026-10-05/anatomy-with-relay.json';
const protocol = JSON.parse(readFileSync(protocolPath)), rawMapping = JSON.parse(readFileSync(mappingPath)), mapping = rawMapping.mapping;
const anatomy = JSON.parse(readFileSync(anatomyPath)), inputs = {};
const calibrationPath = 'research/reports/chess-cue-panel-v1-2026-10-05/report.json';
const calibrationReport = JSON.parse(readFileSync(calibrationPath));
if (!calibrationReport.complete || calibrationReport.learningApplied !== false || !calibrationReport.calibration.usable) throw Error('Require frozen naive input calibration');
const calibration = calibrationReport.calibration;
for (const path of ['.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv', protocolPath, mappingPath, anatomyPath, calibrationPath]) inputs[path] = await sha256(path);
if (inputs['.cache/full.npz'] !== graphHash || inputs['.cache/flywire-annotations-v2.1.0.tsv'] !== annotationHash || rawMapping.inputs.graph !== graphHash || rawMapping.inputs.annotations !== annotationHash || !mapping.readyForCandidateExperiment) throw Error('Pinned candidate mapping mismatch');
const sources = {};
for (const path of ['.codebase/scripts/validate-chess-cue-learning.mjs', '.codebase/src/lowram/chess-cue.mjs', '.codebase/src/lowram/gf-readout.mjs', '.codebase/src/lowram/reversal-memory.mjs', '.codebase/src/lowram/trainer.mjs', '.codebase/src/lowram/graph.mjs', '.codebase/src/lowram/association-validation.mjs', '.codebase/src/lowram/mushroom-body.mjs']) sources[path] = await sha256(path);
if (sources['.codebase/src/lowram/reversal-memory.mjs'] !== rawMapping.moduleSha256) throw Error('Mapping module changed; regenerate provenance to new path first');
for (const [path, hash] of Object.entries(calibrationReport.identity.sources)) if (await sha256(path) !== hash) throw Error(`Frozen calibration source changed: ${path}`);
const loadStart = performance.now(), graph = loadGraph('.cache/full.npz');
const ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
for (const g of mapping.groups) for (const c of g.dan) if (ids[c.index]?.toString() !== c.rootId) throw Error('DAN root mismatch');
const readouts = Object.fromEntries(['MBON12', 'MBON01'].map(type => [type, anatomy.candidateRelay.cells.filter(c => c.type === type)]));
for (const cells of Object.values(readouts)) if (!cells.length || cells.some(c => ids[c.index]?.toString() !== c.rootId)) throw Error('Readout mapping mismatch');
const gf = anatomy.giantFibers.map(c => ({ index:c.index, rootId:c.rootId }));
if (gf.length !== 2 || gf.some(c => ids[c.index]?.toString() !== c.rootId)) throw Error('GF root mismatch');
const model = new SparseTrainer(graph, { inputDim: 1, outputs: 1, steps: protocol.steps, seed: protocol.modelSeed });
const memory = new ReversalMemory(model, mapping, protocol), naive = memory.snapshot();
const invariant = fixedStateHash(model, memory.edges);
model.forward([0]); const rest = Float32Array.from(model.h[model.steps]);
await pace(loadStart);
const board = new Chess(protocol.fen);
const jobs = protocol.seeds.flatMap((seed, i) => protocol.conditions.map(condition => ({ seed, condition,
  initialPunished: i % 2 === 0 ? 'A' : 'B', reversedPunished: i % 2 === 0 ? 'B' : 'A' })));
const identity = { schema: protocol.schema, inputs, sources, mappingHash: digest(mapping), readouts, gf, calibration, invariant, duty, model: model.config, memory: memory.config, jobs };
let state = { identity, checkpoint: 0, nextJob: 0, active: null, results: [] };
if (args.resume) {
  const prior = JSON.parse(readFileSync(args.resume));
  if (digest(prior.identity) !== digest(identity) || !Number.isSafeInteger(prior.nextJob) || prior.nextJob < 0 || prior.nextJob > jobs.length || !Array.isArray(prior.results) || prior.results.length !== prior.nextJob) throw Error('Incompatible comparison checkpoint');
  if (prior.active) {
    if (digest(prior.active.job) !== digest(jobs[prior.nextJob]) || !Number.isSafeInteger(prior.active.nextTrial) || prior.active.nextTrial < 0 || prior.active.nextTrial > 16 || prior.active.trials.length !== prior.active.nextTrial) throw Error('Invalid active trial cursor');
    memory.restore(prior.active.memory);
  }
  state = prior;
}
mkdirSync(dirname(args.out), { recursive: true }); mkdirSync(args.out);
function save() {
  if (state.active) state.active.memory = memory.snapshot();
  state.checkpoint++;
  const name = `checkpoint-${String(state.checkpoint).padStart(5, '0')}`, temp = join(args.out, `${name}.partial`);
  mkdirSync(temp); writeFileSync(join(temp, 'state.json'), JSON.stringify(state)); renameSync(temp, join(args.out, name));
}
save();
let evaluations = 0, stop = false; process.on('SIGINT', () => { stop = true; });
function score() {
  const h = model.h[model.steps];
  const means = Object.fromEntries(Object.entries(readouts).map(([type, cells]) => [type, cells.reduce((s, c) => s + h[c.index], 0) / cells.length]));
  const rawGF = gf.map(c => h[c.index]);
  return { ...means, MBONscore:means.MBON12 - means.MBON01, ...readGF(rawGF, calibration) };
}
async function evoke(indices, pulse = false) {
  guard(); const t = performance.now();
  const drive = indices.map(s => ({ ...s }));
  if (pulse) for (const g of mapping.groups.filter(g => g.danType === 'PPL103')) for (const c of g.dan) drive.push({ index: c.index, current: protocol.current });
  model.forward([0], drive); evaluations++;
  const result = score(); await pace(t); return result;
}
async function probe(cues) {
  const before = digest(memory.snapshot()), A = await evoke(cues.A), B = await evoke(cues.B);
  if (digest(memory.snapshot()) !== before) throw Error('Probe changed memory');
  return { A, B, choice: A.score <= B.score ? 'A' : 'B' };
}
function gainSummary() {
  let offset = 0;
  return mapping.groups.map(g => {
    const v = memory.gains.subarray(offset, offset + g.edges.length); offset += g.edges.length;
    return { side: g.side, mbonType: g.mbonType, min: Math.min(...v), max: Math.max(...v), mean: v.reduce((a, b) => a + b, 0) / v.length };
  });
}
const other = c => c === 'A' ? 'B' : 'A';
let processed = 0;
while (state.nextJob < jobs.length && !stop && processed < limit) {
  const job = jobs[state.nextJob];
  if (!state.active) {
    memory.restore(naive);
    const encoder = createChessCueEncoder(mapping, { ...protocol.encoder, seed:job.seed });
    const cues = Object.fromEntries(Object.entries(protocol.actions).map(([name, move]) => [name, encoder.encode(board, move, protocol.taskContext).stimulation]));
    const order = job.seed % 2 ? ['A', 'B'] : ['B', 'A'];
    const schedule = ['acquisition', 'reversal'].flatMap((phase, phaseIndex) => {
      const count = phaseIndex === 0 ? protocol.acquisitionTrials : protocol.reversalTrials;
      const punished = phaseIndex === 0 ? job.initialPunished : job.reversedPunished;
      const trials = Array.from({ length: count }, (_, i) => ({ phase, trial: i, cue: order[i % 2], punished }));
      const pulses = trials.map(t => t.cue === punished);
      const shuffled = shuffledFeedback(pulses, (job.seed ^ (phaseIndex === 0 ? 0x45c1 : 0x89a3)) >>> 0);
      return trials.map((t, i) => ({ ...t, delivered: job.condition === 'absent' ? false : job.condition === 'shuffled' ? shuffled[i] : pulses[i] }));
    });
    state.active = { job, cues, schedule, nextTrial: 0, trials: [], probes: { baseline: await probe(cues) }, memory: memory.snapshot(), lastLocal: null };
    save();
  }
  const a = state.active;
  while (a.nextTrial < a.schedule.length && !stop && processed < limit) {
    const t = a.schedule[a.nextTrial], beforeHash = digest(memory.snapshot());
    const response = await evoke(a.cues[t.cue], t.delivered);
    const h = model.h[model.steps];
    const kc = mapping.groups.flatMap(g => g.kc.map(i => Math.max(0, h[i] - rest[i]) / protocol.activityScale));
    const update = job.condition === 'disabled' ? { factors: [], changedEdges: 0, events: memory.events } : memory.observe(rest);
    if (fixedStateHash(model, memory.edges) !== invariant) throw Error('Fixed wiring or nonplastic parameter changed');
    a.lastLocal = { kc, factors: update.factors, beforeHash, afterHash: digest(memory.snapshot()) };
    a.trials.push({ ...t, response, update, gainSummary: gainSummary(), gainHash: digest([...memory.gains]) });
    a.nextTrial++; processed++;
    if (a.nextTrial === protocol.acquisitionTrials) {
      a.probes.acquisition = await probe(a.cues);
      // Persistence only: identical repeat probes, no elapsed biological time.
      a.probes.persistence = await probe(a.cues);
    }
    save();
    console.log(JSON.stringify({ job: state.nextJob, seed: job.seed, condition: job.condition, trial: a.nextTrial, changedEdges: update.changedEdges }));
  }
  if (a.nextTrial === a.schedule.length) {
    a.probes.reversal = await probe(a.cues); const learned = memory.snapshot();
    memory.restore(naive); a.probes.reset = await probe(a.cues);
    memory.restore(learned); a.probes.restored = await probe(a.cues);
    state.results.push({ job, cues: a.cues, trials: a.trials, probes: a.probes, memory: learned, fixedStatePreserved: fixedStateHash(model, memory.edges) === invariant });
    state.active = null; state.nextJob++; save();
  }
}
const safeMargin = (p, safe) => p[other(safe)].score - p[safe].score;
let summary = null;
if (state.nextJob === jobs.length) {
  const bySeed = protocol.seeds.map(seed => {
    const groups = Object.fromEntries(state.results.filter(r => r.job.seed === seed).map(r => [r.job.condition, r]));
    const r = groups.informative, initialSafe = other(r.job.initialPunished), reversedSafe = other(r.job.reversedPunished);
    const reverseEffect = v => safeMargin(v.probes.reversal, reversedSafe) - safeMargin(v.probes.acquisition, reversedSafe);
    const counts = (v, phase) => v.trials.filter(t => t.phase === phase && t.delivered).length;
    return { seed, acquisitionChoiceCorrect: r.probes.acquisition.choice === initialSafe, reversalChoiceCorrect: r.probes.reversal.choice === reversedSafe,
      acquisitionEffect: safeMargin(r.probes.acquisition, initialSafe) - safeMargin(r.probes.baseline, initialSafe), reversalEffect: reverseEffect(r),
      absentAdvantage: reverseEffect(r) - reverseEffect(groups.absent), shuffledAdvantage: reverseEffect(r) - reverseEffect(groups.shuffled),
      persistenceExact: digest(r.probes.acquisition) === digest(r.probes.persistence),
      resetExact: protocol.conditions.every(c => digest(groups[c].probes.reset) === digest(groups[c].probes.baseline)),
      restorationExact: protocol.conditions.every(c => digest(groups[c].probes.restored) === digest(groups[c].probes.reversal)),
      disabledUnchanged: ['acquisition', 'reversal'].every(p => digest(groups.disabled.probes[p]) === digest(groups.disabled.probes.baseline)) && groups.disabled.memory.gains.every(g => g === 1),
      matchedPulseCounts: ['acquisition', 'reversal'].every(p => counts(r, p) === counts(groups.shuffled, p)),
      fixedStatePreserved: protocol.conditions.every(c => groups[c].fixedStatePreserved) };
  });
  const tests = Object.fromEntries(['acquisitionEffect', 'reversalEffect', 'absentAdvantage', 'shuffledAdvantage'].map(k => [k, signTest(bySeed.map(r => r[k]), protocol.tolerance)]));
  const gates = { acquisition: bySeed.every(r => r.acquisitionChoiceCorrect && r.acquisitionEffect > protocol.tolerance),
    reversal: bySeed.every(r => r.reversalChoiceCorrect && r.reversalEffect > protocol.tolerance),
    informative: tests.absentAdvantage.p < protocol.alpha && tests.shuffledAdvantage.p < protocol.alpha,
    persistence: bySeed.every(r => r.persistenceExact && r.restorationExact), causalReset: bySeed.every(r => r.resetExact),
    controls: bySeed.every(r => r.disabledUnchanged && r.matchedPulseCounts), fixedState: bySeed.every(r => r.fixedStatePreserved) };
  summary = { bySeed, tests, gates, allGatesPassed: Object.values(gates).every(Boolean) };
}
const cpu = process.cpuUsage(cpuStart);
const report = { complete: state.nextJob === jobs.length, identity, protocol, summary, results: state.results,
  scope: 'New-seed engineered association/reversal using public board-action cues and frozen GF calibration. Contingencies are experimental, not verified chess outcomes; not biological validation or puzzle learning.',
  activeTrial: state.active?.nextTrial ?? null, completedJobs: state.nextJob, totalJobs: jobs.length, evaluationsThisInvocation: evaluations,
  command: { argv: process.argv, execArgv: process.execArgv, node: process.version },
  resources: { peakRssMiB: process.resourceUsage().maxRSS / 1024, elapsedSeconds: (performance.now() - start) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6, scope: 'This invocation through report preparation', cpuDuty: duty } };
writeFileSync(join(args.out, 'report.json.partial'), JSON.stringify(report, null, 2)); renameSync(join(args.out, 'report.json.partial'), join(args.out, 'report.json'));
console.log(JSON.stringify({ complete: report.complete, gates: summary?.gates, resources: report.resources }));
if (report.complete && !summary.allGatesPassed) process.exitCode = 2;


