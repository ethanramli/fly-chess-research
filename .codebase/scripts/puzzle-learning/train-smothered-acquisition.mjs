import { runAdaptiveCoverage } from '../../src/puzzle-learning/adaptive-coverage-experiment.mjs';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { planPuzzleExperience, experienceBoard } from '../../src/puzzle-learning/puzzle-experience-plan.mjs';
import { searchMonteCarlo, } from '../../src/search-and-feedback/monte-carlo-puzzle-search.mjs';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { copyBoard, uci } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
import { fixedStateHash, shuffledFeedback } from '../../src/neural-learning/association-validation.mjs';
import { digest, annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { streamRows } from '../../src/runtime/storage.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, resume: { type: 'string' }, variant: { type: 'string' }, preflight: { type: 'boolean' },
  'cpu-duty': { type: 'string', default: '0.5' }, 'max-events': { type: 'string', default: '80' } } });
const duty = Number(args['cpu-duty']), maxEvents = Number(args['max-events']);
if (!args.out || existsSync(args.out) || !(duty >= 0.1 && duty <= 1)
  || !Number.isSafeInteger(maxEvents) || maxEvents < 1 || maxEvents > 80) throw Error('Require fresh output and bounded options');
const started = performance.now(), cpuStarted = process.cpuUsage();
function guard() {
  const rss = process.memoryUsage().rss, free = os.freemem();
  if (rss > 768 * 2 ** 20 || free < 256 * 2 ** 20)
    throw Error(`Resource guard rssMiB=${rss / 2 ** 20} freeMiB=${free / 2 ** 20}; resume last checkpoint`);
}
async function pace(duration) {
  let remaining = duration * (1 / duty - 1);
  do { const delay = Math.min(250, Math.max(0, remaining));
    await new Promise(r => setTimeout(r, delay)); remaining -= delay; guard();
  } while (remaining > 0);
}
guard(); const read = path => JSON.parse(readFileSync(path));
const protocolPath = 'research/data/smothered-acquisition-v1/protocol.json', frozen = read(protocolPath);
const variant = frozen.variants.find(v => v.id === args.variant);
if (!variant) throw Error('Require frozen --variant');
const p = { ...frozen, prerequisite: variant.prerequisite };
for (const ref of p.commonPlans) assert.equal(await sha256(ref.path), ref.sha256);
const prerequisite = read(join(p.prerequisite, 'report.json')), prerequisiteAudit = read(join(p.prerequisite, 'audit-prefix.json'));
assert.equal(prerequisite.complete, true); assert.equal(prerequisite.summary.allBehavioralGatesPassed, true);
assert.equal(prerequisiteAudit.passed, true); assert.equal(prerequisiteAudit.prefixExact, true);
assert.equal(await sha256(join(p.prerequisite, 'report.json')), prerequisiteAudit.reportSha256);
assert.equal(prerequisiteAudit.reportSha256, variant.reportSha256);
for (const [path, hash] of Object.entries({ ...prerequisite.identity.inputs, ...prerequisite.identity.sources }))
  assert.equal(await sha256(path), hash);
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json', mapping = read(mappingPath).mapping;
const inputs = {}, sources = {};
for (const path of [protocolPath, p.puzzles, ...p.commonPlans.map(ref => ref.path), mappingPath, '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv',
  join(p.prerequisite, 'report.json'), join(p.prerequisite, 'audit-prefix.json')]) inputs[path] = await sha256(path);
assert.equal(inputs['.cache/full.npz'], graphHash); assert.equal(inputs['.cache/flywire-annotations-v2.1.0.tsv'], annotationHash);
for (const path of [...Object.keys(prerequisite.identity.sources).filter(s => s.startsWith('.codebase/src/')),
  '.codebase/scripts/puzzle-learning/train-smothered-acquisition.mjs', '.codebase/scripts/puzzle-learning/audit-adaptive-coverage.mjs', '.codebase/src/puzzle-learning/adaptive-coverage-experiment.mjs', '.codebase/src/search-and-feedback/adaptive-choice-review.mjs', '.codebase/src/chess-input/relational-chess-cue-v2.mjs',
  '.codebase/src/puzzle-learning/dual-valence-puzzle-brain.mjs',
  '.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs', '.codebase/src/puzzle-learning/puzzle-experience-plan.mjs',
  '.codebase/src/search-and-feedback/monte-carlo-puzzle-search.mjs', '.codebase/src/search-and-feedback/experimental-puzzle-search.mjs',
  '.codebase/src/search-and-feedback/trace-consequence-review.mjs', '.codebase/src/search-and-feedback/experience-feedback.mjs',
  '.codebase/src/search-and-feedback/verified-feedback.mjs', '.codebase/src/search-and-feedback/verified-line-explanation.mjs', '.codebase/src/search-and-feedback/mate-certificate.mjs',
  '.codebase/src/search-and-feedback/mate-certificate-check.mjs', '.codebase/src/runtime/storage.mjs']) sources[path] = await sha256(path);
let puzzleCount = 0;
for await (const row of streamRows(p.puzzles)) { experienceBoard(row); if (++puzzleCount > p.maxPuzzles) throw Error('Puzzle count bound'); }
if (!puzzleCount) throw Error('No declared training fixtures');
if (args.preflight) {
  if (args.resume) throw Error('Preflight does not resume neural state');
  assert.equal(p.maxExperiences, p.conditions.length * puzzleCount * p.attemptsPerPuzzle);
  const cue = createCompartmentChessCueEncoder(mapping, { ...p.encoder, conjoin: variant.conjoin, stratify: variant.stratify });
  let candidates = 0;
  for await (const row of streamRows(p.puzzles)) {
    const board = experienceBoard(row), moves = board.moves({ verbose: true });
    assert.ok(moves.length <= 64);
    for (const move of moves) {
      const encoded = cue.encode(board, uci(move), { objective: row.objective, plies: row.plies });
      assert.equal(encoded.stimulation.length, 14); candidates++;
    }
  }
  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'report.json'), JSON.stringify({ passed: true, variant, inputs, sources,
    candidates, puzzleCount, scope: 'Read-only pinned prerequisites and legal input construction; no graph inference or neural acquisition' }, null, 2));
  console.log(JSON.stringify({ preflight: true, candidates, puzzleCount })); process.exit(0);
}
async function rowAt(index) { let i = 0; for await (const row of streamRows(p.puzzles)) if (i++ === index) return row; throw Error('Missing puzzle'); }
const setupStarted = performance.now(), graph = loadGraph('.cache/full.npz'), ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
const model = new SparseTrainer(graph, prerequisite.identity.model), memory = new ReversalMemory(model, mapping, p.memory);
const naive = memory.snapshot(), invariant = fixedStateHash(model, memory.edges), readouts = prerequisite.identity.readouts;
assert.equal(invariant, prerequisite.identity.invariant);
for (const cells of Object.values(readouts)) for (const c of cells) assert.equal(ids[c.index].toString(), c.rootId);
for (const g of mapping.groups) for (const c of g.dan) assert.equal(ids[c.index].toString(), c.rootId);
model.forward([0]); const rest = Float32Array.from(model.h[model.steps]); await pace(performance.now() - setupStarted);
const encoder = createCompartmentChessCueEncoder(mapping, { ...p.encoder, conjoin: variant.conjoin, stratify: variant.stratify });
const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder, readouts, rest,
  maxPresentations: p.maxPresentationsPerCondition, priorScale: p.priorScale, current: p.current, guard, pace });
let invocationPresentations = 0;
const evoke = brain.evoke.bind(brain);
brain.evoke = async stimulation => {
  const before = brain.presentations;
  try { return await evoke(stimulation); }
  finally { invocationPresentations += brain.presentations - before; }
};
const identity = { schema: p.schema, variant, inputs, sources, model: model.config, memory: memory.config,
  mappingHash: digest(mapping), readouts, invariant, encoderIdentity: encoder.identity, duty, puzzleCount };

const rows = []; for await (const row of streamRows(p.puzzles)) rows.push(row);
let state = { identity, checkpoint: 0, conditionIndex: 0, active: null,
  naive, memory: naive, presentations: 0, results: [], totalAttempts: 0 };
if (args.resume) {
  state = read(args.resume); assert.equal(digest(state.identity), digest(identity));
  assert.deepEqual(state.naive, naive);
  assert.ok(state.conditionIndex >= 0 && state.conditionIndex <= p.conditions.length);
  memory.restore(state.memory); brain.presentations = state.presentations;
}
mkdirSync(args.out, { recursive: true });
async function save() {
  guard(); assert.equal(fixedStateHash(model, memory.edges), invariant);
  state.memory = memory.snapshot(); state.presentations = brain.presentations; state.checkpoint++;
  const name = 'checkpoint-' + String(state.checkpoint).padStart(5, '0');
  const temporary = join(args.out, name + '.partial'); mkdirSync(temporary);
  writeFileSync(join(temporary, 'state.json'), JSON.stringify(state));
  renameSync(temporary, join(args.out, name));
}
async function publish(name, value) {
  const path = join(args.out, name); writeFileSync(path + '.partial', JSON.stringify(value));
  renameSync(path + '.partial', path); return { path, sha256: await sha256(path) };
}
async function load(ref) { assert.equal(await sha256(ref.path), ref.sha256); return read(ref.path); }
function resources() { const cpu = process.cpuUsage(cpuStarted); return {
  peakRssMiB: process.resourceUsage().maxRSS / 1024, elapsedSeconds: (performance.now() - started) / 1000,
  cpuSeconds: (cpu.user + cpu.system) / 1e6, presentationsThisInvocation: invocationPresentations, cpuDuty: duty }; }
let stop = false; process.on('SIGINT', () => { stop = true; });
await save();
try {
  const outcome = await runAdaptiveCoverage({ brain, rows, protocol: p, state, save, publish, load,
    guard, maxAttempts: maxEvents, shouldStop: () => stop });
  let summary = null;
  if (outcome.complete) {
    const panels = {};
    for (const r of state.results) panels[r.condition] = await Promise.all(r.panelRefs.map(load));
    const baseline = await Promise.all(state.baselineRefs.map(load));
    const repaired = baseline.map((b,i) => b.review.status === 'failure' && panels.adaptive[i].after.review.status === 'success');
    const gates = {
      usefulChoices: panels.adaptive.every(v => v.after.review.status === 'success'),
      repairAboveAbsentDisabled: repaired.some((yes,i) => yes && ['absent','disabled'].every(c => panels[c][i].after.review.status === 'failure')),
      shuffleSpecificity: state.shuffleIdentifiable && repaired.some((yes,i) => yes && panels.shuffled[i].after.review.status === 'failure'),
      persistenceAndReset: Object.values(panels).flat().every(v => digest(v.after.assessment) === digest(v.repeat.assessment)
        && digest(v.after.assessment) === digest(v.restored.assessment)),
      fixedState: fixedStateHash(model, memory.edges) === invariant };
    summary = { gates, allPilotGatesPassed: Object.values(gates).every(Boolean),
      scope: 'Exploratory fixture result, independent audits required; not reasoning or transfer' };
  }
  await publish('report.json', { ...outcome, identity, protocol: p, summary, state, resources: resources(),
    command: { argv: process.argv, execArgv: process.execArgv, node: process.version } });
  console.log(JSON.stringify({ ...outcome, summary, resources: resources() }));
} catch (error) {
  await publish('interruption.json', { error: String(error.stack), checkpoint: state.checkpoint,
    phase: state.active?.phase, resources: resources() }); throw error;
}
