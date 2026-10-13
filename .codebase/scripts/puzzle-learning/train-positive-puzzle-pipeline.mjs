import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { createRelationalChessCueEncoder } from '../../src/chess-input/relational-chess-cue-v2.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { planPuzzleExperience, experienceBoard } from '../../src/puzzle-learning/puzzle-experience-plan.mjs';
import { searchMonteCarlo, } from '../../src/search-and-feedback/monte-carlo-puzzle-search.mjs';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { copyBoard, uci } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
import { fixedStateHash, shuffledFeedback } from '../../src/neural-learning/association-validation.mjs';
import { digest, annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { streamRows } from '../../src/runtime/storage.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, resume: { type: 'string' },
  'cpu-duty': { type: 'string', default: '0.5' }, 'max-events': { type: 'string', default: '40' } } });
const duty = Number(args['cpu-duty']), maxEvents = Number(args['max-events']);
if (!args.out || existsSync(args.out) || !(duty >= 0.1 && duty <= 1)
  || !Number.isSafeInteger(maxEvents) || maxEvents < 1 || maxEvents > 40) throw Error('Require fresh output and bounded options');
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
const protocolPath = 'research/data/positive-puzzle-pipeline-v1/protocol.json', p = read(protocolPath);
const prerequisite = read(join(p.prerequisite, 'report.json')), prerequisiteAudit = read(join(p.prerequisite, 'audit-prefix.json'));
assert.equal(prerequisite.complete, true); assert.equal(prerequisite.summary.allBehavioralGatesPassed, true);
assert.equal(prerequisiteAudit.passed, true); assert.equal(prerequisiteAudit.prefixExact, true);
assert.equal(await sha256(join(p.prerequisite, 'report.json')), prerequisiteAudit.reportSha256);
assert.equal(prerequisiteAudit.reportSha256, '910e223612751face371cc59558b737ab4e0738bfae6b89baff2705f01f2acbb');
for (const [path, hash] of Object.entries({ ...prerequisite.identity.inputs, ...prerequisite.identity.sources }))
  assert.equal(await sha256(path), hash);
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json', mapping = read(mappingPath).mapping;
const inputs = {}, sources = {};
for (const path of [protocolPath, p.puzzles, mappingPath, '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv',
  join(p.prerequisite, 'report.json'), join(p.prerequisite, 'audit-prefix.json')]) inputs[path] = await sha256(path);
assert.equal(inputs['.cache/full.npz'], graphHash); assert.equal(inputs['.cache/flywire-annotations-v2.1.0.tsv'], annotationHash);
for (const path of [...Object.keys(prerequisite.identity.sources).filter(s => s.startsWith('.codebase/src/')),
  '.codebase/scripts/puzzle-learning/train-positive-puzzle-pipeline.mjs', '.codebase/src/chess-input/relational-chess-cue-v2.mjs',
  '.codebase/src/puzzle-learning/dual-valence-puzzle-brain.mjs',
  '.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs', '.codebase/src/puzzle-learning/puzzle-experience-plan.mjs',
  '.codebase/src/search-and-feedback/monte-carlo-puzzle-search.mjs', '.codebase/src/search-and-feedback/experimental-puzzle-search.mjs',
  '.codebase/src/search-and-feedback/trace-consequence-review.mjs', '.codebase/src/search-and-feedback/experience-feedback.mjs',
  '.codebase/src/search-and-feedback/verified-feedback.mjs', '.codebase/src/search-and-feedback/verified-line-explanation.mjs', '.codebase/src/search-and-feedback/mate-certificate.mjs',
  '.codebase/src/search-and-feedback/mate-certificate-check.mjs', '.codebase/src/runtime/storage.mjs']) sources[path] = await sha256(path);
let puzzleCount = 0;
for await (const row of streamRows(p.puzzles)) { experienceBoard(row); if (++puzzleCount > p.maxPuzzles) throw Error('Puzzle count bound'); }
if (!puzzleCount) throw Error('No declared training fixtures');
async function rowAt(index) { let i = 0; for await (const row of streamRows(p.puzzles)) if (i++ === index) return row; throw Error('Missing puzzle'); }
const setupStarted = performance.now(), graph = loadGraph('.cache/full.npz'), ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
const model = new SparseTrainer(graph, prerequisite.identity.model), memory = new ReversalMemory(model, mapping, p.memory);
const naive = memory.snapshot(), invariant = fixedStateHash(model, memory.edges), readouts = prerequisite.identity.readouts;
assert.equal(invariant, prerequisite.identity.invariant);
for (const cells of Object.values(readouts)) for (const c of cells) assert.equal(ids[c.index].toString(), c.rootId);
for (const g of mapping.groups) for (const c of g.dan) assert.equal(ids[c.index].toString(), c.rootId);
model.forward([0]); const rest = Float32Array.from(model.h[model.steps]); await pace(performance.now() - setupStarted);
const encoder = createRelationalChessCueEncoder(mapping, p.encoder);
const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder, readouts, rest,
  maxPresentations: p.maxPresentationsPerCondition, priorScale: p.priorScale, current: p.current, guard, pace });
let invocationPresentations = 0;
const evoke = brain.evoke.bind(brain);
brain.evoke = async stimulation => {
  const before = brain.presentations;
  try { return await evoke(stimulation); }
  finally { invocationPresentations += brain.presentations - before; }
};
const identity = { schema: p.schema, inputs, sources, model: model.config, memory: memory.config,
  mappingHash: digest(mapping), readouts, invariant, encoderIdentity: encoder.identity, duty, puzzleCount };
let state = { identity, checkpoint: 0, conditionIndex: 0, puzzleIndex: 0, active: null,
  memory: naive, presentations: 0, sharedPlans: [], shuffle: null, results: [], totalEvents: 0 };
if (args.resume) {
  state = read(args.resume); assert.equal(digest(state.identity), digest(identity));
  assert.ok(state.conditionIndex >= 0 && state.conditionIndex <= p.conditions.length);
  assert.ok(state.puzzleIndex >= 0 && state.puzzleIndex < puzzleCount);
  memory.restore(state.memory); brain.presentations = state.presentations;
}
mkdirSync(args.out, { recursive: true });
function save() {
  guard(); assert.equal(fixedStateHash(model, memory.edges), invariant);
  state.memory = memory.snapshot(); state.presentations = brain.presentations; state.checkpoint++;
  const name = `checkpoint-${String(state.checkpoint).padStart(5, '0')}`, temporary = join(args.out, name + '.partial');
  mkdirSync(temporary); writeFileSync(join(temporary, 'state.json'), JSON.stringify(state));
  renameSync(temporary, join(args.out, name));
}
function resources() { const cpu = process.cpuUsage(cpuStarted); return {
  peakRssMiB: process.resourceUsage().maxRSS / 1024, elapsedSeconds: (performance.now() - started) / 1000,
  cpuSeconds: (cpu.user + cpu.system) / 1e6, cpuDuty: duty, presentationsThisInvocation: invocationPresentations }; }
process.on('uncaughtException', error => { writeFileSync(join(args.out, 'interruption.json'), JSON.stringify({
  error: String(error.stack), resources: resources(), checkpoint: state.checkpoint,
  conditionIndex: state.conditionIndex, puzzleIndex: state.puzzleIndex, phase: state.active?.phase }, null, 2)); process.exit(1); });
save(); let events = 0, stop = false; process.on('SIGINT', () => { stop = true; });
async function publish(name, value) {
  const path = join(args.out, name); writeFileSync(path + '.partial', JSON.stringify(value)); renameSync(path + '.partial', path);
  return { path, sha256: await sha256(path) };
}
async function loadRef(ref) { assert.equal(await sha256(ref.path), ref.sha256); return read(ref.path); }
function choiceProof(board, move, row) {
  const successor = copyBoard(board); successor.move({ from: move.slice(0, 2), to: move.slice(2, 4),
    ...(move.length === 5 ? { promotion: move[4] } : {}) });
  return certifyMate(successor, board.turn(), { plies: row.plies - 1, maxNodes: 4096, milliseconds: 2000 });
}
while (state.conditionIndex < p.conditions.length && !stop && events < maxEvents) {
  const condition = p.conditions[state.conditionIndex], row = await rowAt(state.puzzleIndex), board = experienceBoard(row);
  const task = { objective: row.objective, plies: row.plies };
  if (!state.active) { state.active = { condition, row, phase: 'plan', nextEvent: 0,
    beforeMemory: memory.snapshot(), receiptRefs: [] }; save(); }
  const a = state.active; assert.deepEqual(a.row, row); assert.equal(a.condition, condition);
  if (a.phase === 'plan') {
    a.before = await brain.assess(board, board.moves({ verbose: true }), task);
    const ownPlan = await planPuzzleExperience(brain, row, { search: { ...p.search, seed: p.seed + state.puzzleIndex },
      review: p.review, maxTraceRecords: p.search.simulations, guard });
    a.beforeSearch = ownPlan.calculation; a.beforeChoiceProof = choiceProof(board, a.before.choice, row);
    a.beforeSearchProof = choiceProof(board, uci(a.beforeSearch.move), row);
    if (condition === 'informative') {
      a.planRef = await publish(`plan-${state.puzzleIndex}.json`, ownPlan);
      state.sharedPlans[state.puzzleIndex] = a.planRef;
    } else a.planRef = state.sharedPlans[state.puzzleIndex];
    const plan = await loadRef(a.planRef); a.eventCount = plan.experiences.length;
    a.phase = 'teaching'; save();
  }
  const plan = await loadRef(a.planRef);
  while (a.nextEvent < a.eventCount && !stop && events < maxEvents) {
    if (a.phase === 'teaching') {
      const experience = plan.experiences[a.nextEvent];
      let channel = experience.status === 'success' ? 'PAM02' : 'PPL103';
      if (condition === 'absent' || (condition === 'punishment-only' && channel === 'PAM02')) channel = null;
      if (condition === 'shuffled') {
        let offset = a.nextEvent;
        for (let i = 0; i < state.puzzleIndex; i++) offset += (await loadRef(state.sharedPlans[i])).experiences.length;
        channel = state.shuffle[offset];
      }
      a.pending = await brain.replay(experience, { channel, plasticityEnabled: condition !== 'disabled' });
      a.phase = 'receipt'; save(); // Lasting memory plus pending receipt, before acknowledgement.
    }
    if (a.phase === 'receipt') {
      a.receiptRefs.push(await publish(`event-${condition}-${state.puzzleIndex}-${a.nextEvent}.json`, a.pending));
      a.pending = null; a.nextEvent++; events++; state.totalEvents++;
      if (state.totalEvents > p.maxExperiences) throw Error('Experience bound');
      a.phase = 'teaching'; save();
    }
  }
  if (a.nextEvent < a.eventCount || stop) break;
  if (a.phase === 'teaching') { a.phase = 'measure'; save(); }
  if (a.phase === 'measure') {
    a.after = await brain.assess(board, board.moves({ verbose: true }), task);
    a.afterSearch = await searchMonteCarlo(brain, board, { ...p.search, seed: p.seed + state.puzzleIndex, guard });
    a.afterChoiceProof = choiceProof(board, a.after.choice, row);
    a.afterSearchProof = choiceProof(board, uci(a.afterSearch.move), row);
    const learned = memory.snapshot();
    a.repeat = await brain.assess(board, board.moves({ verbose: true }), task);
    memory.restore(a.beforeMemory); a.reset = await brain.assess(board, board.moves({ verbose: true }), task);
    memory.restore(learned); a.restored = await brain.assess(board, board.moves({ verbose: true }), task);
    assert.deepEqual(a.repeat, a.after); assert.deepEqual(a.reset, a.before); assert.deepEqual(a.restored, a.after);
    a.afterMemory = learned; a.fixedStatePreserved = true;
    state.results.push({ ...a }); state.active = null; state.puzzleIndex++;
    if (state.puzzleIndex === puzzleCount) {
      if (condition === 'informative') {
        const flags = [];
        for (const ref of state.sharedPlans) flags.push(...(await loadRef(ref)).experiences.map(e => e.status === 'success' ? 'PAM02' : 'PPL103'));
        state.shuffle = shuffledFeedback(flags, p.seed);
      }
      state.puzzleIndex = 0; state.conditionIndex++; memory.restore(naive); brain.presentations = 0;
    }
    save(); console.log(JSON.stringify({ condition, puzzle: row.id, before: a.before.choice,
      after: a.after.choice, status: a.afterChoiceProof.status, experiences: a.eventCount }));
  }
}
let summary = null;
if (state.conditionIndex === p.conditions.length) {
  const informative = state.results.filter(r => r.condition === 'informative');
  const repaired = informative.filter(r => r.beforeChoiceProof.status === 'failure' && r.afterChoiceProof.status === 'success');
  const matched = (r, condition) => state.results.find(v => v.row.id === r.row.id && v.condition === condition);
  const gates = {
    usefulChoices: informative.length === puzzleCount && informative.every(r => r.afterChoiceProof.status === 'success'),
    repairAboveAbsentDisabled: repaired.some(r => ['absent', 'disabled'].every(c => matched(r, c).afterChoiceProof.status === 'failure')),
    persistenceAndCausalReset: state.results.every(r => digest(r.repeat) === digest(r.after)
      && digest(r.reset) === digest(r.before) && digest(r.restored) === digest(r.after)),
    fixedState: state.results.every(r => r.fixedStatePreserved),
  };
  summary = { gates, allPilotChoiceGatesPassed: Object.values(gates).every(Boolean),
    scope: 'Single-seed familiar-fixture pilot only; independent receipt/channel/prefix audits still required; no statistical specificity or transfer claim' };
}
const report = { complete: state.conditionIndex === p.conditions.length, identity, protocol: p, summary,
  results: state.results, active: state.active, sharedPlans: state.sharedPlans, shuffle: state.shuffle,
  totalEvents: state.totalEvents, resources: resources(),
  command: { argv: process.argv, execArgv: process.execArgv, node: process.version }, scope: p.scope };
writeFileSync(join(args.out, 'report.json.partial'), JSON.stringify(report, null, 2));
renameSync(join(args.out, 'report.json.partial'), join(args.out, 'report.json'));
console.log(JSON.stringify({ complete: report.complete, resources: report.resources, events: events }));
