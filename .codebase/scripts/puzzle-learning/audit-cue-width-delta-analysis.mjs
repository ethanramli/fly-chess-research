import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';

const path = 'research/reports/adaptive-contrastive-coverage-v2-2026-10-09/qb3-delta-analysis-v2.json';
const planPath = 'research/data/adaptive-contrastive-coverage-v2/qb3-analysis-plan.json';
const oldReportPath = 'research/reports/adaptive-near-transfer-v4-2026-10-07/report.json';
const oldAuditPath = 'research/reports/adaptive-near-transfer-v4-2026-10-07/audit.json';
const cap14Path = 'research/reports/gamma2-relative-readout-2026-10-09/adaptive-near-transfer-v4-delta-exploration.json';
const readBytes = p => readFileSync(p);
const read = p => JSON.parse(readBytes(p).toString('utf8').replace(/^\uFEFF/, ''));
const sha = p => createHash('sha256').update(readBytes(p)).digest('hex');
const report = read(path), plan = read(planPath), oldReport = read(oldReportPath), oldAudit = read(oldAuditPath), cap14 = read(cap14Path);
assert.equal(oldAudit.passed, true); assert.equal(oldAudit.reportSha256, sha(oldReportPath));
assert.equal(oldReport.complete, true); assert.equal(report.planSha256, sha(planPath));
assert.equal(report.cap14ReportSha256, sha(oldReportPath)); assert.equal(report.cap14AuditSha256, sha(oldAuditPath));
assert.equal(report.cap14DeltaSha256, sha(cap14Path));
assert.equal(report.summary.comparisons.length, plan.positions.length);
const verified = [];
for (const spec of plan.positions) {
  const info = report.panels.find(x => x.condition === 'informative' && x.positionId === spec.id);
  const absent = report.panels.find(x => x.condition === 'absent' && x.positionId === spec.id);
  assert.ok(info && absent);
  const panel = oldReport.panels.find(x => x.condition === 'informative' && x.position.id === spec.id);
  const oldAbsent = oldReport.panels.find(x => x.condition === 'absent' && x.position.id === spec.id);
  const legacy = cap14.find(x => x.Position === spec.id);
  assert.ok(panel && oldAbsent && legacy);
  const oldScore = new Map(oldAbsent.rows.map(x => [x.move, x.score]));
  const oldRank = panel.rows.map(x => ({ move: x.move, delta: x.score - oldScore.get(x.move), consequence: x.consequence }))
    .sort((a, b) => b.delta - a.delta || a.move.localeCompare(b.move)).findIndex(x => x.move === spec.successMove) + 1;
  assert.equal(oldRank, spec.cap14SuccessDeltaRank); assert.equal(legacy.BestSuccessDeltaRank, oldRank);
  const absMap = new Map(absent.rows.map(x => [x.move, x.score]));
  const ranked = info.rows.map(x => ({ move: x.move, delta: x.score - absMap.get(x.move), consequence: x.status }))
    .sort((a, b) => b.delta - a.delta || a.move.localeCompare(b.move));
  assert.equal(ranked.length, new Chess(plan.positions.length && oldReport.panels.find(x => x.position.id === spec.id).position.fen).moves().length);
  assert.equal(ranked.find(x => x.move === spec.successMove)?.consequence, 'success');
  const summary = report.summary.comparisons.find(x => x.position === spec.id);
  assert.equal(summary.cap14SuccessRank, oldRank);
  assert.equal(summary.cap28SuccessRank, ranked.findIndex(x => x.move === spec.successMove) + 1);
  assert.equal(summary.cap28TopDeltaMove, ranked[0].move);
  assert.equal(summary.improved, summary.cap28SuccessRank < oldRank);
  verified.push({ position: spec.id, cap14SuccessRank: oldRank,
    cap28SuccessRank: summary.cap28SuccessRank, cap28TopMove: ranked[0].move,
    successConsequence: 'independently certified success', passed: summary.improved });
}
assert.equal(report.sourceSha256, sha('.codebase/scripts/puzzle-learning/analyze-cue-width-delta-ranks.mjs'));
assert.equal(report.summary.passed, verified.every(x => x.passed));
const result = { passed: true, analysisSha256: sha(path), planSha256: sha(planPath),
  auditorSourceSha256: sha('.codebase/scripts/puzzle-learning/audit-cue-width-delta-analysis.mjs'), verified,
  scope: 'Arithmetic/provenance replay from saved all-legal rows; no neural inference or training.' };
writeFileSync('research/reports/adaptive-contrastive-coverage-v2-2026-10-09/qb3-delta-analysis-audit.json',
  `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
