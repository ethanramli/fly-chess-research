import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer, random } from '../../src/supervised-baselines/trainer.mjs';
import { Gamma4Memory, mapGamma4, digest, annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { makeCues, choose, samplingChoice, teacherFeedback, shuffledFeedback, neuralMargin, fixedStateHash, summarize } from '../../src/neural-learning/association-validation.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: {
  out: { type: 'string' }, resume: { type: 'string' },
  protocol: { type: 'string', default: 'research/data/association-validation-v1/protocol.json' },
  'cpu-duty': { type: 'string', default: '0.5' }, 'max-trials': { type: 'string', default: '10000' },
} });
const duty = Number(args['cpu-duty']), maxTrials = Number(args['max-trials']);
if (!args.out || !Number.isFinite(duty) || duty < 0.1 || duty > 1 || !Number.isSafeInteger(maxTrials) || maxTrials < 1 || maxTrials > 10000) throw Error('Require --out NEW_DIRECTORY and valid bounded options');
const protocol = JSON.parse(readFileSync(args.protocol, 'utf8'));
if (protocol.schema !== 'gamma4-choice-validation-v1' || !Array.isArray(protocol.seeds) || protocol.seeds.length < 1 || protocol.seeds.length > 32 ||
  new Set(protocol.seeds).size !== protocol.seeds.length || !protocol.seeds.every(s => Number.isSafeInteger(s) && s >= 0 && s <= 0xffffffff) ||
  digest(protocol.conditions) !== digest(['contingent', 'no-feedback', 'shuffled-feedback', 'plasticity-disabled']) ||
  ![protocol.acquisitionTrials, protocol.reversalTrials].every(n => Number.isSafeInteger(n) && n > 0 && n <= 128) ||
  ![protocol.current, protocol.feedbackDelay, protocol.interTrial, protocol.retentionInterval, protocol.marginTolerance].every(n => Number.isFinite(n) && n > 0) ||
  !(protocol.exploration >= 0 && protocol.exploration <= 1) || !(protocol.cueFraction > 0 && protocol.cueFraction <= 0.5) || !(protocol.alpha > 0 && protocol.alpha < 1) ||
  (protocol.balancedSampling !== undefined && typeof protocol.balancedSampling !== 'boolean')) throw Error('Invalid bounded protocol');
const started = performance.now(), cpuStart = process.cpuUsage();
function guard() {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20) throw Error('Soft memory guard; resume latest completed state.json');
}
async function pace(ms) {
  let remaining = ms * (1 / duty - 1);
  while (remaining > 0) { const interval = Math.min(250, remaining); await new Promise(r => setTimeout(r, interval)); remaining -= interval; }
}
guard();
const inputs = { graph: await sha256('.cache/full.npz'), annotations: await sha256('.cache/flywire-annotations-v2.1.0.tsv'), protocol: await sha256(args.protocol) };
if (inputs.graph !== graphHash || inputs.annotations !== annotationHash) throw Error('Pinned graph/annotation checksum mismatch');
const sources = {};
for (const path of ['.codebase/scripts/neural-learning/validate-learning.mjs', '.codebase/src/neural-learning/association-validation.mjs', '.codebase/src/neural-learning/mushroom-body.mjs', '.codebase/src/supervised-baselines/trainer.mjs', '.codebase/src/runtime/graph.mjs']) sources[path] = await sha256(path);
const graph = loadGraph('.cache/full.npz');
const mapping = await mapGamma4(graph, readNpz('.cache/full.npz', ['root_ids']).root_ids, '.cache/flywire-annotations-v2.1.0.tsv');
const model = new SparseTrainer(graph, { steps: 8, inputDim: 1, outputs: 1, seed: 47 });
const memory = new Gamma4Memory(model, mapping), naive = memory.snapshot();
model.forward([0]); const resting = Float32Array.from(model.h[model.steps]);
const invariant = fixedStateHash(model, mapping.edges);
const jobs = protocol.seeds.flatMap((seed, i) => protocol.conditions.map(condition => ({ seed, condition, initialTarget: i % 2 === 0 ? 'A' : 'B', reversedTarget: i % 2 === 0 ? 'B' : 'A' })));
const identity = { schema: 'gamma4-choice-state-v1', inputs, sources, mappingHash: digest(mapping), model: model.config, memory: memory.config, duty, invariant, jobs };
let state = { identity, nextJob: 0, checkpoint: 0, active: null, results: [] };
if (args.resume) {
  const saved = JSON.parse(readFileSync(args.resume, 'utf8'));
  if (digest(saved.identity) !== digest(identity) || !Number.isSafeInteger(saved.nextJob) || saved.nextJob < 0 || saved.nextJob > jobs.length ||
    !Number.isSafeInteger(saved.checkpoint) || saved.checkpoint < 0 || !Array.isArray(saved.results) || saved.results.length !== saved.nextJob) throw Error('Incompatible validation checkpoint');
  if (saved.active && (saved.active.seed !== jobs[saved.nextJob]?.seed || saved.active.condition !== jobs[saved.nextJob]?.condition || !['acquisition', 'reversal'].includes(saved.active.phase) || !Number.isSafeInteger(saved.active.nextTrial) || saved.active.nextTrial < 0 || saved.active.nextTrial > (saved.active.phase === 'acquisition' ? protocol.acquisitionTrials : protocol.reversalTrials))) throw Error('Invalid active cursor');
  state = saved;
}
mkdirSync(dirname(args.out), { recursive: true }); mkdirSync(args.out);
writeFileSync(join(args.out, 'mapping.json'), JSON.stringify(mapping, null, 2));
function save() {
  state.checkpoint++;
  const name = `checkpoint-${String(state.checkpoint).padStart(5, '0')}`, temp = join(args.out, `${name}.partial`);
  mkdirSync(temp); writeFileSync(join(temp, 'state.json'), JSON.stringify(state)); renameSync(temp, join(args.out, name));
}
save(); let processed = 0, stop = false, evaluations = 0, exactCacheHits = 0;
process.on('SIGINT', () => { stop = true; });
console.log(JSON.stringify({ event: 'start', protocol: inputs.protocol, jobs: jobs.length, claim: protocol.claim }));
while (state.nextJob < jobs.length && processed < maxTrials && !stop) {
  const job = jobs[state.nextJob], cues = makeCues(mapping.cells.kc.map(c => c.index), job.seed, protocol.cueFraction);
  const reference = state.results.find(r => r.seed === job.seed && r.condition === 'contingent');
  const randomSequence = random(job.seed ^ 0x8c71a532);
  const draws = Array.from({ length: protocol.acquisitionTrials + protocol.reversalTrials }, () => randomSequence());
  const shuffled = Object.fromEntries(['acquisition', 'reversal'].map((phase, i) => [phase,
    reference ? shuffledFeedback(reference.trials.filter(t => t.phase === phase).map(t => t.delivered), job.seed ^ (i ? 0x176345ab : 0xbfe90243)) : []]));
  // At most two response vectors, reused only while ALL eligible gains match
  // exactly. This is valid for the deterministic reset-per-pulse kernel.
  let cacheKey = null, cached = {};
  async function evoke(cue, dan = false) {
    guard(); const key = digest(memory.snapshot().gains);
    if (key !== cacheKey) { cacheKey = key; cached = {}; }
    if (cue && !dan && cached[cue]) { exactCacheHits++; return cached[cue]; }
    const t = performance.now();
    const drive = (cue ? cues[cue] : []).map(index => ({ index, current: protocol.current }));
    if (dan) drive.push(...mapping.cells.dan.map(c => ({ index: c.index, current: protocol.current })));
    model.forward([0], drive); evaluations++;
    const h = model.h[model.steps];
    const response = {
      mbon: mapping.cells.mbon.reduce((s, c) => s + h[c.index], 0) / mapping.cells.mbon.length,
      kc: Float64Array.from(mapping.edges, k => cue ? Math.max(0, h[graph.col[k]] - resting[graph.col[k]]) / protocol.current : 0),
      dopamine: dan ? mapping.cells.dan.reduce((s, c) => s + Math.max(0, h[c.index] - resting[c.index]) / protocol.current, 0) / mapping.cells.dan.length : 0,
    };
    await pace(performance.now() - t); guard();
    if (cue && !dan) cached[cue] = response;
    return response;
  }
  async function probe() {
    const A = (await evoke('A')).mbon, B = (await evoke('B')).mbon;
    return { A, B, greedy: choose({ A, B }, 0.75, 0) };
  }
  if (state.active) memory.restore(state.active.memory);
  else {
    memory.restore(naive);
    state.active = { ...job, phase: 'acquisition', nextTrial: 0, cues, trials: [], probes: { baseline: await probe() }, memory: memory.snapshot() };
    save();
  }
  const active = state.active;
  while (processed < maxTrials && !stop) {
    const count = active.phase === 'acquisition' ? protocol.acquisitionTrials : protocol.reversalTrials;
    if (active.nextTrial === count) {
      active.probes[active.phase] = await probe();
      if (active.phase === 'acquisition') {
        memory.advance(protocol.retentionInterval); active.probes.retention = await probe();
        active.phase = 'reversal'; active.nextTrial = 0; active.memory = memory.snapshot(); save(); continue;
      }
      const learned = memory.snapshot();
      memory.restore(naive); active.probes.reset = await probe();
      memory.restore(JSON.parse(JSON.stringify(learned))); active.probes.restored = await probe();
      active.memory = memory.snapshot();
      const fixedStatePreserved = fixedStateHash(model, mapping.edges) === invariant;
      if (!fixedStatePreserved) throw Error('Fixed graph/nonplastic parameter mutation');
      const result = { ...active, fixedStatePreserved };
      state.results.push(result); state.active = null; state.nextJob++; save();
      console.log(JSON.stringify({ event: 'condition', seed: job.seed, condition: job.condition,
        initialTarget: job.initialTarget, baseline: result.probes.baseline.greedy,
        acquisition: result.probes.acquisition.greedy, reversal: result.probes.reversal.greedy,
        reversalMargin: neuralMargin(result.probes.reversal, job.reversedTarget), rewards: result.trials.filter(t => t.delivered).length,
      }));
      break;
    }
    guard();
    const phase = active.phase, trial = active.nextTrial, offset = phase === 'acquisition' ? 0 : protocol.acquisitionTrials;
    const target = phase === 'acquisition' ? job.initialTarget : job.reversedTarget;
    // Candidate responses are diagnostics only. Register eligibility ONLY for
    // the committed chosen cue; teacher feedback is computed afterwards.
    const A = await evoke('A'), B = await evoke('B');
    const choice = samplingChoice(job.seed, trial, choose({ A: A.mbon, B: B.mbon }, draws[offset + trial], protocol.exploration), protocol.balancedSampling);
    const correct = teacherFeedback(choice, target);
    const delivered = job.condition === 'no-feedback' ? false : job.condition === 'shuffled-feedback' ? shuffled[phase][trial] : correct;
    memory.advance(protocol.interTrial);
    if (job.condition !== 'plasticity-disabled') memory.pair(choice === 'A' ? A.kc : B.kc, 0);
    memory.advance(protocol.feedbackDelay);
    let evokedDopamine = 0;
    if (delivered) {
      const feedback = await evoke(null, true); evokedDopamine = feedback.dopamine;
      if (job.condition !== 'plasticity-disabled') memory.pair(feedback.kc, feedback.dopamine);
    }
    if (fixedStateHash(model, mapping.edges) !== invariant) throw Error('Fixed state mutated during learning');
    active.trials.push({ phase, trial, choice, correct, delivered, draw: draws[offset + trial], A: A.mbon, B: B.mbon, evokedDopamine });
    active.nextTrial++; active.memory = memory.snapshot(); save(); processed++;
  }
}
const complete = state.nextJob === jobs.length;
const cpu = process.cpuUsage(cpuStart);
const report = { complete, identity, protocol, completedJobs: state.nextJob, totalJobs: jobs.length,
  summary: complete ? summarize(state.results, protocol) : null,
  results: state.results, evaluationsThisInvocation: evaluations, exactCacheHitsThisInvocation: exactCacheHits,
  command: { executable: process.execPath, options: process.execArgv, argv: process.argv.slice(1), node: process.version },
  resources: { peakResidentMiB: process.resourceUsage().maxRSS / 1024, elapsedSeconds: (performance.now() - started) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6 },
};
writeFileSync(join(args.out, 'report.json.partial'), JSON.stringify(report, null, 2)); renameSync(join(args.out, 'report.json.partial'), join(args.out, 'report.json'));
console.log(JSON.stringify({ event: 'finish', complete, completedJobs: state.nextJob, gates: report.summary?.gates, resources: report.resources }));
if (complete && !report.summary.allGatesPassed) process.exitCode = 2;
