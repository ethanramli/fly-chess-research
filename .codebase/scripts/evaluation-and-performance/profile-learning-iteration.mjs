// Replays one frozen adaptive choice-review cycle for timing only.
// This does not modify any published learner checkpoint or experiment source.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { runAdaptiveCoverage } from '../../src/puzzle-learning/adaptive-coverage-experiment.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { sha256 as graphFileHash, graphHash } from '../runtime/fetch-graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
if (!args.out || existsSync(args.out)) throw Error('Require --out pointing to a fresh report directory');
const duty = 0.5;
const heapLimitMiB = 256;
const rssLimit = 768 * 2 ** 20;
const freeLimit = 256 * 2 ** 20;
const started = performance.now();
const cpuStarted = process.cpuUsage();
const hashBytes = value => createHash('sha256').update(value).digest('hex');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const timers = {
  forwardMs: [], evokeMs: [], assessMs: [], replayMs: [], observeMs: [],
  encodeMs: [], snapshotMs: [], paceMs: [], paceRequestedMs: [],
  saveMs: [], publishMs: [], reviewMs: [],
};
const counts = { assessments: 0, encodes: 0, presentations: 0, checkpoints: 0, publications: 0 };

function guard() {
  const rss = process.memoryUsage().rss;
  const free = os.freemem();
  if (rss > rssLimit || free < freeLimit)
    throw Error(`Resource guard rssMiB=${rss / 2 ** 20} freeMiB=${free / 2 ** 20}`);
}
async function pace(duration) {
  const startedPace = performance.now();
  let remaining = duration * (1 / duty - 1);
  timers.paceRequestedMs.push(remaining);
  do {
    const delay = Math.min(250, Math.max(0, remaining));
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    remaining -= delay;
    guard();
  } while (remaining > 0);
  timers.paceMs.push(performance.now() - startedPace);
}

guard();
const protocolPath = 'research/data/adaptive-two-valence-v1/protocol.json';
const protocol = readJson(protocolPath);
const variant = protocol.variants.find(v => v.id === 'original');
assert.ok(variant);
const teacherPath = protocol.teacherReport;
assert.equal(await graphFileHash(teacherPath), protocol.teacherReportSha256);
const prerequisitePath = join(variant.prerequisite, 'report.json');
const prerequisite = readJson(prerequisitePath);
assert.equal(await graphFileHash(prerequisitePath), variant.reportSha256);
assert.equal(prerequisite.complete, true);
assert.equal(prerequisite.summary.allBehavioralGatesPassed, true);
const prerequisiteAuditPath = join(variant.prerequisite, 'audit.json');
const prerequisiteAudit = readJson(prerequisiteAuditPath);
assert.equal(prerequisiteAudit.passed, true);
const prerequisitePrefixAuditPath = join(variant.prerequisite, 'audit-prefix.json');
const prerequisitePrefixAudit = readJson(prerequisitePrefixAuditPath);
assert.equal(prerequisitePrefixAudit.passed, true);
assert.equal(prerequisitePrefixAudit.prefixExact, true);
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const mapping = readJson(mappingPath).mapping;
assert.equal(digest(mapping), prerequisite.identity.mappingHash);
assert.equal(prerequisiteAudit.reportSha256, variant.reportSha256);
assert.equal(await graphFileHash('.cache/full.npz'), graphHash);
assert.equal(await graphFileHash('.cache/flywire-annotations-v2.1.0.tsv'), prerequisite.identity.inputs['.cache/flywire-annotations-v2.1.0.tsv']);

const expectedRun = 'research/reports/adaptive-two-valence-original-v2-2026-10-06';
const expectedReport = readJson(join(expectedRun, 'report.json'));
assert.equal(expectedReport.complete, true);
const expectedAuditPath = join(expectedRun, 'audit.json');
const expectedAudit = readJson(expectedAuditPath);
assert.equal(expectedAudit.passed, true);
assert.equal(await graphFileHash(join(expectedRun, 'report.json')), expectedAudit.reportSha256);
const eventPath = join(expectedRun, 'event-adaptive-0.json');
const expectedEvent = readJson(eventPath);
const expectedSelection = readJson(join(expectedRun, 'selection-0.json'));
const expectedNaive = readJson(join(expectedRun, 'naive-0.json'));
const expectedRanking = readJson(join(expectedRun, 'ranking-adaptive-0.json'));
assert.equal(expectedEvent.experience.move, expectedSelection.review.move);

const sourcePaths = [
  '.codebase/scripts/evaluation-and-performance/profile-learning-iteration.mjs',
  '.codebase/scripts/runtime/fetch-graph.mjs',
  '.codebase/src/puzzle-learning/adaptive-coverage-experiment.mjs',
  '.codebase/src/puzzle-learning/puzzle-experience-plan.mjs',
  '.codebase/src/puzzle-learning/dual-valence-puzzle-brain.mjs',
  '.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs',
  '.codebase/src/search-and-feedback/adaptive-choice-review.mjs',
  '.codebase/src/search-and-feedback/verified-feedback.mjs',
  '.codebase/src/search-and-feedback/verified-line-explanation.mjs',
  '.codebase/src/search-and-feedback/mate-certificate.mjs',
  '.codebase/src/search-and-feedback/mate-certificate-check.mjs',
  '.codebase/src/search-and-feedback/experimental-puzzle-search.mjs',
  '.codebase/src/search-and-feedback/puzzle-search.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs',
  '.codebase/src/neural-learning/dual-valence-interface.mjs',
  '.codebase/src/neural-learning/association-validation.mjs',
  '.codebase/src/neural-learning/mushroom-body.mjs',
  '.codebase/src/neural-learning/mbon-readout.mjs',
  '.codebase/src/chess-input/compartment-chess-cue.mjs',
  '.codebase/src/chess-input/relational-chess-cue-v2.mjs',
  '.codebase/src/supervised-baselines/trainer.mjs',
  '.codebase/src/runtime/graph.mjs',
  'package.json',
  'package-lock.json',
];
const inputs = [
  protocolPath, teacherPath, protocol.preflight, ...protocol.commonPlans.map(p => p.path),
  mappingPath, prerequisitePath, prerequisiteAuditPath, prerequisitePrefixAuditPath,
  '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv', protocol.puzzles,
  join(expectedRun, 'report.json'), expectedAuditPath, eventPath,
  join(expectedRun, 'selection-0.json'), join(expectedRun, 'naive-0.json'),
  join(expectedRun, 'ranking-adaptive-0.json'),
];
const inputHashes = Object.fromEntries(await Promise.all(inputs.map(async path => [path, await graphFileHash(path)])));
for (const p of protocol.commonPlans) assert.equal(inputHashes[p.path], p.sha256);
const sources = Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, await graphFileHash(path)])));
const dependencyIdentity = {
  node: process.version,
  chessJs: JSON.parse(readFileSync('node_modules/chess.js/package.json', 'utf8')).version,
  packageLockSha256: inputHashes['package-lock.json'],
};

const rows = readFileSync(protocol.puzzles, 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
assert.equal(rows.length, 2);
assert.equal(rows[0].fen, expectedEvent.experience.context.fen);
assert.equal(rows[0].objective, expectedEvent.experience.context.task.objective);
guard();
const setupStarted = performance.now();
const graph = loadGraph('.cache/full.npz');
guard();
const model = new SparseTrainer(graph, prerequisite.identity.model);
guard();
const memory = new ReversalMemory(model, mapping, protocol.memory);
const naive = memory.snapshot();
const expectedNaiveMemory = expectedReport.state.naive;
assert.deepEqual(naive, expectedNaiveMemory);
const readouts = prerequisite.identity.readouts;
const cueEncoder = createCompartmentChessCueEncoder(mapping, protocol.encoder);
const encoder = {
  ...cueEncoder,
  encode(...args_) {
    const t = performance.now();
    try { return cueEncoder.encode(...args_); }
    finally { timers.encodeMs.push(performance.now() - t); counts.encodes++; }
  },
};
model.forward([0]);
const rest = Float32Array.from(model.h[model.steps]);
const fixedBefore = fixedStateHash(model, memory.edges);
const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder, readouts, rest,
  maxPresentations: protocol.maxPresentationsPerCondition, priorScale: protocol.priorScale,
  current: protocol.current, guard, pace });
const setupMs = performance.now() - setupStarted;
guard();

const originalForward = model.forward.bind(model);
model.forward = (...args_) => {
  const t = performance.now();
  try { return originalForward(...args_); }
  finally { timers.forwardMs.push(performance.now() - t); }
};
const originalEvoke = brain.evoke.bind(brain);
brain.evoke = async stimulation => {
  const t = performance.now();
  try { return await originalEvoke(stimulation); }
  finally { timers.evokeMs.push(performance.now() - t); counts.presentations++; }
};
const originalAssess = brain.assess.bind(brain);
let lastAssessEnd = null;
brain.assess = async (...args_) => {
  const t = performance.now();
  try { return await originalAssess(...args_); }
  finally { timers.assessMs.push(performance.now() - t); counts.assessments++; lastAssessEnd = performance.now(); }
};
const originalReplay = brain.replay.bind(brain);
brain.replay = async (...args_) => {
  const t = performance.now();
  try { return await originalReplay(...args_); }
  finally { timers.replayMs.push(performance.now() - t); }
};
const originalObserve = memory.observe.bind(memory);
memory.observe = (...args_) => {
  const t = performance.now();
  try { return originalObserve(...args_); }
  finally { timers.observeMs.push(performance.now() - t); }
};
const originalSnapshot = memory.snapshot.bind(memory);
memory.snapshot = (...args_) => {
  const t = performance.now();
  try { return originalSnapshot(...args_); }
  finally { timers.snapshotMs.push(performance.now() - t); }
};

mkdirSync(args.out, { recursive: true });
let checkpoint = 0;
async function save(state) {
  guard();
  const t = performance.now();
  state.memory = memory.snapshot();
  state.presentations = brain.presentations;
  checkpoint++;
  const temporary = join(args.out, `checkpoint-${String(checkpoint).padStart(3, '0')}.partial`);
  const destination = join(args.out, `checkpoint-${String(checkpoint).padStart(3, '0')}`);
  mkdirSync(temporary);
  writeFileSync(join(temporary, 'state.json'), JSON.stringify(state));
  renameSync(temporary, destination);
  timers.saveMs.push(performance.now() - t);
  counts.checkpoints++;
}
const publicationNames = [];
async function publish(name, value) {
  guard();
  if (name.startsWith('selection-') && lastAssessEnd !== null) {
    timers.reviewMs.push(performance.now() - lastAssessEnd);
    lastAssessEnd = null;
  }
  const t = performance.now();
  const path = join(args.out, name);
  writeFileSync(`${path}.partial`, JSON.stringify(value));
  renameSync(`${path}.partial`, path);
  const ref = { path, sha256: await graphFileHash(path) };
  timers.publishMs.push(performance.now() - t);
  publicationNames.push(name);
  counts.publications++;
  return ref;
}
async function load(ref) {
  const bytes = readFileSync(ref.path);
  assert.equal(hashBytes(bytes), ref.sha256);
  return JSON.parse(bytes.toString('utf8'));
}

const identity = {
  schema: 'learning-iteration-profile-v1', variant: 'original', duty,
  inputs: inputHashes, sources, dependencyIdentity,
  graphHash, model: model.config, memory: memory.config, mappingHash: digest(mapping),
  encoderIdentity: cueEncoder.identity, readouts,
  baselineMemoryIdentity: naive.identity, fixedParameterHash: fixedBefore,
};
let state = { identity, checkpoint: 0, conditionIndex: 0, active: null,
  naive, memory: naive, presentations: 0, results: [], totalAttempts: 0 };
const cpuBeforeCycle = process.cpuUsage();
const cycleStarted = performance.now();
const outcome = await runAdaptiveCoverage({ brain, rows, protocol, state, save, publish, load,
  guard, maxAttempts: 1 });
const cycleElapsedMs = performance.now() - cycleStarted;
const cpuCycle = process.cpuUsage(cpuBeforeCycle);
const adaptiveEvent = await load(state.active.eventRefs[0]);
const selection = await load(state.active.selectionRef);
const ranking = await load(state.active.rankingRefs[0]);
const naiveActual = await load(state.baselineRefs[0]);

assert.equal(outcome.complete, false);
assert.equal(outcome.attemptsThisInvocation, 1);
assert.equal(state.totalAttempts, 1);
assert.equal(selection.assessment.choice, expectedSelection.assessment.choice);
assert.equal(selection.review.move, expectedSelection.review.move);
assert.equal(selection.review.status, expectedSelection.review.status);
assert.equal(selection.review.certificateSha256, expectedSelection.review.certificateSha256);
assert.deepEqual(naiveActual.assessment, expectedNaive.assessment);
assert.deepEqual(adaptiveEvent.receipt.after, expectedEvent.receipt.after);
assert.equal(adaptiveEvent.receipt.update.changedEdges, expectedEvent.receipt.update.changedEdges);
assert.deepEqual(ranking.assessment, expectedRanking.assessment);
assert.equal(fixedStateHash(model, memory.edges), fixedBefore);
assert.equal(memory.snapshot().events, 1);

function summarize(values) {
  if (!values.length) return { count: 0, totalMs: 0, meanMs: null, medianMs: null, p95Ms: null, maxMs: null };
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = p => sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
  return { count: sorted.length, totalMs: sorted.reduce((a, b) => a + b, 0),
    meanMs: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    medianMs: percentile(0.5), p95Ms: percentile(0.95), maxMs: sorted.at(-1) };
}
const cpuAll = process.cpuUsage(cpuStarted);
const report = {
  complete: true,
  scope: 'One exact first adaptive all-legal choice-review-feedback-ranking cycle, plus its two frozen naive baselines. Same current policy, graph, cues, proof and local rule. No Monte Carlo search is included in this adaptive runner. This is a timing diagnostic, not a new learning result or optimization.',
  timestamp: new Date().toISOString(), identity,
  fixture: { id: rows[0].id, fen: rows[0].fen, objective: rows[0].objective, plies: rows[0].plies,
    legalMoves: new Chess(rows[0].fen).moves().length, selectedMove: selection.assessment.choice,
    verifiedStatus: selection.review.status, changedEdges: adaptiveEvent.receipt.update.changedEdges,
    presentations: brain.presentations },
  equivalence: {
    naiveAssessmentExact: true, selectedMoveAndCertificateMatch: true,
    postUpdateMemoryExact: true, postUpdateAllLegalRankingExact: true,
    fixedParametersPreserved: true,
    expectedArtifacts: { event: eventPath, selection: join(expectedRun, 'selection-0.json'),
      baseline: join(expectedRun, 'naive-0.json'), ranking: join(expectedRun, 'ranking-adaptive-0.json') },
  },
  timing: {
    setupMs,
    endToEndCycleMs: cycleElapsedMs,
    endToEndCycleCpuMs: (cpuCycle.user + cpuCycle.system) / 1000,
    presentationCount: brain.presentations,
    assessments: timers.assessMs.map((elapsedMs, index) => ({ index, elapsedMs })),
    phases: Object.fromEntries(['forwardMs','evokeMs','encodeMs','observeMs','replayMs','reviewMs','snapshotMs','paceMs','saveMs','publishMs']
      .map(key => [key, summarize(timers[key])])),
    paceRequestedMs: summarize(timers.paceRequestedMs),
    interpretation: 'Nested phase times overlap; do not add them. End-to-end includes all-legal assessments, proof/explanation, local update, callbacks, checkpoint writes and pacing. Setup is reported separately. Search is absent by protocol.',
  },
  resources: {
    peakRssMiB: process.resourceUsage().maxRSS / 1024,
    elapsedSeconds: (performance.now() - started) / 1000,
    cpuSeconds: (cpuAll.user + cpuAll.system) / 1e6,
    freeMemoryMiBAtEnd: os.freemem() / 2 ** 20,
    cpu: os.cpus()[0].model,
    duty,
  },
  artifacts: { checkpointCount: counts.checkpoints, publicationNames },
  command: { executable: process.execPath, options: process.execArgv, argv: process.argv.slice(1), node: process.version },
};
const reportPath = join(args.out, 'report.json');
writeFileSync(`${reportPath}.partial`, JSON.stringify(report, null, 2));
renameSync(`${reportPath}.partial`, reportPath);
writeFileSync(join(args.out, 'README.md'), [
  '# Learning-iteration timing diagnostic', '',
  `Completed ${report.timestamp} on a single frozen training fixture.`, '',
  report.scope, '',
  `The cycle took ${cycleElapsedMs.toFixed(1)} ms wall time and ${report.timing.endToEndCycleCpuMs.toFixed(1)} ms CPU time, with ${brain.presentations} neural presentations. Exact pre-update assessment, selected move/certificate, post-update memory and post-update all-legal ranking matched the archived successful run.`, '',
  'This locates costs in the adaptive all-legal review and immediate-feedback loop. It does not profile the Monte Carlo search path or claim a speedup. Phase times are nested, and all pacing, guard, CPU and RSS rules remain recorded.', '',
  'See `report.json` for raw phase samples, pinned source/input hashes and resource measurements.', '',
].join('\n'));
console.log(JSON.stringify({ complete: report.complete, cycleMs: cycleElapsedMs,
  cpuMs: report.timing.endToEndCycleCpuMs, presentations: brain.presentations,
  forward: report.timing.phases.forwardMs, observe: report.timing.phases.observeMs,
  peakRssMiB: report.resources.peakRssMiB, out: args.out }));
