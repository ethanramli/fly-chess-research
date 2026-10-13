// One-pair end-to-end screen for verified consequence learning.
// The answer remains teacher-side until the bounded neural search commits.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest, annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { reviewCommittedChoice } from '../../src/search-and-feedback/adaptive-choice-review.mjs';
import { reviewCommittedContrast } from '../../src/search-and-feedback/contrastive-choice-review.mjs';
import { searchMonteCarlo } from '../../src/search-and-feedback/monte-carlo-puzzle-search.mjs';
import { uci } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
import { shuffledFeedback } from '../../src/neural-learning/association-validation.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const protocolPath = 'research/data/contrastive-feedback-screen-v1/protocol.json';
const p = JSON.parse(readFileSync(protocolPath, 'utf8'));
const { values: args } = parseArgs({ options: {
  out: { type: 'string' }, preflight: { type: 'boolean' }, resume: { type: 'string' },
  'cpu-duty': { type: 'string', default: '0.5' },
} });
const duty = Number(args['cpu-duty']);
if (!Number.isFinite(duty) || duty !== p.runtime.cpuDuty
  || (!args.preflight && (!args.out || existsSync(args.out))))
  throw Error('Require frozen finite duty and fresh output (unless --preflight)');
if (process.version !== p.runtime.nodeVersion
  || !process.execArgv.includes(`--max-old-space-size=${p.runtime.heapMiB}`))
  throw Error('Node or explicit heap identity differs from protocol');

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
for (const [path, expected] of Object.entries(p.inputs)) assert.equal(await sha256(path), expected, `Input hash mismatch: ${path}`);
for (const [path, expected] of Object.entries(p.sources)) assert.equal(await sha256(path), expected, `Source hash mismatch: ${path}`);
assert.equal(await sha256('.cache/full.npz'), graphHash);
assert.equal(await sha256('.cache/flywire-annotations-v2.1.0.tsv'), annotationHash);
const require = createRequire(import.meta.url);
let packagePath = dirname(require.resolve('chess.js/package.json'));
const chessPackage = readJson(join(packagePath, 'package.json'));
assert.deepEqual({ name: chessPackage.name, version: chessPackage.version },
  { name: 'chess.js', version: p.runtime.chessJs });

const balancedPrereq = readJson(p.prerequisites.balancedReport);
const balancedAudit = readJson(p.prerequisites.balancedAudit);
const eligibilityReport = readJson(p.prerequisites.eligibilityReport);
const eligibilityAudit = readJson(p.prerequisites.eligibilityAudit);
assert.equal(balancedPrereq.complete, true);
assert.equal(balancedPrereq.summary.allBehavioralGatesPassed, true);
assert.equal(balancedAudit.passed, true);
assert.equal(eligibilityReport.complete, true);
assert.equal(eligibilityAudit.passed, true);
assert.equal(await sha256(p.prerequisites.balancedReport), p.prerequisites.balancedReportSha256);
assert.equal(await sha256(p.prerequisites.balancedAudit), p.prerequisites.balancedAuditSha256);
assert.equal(await sha256(p.prerequisites.eligibilityReport), p.prerequisites.eligibilityReportSha256);
assert.equal(await sha256(p.prerequisites.eligibilityAudit), p.prerequisites.eligibilityAuditSha256);
const eligibilityByVariant = new Map(eligibilityReport.records.map(record => [record.variant, record]));
for (const [id, expectedActive] of [['original', 0], ['balanced', 10]]) {
  const groups = eligibilityByVariant.get(id)?.groups.filter(group => group.danType === 'PAM02') ?? [];
  assert.equal(groups.reduce((sum, group) => sum + group.activeEdgeAssociatedKCEntries, 0), expectedActive);
  assert.equal(groups.reduce((sum, group) => sum + group.changedEdges, 0), expectedActive);
}
assert.equal(balancedPrereq.identity.invariant, p.shared.invariant);
assert.equal(balancedPrereq.identity.mappingHash, p.shared.mappingHash);
assert.deepEqual(balancedPrereq.identity.model, p.shared.model);
assert.deepEqual(balancedPrereq.identity.memory, p.shared.memory);
for (const type of ['MBON12', 'MBON01']) assert.deepEqual(
  balancedPrereq.identity.readouts[type].map(({ index, rootId }) => ({ index, rootId })), p.shared.readouts[type]);
const acquisition = readJson(p.prerequisites.acquisitionReport);
const acquisitionAudit = readJson(p.prerequisites.acquisitionAudit);
assert.equal(acquisition.complete, true);
assert.equal(acquisitionAudit.passed, true);
assert.equal(acquisition.identity.variant.id, 'original');
assert.equal(acquisitionAudit.reportSha256, p.prerequisites.acquisitionReportSha256);
assert.equal(await sha256(p.prerequisites.acquisitionReport), p.prerequisites.acquisitionReportSha256);
assert.equal(await sha256(p.prerequisites.acquisitionAudit), p.prerequisites.acquisitionAuditSha256);

const mapping = readJson(p.mappingPath).mapping;
assert.equal(digest(mapping), p.shared.mappingHash);
const rows = p.positions.map(ref => {
  const lines = readFileSync(ref.path, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  const row = lines.find(candidate => candidate.id === ref.id);
  assert.ok(row, `Missing position ${ref.id}`);
  assert.equal(row.objective, 'forced-mate');
  assert.equal(row.plies, 3);
  return row;
});
const boardFor = row => new Chess(row.fen);
const taskFor = row => ({ objective: row.objective, plies: row.plies });
const anchors = readJson(p.anchorPlanPath).experiences;
const knownSuccess = anchors.find(event => event.move === p.teacherAnchors.success);
const knownFailure = anchors.find(event => event.move === p.teacherAnchors.failure);
assert.equal(knownSuccess?.status, 'success');
assert.equal(knownFailure?.status, 'failure');
assert.deepEqual(knownSuccess.context.task, taskFor(rows[0]));
assert.deepEqual(knownFailure.context.task, taskFor(rows[0]));
const shuffleCheck = shuffledFeedback(p.feedbackOrder.original, p.shuffleSeed);
const shuffleCheckBalanced = shuffledFeedback(p.feedbackOrder.balanced, p.shuffleSeed);
assert.notDeepEqual(shuffleCheck, p.feedbackOrder.original, 'Frozen shuffled control is degenerate for original variant');
assert.notDeepEqual(shuffleCheckBalanced, p.feedbackOrder.balanced, 'Frozen shuffled control is degenerate for balanced variant');

const guard = () => {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20)
    throw Error(`Resource guard: rss=${process.memoryUsage().rss / 2 ** 20} MiB free=${os.freemem() / 2 ** 20} MiB`);
};
async function pace(ms) {
  let remaining = ms * (1 / duty - 1);
  while (remaining > 0) {
    const delay = Math.min(250, remaining);
    await new Promise(resolve => setTimeout(resolve, delay)); remaining -= delay; guard();
  }
}
function atomicJson(path, value) {
  const partial = `${path}.partial`;
  writeFileSync(partial, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  renameSync(partial, path);
}

if (args.preflight) {
  const projection = [];
  for (const variant of p.variants) {
    const encoder = createCompartmentChessCueEncoder(mapping, { ...p.encoder, ...variant });
    const board = boardFor(rows[0]);
    const successCue = encoder.encode(board, p.teacherAnchors.success, taskFor(rows[0]));
    const failureCue = encoder.encode(board, p.teacherAnchors.failure, taskFor(rows[0]));
    projection.push({ variant, encoderIdentity: encoder.identity,
      successCells: successCue.stimulation.map(cell => cell.index),
      failureCells: failureCue.stimulation.map(cell => cell.index),
      successDose: successCue.stimulation.reduce((sum, cell) => sum + cell.current, 0),
      failureDose: failureCue.stimulation.reduce((sum, cell) => sum + cell.current, 0) });
  }
  assert.equal(projection.every(row => row.successCells.length === p.encoder.maxCells
    && row.failureCells.length === p.encoder.maxCells
    && row.successDose === p.encoder.totalCurrent && row.failureDose === p.encoder.totalCurrent), true);
  console.log(JSON.stringify({ passed: true, projection, shuffled: {
    original: shuffleCheck, balanced: shuffleCheckBalanced,
  }, scope: 'Pinned source/input, legal-cue and nondegenerate-control preflight; no graph inference or learning' }));
  process.exit(0);
}

const runStarted = performance.now(), cpuStarted = process.cpuUsage();
guard();
const graph = loadGraph('.cache/full.npz'); guard();
const ids = readNpz('.cache/full.npz', ['root_ids']).root_ids; guard();
const model = new SparseTrainer(graph, p.shared.model); guard();
const memory = new ReversalMemory(model, mapping, p.shared.memory);
const invariant = fixedStateHash(model, memory.edges);
assert.equal(invariant, p.shared.invariant);
for (const cell of Object.values(p.shared.readouts).flat()) assert.equal(ids[cell.index].toString(), cell.rootId);
for (const group of mapping.groups) for (const cell of group.dan) assert.equal(ids[cell.index].toString(), cell.rootId);
const naive = memory.snapshot();
const restStart = performance.now(); model.forward([0]);
const rest = Float32Array.from(model.h[model.steps]); await pace(performance.now() - restStart);

const out = resolve(args.out);
if (!existsSync(dirname(out))) throw Error('Output parent directory must already exist');
mkdirSync(out, { recursive: false });
const identity = {
  protocolPath, protocolSha256: await sha256(protocolPath), inputs: p.inputs, sources: p.sources,
  graphHash, annotationHash, model: model.config, memory: memory.config, memoryIdentity: naive.identity,
  initialMemoryHash: digest(naive), fixedStateHash: invariant, mappingHash: digest(mapping), readouts: p.shared.readouts,
  runtime: { node: process.version, execArgv: process.execArgv, chessJs: p.runtime.chessJs,
    packageLockSha256: p.inputs['package-lock.json'] },
};
const resumeRoot = args.resume ? resolve(args.resume) : null;
if (resumeRoot) {
  const priorIdentity = readJson(join(resumeRoot, 'run-identity.json'));
  assert.deepEqual(priorIdentity, identity, 'Resume origin identity differs from current pinned inputs');
}
atomicJson(join(out, 'run-identity.json'), identity);
const result = { schema: p.schema, complete: false, identity, protocol: p,
  resumeOrigin: resumeRoot?.replaceAll('\\', '/') ?? null,
  naiveMemory: naive, baseline: {}, variants: [], resources: null };
let presentationCount = 0;

async function makeBrain(variant, initialMemory = naive) {
  memory.restore(initialMemory);
  const encoder = createCompartmentChessCueEncoder(mapping, { ...p.encoder, ...variant });
  const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder,
    readouts: p.shared.readouts, rest, maxPresentations: p.maxPresentationsPerRun,
    current: p.current, guard, pace });
  const originalEvoke = brain.evoke.bind(brain);
  brain.evoke = async stimulation => {
    const before = brain.presentations;
    try { return await originalEvoke(stimulation); }
    finally { presentationCount += brain.presentations - before; }
  };
  return { brain, encoder };
}
async function assessment(brain, row) {
  const started = performance.now();
  const presentationStart = brain.presentations;
  const board = boardFor(row), before = brain.memoryFingerprint();
  const evaluateStarted = performance.now();
  const assessed = await brain.assess(board, board.moves({ verbose: true }), taskFor(row));
  const evaluationMs = performance.now() - evaluateStarted;
  const verifyStarted = performance.now();
  const review = reviewCommittedChoice(board, assessed.choice, taskFor(row), p.verification);
  const verificationMs = performance.now() - verifyStarted;
  assert.equal(brain.memoryFingerprint(), before);
  return { assessment: assessed, review, timing: { totalMs: performance.now() - started,
    neuralAssessmentMs: evaluationMs, verificationMs, presentations: brain.presentations - presentationStart,
    legalMoves: assessed.rows.length } };
}
async function fixedSearch(brain, row, seed) {
  const started = performance.now();
  const presentationStart = brain.presentations;
  const board = boardFor(row), before = brain.memoryFingerprint(), traces = [];
  const searchStarted = performance.now();
  const search = await searchMonteCarlo(brain, board, { ...p.search, task: taskFor(row), seed, guard,
    onSimulation: async trace => traces.push(trace) });
  const searchWallMs = performance.now() - searchStarted;
  const verifyStarted = performance.now();
  const review = reviewCommittedChoice(board, uci(search.move), taskFor(row), p.verification);
  const verificationMs = performance.now() - verifyStarted;
  assert.equal(brain.memoryFingerprint(), before);
  assert.equal(board.fen(), row.fen);
  return { search, traces, review, timing: { totalMs: performance.now() - started,
    searchWallMs, verificationMs, presentations: brain.presentations - presentationStart,
    completedSimulations: search.simulations, neuralEvaluations: search.evaluations,
    phaseTiming: search.phaseTiming,
    candidateExpansions: search.candidateCoverage.expansions,
    candidatesSelected: search.candidateCoverage.selectedCandidates,
    candidatesOmitted: search.candidateCoverage.omittedCandidates,
    stoppedBy: search.stoppedBy } };
}
function queueAlternatives(chosen) {
  return chosen === p.teacherAnchors.success ? [p.teacherAnchors.failure] : [p.teacherAnchors.success];
}
function validPair(contrast, board, row) {
  const events = contrast.experiences;
  const success = events.find(event => event.status === 'success');
  const failure = events.find(event => event.status === 'failure');
  if (success && failure) return { success, failure, contrast };
  // If verification of the committed choice exhausted its bound, the choice
  // stays unknown; independently reviewed anchor experiences may still teach.
  const positive = reviewCommittedChoice(board, p.teacherAnchors.success, taskFor(row), p.verification);
  const negative = reviewCommittedChoice(board, p.teacherAnchors.failure, taskFor(row), p.verification);
  assert.equal(positive.status, 'success'); assert.equal(negative.status, 'failure');
  return { success: positive, failure: negative, contrast,
    fallback: 'Committed consequence unknown; only independently rechecked anchor outcomes enter learning.' };
}
function channelFor(condition, event, index, shuffle) {
  if (condition === 'absent') return null;
  if (condition === 'shuffled') return shuffle[index];
  return event.status === 'success' ? 'PAM02' : 'PPL103';
}
async function playCondition({ variantId, variant, condition, pair, shuffle }) {
  const completedPath = resumeRoot && join(resumeRoot, `condition-${variantId}-${condition}.json`);
  if (completedPath && existsSync(completedPath)) {
    const conditionReport = readJson(completedPath);
    assert.equal(conditionReport.condition, condition); assert.equal(conditionReport.variant.id, variantId);
    return { path: completedPath.replaceAll('\\', '/'), sha256: await sha256(completedPath), conditionReport };
  }
  const receipts = [], resumedMemory = [];
  if (resumeRoot) for (let i = 0; i < pair.length; i++) {
    const oldPath = join(resumeRoot, `receipt-${variantId}-${condition}-${i}.json`);
    if (!existsSync(oldPath)) break;
    const old = readJson(oldPath);
    assert.equal(old.condition, condition); assert.equal(old.variantId, variantId);
    assert.deepEqual(old.experience, pair[i]);
    receipts.push({ path: oldPath.replaceAll('\\', '/'), sha256: await sha256(oldPath) });
    resumedMemory.push(old.after);
  }
  const { brain, encoder } = await makeBrain(variant, resumedMemory.at(-1) ?? naive);
  const beforeFingerprint = digest(naive);
  for (let i = 0; i < pair.length; i++) {
    if (i < receipts.length) continue;
    guard();
    const event = pair[i], channel = channelFor(condition, event, i, shuffle);
    const before = memory.snapshot(), fixedBefore = fixedStateHash(model, memory.edges);
    const receipt = await brain.replay(event, { channel, plasticityEnabled: condition !== 'disabled' });
    const after = memory.snapshot(), fixedAfter = fixedStateHash(model, memory.edges);
    assert.equal(fixedBefore, invariant); assert.equal(fixedAfter, invariant);
    if (condition === 'disabled') assert.deepEqual(after, before);
    const path = join(out, `receipt-${variantId}-${condition}-${i}.json`);
    atomicJson(path, { condition, variantId, experience: event, channel,
      plasticityEnabled: condition !== 'disabled', before, after, receipt,
      fixedStateBefore: fixedBefore, fixedStateAfter: fixedAfter });
    receipts.push({ path: path.replaceAll('\\', '/'), sha256: await sha256(path) });
  }
  const afterTraining = await assessment(brain, rows[0]);
  const counterfactual = await assessment(brain, rows[1]);
  const searched = await fixedSearch(brain, rows[0], p.search.seed);
  const learned = memory.snapshot(), learnedFingerprint = brain.memoryFingerprint();
  const repeated = await assessment(brain, rows[0]);
  assert.deepEqual(repeated.assessment, afterTraining.assessment);
  memory.restore(naive);
  const reset = await assessment(brain, rows[0]);
  const resetExact = digest(reset.assessment) === digest(result.baseline[variantId].target.assessment);
  memory.restore(learned);
  const restored = await assessment(brain, rows[0]);
  const restoreExact = digest(restored.assessment) === digest(afterTraining.assessment);
  assert.equal(brain.memoryFingerprint(), learnedFingerprint);
  const conditionReport = { condition, variant: { id: variantId, ...variant }, encoderIdentity: encoder.identity,
    experienceRefs: receipts, beforeFingerprint, afterFingerprint: learnedFingerprint,
    memory: learned, afterTraining, repeated, counterfactual, fixedBudgetSearch: searched,
    reset: reset.assessment, restored: restored.assessment,
    gates: { resetExact, restoreExact,
      disabledStateUnchanged: condition !== 'disabled' || digest(learned) === digest(naive),
      fixedStatePreserved: fixedStateHash(model, memory.edges) === invariant } };
  const path = join(out, `condition-${variantId}-${condition}.json`);
  atomicJson(path, conditionReport);
  return { path: path.replaceAll('\\', '/'), sha256: await sha256(path), conditionReport };
}

try {
  for (const variant of p.variants) {
    let baselinePath = resumeRoot && join(resumeRoot, `baseline-${variant.id}.json`);
    let baseline;
    if (baselinePath && existsSync(baselinePath)) baseline = readJson(baselinePath);
    else {
      const { brain, encoder } = await makeBrain(variant);
      const baselineTarget = await assessment(brain, rows[0]);
      const baselineCounterfactual = await assessment(brain, rows[1]);
      const baselineSearch = await fixedSearch(brain, rows[0], p.search.seed);
      const choice = baselineSearch.review.move;
      const contrast = reviewCommittedContrast(boardFor(rows[0]), choice, queueAlternatives(choice),
        taskFor(rows[0]), p.verification);
      const pairResult = validPair(contrast, boardFor(rows[0]), rows[0]);
      const pair = p.feedbackOrder[variant.id].map(status => pairResult[status]);
      assert.equal(pair.length, 2);
      assert.deepEqual(pair.map(event => event.status).sort(), ['failure', 'success']);
      assert.ok(pair.every(event => event.context.fen === rows[0].fen
        && event.context.pgn === boardFor(rows[0]).pgn()
        && digest(event.context.task) === digest(taskFor(rows[0]))));
      baseline = { variant: { id: variant.id, ...variant }, encoderIdentity: encoder.identity,
        target: baselineTarget, counterfactual: baselineCounterfactual, fixedBudgetSearch: baselineSearch,
        contrast, teachingPair: pair, fallback: pairResult.fallback ?? null };
      baselinePath = join(out, `baseline-${variant.id}.json`); atomicJson(baselinePath, baseline);
    }
    const baselineRef = { path: baselinePath.replaceAll('\\', '/'), sha256: await sha256(baselinePath) };
    result.baseline[variant.id] = { ...baselineRef, ...baseline };
    const pair = baseline.teachingPair;

    const labels = pair.map(event => event.status === 'success' ? 'PAM02' : 'PPL103');
    const shuffled = shuffledFeedback(labels, p.shuffleSeed);
    assert.notDeepEqual(shuffled, labels);
    const conditionRefs = [];
    for (const condition of p.conditions) {
      const completed = await playCondition({ variantId: variant.id, variant,
        condition, pair, shuffle: shuffled });
      conditionRefs.push({ path: completed.path, sha256: completed.sha256, condition });
    }
    result.variants.push({ id: variant.id, baseline: result.baseline[variant.id], conditions: conditionRefs });
  }
  result.summary = Object.fromEntries(result.variants.map(variant => {
    const reports = Object.fromEntries(variant.conditions.map(ref => [ref.condition, readJson(ref.path)]));
    const baseline = readJson(variant.baseline.path);
    const before = baseline.target.review.status;
    const informative = reports.informative.afterTraining.review.status;
    const controls = ['absent', 'shuffled', 'disabled'].map(condition => reports[condition].afterTraining.review.status);
    const beforeRows = new Map(baseline.target.assessment.rows.map(row => [row.move, row.score]));
    const afterRows = new Map(reports.informative.afterTraining.assessment.rows.map(row => [row.move, row.score]));
    const marginBefore = beforeRows.get(p.teacherAnchors.success) - beforeRows.get(p.teacherAnchors.failure);
    const marginAfter = afterRows.get(p.teacherAnchors.success) - afterRows.get(p.teacherAnchors.failure);
    return [variant.id, {
      baselineUnaided: before, informativeUnaided: informative, controlsUnaided: controls,
      baselineFixedSearch: baseline.fixedBudgetSearch.review.status,
      informativeFixedSearch: reports.informative.fixedBudgetSearch.review.status,
      counterfactualUnaided: reports.informative.counterfactual.review.status,
      counterfactualControls: ['absent', 'shuffled', 'disabled'].map(condition => reports[condition].counterfactual.review.status),
      successMinusFailureMarginBefore: marginBefore, successMinusFailureMarginAfter: marginAfter,
      marginChange: marginAfter - marginBefore,
      gates: {
        naiveChoiceFailed: before === 'failure',
        informativeChoiceSuccess: informative === 'success',
        repairAboveAllControls: before === 'failure' && informative === 'success' && controls.every(status => status === 'failure'),
        resetAndRestoreExact: variant.conditions.every(ref => reports[ref.condition].gates.resetExact && reports[ref.condition].gates.restoreExact),
        fixedStatePreserved: variant.conditions.every(ref => reports[ref.condition].gates.fixedStatePreserved),
      },
      scope: 'One verified contrastive feedback pair on an inspected development position; no statistical or final-transfer claim.',
    }];
  }));
  result.complete = true;
  const cpu = process.cpuUsage(cpuStarted);
  result.resources = { elapsedSeconds: (performance.now() - runStarted) / 1000,
    cpuSeconds: (cpu.user + cpu.system) / 1e6, peakRssMiB: process.resourceUsage().maxRSS / 1024,
    cpuDuty: duty, presentationsObserved: presentationCount,
    scope: 'Current invocation only; resumed-run total must combine each preserved invocation record.' };
  const reportPath = join(out, 'report.json'); atomicJson(reportPath, result);
  console.log(JSON.stringify({ complete: true, variants: result.variants.map(v => ({ id: v.id,
    choices: v.conditions.map(ref => [ref.condition, readJson(ref.path).afterTraining.review.move]) })),
    resources: result.resources, reportPath }));
} catch (error) {
  const interruption = { error: String(error.stack), identity, resources: {
    elapsedSeconds: (performance.now() - runStarted) / 1000,
    peakRssMiB: process.resourceUsage().maxRSS / 1024, cpuDuty: duty,
  } };
  atomicJson(join(out, 'interruption.json'), interruption);
  throw error;
}
