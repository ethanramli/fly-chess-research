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
import { searchCesp99 } from '../../src/search-and-feedback/cesp99-search-adapter.mjs';
import { reviewCommittedChoice } from '../../src/search-and-feedback/adaptive-choice-review.mjs';
import { searchMonteCarlo } from '../../src/search-and-feedback/monte-carlo-puzzle-search.mjs';
import { uci } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const protocolPath = 'research/data/licensed-search-comparison-v1/protocol.json';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const p = read(protocolPath);
const { values: args } = parseArgs({ options: { out: { type: 'string' }, resume: { type: 'string' },
  preflight: { type: 'boolean' }, 'cpu-duty': { type: 'string', default: '0.5' },
  'max-events': { type: 'string', default: '128' } } });
const duty = Number(args['cpu-duty']);
assert.ok(Number.isFinite(duty) && duty === p.runtime.cpuDuty);

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
  assert.equal(audit.passed, true); assert.equal(report.complete, true);
  assert.equal(audit.reportSha256, await sha256(ref.report));
}
const mapping = read(p.mappingPath).mapping;
assert.equal(digest(mapping), p.shared.mappingHash);
const rows = p.positions.map(ref => {
  const row = readFileSync(ref.path, 'utf8').trim().split(/\r?\n/).map(JSON.parse).find(r => r.id === ref.id);
  assert.ok(row); assert.equal(row.objective, 'forced-mate'); assert.equal(row.plies, 3); return row;
});
const encoder = createCompartmentChessCueEncoder(mapping, { ...p.encoder, ...p.variant });
const cue = encoder.encode(new Chess(rows[0].fen), p.preflightMove, { objective: rows[0].objective, plies: rows[0].plies });
assert.equal(cue.stimulation.length, p.encoder.maxCells);
assert.equal(cue.stimulation.reduce((sum, cell) => sum + cell.current, 0), p.encoder.totalCurrent);
if (args.preflight) {
  console.log(JSON.stringify({ passed: true, encoderIdentity: encoder.identity,
    legalMoves: new Chess(rows[0].fen).moves().length, sources: Object.keys(p.sources).length,
    scope: 'Frozen source/input/dependency/prerequisite and cue construction; no graph inference' }));
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
const naive = memory.snapshot(), invariant = fixedStateHash(model, memory.edges);
assert.equal(invariant, p.shared.invariant);
for (const cell of [...Object.values(p.shared.readouts).flat(), ...mapping.groups.flatMap(g => g.dan)])
  assert.equal(ids[cell.index].toString(), cell.rootId);
const restStart = performance.now(); model.forward([0]);
const rest = Float32Array.from(model.h[model.steps]); await pace(performance.now() - restStart);
const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder,
  readouts: p.shared.readouts, rest, current: p.current, priorScale: p.priorScale,
  maxPresentations: p.maxPresentations, guard, pace });

const identity = { protocolPath, protocolSha256: await sha256(protocolPath), sources: p.sources,
  inputs: p.inputs, fixedStateHash: invariant, encoderIdentity: encoder.identity };
const out = resolve(args.out); mkdirSync(out);
const atomic = (path, value) => { writeFileSync(path + '.partial', JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); renameSync(path + '.partial', path); };
let results = [], sequence = 0;
if (args.resume) { const saved = read(args.resume); assert.deepEqual(saved.identity, identity);
  results = saved.results; for (const ref of results) assert.equal(await sha256(ref.path), ref.sha256);
  brain.presentations = saved.presentations; }
const learned = read(p.learnedMemoryPath).learned;
const checkpoint = () => atomic(join(out, 'checkpoint-' + String(++sequence).padStart(5, '0') + '.json'),
  { identity, results, presentations: brain.presentations });
try {
  for (const row of rows) for (const condition of ['naive', 'learned']) for (const algorithm of ['existing', 'cesp99']) {
    const key = row.id + '-' + condition + '-' + algorithm;
    if (results.some(r => r.key === key)) continue;
    const snapshot = condition === 'naive' ? naive : learned;
    memory.restore(snapshot); const frozen = digest(snapshot), fixedBefore = fixedStateHash(model, memory.edges);
    const board = new Chess(row.fen); if (row.pgn) board.loadPgn(row.pgn);
    const task = { objective: row.objective, plies: row.plies }, assessments = [], traces = [];
    const evaluate = brain.evaluate.bind(brain);
    const proxy = { memoryFingerprint: () => brain.memoryFingerprint(), evaluate: async (b, moves, supplied) => {
      const result = await evaluate(b, moves, supplied);
      assessments.push({ fen: b.fen(), pgn: b.pgn(), moves: moves.map(uci), task: supplied, ...result }); return result;
    } };
    const begin = performance.now(), cpuBefore = process.cpuUsage(), presentationsBefore = brain.presentations;
    const search = algorithm === 'cesp99' ? await searchCesp99(proxy, board, { ...p.search, task, guard })
      : await searchMonteCarlo(proxy, board, { ...p.search, task, guard, onSimulation: trace => traces.push(trace) });
    if (algorithm === 'cesp99') traces.push(...search.traces);
    const move = typeof search.move === 'string' ? search.move : search.move ? uci(search.move) : null;
    const review = move ? reviewCommittedChoice(board, move, task, p.verification) : null;
    assert.equal(digest(memory.snapshot()), frozen); assert.equal(fixedStateHash(model, memory.edges), fixedBefore);
    assert.equal(board.fen(), row.fen); const cpu = process.cpuUsage(cpuBefore);
    const result = { key, row, condition, algorithm, search, traces, assessments, review,
      memoryBefore: frozen, memoryAfter: brain.memoryFingerprint(), fixedBefore, fixedAfter: fixedStateHash(model, memory.edges),
      resources: { elapsedSeconds: (performance.now() - begin) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6,
        presentations: brain.presentations - presentationsBefore } };
    const path = join(out, key + '.json'); atomic(path, result);
    results.push({ key, path: path.replaceAll('\\', '/'), sha256: await sha256(path) }); checkpoint();
    console.log(JSON.stringify({ key, move, status: review?.status ?? 'unknown', ...result.resources }));
  }
  const cpu = process.cpuUsage(cpuStarted);
  atomic(join(out, 'report.json'), { complete: true, identity, results, command: process.argv,
    resources: { elapsedSeconds: (performance.now() - started) / 1000, cpuSeconds: (cpu.user + cpu.system) / 1e6,
      peakRssMiB: process.resourceUsage().maxRSS / 1024, cpuDuty: duty },
    scope: 'Record-only search-mechanics comparison, all-legal candidates; neutral leaf value, no new learning or final transfer.' });
} catch (error) { atomic(join(out, 'interruption.json'), { error: String(error.stack), identity, results }); throw error; }
