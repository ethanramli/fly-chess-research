import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const inputDir = 'research/reports/adaptive-near-transfer-v4-2026-10-07';
const outputDir = 'research/reports/adaptive-near-transfer-margin-v1-2026-10-07';
assert.ok(!existsSync(outputDir), `Refusing to overwrite ${outputDir}`);
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const reportPath = join(inputDir, 'report.json');
const auditPath = join(inputDir, 'audit.json');
const protocolPath = 'research/data/adaptive-near-transfer-v4/protocol.json';
const audit = read(auditPath), report = read(reportPath);
assert.equal(audit.passed, true);
assert.equal(audit.reportSha256, hash(reportPath));
assert.equal(audit.protocolSha256, hash(protocolPath));
assert.equal(report.complete, true);

const conditions = ['informative', 'absent', 'shuffled', 'disabled'];
const ids = [...new Set(report.panels.map(panel => panel.position.id))].sort();
assert.equal(ids.length, 5);
const rows = ids.map(id => {
  const panels = Object.fromEntries(report.panels.filter(panel => panel.position.id === id)
    .map(panel => [panel.condition, panel]));
  for (const condition of conditions) assert.ok(panels[condition], `${id}: missing ${condition}`);
  const successes = new Set(panels.informative.successMoves);
  assert.ok(successes.size > 0, `${id}: missing certified success move`);
  const margin = panel => {
    const successful = panel.rows.filter(row => successes.has(row.move)).sort((a, b) => b.score - a.score)[0];
    const failing = panel.rows.filter(row => !successes.has(row.move)).sort((a, b) => b.score - a.score)[0];
    assert.ok(successful && failing, `${id}/${panel.condition}: incomplete consequence labels`);
    return { bestSuccess: { move: successful.move, score: successful.score },
      bestFailure: { move: failing.move, score: failing.score },
      margin: successful.score - failing.score,
      correctChoice: panel.choice === successful.move };
  };
  const measured = Object.fromEntries(conditions.map(condition => [condition, margin(panels[condition])]));
  const controlMean = conditions.slice(1).reduce((sum, condition) => sum + measured[condition].margin, 0) / 3;
  return { id, legalCandidates: panels.informative.legalMoveCount,
    successMoves: [...successes], ...measured,
    meanMatchedControlMargin: controlMean,
    informativeMarginLift: measured.informative.margin - controlMean };
});
assert.ok(rows.every(row => !row.informative.correctChoice), 'This diagnostic expects the audited five-choice failure');

const sourcePath = fileURLToPath(import.meta.url);
const output = {
  schema: 'adaptive-near-transfer-margin-diagnostic-v1',
  scope: 'Exploratory descriptive reanalysis of already audited saved scores; no graph inference or feedback.',
  formula: 'margin = max(score of certified successful moves) - max(score of certified failures); informativeMarginLift = informative margin - mean(absent, shuffled, disabled margins).',
  inputs: Object.fromEntries([reportPath, auditPath, protocolPath].map(path => [path, hash(path)])),
  analyzer: { path: sourcePath.replace(`${root}\\`, '').replaceAll('\\', '/'), sha256: hash(sourcePath) },
  auditSummary: { panels: audit.panels, candidates: audit.candidates, certificates: audit.certificates,
    feedbackEvents: audit.feedbackEvents, memoryUnchangedPanels: audit.memoryUnchangedPanels },
  panels: rows,
  summary: { panels: rows.length,
    positiveMarginLifts: rows.filter(row => row.informativeMarginLift > 0).length,
    informativeCorrectChoices: rows.filter(row => row.informative.correctChoice).length,
    meanInformativeMarginLift: rows.reduce((sum, row) => sum + row.informativeMarginLift, 0) / rows.length,
    scope: 'Within-motif ranking transfer only; the learned memory chooses a certified failure on all five panels.' }
};
mkdirSync(outputDir);
writeFileSync(join(outputDir, 'report.json'), `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ output: join(outputDir, 'report.json'), summary: output.summary }));
