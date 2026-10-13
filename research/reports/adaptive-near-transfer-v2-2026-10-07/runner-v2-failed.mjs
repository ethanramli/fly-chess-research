import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory, mapReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { readMBON } from '../../src/neural-learning/mbon-readout.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { uci } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
import { sha256, graphHash } from '../runtime/fetch-graph.mjs';

const { values: args } = parseArgs({ options: { out: { type: 'string' }, resume: { type: 'string' }, protocol: { type: 'string' }, preflight: { type: 'boolean' }, 'cpu-duty': { type: 'string', default: '0.5' } } });
const protocolPath = args.protocol ?? 'research/data/adaptive-near-transfer-v2/protocol.json';
const p = JSON.parse(readFileSync(protocolPath, 'utf8'));
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const protocolHash = await sha256(protocolPath);
assert.equal(p.schema, 'adaptive-near-transfer-v2');
assert.equal(process.version, p.runtime.nodeVersion);
assert.ok(process.execArgv.includes('--max-old-space-size=256'));
const duty = Number(args['cpu-duty']); assert.ok(Number.isFinite(duty) && duty === p.runtime.cpuDuty);
for (const [path, expected] of Object.entries({ ...p.inputs, ...p.sources })) assert.equal(await sha256(path), expected, `Pinned identity mismatch: ${path}`);
assert.equal(await sha256('.cache/full.npz'), graphHash);
const chessEntry = fileURLToPath(import.meta.resolve('chess.js'));
assert.equal(resolve(chessEntry), resolve(p.runtime.chessEntrypoint));
assert.equal(read('node_modules/chess.js/package.json').version, p.runtime.chessJs);

const acquisitionDir = 'research/reports/adaptive-contrastive-coverage-v1-2026-10-07';
const acquisition = read(`${acquisitionDir}/report.json`), acquisitionAudit = read(`${acquisitionDir}/audit.json`), acquisitionComplete = read(`${acquisitionDir}/COMPLETE`);
assert.ok(acquisition.complete && acquisitionAudit.passed && acquisitionComplete.auditPassed);
assert.equal(acquisitionComplete.reportSha256, await sha256(`${acquisitionDir}/report.json`));
assert.equal(acquisitionComplete.auditSha256, await sha256(`${acquisitionDir}/audit.json`));
assert.equal(acquisition.state.memory.identity, p.prerequisites.acquisition.acquiredMemoryIdentity);
const variationDir = 'research/reports/smothered-training-variations-v1-2026-10-07';
const variationAudit = read(`${variationDir}/audit.json`);
assert.ok(variationAudit.passed && variationAudit.certificates === p.prerequisites.variations.certificateCount);

if (args.preflight) {
  console.log(JSON.stringify({ passed: true, protocolSha256: protocolHash, positions: p.positions.map(x => x.id), conditions: Object.keys(p.conditions), sources: Object.keys(p.sources).length, scope: p.scope }));
  process.exit(0);
}
assert.ok(args.out, 'Use --out DIR');
const outDir = resolve(args.out ?? p.output); if (existsSync(outDir)) throw Error('Output must be a fresh directory, including when resuming');
mkdirSync(join(outDir, 'panels'), { recursive: true });
const guard = () => { if (process.memoryUsage().rss > p.runtime.rssMiB * 2 ** 20 || os.freemem() < p.runtime.freeMemoryMiB * 2 ** 20) throw Error('Resource guard exceeded'); };
async function pace(ms) { let remaining = ms * (1 / duty - 1); while (remaining > 0) { const d = Math.min(250, remaining); await new Promise(r => setTimeout(r, d)); remaining -= d; guard(); } }
function atomic(path, value) { const temp = `${path}.${process.pid}.partial`; writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' }); renameSync(temp, path); }
const caseList = Object.entries(p.conditions).flatMap(([condition]) => p.positions.map(position => ({ condition, positionId: position.id })));
const completed = {};
if (args.resume) {
  const oldStatePath = resolve(args.resume), oldDir = dirname(oldStatePath), old = read(oldStatePath);
  assert.equal(old.protocolSha256, protocolHash); assert.equal(old.kind, 'adaptive-near-transfer-checkpoint-v1');
  for (const [key, ref] of Object.entries(old.completed)) {
    const bytes = readFileSync(resolve(oldDir, ref.path)); assert.equal(hash(bytes), ref.sha256);
    const target = join(outDir, 'panels', `${key}.json`); writeFileSync(target, bytes, { flag: 'wx' });
    completed[key] = { path: `panels/${key}.json`, sha256: hash(bytes) };
  }
}
let checkpointSequence = 0;
function publishState() {
  const path = join(outDir, `state-${String(++checkpointSequence).padStart(5, '0')}.json`);
  atomic(path, { kind: 'adaptive-near-transfer-checkpoint-v1', protocolSha256: protocolHash, completed });
}

guard(); const graph = loadGraph('.cache/full.npz'); guard();
const ids = readNpz('.cache/full.npz', ['root_ids']).root_ids; guard();
const mapping = read(p.mappingPath).mapping;
const model = new SparseTrainer(graph, p.model); guard();
const memory = new ReversalMemory(model, mapping, p.memory); guard();
assert.equal(fixedStateHash(model, memory.edges), p.fixedStateHash);
for (const cell of [...Object.values(p.readouts).flat(), ...mapping.groups.flatMap(g => g.dan)]) assert.equal(ids[cell.index].toString(), cell.rootId);
const encoder = createCompartmentChessCueEncoder(mapping, { ...p.encoder, ...p.variant });
const restStart = performance.now(); model.forward([0]); const rest = Float32Array.from(model.h[model.steps]); await pace(performance.now() - restStart);
const brain = new DualValencePuzzleBrain({ model, memory, mapping, encoder, readouts: p.readouts, rest,
  current: p.current, priorScale: p.priorScale, maxPresentations: 8192, guard, pace });
const certRows = readFileSync(p.certificatePath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const certificates = new Map();
for (const record of certRows) {
  if (!p.positions.some(position => position.id === record.id)) continue;
  const moveUci = record.review.move, actor = record.review.actor, proof = record.review.proof;
  const key = `${record.id}|${moveUci}`; if (certificates.has(key)) throw Error(`Duplicate certificate ${key}`);
  const board = new Chess(record.context.fen);
  const move = board.moves({ verbose: true }).find(m => uci(m) === moveUci); assert.ok(move, `Illegal certified move ${key}`);
  board.move(move);
  const checked = checkMateCertificate(proof.certificate, board, { attacker: actor, plies: record.context.task.plies - 1, ...p.verification });
  assert.ok(checked.verified && checked.status === record.review.status, `Certificate mismatch ${key}`);
  assert.ok(record.review.status === 'success' || record.review.status === 'failure');
  certificates.set(key, { status: record.review.status, certificateSha256: record.review.certificateSha256 });
}
for (const position of p.positions) {
  const legal = new Chess(position.fen).moves().length;
  assert.equal([...certificates.keys()].filter(k => k.startsWith(`${position.id}|`)).length, legal, `Certificate coverage ${position.id}`);
}

const started = performance.now(), cpuStarted = process.cpuUsage();
for (const item of caseList) {
  const caseKey = `${item.condition}__${item.positionId}`;
  if (completed[caseKey]) continue;
  const conditionPath = p.conditions[item.condition], condition = read(conditionPath);
  const snapshot = condition.learned.learned;
  assert.equal(snapshot.identity, memory.identity);
  memory.restore(snapshot); brain.presentations = 0;
  const before = digest(memory.snapshot());
  const position = p.positions.find(x => x.id === item.positionId), board = new Chess(position.fen);
  const legalMoves = board.moves({ verbose: true }); assert.ok(legalMoves.length > 0 && legalMoves.length <= p.maxLegalMoves);
  const assessment = await brain.assess(board, legalMoves, { objective: position.objective, plies: position.plies });
  const after = digest(memory.snapshot()); assert.equal(after, before, 'Evaluation changed memory');
  const rows = assessment.rows.map(row => {
    const consequence = certificates.get(`${position.id}|${row.move}`); assert.ok(consequence);
    return { ...row, consequence: consequence.status, certificateSha256: consequence.certificateSha256 };
  });
  rows.sort((a, b) => b.score - a.score || a.move.localeCompare(b.move));
  const successes = rows.filter(row => row.consequence === 'success');
  const panel = { schema: 'adaptive-near-transfer-panel-v1', condition: item.condition, position,
    rows, legalMoveCount: legalMoves.length, choice: rows[0].move, choiceConsequence: rows[0].consequence,
    successMoves: successes.map(x => x.move), successRanks: successes.map(x => rows.findIndex(r => r.move === x.move) + 1),
    memoryBefore: before, memoryAfter: after, presentations: brain.presentations, feedbackEvents: 0 };
  const path = join(outDir, 'panels', `${caseKey}.json`); atomic(path, panel);
  completed[caseKey] = { path: `panels/${caseKey}.json`, sha256: await sha256(path) }; publishState();
  console.log(JSON.stringify({ completed: Object.keys(completed).length, total: caseList.length, condition: item.condition, position: item.positionId, choice: panel.choice, outcome: panel.choiceConsequence, successRanks: panel.successRanks, presentations: panel.presentations }));
}
const panels = Object.entries(completed).map(([key, ref]) => ({ key, ...read(join(outDir, ref.path)), sha256: ref.sha256 }));
const cpu = process.cpuUsage(cpuStarted);
const report = { schema: 'adaptive-near-transfer-v2', complete: true, protocolPath, protocolSha256: protocolHash,
  acquisition: p.prerequisites.acquisition, variations: p.prerequisites.variations,
  scope: p.scope, panels, resources: { elapsedSeconds: (performance.now() - started) / 1000,
    cpuSeconds: (cpu.user + cpu.system) / 1e6,
    peakRssMiB: process.resourceUsage().maxRSS / 1024, cpuDuty: duty, presentations: panels.reduce((sum, x) => sum + x.presentations, 0) } };
const reportPath = join(outDir, 'report.json'); atomic(reportPath, report);
atomic(join(outDir, 'RUN_COMPLETE.json'), { reportSha256: await sha256(reportPath), protocolSha256: protocolHash, panels: panels.length });
console.log(JSON.stringify({ complete: true, out: outDir, panels: panels.length, resources: report.resources }, null, 2));
