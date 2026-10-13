import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { MappedPuzzleBrain } from '../../src/puzzle-learning/mapped-puzzle-brain.mjs';

const planPath = 'research/data/adaptive-contrastive-coverage-v2/qb3-analysis-plan.json';
const v2ProtocolPath = 'research/data/adaptive-contrastive-coverage-v2/protocol.json';
const v2Run = 'research/reports/adaptive-contrastive-coverage-v2-2026-10-09/resume';
const v1ProtocolPath = 'research/data/adaptive-contrastive-coverage-v1/protocol.json';
const v1AuditPath = 'research/reports/adaptive-contrastive-coverage-v1-2026-10-07/audit.json';
const v2AuditPath = `${v2Run}/audit.json`;
const v2ReportPath = `${v2Run}/report.json`;
const v4ProtocolPath = 'research/data/adaptive-near-transfer-v4/protocol.json';
const v4ReportPath = 'research/reports/adaptive-near-transfer-v4-2026-10-07/report.json';
const v4AuditPath = 'research/reports/adaptive-near-transfer-v4-2026-10-07/audit.json';
const cap14DeltaPath = 'research/reports/gamma2-relative-readout-2026-10-09/adaptive-near-transfer-v4-delta-exploration.json';
const outPath = 'research/reports/adaptive-contrastive-coverage-v2-2026-10-09/qb3-delta-analysis-v2.json';
const readBytes = path => readFileSync(path);
const read = path => JSON.parse(readBytes(path).toString('utf8').replace(/^\uFEFF/, ''));
const sha = value => createHash('sha256').update(value).digest('hex');
const fileSha = path => sha(readBytes(path));
const p = read(v2ProtocolPath), plan = read(planPath), oldP = read(v1ProtocolPath);
const oldAudit = read(v1AuditPath), audit = read(v2AuditPath), report = read(v2ReportPath);
const v4 = read(v4ProtocolPath), v4Report = read(v4ReportPath), v4Audit = read(v4AuditPath), cap14Delta = read(cap14DeltaPath);
assert.equal(audit.passed, true); assert.equal(audit.reportSha256, await fileSha(v2ReportPath));
assert.equal(report.complete, true); assert.equal(report.identity.protocolSha256, await fileSha(v2ProtocolPath));
assert.equal(oldAudit.passed, true); assert.equal(v4Report.complete, true); assert.equal(v4Audit.passed, true);
assert.equal(v4Audit.reportSha256, await fileSha(v4ReportPath));
assert.equal(v4Report.acquisition.auditSha256, await fileSha(v1AuditPath));
assert.equal(p.encoder.maxCells, 28); assert.equal(p.encoder.totalCurrent, 21);
assert.equal(p.encoder.maxCellCurrent, 0.75); assert.equal(oldP.encoder.maxCells, 14);
assert.equal(oldP.encoder.totalCurrent, 21); assert.equal(oldP.encoder.maxCellCurrent, 1.5);
const guard = () => assert.ok(process.memoryUsage().rss <= 768 * 2 ** 20 && os.freemem() >= 256 * 2 ** 20);
async function pace(ms) {
  let left = ms;
  while (left > 0) { const delay = Math.min(250, left); await new Promise(resolve => setTimeout(resolve, delay)); left -= delay; guard(); }
}
const graph = loadGraph('.cache/full.npz'); guard();
const ids = readNpz('.cache/full.npz', ['root_ids']).root_ids;
const mapping = read(p.mappingPath).mapping;
const model = new SparseTrainer(graph, p.shared.model); guard();
const memory = new ReversalMemory(model, mapping, p.shared.memory); guard();
assert.equal(digest(mapping), p.shared.mappingHash);
assert.equal(fixedStateHash(model, memory.edges), p.shared.invariant);
for (const cell of [...Object.values(p.shared.readouts).flat(), ...mapping.groups.flatMap(g => g.dan)])
  assert.equal(ids[cell.index].toString(), cell.rootId);
const encoder = createCompartmentChessCueEncoder(mapping, { ...p.encoder, ...p.variant });
const cue = encoder.encode(new Chess(v4.positions.find(x => x.id === plan.positions[0].id).fen), plan.positions[0].successMove,
  { objective: 'forced-mate', plies: 3 });
assert.equal(cue.stimulation.length, 28);
assert.equal(cue.stimulation.reduce((n, cell) => n + cell.current, 0), 21);
assert.ok(cue.stimulation.every(cell => cell.current === 0.75));
model.forward([0]); const rest = Float32Array.from(model.h[model.steps]);
const brain = new MappedPuzzleBrain({ model, memory, mapping, encoder, readouts: p.shared.readouts, rest,
  current: p.current, maxPresentations: 8192, guard, pace });
const snapshots = {};
for (const condition of plan.conditions) {
  const resultRef = report.state.results.find(x => x.condition === condition)?.resultRef;
  assert.ok(resultRef, `Missing completed condition ${condition}`);
  assert.equal(await fileSha(resultRef.path), resultRef.sha256);
  const resultPath = resultRef.path;
  const result = read(resultPath);
  assert.equal(result.condition, condition);
  assert.equal(result.learned.identity, memory.identity);
  snapshots[condition] = result.learned;
}
const scoreRows = {};
const started = performance.now(), cpuStart = process.cpuUsage();
for (const positionSpec of plan.positions) {
  const position = v4.positions.find(x => x.id === positionSpec.id);
  assert.ok(position, `Missing pinned development probe ${positionSpec.id}`);
  const board = new Chess(position.fen), legal = board.moves({ verbose: true });
  for (const condition of plan.conditions) {
    memory.restore(snapshots[condition]);
    const before = digest(memory.snapshot()); brain.presentations = 0;
    const assessment = await brain.assess(board, legal, { objective: position.objective, plies: position.plies });
    assert.equal(digest(memory.snapshot()), before); assert.equal(board.fen(), position.fen);
    scoreRows[`${condition}|${positionSpec.id}`] = assessment.rows;
    console.log(JSON.stringify({ position: positionSpec.id, condition, moves: assessment.rows.length,
      presentations: brain.presentations, elapsedSeconds: Number(((performance.now() - started) / 1000).toFixed(1)) }));
  }
}
const oldRanks = [];
for (const item of plan.positions) {
  const info = v4Report.panels.find(x => x.condition === 'informative' && x.position.id === item.id);
  const absent = v4Report.panels.find(x => x.condition === 'absent' && x.position.id === item.id);
  const legacy = cap14Delta.find(x => x.Position === item.id);
  assert.ok(info && absent && legacy);
  const oldAbs = new Map(absent.rows.map(x => [x.move, x.score]));
  const oldRows = info.rows.map(x => ({ move: x.move, delta: x.score - oldAbs.get(x.move), consequence: x.consequence }))
    .sort((a, b) => b.delta - a.delta || a.move.localeCompare(b.move));
  const rank = oldRows.findIndex(x => x.move === item.successMove) + 1;
  assert.equal(rank, item.cap14SuccessDeltaRank);
  assert.equal(legacy.BestSuccessDeltaRank, rank);
  oldRanks.push({ position: item.id, successMove: item.successMove, rank, topMove: oldRows[0].move,
    topConsequence: oldRows[0].consequence, delta: oldRows.find(x => x.move === item.successMove).delta });
}
const comparisons = plan.positions.map(item => {
  const getMap = condition => new Map(scoreRows[`${condition}|${item.id}`].map(x => [x.move, x.score]));
  const absent = getMap('absent'), informative = getMap('informative');
  const ranked = [...informative].map(([move, score]) => ({ move, delta: score - absent.get(move) }))
    .sort((a, b) => b.delta - a.delta || a.move.localeCompare(b.move));
  const successRank = ranked.findIndex(x => x.move === item.successMove) + 1;
  const controls = Object.fromEntries(['shuffled', 'disabled'].map(condition => {
    const scores = getMap(condition);
    const rows = [...scores].map(([move, score]) => ({ move, delta: score - absent.get(move) }))
      .sort((a, b) => b.delta - a.delta || a.move.localeCompare(b.move));
    return [condition, { successRank: rows.findIndex(x => x.move === item.successMove) + 1,
      topMove: rows[0].move, topDelta: rows[0].delta }];
  }));
  const certPanel = v4Report.panels.find(x => x.condition === 'informative' && x.position.id === item.id);
  assert.ok(certPanel.rows.some(x => x.move === item.successMove && x.consequence === 'success'));
  return { position: item.id, successMove: item.successMove, legalMoves: ranked.length,
    cap14SuccessRank: item.cap14SuccessDeltaRank, cap28SuccessRank: successRank,
    cap28TopDeltaMove: ranked[0].move, cap28TopDelta: ranked[0].delta,
    successDelta: ranked.find(x => x.move === item.successMove).delta,
    absoluteChoices: Object.fromEntries(plan.conditions.map(condition => [condition,
      scoreRows[`${condition}|${item.id}`].toSorted((a, b) => b.score - a.score || a.move.localeCompare(b.move))[0].move])),
    controls, improved: successRank < item.cap14SuccessDeltaRank };
});
const summary = { passed: comparisons.every(x => x.improved), criterion: plan.metric,
  comparisons, cap14RanksVerifiedFromAuditedRawPanels: oldRanks,
  interpretation: 'This compares informative-minus-absent score-change ranks on two already inspected development probes. It is not independent transfer, a biological plasticity test, or a solution to the all-legal choice failure.' };
const cpu = process.cpuUsage(cpuStart);
const panels = Object.entries(scoreRows).map(([key, rows]) => {
  const [condition, positionId] = key.split('|');
  const sourcePanel = v4Report.panels.find(x => x.condition === 'informative' && x.position.id === positionId);
  const consequence = new Map(sourcePanel.rows.map(x => [x.move, { status: x.consequence, certificateSha256: x.certificateSha256 }]));
  return { condition, positionId, memoryFingerprint: digest(snapshots[condition]), rows: rows.map(x => ({ ...x, ...consequence.get(x.move) })) };
});
const output = { schema: plan.schema, planPath, planSha256: await fileSha(planPath), protocolSha256: await fileSha(v2ProtocolPath),
  auditSha256: await fileSha(v2AuditPath), trainingReportSha256: await fileSha(v2ReportPath),
  cap14ReportSha256: await fileSha(v4ReportPath), cap14AuditSha256: await fileSha(v4AuditPath),
  cap14DeltaSha256: await fileSha(cap14DeltaPath),
  sourceSha256: await fileSha('.codebase/scripts/puzzle-learning/analyze-cue-width-delta-ranks.mjs'),
  config: { encoder: encoder.config, model: model.config, memory: memory.config }, panels, summary,
  resources: { elapsedSeconds: (performance.now() - started) / 1000,
    cpuSeconds: (cpu.user + cpu.system) / 1e6, peakRssMiB: process.resourceUsage().maxRSS / 1024,
    cpuDuty: 0.5, presentations: brain.presentations * plan.positions.length * plan.conditions.length },
  coverage: 'Complete all-legal action assessment; no training, feedback events, or memory updates.' };
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ outPath, passed: summary.passed, comparisons, resources: output.resources }, null, 2));
