// Bounded full-graph timing diagnostic for forcing-candidate PUCT.
// No feedback is delivered and persistent memory is not changed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { searchMonteCarlo } from '../../src/search-and-feedback/monte-carlo-puzzle-search.mjs';
import { verifyMate } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest, annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';

const { values: args } = parseArgs({ options: {
  out: { type: 'string' }, 'candidate-mode': { type: 'string' },
  'max-evaluations': { type: 'string', default: '2' },
  simulations: { type: 'string', default: '2' },
  'forcing-prior-mix': { type: 'string', default: '0' },
  'puzzle-path': { type: 'string' }, 'position-id': { type: 'string' }
} });
const candidateMode = args['candidate-mode'] ?? 'forcing';
const maxEvaluations = Number(args['max-evaluations']);
const simulations = Number(args.simulations);
const forcingPriorMix = Number(args['forcing-prior-mix']);
if (!args.out || existsSync(args.out) || !['all-legal', 'forcing'].includes(candidateMode)
  || !Number.isSafeInteger(maxEvaluations) || maxEvaluations < 1 || maxEvaluations > 16
  || !Number.isSafeInteger(simulations) || simulations < 1 || simulations > 32
  || !Number.isFinite(forcingPriorMix) || forcingPriorMix < 0 || forcingPriorMix > 1
  || (forcingPriorMix > 0 && candidateMode !== 'forcing'))
  throw Error('Require fresh --out, a candidate mode, bounded simulations/evaluations and a valid forcing prior mix');
const duty = 0.5, rssLimit = 768 * 2 ** 20, freeLimit = 256 * 2 ** 20;
const started = performance.now(), cpuStarted = process.cpuUsage();
const hash = value => createHash('sha256').update(value).digest('hex');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const timings = { evaluateMs: [], assessMs: [], evokeMs: [], encodeMs: [], paceMs: [] };
const counts = { neuralPresentations: 0, candidateAssessments: 0, evaluatedPositions: 0 };
function guard() {
  const rss = process.memoryUsage().rss, free = os.freemem();
  if (rss > rssLimit || free < freeLimit) throw Error(`Resource guard rssMiB=${rss / 2 ** 20} freeMiB=${free / 2 ** 20}`);
}
async function pace(workMs) {
  const t = performance.now(); let remaining = workMs * (1 / duty - 1);
  do {
    const delay = Math.min(250, Math.max(0, remaining));
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    remaining -= delay; guard();
  } while (remaining > 0);
  timings.paceMs.push(performance.now() - t);
}

const protocolPath = 'research/data/smothered-acquisition-v1/protocol.json';
const puzzlePath = args['puzzle-path'] ?? 'research/data/smothered-acquisition-v1/puzzles.jsonl';
const mappingPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const prerequisiteDir = 'research/reports/compartment-input-original-2026-10-06';
const prerequisitePath = join(prerequisiteDir, 'report.json');
const prerequisite = readJson(prerequisitePath);
const prerequisiteAuditPath = join(prerequisiteDir, 'audit-prefix.json');
const prerequisiteAudit = readJson(prerequisiteAuditPath);
assert.equal(prerequisite.complete, true);
assert.equal(prerequisiteAudit.passed, true);
assert.equal(prerequisiteAudit.prefixExact, true);
assert.equal(await sha256(prerequisitePath), prerequisiteAudit.reportSha256);
assert.equal(prerequisiteAudit.reportSha256, '9647b9c1cd0311a237c7ddd38691a88b07754de19331c4a5240388f3d2e5fdd8');
const protocol = readJson(protocolPath);
let puzzleRows = readFileSync(puzzlePath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
if (args['position-id']) puzzleRows = puzzleRows.filter(row => row.id === args['position-id']);
assert.equal(puzzleRows.length, 1);
assert.equal(await sha256('.cache/full.npz'), graphHash);
assert.equal(await sha256('.cache/flywire-annotations-v2.1.0.tsv'), annotationHash);
for (const [path, expected] of Object.entries(prerequisite.identity.inputs))
  if (path === '.cache/full.npz' || path === '.cache/flywire-annotations-v2.1.0.tsv') assert.equal(await sha256(path), expected);

const sourcePaths = [
  '.codebase/scripts/evaluation-and-performance/profile-forcing-monte-carlo.mjs',
  '.codebase/scripts/runtime/fetch-graph.mjs',
  '.codebase/src/search-and-feedback/monte-carlo-puzzle-search.mjs',
  '.codebase/src/search-and-feedback/delta-forcing-candidates.mjs',
  '.codebase/src/search-and-feedback/experimental-puzzle-search.mjs',
  '.codebase/src/puzzle-learning/dual-valence-puzzle-brain.mjs',
  '.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs',
  '.codebase/src/chess-input/compartment-chess-cue.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs',
  '.codebase/src/neural-learning/dual-valence-interface.mjs',
  '.codebase/src/neural-learning/mbon-readout.mjs',
  '.codebase/src/neural-learning/association-validation.mjs',
  '.codebase/src/neural-learning/mushroom-body.mjs',
  '.codebase/src/runtime/graph.mjs',
  '.codebase/src/supervised-baselines/trainer.mjs', 'package.json', 'package-lock.json',
];
const sourceHashes = Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, await sha256(path)])));
const inputPaths = [protocolPath, puzzlePath, mappingPath, prerequisitePath, prerequisiteAuditPath,
  '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv'];
const inputHashes = Object.fromEntries(await Promise.all(inputPaths.map(async path => [path, await sha256(path)])));
const dependencyIdentity = { node: process.version,
  chessJs: JSON.parse(readFileSync('node_modules/chess.js/package.json', 'utf8')).version,
  packageLockSha256: inputHashes['package-lock.json'] ?? await sha256('package-lock.json') };

guard();
const graph = loadGraph('.cache/full.npz'); guard();
const model = new SparseTrainer(graph, prerequisite.identity.model); guard();
const mapping = readJson(mappingPath).mapping;
assert.equal(digest(mapping), prerequisite.identity.mappingHash);
const memory = new ReversalMemory(model, mapping, protocol.memory);
const memoryBefore = memory.snapshot(), fixedBefore = fixedStateHash(model, memory.edges);
assert.equal(fixedBefore, prerequisite.identity.invariant);
const ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
for (const cells of Object.values(prerequisite.identity.readouts))
  for (const cell of cells) assert.equal(ids[cell.index].toString(), cell.rootId);
for (const group of mapping.groups) for (const cell of group.dan)
  assert.equal(ids[cell.index].toString(), cell.rootId);
model.forward([0]); const rest = Float32Array.from(model.h[model.steps]); guard();

const baseEncoder = createCompartmentChessCueEncoder(mapping, protocol.encoder);
const encoder = { ...baseEncoder, encode(...xs) {
  const t = performance.now(); try { return baseEncoder.encode(...xs); }
  finally { timings.encodeMs.push(performance.now() - t); counts.candidateAssessments++; }
} };
const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder,
  readouts: prerequisite.identity.readouts, rest,
  maxPresentations: 4096, priorScale: protocol.priorScale ?? 4,
  current: protocol.current, guard, pace });
const originalEvoke = brain.evoke.bind(brain);
brain.evoke = async (...xs) => {
  const t = performance.now(); try { return await originalEvoke(...xs); }
  finally { timings.evokeMs.push(performance.now() - t); counts.neuralPresentations++; }
};
const originalAssess = brain.assess.bind(brain);
brain.assess = async (...xs) => {
  const t = performance.now(); try { return await originalAssess(...xs); }
  finally { timings.assessMs.push(performance.now() - t); }
};
const originalEvaluate = brain.evaluate.bind(brain);
brain.evaluate = async (...xs) => {
  const t = performance.now(); try { return await originalEvaluate(...xs); }
  finally { timings.evaluateMs.push(performance.now() - t); counts.evaluatedPositions++; }
};

const row = puzzleRows[0], board = new Chess(row.fen), originalFen = board.fen();
const searchConfig = { seed: protocol.seed, simulations, maxEvaluations,
  maxDepth: 3, maxNodes: 1024, milliseconds: 120000,
  exploration: 1.5, randomFraction: protocol.search.randomFraction, uniformMix: 0.15,
  candidateMode, maxCandidates: 16, quietReserve: 4, forcingPriorMix,
  task: { objective: row.objective, plies: row.plies },
  // Match the acquisition runner: neural presentations are paced by the brain;
  // the search-level callback is left at its no-op default.
  guard };
const traces = [];
const result = await searchMonteCarlo(brain, board, { ...searchConfig,
  onSimulation: async trace => traces.push(trace) });
guard();
assert.equal(board.fen(), originalFen, 'hypothetical search changed the task board');
assert.deepEqual(memory.snapshot(), memoryBefore, 'search changed persistent memory');
assert.equal(fixedStateHash(model, memory.edges), fixedBefore, 'search changed fixed parameters');
assert.ok(result.evaluations <= searchConfig.maxEvaluations);
assert.equal(counts.evaluatedPositions, result.evaluations);
assert.equal(counts.neuralPresentations, counts.candidateAssessments);

const cpu = process.cpuUsage(cpuStarted), outputDir = args.out;
mkdirSync(outputDir, { recursive: true });
const report = {
  schema: 'forcing-monte-carlo-profile-v1', complete: true,
  timestamp: new Date().toISOString(),
  scope: `One bounded full-graph PUCT search using ${candidateMode} candidate selection on one development position. Search only; no feedback, persistent learning or transfer.`,
  identity: { inputs: inputHashes, sources: sourceHashes, dependencyIdentity,
    graphHash, annotationHash, model: model.config, memory: memory.config,
    mappingHash: digest(mapping), encoderIdentity: baseEncoder.identity,
    baselineMemoryHash: digest(memoryBefore), fixedStateHash: fixedBefore },
  position: { id: row.id, split: row.split, puzzlePath, fen: row.fen,
    objective: row.objective, plies: row.plies,
    rootLegalMoves: board.moves().length },
  searchConfig, candidateMode,
  search: { move: result.candidates.find(c => c.move === result.move)?.uci,
    simulations: result.simulations, evaluations: result.evaluations,
    nodes: result.nodes, terminalLeaves: result.terminalLeaves,
    cutoffs: result.cutoffs, stoppedBy: result.stoppedBy,
    elapsedMs: result.elapsedMs, candidates: result.candidates.map(c => ({ uci: c.uci,
      visits: c.visits, valueVisits: c.valueVisits, prior: c.prior, value: c.value })), traces,
    candidateMode: result.candidateMode, candidateCoverage: result.candidateCoverage,
    verifiedChoiceConsequence: (() => {
      const chosen = new Chess(board.fen()); chosen.move(result.candidates.find(c => c.move === result.move)?.uci);
      return verifyMate(chosen, board.turn(), { plies: row.plies - 1, maxNodes: 4096 }).status;
    })() },
  work: { ...counts,
    candidatePresentationsPerEvaluatedPosition: counts.evaluatedPositions
      ? counts.neuralPresentations / counts.evaluatedPositions : null,
    meanLegalCandidatesPerEvaluation: counts.evaluatedPositions
      ? counts.candidateAssessments / counts.evaluatedPositions : null },
  timings: Object.fromEntries(Object.entries(timings).map(([key, xs]) => [key, {
    count: xs.length, totalMs: xs.reduce((a, b) => a + b, 0),
    meanMs: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null,
    maxMs: xs.length ? Math.max(...xs) : null }])),
  resources: { peakRssMiB: process.resourceUsage().maxRSS / 1024,
    elapsedSeconds: (performance.now() - started) / 1000,
    cpuSeconds: (cpu.user + cpu.system) / 1e6, cpuDuty: duty },
};
const finalPath = join(outputDir, 'report.json'), tempPath = finalPath + '.partial';
writeFileSync(tempPath, JSON.stringify(report, null, 2), { flag: 'wx' });
renameSync(tempPath, finalPath);
writeFileSync(join(outputDir, 'COMPLETE'), hash(JSON.stringify(report)) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ search: report.search, work: report.work,
  timings: report.timings, resources: report.resources, report: finalPath }));
