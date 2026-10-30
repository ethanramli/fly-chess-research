import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest, annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { runMultiContextStability } from '../../src/puzzle-learning/multi-context-stability-experiment.mjs';
import { reviewCommittedChoice } from '../../src/search-and-feedback/adaptive-choice-review.mjs';
import { searchMonteCarlo } from '../../src/search-and-feedback/monte-carlo-puzzle-search.mjs';
import { uci } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const protocolPath = 'research/data/multi-context-stability-v1/protocol.json';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const p = read(protocolPath);
const { values: args } = parseArgs({ options: { out: { type: 'string' }, resume: { type: 'string' },
  preflight: { type: 'boolean' }, 'cpu-duty': { type: 'string', default: '0.5' },
  'max-events': { type: 'string', default: '128' } } });
const duty = Number(args['cpu-duty']), maxEvents = Number(args['max-events']);
assert.ok(Number.isFinite(duty) && duty === p.runtime.cpuDuty);
assert.ok(Number.isSafeInteger(maxEvents) && maxEvents > 0 && maxEvents <= 128);
assert.equal(process.version, p.runtime.nodeVersion);
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
assert.ok(Object.keys(p.sources).length >= 20, 'Require complete frozen runtime source identities');
for (const [path, hash] of Object.entries({ ...p.inputs, ...p.sources }))
  assert.equal(await sha256(path), hash, `Frozen identity differs: ${path}`);
assert.equal(await sha256('.cache/full.npz'), graphHash);
assert.equal(await sha256('.cache/flywire-annotations-v2.1.0.tsv'), annotationHash);
const dependencyPath = fileURLToPath(import.meta.resolve('chess.js'));
assert.equal(resolve(dependencyPath), resolve(p.runtime.chessEntrypoint));
assert.equal(await sha256(dependencyPath), p.inputs[p.runtime.chessEntrypoint]);
assert.equal(read('node_modules/chess.js/package.json').version, p.runtime.chessJs);
for (const ref of p.requiredAudits) {
  const audit = read(ref.audit), report = read(ref.report);
  assert.equal(await sha256(ref.report), ref.reportSha256);
  assert.equal(audit.passed, true); assert.equal(report.complete, true);
  assert.equal(audit.reportSha256, await sha256(ref.report));
}
const mapping = read(p.mappingPath).mapping;
assert.equal(digest(mapping), p.shared.mappingHash);
const rows = p.positions.map(ref => {
  assert.equal(ref.role, 'training'); assert.equal(ref.finalTestEligible, false);
  const row = readFileSync(ref.path, 'utf8').trim().split(/\r?\n/).map(JSON.parse).find(r => r.id === ref.id);
  assert.ok(row); assert.equal(row.objective, 'forced-mate'); assert.equal(row.plies, 3);
  assert.equal(row.split, 'train');
  if (row.finalTestEligible !== undefined) assert.equal(row.finalTestEligible, false);
  return row;
});
const encoder = createCompartmentChessCueEncoder(mapping, { ...p.encoder, ...p.variant });
for (let i = 0; i < rows.length; i++) {
  const board = new Chess(rows[i].fen), move = p.successMoves[i];
  assert.ok(board.moves({ verbose: true }).some(m => uci(m) === move));
  const checked = reviewCommittedChoice(board, move,
    { objective: rows[i].objective, plies: rows[i].plies }, p.verification);
  assert.equal(checked.status, 'success', `Pinned positive is not currently verifiable: ${rows[i].id}`);
  const cue = encoder.encode(board, move, { objective: rows[i].objective, plies: rows[i].plies });
  assert.equal(cue.stimulation.length, p.encoder.maxCells);
  assert.equal(cue.stimulation.reduce((sum, cell) => sum + cell.current, 0), p.encoder.totalCurrent);
}
if (args.preflight) {
  console.log(JSON.stringify({ passed: true, encoderIdentity: encoder.identity,
    contexts: rows.map((row, i) => ({ id: row.id, legalMoves: new Chess(row.fen).moves().length,
      successMove: p.successMoves[i], positiveVerified: true })), sources: Object.keys(p.sources).length,
    scope: 'Frozen identity, prerequisite, training-family, dependency and cue preflight; no graph inference' }));
  process.exit(0);
}
assert.ok(args.out && !existsSync(args.out), 'Require fresh output');
const guard = () => {
  if (process.memoryUsage().rss > 768 * 2 ** 20 || os.freemem() < 256 * 2 ** 20)
    throw Error('Resource guard: 768 MiB RSS / 256 MiB free memory');
};
async function pace(ms) {
  let remaining = ms * (1 / duty - 1);
  while (remaining > 0) { const delay = Math.min(250, remaining);
    await new Promise(r => setTimeout(r, delay)); remaining -= delay; guard(); }
}
const started = performance.now(), cpuStarted = process.cpuUsage();
guard(); const graph = loadGraph('.cache/full.npz'); guard();
const ids = readNpz('.cache/full.npz', ['root_ids']).root_ids; guard();
const model = new SparseTrainer(graph, p.shared.model); guard();
const memory = new ReversalMemory(model, mapping, p.shared.memory); guard();
const initial = read(p.initialMemoryPath);
assert.equal(digest(initial.memory), p.initialMemoryHash);
assert.equal(initial.memory.identity, memory.identity);
memory.restore(initial.memory);
const naive = memory.snapshot(), invariant = fixedStateHash(model, memory.edges);
assert.equal(invariant, p.shared.invariant);
for (const cell of [...Object.values(p.shared.readouts).flat(), ...mapping.groups.flatMap(g => g.dan)])
  assert.equal(ids[cell.index].toString(), cell.rootId);
const restStart = performance.now(); model.forward([0]);
const rest = Float32Array.from(model.h[model.steps]); await pace(performance.now() - restStart);
const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder,
  readouts: p.shared.readouts, rest, current: p.current, priorScale: p.priorScale,
  maxPresentations: p.maxPresentations, guard, pace });
let invocationPresentations = 0;
const evoke = brain.evoke.bind(brain);
brain.evoke = async (...xs) => { const before = brain.presentations;
  try { return await evoke(...xs); } finally { invocationPresentations += brain.presentations - before; } };
const replay = brain.replay.bind(brain);
brain.replay = async (...xs) => {
  const before = fixedStateHash(model, memory.edges), receipt = await replay(...xs);
  const after = fixedStateHash(model, memory.edges);
  assert.equal(before, invariant); assert.equal(after, invariant);
  return { ...receipt, fixedStateBefore: before, fixedStateAfter: after };
};
const identity = { protocolPath, protocolSha256: await sha256(protocolPath), sources: p.sources, inputs: p.inputs,
  fixedStateHash: invariant, initialMemoryHash: digest(naive), encoderIdentity: encoder.identity,
  model: model.config, memory: memory.config, mappingHash: digest(mapping), readouts: p.shared.readouts,
  dependency: { entrypoint: dependencyPath, sha256: await sha256(dependencyPath), version: p.runtime.chessJs },
  runtime: { node: process.version, heapMiB: 256, cpuDuty: duty } };
const out = resolve(args.out); mkdirSync(out);
const atomic = (path, data) => {
  const bytes = JSON.stringify(data, null, 2) + '\n';
  if (existsSync(path)) { assert.equal(readFileSync(path, 'utf8'), bytes); return; }
  writeFileSync(path + '.partial', bytes, { flag: 'wx' }); renameSync(path + '.partial', path);
};
const publish = async (name, value) => {
  guard(); const path = join(out, name); atomic(path, value);
  return { path: path.replaceAll('\\', '/'), sha256: await sha256(path) };
};
const load = async ref => { assert.equal(await sha256(ref.path), ref.sha256); return read(ref.path); };
let checkpoint = 0, state;
if (args.resume) {
  const manifest = read(join(dirname(args.resume), 'checkpoint.json'));
  assert.equal(await sha256(args.resume), manifest.stateSha256);
  const saved = read(args.resume); assert.deepEqual(saved.identity, identity);
  state = saved.state; assert.deepEqual(state.naive, naive);
} else state = { naive, memory: naive, presentations: 0, conditionIndex: 0, totalEvents: 0,
  active: null, results: [], evaluationRefs: [] };
const save = async value => {
  guard(); assert.equal(fixedStateHash(model, memory.edges), invariant);
  const name = `checkpoint-${String(++checkpoint).padStart(5, '0')}`;
  const partial = join(out, name + '.partial'), final = join(out, name);
  mkdirSync(partial); const path = join(partial, 'state.json');
  atomic(path, { identity, state: value });
  atomic(join(partial, 'checkpoint.json'), { stateSha256: await sha256(path), sequence: checkpoint });
  renameSync(partial, final);
};
const boardFor = row => { const board = new Chess(row.fen); if (row.pgn) board.loadPgn(row.pgn); return board; };
const taskFor = row => ({ objective: row.objective, plies: row.plies });
async function panel(row) {
  const before = digest(memory.snapshot()), board = boardFor(row), begin = performance.now();
  const assessment = await brain.assess(board, board.moves({ verbose: true }), taskFor(row));
  const review = reviewCommittedChoice(board, assessment.choice, taskFor(row), p.verification);
  assert.equal(digest(memory.snapshot()), before);
  return { rowId: row.id, assessment, review, memoryFingerprint: before,
    elapsedMs: performance.now() - begin };
}
async function search(row, config) {
  const before = digest(memory.snapshot()), board = boardFor(row), traces = [], begin = performance.now();
  const result = await searchMonteCarlo(brain, board, { ...config, task: taskFor(row), guard,
    onSimulation: async trace => traces.push(trace) });
  const review = reviewCommittedChoice(board, uci(result.move), taskFor(row), p.verification);
  assert.equal(digest(memory.snapshot()), before); assert.equal(board.fen(), row.fen);
  return { rowId: row.id, search: result, traces, review, memoryFingerprint: before,
    elapsedMs: performance.now() - begin };
}
try {
  atomic(join(out, 'run-identity.json'), identity);
  memory.restore(state.memory); brain.presentations = state.presentations;
  if (!state.naiveSearchRefs) {
    assert.deepEqual(memory.snapshot(), naive); state.baselineRefs = [];
    state.naiveSearchRefs = [];
    for (let i = 0; i < rows.length; i++) {
      state.baselineRefs.push(await publish(`baseline-${i}.json`, await panel(rows[i])));
      state.naiveSearchRefs.push(await publish(`naive-search-${i}.json`, await search(rows[i], p.evaluationSearch)));
    }
    state.memory = memory.snapshot(); state.presentations = brain.presentations; await save(state);
  }
  const execution = await runMultiContextStability({ brain, rows, successMoves: p.successMoves,
    protocol: p, state, save, publish, load, guard, maxEvents });
  state = execution.state;
  if (execution.complete) {
    while (state.evaluationRefs.length < state.results.length) {
      const result = state.results[state.evaluationRefs.length], learned = await load(result.resultRef);
      memory.restore(learned.learned); const contexts = [];
      for (let i = 0; i < rows.length; i++) contexts.push({
        panel: await panel(rows[i]), fixedBudgetSearch: await search(rows[i], p.evaluationSearch) });
      state.evaluationRefs.push(await publish(`evaluation-${result.condition}.json`, {
        condition: result.condition, memoryFingerprint: digest(learned.learned), contexts }));
      memory.restore(state.memory); state.presentations = brain.presentations; await save(state);
    }
  }
  const results = await Promise.all(state.results.map(r => load(r.resultRef)));
  const baseline = await Promise.all(state.baselineRefs.map(load));
  const informative = results.find(r => r.condition === 'informative');
  const repaired = baseline.map((b, i) => b.review.status === 'failure'
    && informative?.after[i]?.review.status === 'success');
  const evaluations = await Promise.all(state.evaluationRefs.map(load));
  const evalInformative = evaluations.find(r => r.condition === 'informative');
  const cpu = process.cpuUsage(cpuStarted);
  const report = { schema: p.schema, complete: execution.complete, identity,
    resumeOrigin: args.resume ?? null, command: { executable: process.execPath, execArgv: process.execArgv, argv: process.argv },
    state, baseline, results, evaluations,
    summary: { baseline: baseline.map(v => v.review.status), informative: informative?.after.map(v => v.review.status) ?? null,
      controls: results.filter(r => r.condition !== 'informative').map(r => ({ condition: r.condition,
        status: r.after.map(v => v.review.status) })), shuffleIdentifiable: state.shuffleIdentifiable ?? false,
      allContextAcquisition: execution.complete && informative?.after.every(v => v.review.status === 'success') === true,
      repairedAboveControls: repaired.some((yes, i) => yes && results.filter(r => ['absent','disabled'].includes(r.condition))
        .every(r => r.after[i]?.review.status === 'failure')),
      allContextSearch: evalInformative?.contexts.every(v => v.fixedBudgetSearch.review.status === 'success') === true,
      scope: 'Shared-memory acquisition on two related training positions only; no unfamiliar-family or reasoning claim' },
    resources: { elapsedSeconds: (performance.now() - started) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6,
      peakRssMiB: process.resourceUsage().maxRSS / 1024, invocationPresentations, cpuDuty: duty,
      scope: 'Invocation only; resumed invocation metrics are not whole-run totals.' } };
  atomic(join(out, 'report.json'), report); console.log(JSON.stringify({ complete: report.complete,
    summary: report.summary, resources: report.resources, checkpoints: checkpoint }));
} catch (error) {
  atomic(join(out, 'interruption.json'), { error: String(error.stack), identity,
    lastPublishedCheckpoint: checkpoint ? `checkpoint-${String(checkpoint).padStart(5, '0')}` : null });
  throw error;
}
