// Read-only synthesis of independently audited arms; no final-family or graph reads.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const base = 'research/reports/correction-preservation-v2-2026-10-08';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const protocolPath = 'research/data/correction-preservation-v2/protocol.json';
const registrationPath = 'research/data/correction-preservation-v2/registration.json';
const protocol = read(protocolPath), registration = read(registrationPath);
const archiveAudit = read('research/data/correction-preservation-v2/archive-audit.json');
assert.equal(sha(protocolPath), registration.protocolSha256);
assert.equal(sha(registrationPath), archiveAudit.registrationSha256);
assert.equal(sha(registration.specificationPath), registration.specificationSha256);
const conditions = ['informative', 'no-channel', 'shuffled', 'disabled'];
// Preserve the failed Windows publication invocation and analyse the completed
// descendant separately.  This mapping is evidence, not a substitution of the
// partial checkpoint for a published one.
const runDirectory = (schedule, condition) =>
  schedule === 'selected' && condition === 'disabled'
    ? 'selected-disabled-resumed'
    : `${schedule}-${condition}`;
const rows = [];
const allPanels = group => [...group.train, ...group.validation];
let baseline = null, initialMemoryHash = null, presentations = null;
for (const schedule of ['selected', 'uniform']) for (const condition of conditions) {
  const dir = join(base, runDirectory(schedule, condition));
  const reportPath = join(dir, 'report.json'), auditPath = join(dir, 'audit.json');
  const report = read(reportPath), audit = read(auditPath);
  assert.equal(read(join(dir, 'COMPLETE')).reportSha256, sha(reportPath));
  assert.equal(read(`${auditPath}.COMPLETE`).auditSha256, sha(auditPath));
  assert.equal(audit.reportSha256, sha(reportPath));
  assert.equal(audit.protocolSha256, registration.protocolSha256);
  assert.equal(audit.exactFreshNeuralReplays, true);
  assert.equal(audit.finalFamilyFilesRead, false);
  assert.equal(report.schedule, schedule); assert.equal(report.condition, condition);
  assert.equal(audit.schedule, schedule); assert.equal(audit.condition, condition);
  assert.equal(report.receipts.length, 4);
  assert.equal(report.identity.protocolSha256, registration.protocolSha256);
  if (baseline === null) {
    baseline = report.baseline; initialMemoryHash = report.initialMemoryHash;
    presentations = report.presentations;
  }
  assert.deepEqual(report.baseline, baseline, 'Scratch baseline must be identical across arms');
  assert.equal(report.initialMemoryHash, initialMemoryHash);
  assert.equal(report.presentations, presentations);
  const before = allPanels(report.baseline), after = allPanels(report.afterTraining);
  const panels = before.map((old, index) => {
    const current = after[index]; assert.equal(current.panelId, old.panelId);
    return { panelId: old.panelId, split: old.split, beforeChoice: old.choice,
      afterChoice: current.choice, beforeCorrect: old.correct, afterCorrect: current.correct,
      beforeMargin: old.margin, afterMargin: current.margin, marginGain: current.margin - old.margin,
      candidateChanges: old.rows.map(candidate => {
        const next = current.rows.find(item => item.move === candidate.move); assert.ok(next);
        return { move: candidate.move, consequence: candidate.consequence,
          beforeScore: candidate.score, afterScore: next.score, scoreGain: next.score - candidate.score };
      }) };
  });
  rows.push({ schedule, condition, reportSha256: sha(reportPath), auditSha256: sha(auditPath),
    trainingCorrectBefore: report.baseline.train.filter(row => row.correct).length,
    trainingCorrectAfter: report.afterTraining.train.filter(row => row.correct).length,
    validationCorrectBefore: report.baseline.validation.filter(row => row.correct).length,
    validationCorrectAfter: report.afterTraining.validation.filter(row => row.correct).length,
    repairs: panels.filter(row => !row.beforeCorrect && row.afterCorrect).map(row => row.panelId),
    regressions: panels.filter(row => row.beforeCorrect && !row.afterCorrect).map(row => row.panelId),
    panels, presentations: report.presentations, metrics: report.metrics,
    auditMetrics: audit.auditMetrics, auditPeakRssBytes: audit.auditPeakRssBytes });
}
const comparisons = ['selected', 'uniform'].map(schedule => {
  const informative = rows.find(row => row.schedule === schedule && row.condition === 'informative');
  const target = informative.panels.find(row => row.panelId === registration.target);
  const sentinel = informative.panels.find(row => row.panelId === registration.sentinel);
  const contrasts = conditions.filter(condition => condition !== 'informative').map(condition => {
    const control = rows.find(row => row.schedule === schedule && row.condition === condition);
    return { condition, panels: informative.panels.map(panel => ({ panelId: panel.panelId,
      informativeMinusControlMarginGain: panel.marginGain - control.panels.find(row => row.panelId === panel.panelId).marginGain })) };
  });
  return { schedule, target, sentinel, contrasts, checks: {
    baselineTargetWrong: target.beforeCorrect === false,
    baselineSentinelCorrect: sentinel.beforeCorrect === true,
    informativeTargetCorrect: target.afterCorrect === true,
    informativeSentinelCorrect: sentinel.afterCorrect === true,
    zeroNewRegressions: informative.regressions.length === 0,
    targetMarginGainPositive: target.marginGain > 0,
    targetMarginGainGreaterThanEachMatchedControl: contrasts.every(contrast =>
      contrast.panels.find(panel => panel.panelId === registration.target).informativeMinusControlMarginGain > 0),
  } };
});
const recoveryPath = join(base, 'recovery-audit.json'), recovery = read(recoveryPath);
assert.equal(recovery.passed, true); assert.equal(recovery.pendingUpdateDuplicated, false);
assert.equal(recovery.newPresentationsBeforeAcknowledgment, 0);
assert.equal(recovery.exactReceiptHashes, 4);
const recoveredReport = read(join(base, 'recovery-selected-informative', 'report.json'));
assert.equal(sha(join(base, 'recovery-selected-informative', 'report.json')), recovery.recoveredReportSha256);
const selectedChecks = comparisons.find(row => row.schedule === 'selected').checks;
const summary = { schema: 'correction-preservation-v2-summary-v1',
  protocolSha256: registration.protocolSha256, registrationSha256: sha(registrationPath),
  analyzerSha256: sha(fileURLToPath(import.meta.url)),
  allEightArmsIndependentlyAudited: true, scratchBaselinesIdentical: true,
  acceptance: { ...selectedChecks, exactIndependentReplay: true, exactPendingRecovery: true },
  selectedScreenPass: Object.values(selectedChecks).every(Boolean),
  arms: rows, comparisons, recoveryAuditSha256: sha(recoveryPath),
  resources: { totalMainTrainingWallSeconds: rows.reduce((sum, row) => sum + row.metrics.wallSeconds, 0),
    totalMainTrainingCpuSeconds: rows.reduce((sum, row) => sum + row.metrics.cpuSeconds, 0),
    totalMainAuditWallSeconds: rows.reduce((sum, row) => sum + row.auditMetrics.wallSeconds, 0),
    totalMainAuditCpuSeconds: rows.reduce((sum, row) => sum + row.auditMetrics.cpuSeconds, 0),
    maxMainTrainingRssBytes: Math.max(...rows.map(row => row.metrics.peakRssBytes)),
    maxMainAuditRssBytes: Math.max(...rows.map(row => row.auditPeakRssBytes)),
    recoveryInvocation: recoveredReport.metrics,
    scope: 'Measured Node invocation times exclude module import startup and small fixture/analysis overhead; no matched time-to-quality comparison.' },
  finalFamilyFilesRead: false, graphInference: false,
  scope: 'One-seed one-ply candidate pairs. Uniform comparison is descriptive. No delayed biological retention, all-legal usefulness or transferable reasoning established.' };
const out = join(base, 'summary.json');
assert.ok(!existsSync(out) && !existsSync(`${out}.partial`), 'Never overwrite a result synthesis');
writeFileSync(`${out}.partial`, JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
renameSync(`${out}.partial`, out);
console.log(JSON.stringify({ selectedScreenPass: summary.selectedScreenPass,
  acceptance: summary.acceptance, resources: summary.resources }));
