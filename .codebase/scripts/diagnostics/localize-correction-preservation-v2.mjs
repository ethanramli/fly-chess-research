// Read-only localization of the completed correction-preservation v2 screen.
// It reports observed cue/activity/update overlap; it does not propose or apply
// a learning rule, invoke graph inference, or inspect a final family.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = resolve(process.argv[2] ?? 'research/reports/correction-preservation-v2-2026-10-08');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const overlap = (a, b) => [...a].filter(value => b.has(value)).length;
const runDirectory = (schedule, condition) => schedule === 'selected' && condition === 'disabled'
  ? 'selected-disabled-resumed' : `${schedule}-${condition}`;
const summary = read(join(base, 'summary.json'));
const registration = read('research/data/correction-preservation-v2/registration.json');
const arms = [];
for (const schedule of ['selected', 'uniform']) for (const condition of ['informative', 'no-channel', 'shuffled', 'disabled']) {
  const dir = join(base, runDirectory(schedule, condition));
  const report = read(join(dir, 'report.json'));
  const baseline = [...report.baseline.train, ...report.baseline.validation];
  const after = [...report.afterTraining.train, ...report.afterTraining.validation];
  const panels = after.map(current => {
    const before = baseline.find(row => row.panelId === current.panelId);
    assert.ok(before);
    return { panelId: current.panelId, choiceBefore: before.choice, choiceAfter: current.choice,
      correctBefore: before.correct, correctAfter: current.correct,
      marginBefore: before.margin, marginAfter: current.margin,
      marginGain: current.margin - before.margin };
  });
  const events = report.receipts.map(ref => {
    const record = read(join(dir, ref.path));
    assert.equal(sha(join(dir, ref.path)), ref.sha256);
    const assignment = new Set(record.receipt.cue.assignments.map(item => item.index));
    const activeKc = new Set(record.receipt.local.kc
      .map((value, index) => value > 0 ? index : null).filter(index => index !== null));
    return { eventIndex: record.eventIndex, panelId: record.panelId, move: record.move,
      certifiedStatus: record.status, deliveredChannel: record.channel,
      learningApplied: record.receipt.learningApplied,
      plasticityEnabled: record.receipt.plasticityEnabled,
      directCueCells: assignment.size, activeKcCount: activeKc.size,
      updateFactors: record.receipt.update.factors,
      changedEdges: record.receipt.update.changedEdges,
      assignment, activeKc };
  });
  const pairs = [];
  for (let left = 0; left < events.length; left += 1) for (let right = left + 1; right < events.length; right += 1) {
    pairs.push({ leftEvent: events[left].eventIndex, rightEvent: events[right].eventIndex,
      directCueIntersection: overlap(events[left].assignment, events[right].assignment),
      activeKcIntersection: overlap(events[left].activeKc, events[right].activeKc) });
  }
  arms.push({ schedule, condition, reportSha256: sha(join(dir, 'report.json')),
    target: panels.find(panel => panel.panelId === registration.target),
    sentinel: panels.find(panel => panel.panelId === registration.sentinel),
    changedPanels: panels.filter(panel => panel.choiceBefore !== panel.choiceAfter || panel.correctBefore !== panel.correctAfter),
    events: events.map(({ assignment, activeKc, ...event }) => event), pairOverlaps: pairs });
}
const selectedInformative = arms.find(row => row.schedule === 'selected' && row.condition === 'informative');
const uniformInformative = arms.find(row => row.schedule === 'uniform' && row.condition === 'informative');
const uniformShuffled = arms.find(row => row.schedule === 'uniform' && row.condition === 'shuffled');
const result = { schema: 'correction-preservation-v2-localization-v1',
  protocolSha256: summary.protocolSha256, summarySha256: sha(join(base, 'summary.json')),
  scriptSha256: sha(fileURLToPath(import.meta.url)), target: registration.target, sentinel: registration.sentinel,
  findings: {
    selectedInformativeTargetUnrepaired: selectedInformative.target.correctAfter === false,
    selectedInformativeTargetMarginWorsened: selectedInformative.target.marginGain < 0,
    uniformInformativeValidationUnchanged: uniformInformative.changedPanels.filter(panel => panel.panelId.startsWith('va-')).length === 0,
    uniformShuffledValidationChanges: uniformShuffled.changedPanels.filter(panel => panel.panelId.startsWith('va-')),
    interpretation: 'Observed cue-cell and endpoint-activity overlap can motivate a causal hypothesis but does not identify causal edges, establish biological representation, or validate a replacement rule.'
  }, arms,
  scope: 'Read-only development localization from frozen reports and receipts. No graph inference, final-family read, causal intervention, retention claim, or transferable-reasoning claim.' };
const out = join(base, 'localization.json');
assert.ok(!existsSync(out) && !existsSync(`${out}.partial`), 'Never overwrite localization evidence');
writeFileSync(`${out}.partial`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
renameSync(`${out}.partial`, out);
console.log(JSON.stringify({ target: result.target, findings: result.findings, output: out }));
