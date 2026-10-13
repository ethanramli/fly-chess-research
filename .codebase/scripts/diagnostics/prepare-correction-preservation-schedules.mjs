// Prepare equal-budget teacher schedules from audited training-only evidence.
// No graph inference or neural update occurs in this preparation step.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { planCorrectionAndPreservation } from '../../src/puzzle-learning/correction-preservation-plan.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';

const frozenPath = 'research/data/bound-ray-feedback-development-v1/protocol.json';
const reportPath = 'research/reports/bound-ray-feedback-development-v1-2026-10-08/bound-ray-informative/report.json';
const auditPath = 'research/reports/bound-ray-feedback-development-v1-2026-10-08/bound-ray-informative/audit.json';
const completePath = `${auditPath}.COMPLETE`;
const outPath = 'research/data/correction-preservation-schedules-v1';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
assert.ok(!existsSync(outPath), 'Never overwrite a prepared schedule artifact');

const frozen = read(frozenPath), report = read(reportPath), audit = read(auditPath), complete = read(completePath);
assert.equal(await sha256(frozenPath), report.identity.protocolSha256);
assert.equal(await sha256(reportPath), audit.reportSha256);
assert.equal(await sha256(auditPath), complete.auditSha256);
assert.equal(audit.exactFreshNeuralReplays, true);
assert.equal(audit.finalFamilyFilesRead, false);
assert.equal(report.encoder, 'bound-ray'); assert.equal(report.condition, 'informative');
assert.equal(report.baseline.train.length, 8);
const trainPath = frozen.data.trainPath;
assert.equal(await sha256(trainPath), frozen.inputHashes[trainPath]);
const panels = readFileSync(trainPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
assert.equal(panels.length, 8);
const baselineById = new Map(report.baseline.train.map(row => [row.panelId, row]));
assert.equal(baselineById.size, 8);
const observations = panels.map(panel => {
  const baseline = baselineById.get(panel.id);
  assert.ok(baseline); assert.equal(baseline.memoryHash, report.initialMemoryHash);
  const board = new Chess(); board.loadPgn(panel.pgn); assert.equal(board.fen(), panel.fen);
  return { panelId: panel.id, split: 'train', assessment: {
    fen: panel.fen, pgn: panel.pgn, task: frozen.task, memoryHash: baseline.memoryHash,
    rows: baseline.rows.map(({ move, score }) => ({ move, score })), choice: baseline.choice,
  }, experiences: panel.candidates.map(candidate => ({
    ...verifiedExperience(board, candidate.move, frozen.task, candidate.proof),
    proof: candidate.proof, context: { fen: panel.fen, pgn: panel.pgn, task: frozen.task },
  })) };
});
const plan = planCorrectionAndPreservation(observations, report.initialMemoryHash);
assert.equal(plan.ready, true);
assert.equal(plan.targetPanelId, 'tr-06'); assert.equal(plan.sentinelPanelId, 'tr-03');

function event(panelId, move, role, index) {
  const panel = panels.find(row => row.id === panelId); assert.ok(panel);
  const board = new Chess(); board.loadPgn(panel.pgn);
  const candidate = panel.candidates.find(row => row.move === move); assert.ok(candidate);
  const experience = { ...verifiedExperience(board, candidate.move, frozen.task, candidate.proof),
    proof: candidate.proof, context: { fen: panel.fen, pgn: panel.pgn, task: frozen.task } };
  assert.equal(experience.learningAllowed, true);
  return { index, panelId, move, role, status: experience.status, experience };
}
const selected = plan.experiences.map(row => event(row.panelId,
  row.experience.move, row.role, row.index));
assert.deepEqual(selected.map(row => row.role), [
  'target-failure','target-success','preserve-success','preserve-failure']);

// The uniform arm uses only a seeded hash of training panel IDs and consequence
// class. It never consults baseline score, choice, margin or the selected plan.
const panelById = new Map(panels.map(row => [row.id, row]));
const rankedPanels = status => observations.filter(observation => {
  const panel = panelById.get(observation.panelId);
  return panel.candidates.some(candidate => candidate.proof.status === status);
}).map(observation => ({ id: observation.panelId,
  key: createHash('sha256').update(`uniform-curriculum-v1:20261008:${status}:${observation.panelId}`).digest('hex')
})).sort((a,b) => a.key.localeCompare(b.key));
const positive = rankedPanels('success').slice(0,2);
const negative = rankedPanels('failure').filter(row => !positive.some(yes => yes.id === row.id)).slice(0,2);
assert.equal(positive.length,2); assert.equal(negative.length,2);
const uniformUnordered = [
  ...positive.map(row => ({ panelId: row.id, status: 'success' })),
  ...negative.map(row => ({ panelId: row.id, status: 'failure' })),
].map(row => {
  const panel = panelById.get(row.panelId);
  const candidate = panel.candidates.find(item => item.proof.status === row.status);
  return { panelId: row.panelId, move: candidate.move, status: row.status,
    orderKey: createHash('sha256').update(`uniform-order-v1:20261008:${row.panelId}:${candidate.move}`).digest('hex') };
}).sort((a,b) => a.orderKey.localeCompare(b.orderKey));
const uniform = uniformUnordered.map((row,index) => event(row.panelId,row.move,'uniform-sample',index));
assert.equal(new Set(uniform.map(row => row.panelId)).size,4);
assert.equal(uniform.filter(row => row.status === 'success').length,2);
assert.equal(uniform.filter(row => row.status === 'failure').length,2);
for (const schedule of [selected,uniform]) {
  assert.equal(schedule.length,4);
  assert.equal(schedule.filter(row => row.status === 'success').length,2);
  assert.equal(schedule.filter(row => row.status === 'failure').length,2);
}

const artifact = { schema: 'correction-preservation-schedules-v1',
  source: { frozenProtocol: frozenPath, frozenProtocolSha256: await sha256(frozenPath),
    trainingPath: trainPath, trainingSha256: await sha256(trainPath),
    scratchReport: reportPath, scratchReportSha256: await sha256(reportPath),
    scratchAudit: auditPath, scratchAuditSha256: await sha256(auditPath),
    scratchAuditCompleteSha256: await sha256(completePath),
    baselineMemoryHash: report.initialMemoryHash },
  task: frozen.task,
  equalBudget: { eventsPerSchedule: 4, eachScheduleCounts: { success: 2, failure: 2 },
    baselineRankingWorkShared: 'Both schedules use the same already-required eight-panel scratch baseline; uniform selection itself ignores all scores/choices.' },
  selected: { method: plan.selectionRule, targetPanelId: plan.targetPanelId,
    sentinelPanelId: plan.sentinelPanelId, events: selected.map(({index,panelId,move,role,status,experience})=>({index,panelId,move,role,status,experience})) },
  uniform: { seed: 20261008, selection: 'Two success and two failure experiences from four distinct training panels, ranked only by stable hash of seed, outcome class and panel ID; order is a separate stable hash.',
    panels: uniform.map(row=>row.panelId), events: uniform.map(({index,panelId,move,role,status,experience})=>({index,panelId,move,role,status,experience})) },
  futureConditions: ['informative','no-channel','shuffled','disabled'],
  shuffledFeedback: 'For each frozen schedule, independently seed a non-identical permutation of its 2-success/2-failure labels; every control replays the same schedule, contexts and assessment counts.',
  gates: { selected: 'At one frozen post-training memory, correct the target and preserve the sentinel; no regressions across all eight training and four validation panels.',
    comparison: 'Report every choice/margin; schedule advantage requires the selected informative arm to outperform its schedule-matched controls and the uniform informative arm without validation regressions.',
    retention: 'Exact repeat/reset/restoration plus held-correct panel criteria; deterministic state persistence alone does not pass.',
    scope: 'One-seed narrow mechanism test, not disjoint transfer or general chess reasoning.' },
  status: 'Schedule preparation only; independent source archive, runner, auditor, recovery fixture and frozen experiment protocol still required before graph use.' };
mkdirSync(outPath, { recursive: false });
const path = join(outPath, 'schedules.json'), partial = `${path}.partial`;
writeFileSync(partial, `${JSON.stringify(artifact,null,2)}\n`, { flag: 'wx' }); renameSync(partial,path);
const manifest = { schema: artifact.schema, schedulesPath: path,
  schedulesSha256: await sha256(path), preparationScript: '.codebase/scripts/diagnostics/prepare-correction-preservation-schedules.mjs',
  preparationScriptSha256: await sha256('.codebase/scripts/diagnostics/prepare-correction-preservation-schedules.mjs'),
  source: artifact.source, selected: selected.map(row=>({panelId:row.panelId,move:row.move,role:row.role,status:row.status})),
  uniform: uniform.map(row=>({panelId:row.panelId,move:row.move,role:row.role,status:row.status})),
  graphInference: false, finalFamilyRead: false };
const manifestPath=join(outPath,'manifest.json'), manifestPartial=`${manifestPath}.partial`;
writeFileSync(manifestPartial,`${JSON.stringify(manifest,null,2)}\n`,{flag:'wx'});renameSync(manifestPartial,manifestPath);
console.log(JSON.stringify({ready:true,selected:manifest.selected,uniform:manifest.uniform,eventsPerArm:4,counts:{success:2,failure:2},graphInference:false}));
