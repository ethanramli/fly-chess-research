import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { createChessCueEncoder } from '../../src/chess-input/chess-cue.mjs';
import { readMBON, chooseMBON } from '../../src/neural-learning/mbon-readout.mjs';
import { createDualValenceInterface, dualValenceSchedule } from '../../src/neural-learning/dual-valence-interface.mjs';
import { fixedStateHash, signTest } from '../../src/neural-learning/association-validation.mjs';
import { digest, annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, resume: { type: 'string' },
  'cpu-duty': { type: 'string', default: '0.5' }, 'max-trials': { type: 'string', default: '480' } } });
const duty = Number(args['cpu-duty']), limit = Number(args['max-trials']);
if (!args.out || existsSync(args.out) || !(duty >= 0.1 && duty <= 1)
  || !Number.isSafeInteger(limit) || limit < 1 || limit > 480) throw Error('Require fresh output and bounded options');
const started = performance.now(), cpuStarted = process.cpuUsage();
function guard() { if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20)
  throw Error('Soft memory guard; resume last atomic checkpoint'); }
async function pace(duration) { let remaining = duration * (1 / duty - 1);
  do { const delay = Math.min(250, Math.max(0, remaining)); await new Promise(r => setTimeout(r, delay));
    remaining -= delay; guard(); } while (remaining > 0); }
guard();
const protocolPath = 'research/data/positive-channel-association-v1/protocol.json';
const p = JSON.parse(readFileSync(protocolPath));
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const rawMapping = JSON.parse(readFileSync(mappingPath)), mapping = rawMapping.mapping;
const anatomyPath = 'research/reports/instinct-design-2026-10-05/anatomy-with-relay.json';
const anatomy = JSON.parse(readFileSync(anatomyPath));
const priorPath = 'research/reports/mbon-choice-v1-2026-10-06/report.json';
const inputs = {}, sources = {};
for (const path of [protocolPath, mappingPath, anatomyPath, priorPath, '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv']) inputs[path] = await sha256(path);
assert.equal(inputs['.cache/full.npz'], graphHash); assert.equal(inputs['.cache/flywire-annotations-v2.1.0.tsv'], annotationHash);
assert.equal(rawMapping.inputs.graph, graphHash); assert.equal(rawMapping.inputs.annotations, annotationHash);
for (const path of ['.codebase/scripts/neural-learning/validate-positive-channel.mjs', '.codebase/src/neural-learning/dual-valence-interface.mjs',
  '.codebase/src/chess-input/chess-cue.mjs', '.codebase/src/neural-learning/mbon-readout.mjs', '.codebase/src/neural-learning/reversal-memory.mjs',
  '.codebase/src/supervised-baselines/trainer.mjs', '.codebase/src/runtime/graph.mjs', '.codebase/src/neural-learning/mushroom-body.mjs',
  '.codebase/src/neural-learning/association-validation.mjs']) sources[path] = await sha256(path);
assert.equal(sources['.codebase/src/neural-learning/reversal-memory.mjs'], rawMapping.moduleSha256);
const prior = JSON.parse(readFileSync(priorPath));
assert.ok(p.seeds.every(seed => !prior.protocol.seeds.includes(seed)));
for (const key of ['encoder', 'steps', 'modelSeed', 'current', 'fen', 'actions', 'taskContext']) assert.deepEqual(p[key], prior.protocol[key]);
for (const key of Object.keys(p.memory)) assert.equal(p.memory[key], prior.protocol[key]);
for (const path of ['.codebase/src/chess-input/chess-cue.mjs', '.codebase/src/neural-learning/mbon-readout.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs', '.codebase/src/supervised-baselines/trainer.mjs']) assert.equal(sources[path], prior.identity.sources[path]);
const graph = loadGraph('.cache/full.npz'), ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
const readouts = Object.fromEntries(['MBON12', 'MBON01'].map(type => [type, anatomy.candidateRelay.cells.filter(c => c.type === type)]));
for (const cells of [...mapping.groups.map(g => g.dan), ...Object.values(readouts)]) {
  assert.ok(cells.length); for (const cell of cells) assert.equal(ids[cell.index]?.toString(), cell.rootId); }
const interface_ = createDualValenceInterface(mapping, p.current);
const model = new SparseTrainer(graph, { inputDim: 1, outputs: 1, seed: p.modelSeed, steps: p.steps });
const memory = new ReversalMemory(model, mapping, p.memory), naive = memory.snapshot();
model.forward([0]); const rest = Float32Array.from(model.h[model.steps]);
const invariant = fixedStateHash(model, memory.edges), board = new Chess(p.fen);
const jobs = p.seeds.flatMap((seed, i) => p.conditions.map(condition => ({ seed, condition,
  initialPunished: i % 2 === 0 ? 'A' : 'B' })));
const identity = { schema: p.schema, inputs, sources, mappingHash: digest(mapping), readouts,
  model: model.config, memory: memory.config, populations: interface_.populations, invariant, duty, jobs };
let state = { identity, checkpoint: 0, nextJob: 0, active: null, results: [], memory: naive,
  totalTrials: 0, evaluations: 0 };
if (args.resume) { state = JSON.parse(readFileSync(args.resume)); assert.deepEqual(state.identity, identity);
  assert.ok(Number.isSafeInteger(state.nextJob) && state.nextJob >= 0 && state.nextJob <= jobs.length);
  assert.equal(state.results.length, state.nextJob); memory.restore(state.memory); }
mkdirSync(args.out, { recursive: true });
function save() { guard(); assert.equal(fixedStateHash(model, memory.edges), invariant);
  state.memory = memory.snapshot(); state.checkpoint++;
  const name = `checkpoint-${String(state.checkpoint).padStart(5, '0')}`, temporary = join(args.out, name + '.partial');
  mkdirSync(temporary); writeFileSync(join(temporary, 'state.json'), JSON.stringify(state)); renameSync(temporary, join(args.out, name)); }
function resources() { const cpu = process.cpuUsage(cpuStarted); return { peakRssMiB: process.resourceUsage().maxRSS / 1024,
  elapsedSeconds: (performance.now() - started) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6, cpuDuty: duty }; }
process.on('uncaughtException', error => { writeFileSync(join(args.out, 'interruption.json'), JSON.stringify({
  error: String(error.stack), resources: resources(), checkpoint: state.checkpoint, phase: state.active?.phase }, null, 2)); process.exit(1); });
let evaluationsThisInvocation = 0, processed = 0, stop = false; process.on('SIGINT', () => { stop = true; });
async function evoke(cue, channel = null) {
  guard(); if (state.evaluations >= p.maxEvaluations) throw Error('Evaluation bound');
  const t = performance.now(), presentation = interface_.present(cue, channel);
  model.forward([0], presentation.stimulation); state.evaluations++; evaluationsThisInvocation++;
  const cells = Object.fromEntries(Object.entries(readouts).map(([type, neurons]) =>
    [type, neurons.map(c => model.h[model.steps][c.index])]));
  const response = { ...readMBON(cells), cells };
  await pace(performance.now() - t); return { response, presentation };
}
async function probe(cues) { const before = digest(memory.snapshot());
  const A = (await evoke(cues.A)).response, B = (await evoke(cues.B)).response;
  assert.equal(digest(memory.snapshot()), before); return { A, B, ...chooseMBON(A, B) }; }
save();
while (state.nextJob < jobs.length && !stop && processed < limit) {
  const job = jobs[state.nextJob];
  if (!state.active) { memory.restore(naive);
    const encoder = createChessCueEncoder(mapping, { ...p.encoder, seed: job.seed });
    const cues = Object.fromEntries(Object.entries(p.actions).map(([key, move]) => [key, encoder.encode(board, move, p.taskContext).stimulation]));
    state.active = { job, cues, schedule: dualValenceSchedule({ ...job, acquisitionTrials: p.acquisitionTrials,
      reversalTrials: p.reversalTrials }), nextTrial: 0, receiptRefs: [], phase: 'teaching',
      probes: { baseline: await probe(cues) }, pending: null }; save(); }
  const a = state.active; assert.deepEqual(a.job, job);
  while (a.nextTrial < a.schedule.length && !stop && processed < limit) {
    if (a.phase === 'teaching') {
      const trial = a.schedule[a.nextTrial], before = memory.snapshot();
      const { response, presentation } = await evoke(a.cues[trial.cue], trial.deliveredChannel);
      const h = model.h[model.steps], kc = mapping.groups.flatMap(g => g.kc.map(i => Math.max(0, h[i] - rest[i]) / p.memory.activityScale));
      const dan = mapping.groups.map(g => g.dan.map(c => Math.max(0, h[c.index] - rest[c.index]) / p.memory.activityScale));
      const update = job.condition === 'disabled' ? { factors: [], changedEdges: 0, events: memory.events } : memory.observe(rest);
      a.pending = { job, trial, response, presentation, before, after: memory.snapshot(), local: { kc, dan, factors: update.factors }, update };
      a.phase = 'record'; save();
    }
    if (a.phase === 'record') { const path = join(args.out, `trial-${state.nextJob}-${a.nextTrial}.json`);
      writeFileSync(path + '.partial', JSON.stringify(a.pending)); renameSync(path + '.partial', path);
      a.receiptRefs.push({ path, sha256: await sha256(path) }); a.pending = null;
      a.nextTrial++; state.totalTrials++; processed++;
      a.phase = a.nextTrial === p.acquisitionTrials && !a.probes.acquisition ? 'acquisition-probe' : 'teaching'; save(); }
    if (a.phase === 'acquisition-probe') { a.probes.acquisition = await probe(a.cues);
      a.probes.persistence = await probe(a.cues); a.phase = 'teaching'; save(); }
  }
  if (a.nextTrial === a.schedule.length) {
    a.probes.reversal = await probe(a.cues); const learned = memory.snapshot();
    memory.restore(naive); a.probes.reset = await probe(a.cues); memory.restore(learned); a.probes.restored = await probe(a.cues);
    state.results.push({ ...a, memory: learned, fixedStatePreserved: fixedStateHash(model, memory.edges) === invariant });
    state.active = null; state.nextJob++; save(); console.log(JSON.stringify({ job: state.nextJob, seed: job.seed, condition: job.condition }));
  }
}
const other = cue => cue === 'A' ? 'B' : 'A', margin = (probe, safe) => probe[safe].score - probe[other(safe)].score;
let summary = null;
if (state.nextJob === jobs.length) {
  const bySeed = p.seeds.map(seed => { const rows = Object.fromEntries(state.results.filter(r => r.job.seed === seed).map(r => [r.job.condition, r]));
    const r = rows.informative, safe = other(r.job.initialPunished), reversedSafe = r.job.initialPunished;
    const acquisition = row => margin(row.probes.acquisition, safe) - margin(row.probes.baseline, safe);
    const reversal = row => margin(row.probes.reversal, reversedSafe) - margin(row.probes.acquisition, reversedSafe);
    const pulseCounts = row => Object.fromEntries(['acquisition', 'reversal'].map(phase => [phase,
      Object.fromEntries(['PAM02', 'PPL103'].map(channel => [channel, row.schedule.filter(t => t.phase === phase && t.deliveredChannel === channel).length]))]));
    return { seed, acquisitionCorrect: r.probes.acquisition.choice === safe && margin(r.probes.acquisition, safe) > p.tolerance,
      reversalCorrect: r.probes.reversal.choice === reversedSafe && margin(r.probes.reversal, reversedSafe) > p.tolerance,
      rankingSwitch: r.probes.acquisition.M * r.probes.reversal.M < 0,
      acquisitionEffect: acquisition(r), reversalEffect: reversal(r),
      acquisitionAbsentAdvantage: acquisition(r) - acquisition(rows.absent), acquisitionShuffledAdvantage: acquisition(r) - acquisition(rows.shuffled),
      reversalAbsentAdvantage: reversal(r) - reversal(rows.absent), reversalShuffledAdvantage: reversal(r) - reversal(rows.shuffled),
      punishmentOnlyAcquisitionDifference: acquisition(r) - acquisition(rows['punishment-only']),
      punishmentOnlyReversalDifference: reversal(r) - reversal(rows['punishment-only']),
      persistenceExact: digest(r.probes.acquisition) === digest(r.probes.persistence),
      resetExact: Object.values(rows).every(v => digest(v.probes.reset) === digest(v.probes.baseline)),
      restoredExact: Object.values(rows).every(v => digest(v.probes.restored) === digest(v.probes.reversal)),
      disabledUnchanged: ['acquisition', 'reversal'].every(key => digest(rows.disabled.probes[key]) === digest(rows.disabled.probes.baseline)) && rows.disabled.memory.gains.every(g => g === 1),
      matchedPopulationCounts: digest(pulseCounts(r)) === digest(pulseCounts(rows.shuffled)),
      fixedStatePreserved: Object.values(rows).every(v => v.fixedStatePreserved) }; });
  const advantages = ['acquisitionAbsentAdvantage', 'acquisitionShuffledAdvantage', 'reversalAbsentAdvantage', 'reversalShuffledAdvantage'];
  const tests = Object.fromEntries(advantages.map(key => [key, signTest(bySeed.map(r => r[key]), p.tolerance)]));
  const gates = { acquisition: bySeed.every(r => r.acquisitionCorrect && r.acquisitionEffect > p.tolerance),
    reversal: bySeed.every(r => r.reversalCorrect && r.rankingSwitch && r.reversalEffect > p.tolerance),
    informative: advantages.every(key => tests[key].p < p.alpha),
    persistence: bySeed.every(r => r.persistenceExact && r.restoredExact), causalReset: bySeed.every(r => r.resetExact),
    controls: bySeed.every(r => r.disabledUnchanged && r.matchedPopulationCounts), fixedState: bySeed.every(r => r.fixedStatePreserved) };
  summary = { bySeed, tests, gates, allBehavioralGatesPassed: Object.values(gates).every(Boolean),
    resumeAcceptance: 'Requires independent after-update prefix comparison; not inferred from behavioral gates' };
}
const report = { complete: state.nextJob === jobs.length, identity, protocol: p, results: state.results,
  summary, totalTrials: state.totalTrials, active: state.active, evaluationsThisInvocation,
  command: { argv: process.argv, execArgv: process.execArgv, node: process.version }, resources: resources(), scope: p.scope };
writeFileSync(join(args.out, 'report.json.partial'), JSON.stringify(report, null, 2)); renameSync(join(args.out, 'report.json.partial'), join(args.out, 'report.json'));
console.log(JSON.stringify({ complete: report.complete, gates: summary?.gates, resources: report.resources }));
if (report.complete && !summary.allBehavioralGatesPassed) process.exitCode = 2;
