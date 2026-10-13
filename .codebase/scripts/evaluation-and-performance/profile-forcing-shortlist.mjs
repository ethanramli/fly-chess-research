// Paired full-graph all-legal versus forcing-shortlist read-only assessment.
// It does not teach, update memory, or integrate the shortlist into MCTS.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { Chess } from 'chess.js';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest, annotationHash } from '../../src/neural-learning/mushroom-body.mjs';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { forcingCandidates } from '../../src/search-and-feedback/delta-forcing-candidates.mjs';
import { reviewCommittedChoice } from '../../src/search-and-feedback/adaptive-choice-review.mjs';
import { uci } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' } } });
if (!args.out || existsSync(args.out)) throw Error('Require --out pointing to a fresh report directory');
const duty = 0.5, maxCandidates = 16, quietReserve = 4;
const rssLimit = 768 * 2 ** 20, freeLimit = 256 * 2 ** 20;
const start = performance.now(), cpuStart = process.cpuUsage();
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const timings = [];
function guard() {
  const rss = process.memoryUsage().rss, free = os.freemem();
  if (rss > rssLimit || free < freeLimit) throw Error(`Resource guard rssMiB=${rss / 2 ** 20} freeMiB=${free / 2 ** 20}`);
}
async function pace(workMs) {
  let remaining = workMs * (1 / duty - 1);
  do {
    const delay = Math.min(250, Math.max(0, remaining));
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    remaining -= delay; guard();
  } while (remaining > 0);
}

const protocolPath = 'research/data/smothered-acquisition-v1/protocol.json';
const puzzlePath = 'research/data/smothered-acquisition-v1/puzzles.jsonl';
const mapPath = 'research/reports/reversal-candidate-2026-10-05/mapping.json';
const prerequisiteDir = 'research/reports/compartment-input-original-2026-10-06';
const prerequisitePath = join(prerequisiteDir, 'report.json');
const prerequisiteAuditPath = join(prerequisiteDir, 'audit-prefix.json');
const prepDir = 'research/reports/smothered-mate-preparation-2026-10-07';
const prepReportPath = join(prepDir, 'report.json'), prepAuditPath = join(prepDir, 'audit.json');
const certificatesPath = join(prepDir, 'certificates.jsonl');
const protocol = readJson(protocolPath), prerequisite = readJson(prerequisitePath);
const prerequisiteAudit = readJson(prerequisiteAuditPath), prepReport = readJson(prepReportPath);
const prepAudit = readJson(prepAuditPath), mapping = readJson(mapPath).mapping;
assert.equal(prerequisite.complete, true);
assert.equal(prerequisiteAudit.passed, true);
assert.equal(prerequisiteAudit.prefixExact, true);
assert.equal(await sha256(prerequisitePath), prerequisiteAudit.reportSha256);
assert.equal(prerequisiteAudit.reportSha256, '9647b9c1cd0311a237c7ddd38691a88b07754de19331c4a5240388f3d2e5fdd8');
assert.equal(prepAudit.passed, true);
assert.equal(prepAudit.certificatesChecked, 32);
assert.equal(prepAudit.legalCoverage, true);
assert.equal(prepAudit.immediateMateAbsent, true);
assert.equal(await sha256('.cache/full.npz'), graphHash);
assert.equal(await sha256('.cache/flywire-annotations-v2.1.0.tsv'), annotationHash);

const rows = readFileSync(puzzlePath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
assert.equal(rows.length, 1);
const puzzle = rows[0], board = new Chess(puzzle.fen), task = { objective: puzzle.objective, plies: puzzle.plies };
assert.equal(prepReport.row.fen, puzzle.fen);
assert.equal(prepReport.row.objective, puzzle.objective);
assert.equal(prepReport.row.plies, puzzle.plies);
const certificateRows = readFileSync(certificatesPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const legalMoves = board.moves({ verbose: true }), legalUci = legalMoves.map(uci).sort();
assert.equal(certificateRows.length, legalMoves.length);
const certificatesByMove = new Map(certificateRows.map(row => [row.move, row]));
assert.equal(certificatesByMove.size, legalMoves.length);
assert.deepEqual([...certificatesByMove.keys()].sort(), legalUci);
assert.ok(certificateRows.every(row => row.context.fen === puzzle.fen
  && row.context.task.objective === task.objective && row.context.task.plies === task.plies));
const successfulMoves = certificateRows.filter(row => row.status === 'success').map(row => row.move);
assert.deepEqual(successfulMoves, ['c4g8']);

const sourcePaths = [
  '.codebase/scripts/evaluation-and-performance/profile-forcing-shortlist.mjs',
  '.codebase/scripts/runtime/fetch-graph.mjs',
  '.codebase/src/puzzle-learning/dual-valence-puzzle-brain.mjs',
  '.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs',
  '.codebase/src/chess-input/compartment-chess-cue.mjs',
  '.codebase/src/chess-input/relational-chess-cue-v2.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs',
  '.codebase/src/neural-learning/dual-valence-interface.mjs',
  '.codebase/src/neural-learning/association-validation.mjs',
  '.codebase/src/neural-learning/mushroom-body.mjs',
  '.codebase/src/neural-learning/mbon-readout.mjs',
  '.codebase/src/runtime/graph.mjs', '.codebase/src/supervised-baselines/trainer.mjs',
  '.codebase/src/search-and-feedback/delta-forcing-candidates.mjs',
  '.codebase/src/search-and-feedback/adaptive-choice-review.mjs',
  '.codebase/src/search-and-feedback/experimental-puzzle-search.mjs',
  '.codebase/src/search-and-feedback/mate-certificate.mjs',
  '.codebase/src/search-and-feedback/mate-certificate-check.mjs',
  '.codebase/src/search-and-feedback/verified-feedback.mjs',
  '.codebase/src/search-and-feedback/verified-line-explanation.mjs',
  'package.json', 'package-lock.json',
];
const inputPaths = [protocolPath, puzzlePath, mapPath, prerequisitePath, prerequisiteAuditPath,
  prepReportPath, prepAuditPath, certificatesPath, '.cache/full.npz', '.cache/flywire-annotations-v2.1.0.tsv'];
const sources = Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, await sha256(path)])));
const inputs = Object.fromEntries(await Promise.all(inputPaths.map(async path => [path, await sha256(path)])));
const dependencyIdentity = { node: process.version,
  chessJs: JSON.parse(readFileSync('node_modules/chess.js/package.json', 'utf8')).version,
  packageLockSha256: await sha256('package-lock.json') };

guard();
const graph = loadGraph('.cache/full.npz'); guard();
const model = new SparseTrainer(graph, prerequisite.identity.model); guard();
const memory = new ReversalMemory(model, mapping, protocol.memory);
assert.equal(digest(mapping), prerequisite.identity.mappingHash);
const memoryBefore = memory.snapshot(), memoryHashBefore = digest(memoryBefore);
const invariantBefore = fixedStateHash(model, memory.edges);
assert.equal(invariantBefore, prerequisite.identity.invariant);
const ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
for (const cells of Object.values(prerequisite.identity.readouts))
  for (const cell of cells) assert.equal(ids[cell.index].toString(), cell.rootId);
for (const group of mapping.groups) for (const cell of group.dan)
  assert.equal(ids[cell.index].toString(), cell.rootId);
model.forward([0]); const rest = Float32Array.from(model.h[model.steps]); guard();
const encoder = createCompartmentChessCueEncoder(mapping, protocol.encoder);
const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder,
  readouts: prerequisite.identity.readouts, rest, maxPresentations: 4096,
  priorScale: protocol.priorScale, current: protocol.current, guard, pace });
const originalAssess = brain.assess.bind(brain);
brain.assess = async (...xs) => {
  const beforeCount = brain.presentations, t = performance.now();
  try { return await originalAssess(...xs); }
  finally { timings.push({ elapsedMs: performance.now() - t,
    presentations: brain.presentations - beforeCount }); }
};

// A puzzle FEN supplies no predecessor board, so delta-trigger tags are absent;
// all generated checks/captures/new attacks are still discovered from this root.
const delta = { changedSquares: [], captures: [], arrivals: [], sideToMove: board.turn(),
  check: board.isCheck(), realHistoryPlies: board.history().length };
const generationStarted = performance.now();
const shortlist = forcingCandidates(board, delta, { maxCandidates, quietReserve });
const generationMs = performance.now() - generationStarted;
const shortlistMoves = shortlist.candidates.map(row => row.move);
const beforeMemoryHash = brain.memoryFingerprint(), beforeFen = board.fen(), beforePgn = board.pgn();
async function timedAssessment(kind, moves) {
  const beforeCount = brain.presentations, started = performance.now();
  const assessment = await originalAssess(board, moves, task);
  timings.push({ kind, elapsedMs: performance.now() - started,
    presentations: brain.presentations - beforeCount, choice: assessment.choice, rows: assessment.rows });
  assert.equal(brain.memoryFingerprint(), beforeMemoryHash);
  assert.equal(board.fen(), beforeFen);
  assert.equal(board.pgn(), beforePgn);
  return assessment;
}
// ABBA ordering gives each condition one early and one late measurement.
const all = await timedAssessment('all-legal', legalMoves);
const focused = await timedAssessment('shortlist', shortlistMoves);
const focusedRepeat = await timedAssessment('shortlist', shortlistMoves);
const allRepeat = await timedAssessment('all-legal', legalMoves);
assert.equal(all.choice, allRepeat.choice);
assert.equal(focused.choice, focusedRepeat.choice);
const choicesAgree = all.choice === focused.choice;
const allProof = reviewCommittedChoice(board, all.choice, task,
  { maxNodes: protocol.verification.maxNodes, milliseconds: protocol.verification.milliseconds });
const focusedProof = reviewCommittedChoice(board, focused.choice, task,
  { maxNodes: protocol.verification.maxNodes, milliseconds: protocol.verification.milliseconds });
const shortlistMoveUci = shortlistMoves.map(uci);
const successfulCoverage = successfulMoves.map(move => ({ move, included: shortlistMoveUci.includes(move) }));
assert.ok(successfulCoverage.every(row => row.included), 'shortlist omitted a preverified successful action');
assert.equal(brain.memoryFingerprint(), beforeMemoryHash);
assert.equal(digest(memory.snapshot()), memoryHashBefore);
assert.equal(fixedStateHash(model, memory.edges), invariantBefore);
assert.equal(board.fen(), beforeFen);
assert.equal(board.pgn(), beforePgn);
assert.equal(shortlist.candidates.length, Math.min(maxCandidates, legalMoves.length));
assert.equal(certificatesByMove.get(all.choice).status, allProof.status);
assert.equal(certificatesByMove.get(focused.choice).status, focusedProof.status);
const timingByKind = Object.fromEntries(['all-legal', 'shortlist'].map(kind => {
  const samples = timings.filter(row => row.kind === kind);
  return [kind, { repetitions: samples.length,
    meanElapsedMs: samples.reduce((sum, row) => sum + row.elapsedMs, 0) / samples.length,
    rawElapsedMs: samples.map(row => row.elapsedMs),
    presentationsPerAssessment: samples[0].presentations }];
}));

const report = { schema: 'forcing-shortlist-paired-profile-v1', complete: true,
  timestamp: new Date().toISOString(),
  scope: 'One read-only full-graph paired neural ranking on a development puzzle. The updated forcing shortlist is compared with all legal candidates under identical frozen memory; both committed choices are independently verified. No feedback, neural learning, Monte Carlo expansion or transfer ran.',
  identity: { sources, inputs, dependencyIdentity, graphHash, annotationHash,
    model: model.config, memory: memory.config, mappingHash: digest(mapping),
    encoderIdentity: encoder.identity, memoryHash: memoryHashBefore, fixedStateHash: invariantBefore },
  protocol: { duty, maxCandidates, quietReserve, deltaSource: 'empty: puzzle input provides no predecessor board',
    sameMemoryForAllAssessments: true, repetitionsPerCondition: 2,
    timingOrder: timings.map(row => row.kind), searchExpansion: false },
  position: { id: puzzle.id, split: puzzle.split, fen: puzzle.fen, task,
    legalCount: legalMoves.length, successfulMoves },
  results: { allLegalChoice: all.choice, shortlistChoice: focused.choice,
    choicesAgree, allLegalStatus: allProof.status,
    shortlistStatus: focusedProof.status,
    allLegalCertificateSha256: allProof.certificateSha256,
    shortlistCertificateSha256: focusedProof.certificateSha256,
    successfulCoverage, selectedCount: shortlist.candidates.length,
    omittedCount: legalMoves.length - shortlist.candidates.length,
    omittedMoves: legalUci.filter(move => !shortlistMoveUci.includes(move)),
    candidates: shortlist.candidates.map(row => ({ uci: row.uci, tags: row.tags,
      priority: row.priority ?? 0, verifiedStatus: certificatesByMove.get(row.uci).status })),
    allLegalRows: all.rows, shortlistRows: focused.rows,
    repeatChoices: { allLegal: allRepeat.choice, shortlist: focusedRepeat.choice } },
  work: { neuralPresentations: brain.presentations, candidateGenerationMs: generationMs,
    assessments: timings.map(({ kind, elapsedMs, presentations, choice }) => ({ kind, elapsedMs, presentations, choice })),
    timingByKind, timeReductionPercent: 100 * (1 - timingByKind.shortlist.meanElapsedMs / timingByKind['all-legal'].meanElapsedMs),
    assessmentElapsedMs: timings.reduce((sum, row) => sum + row.elapsedMs, 0),
    meanMsPerPresentation: brain.presentations
      ? timings.reduce((sum, row) => sum + row.elapsedMs, 0) / brain.presentations : null },
  resources: { peakRssMiB: process.resourceUsage().maxRSS / 1024,
    elapsedSeconds: (performance.now() - start) / 1000,
    cpuSeconds: (() => { const c = process.cpuUsage(cpuStart); return (c.user + c.system) / 1e6; })(),
    freeMemoryMiBAtEnd: os.freemem() / 2 ** 20, cpuDuty: duty },
};
mkdirSync(args.out, { recursive: true });
const reportPath = join(args.out, 'report.json'), reportJson = JSON.stringify(report, null, 2);
writeFileSync(reportPath + '.partial', reportJson, { flag: 'wx' });
renameSync(reportPath + '.partial', reportPath);
writeFileSync(join(args.out, 'COMPLETE'), await sha256(reportPath) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ results: { allLegalChoice: report.results.allLegalChoice,
  shortlistChoice: report.results.shortlistChoice, choicesAgree: report.results.choicesAgree,
  allLegalStatus: report.results.allLegalStatus, shortlistStatus: report.results.shortlistStatus,
  successfulCoverage: report.results.successfulCoverage, selectedCount: report.results.selectedCount,
  omittedCount: report.results.omittedCount }, work: report.work, resources: report.resources,
  report: reportPath }));
