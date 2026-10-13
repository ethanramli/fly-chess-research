import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';

const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const v1Path = 'research/data/correction-preservation-schedules-v1';
const outPath = 'research/data/correction-preservation-schedules-v2';
const partialPath = outPath + '.partial';
assert.ok(!existsSync(outPath) && !existsSync(partialPath), 'Never overwrite a schedule artifact');
const oldManifest = read(join(v1Path, 'manifest.json'));
const old = read(join(v1Path, 'schedules.json'));
assert.equal(sha(join(v1Path, 'schedules.json')), oldManifest.schedulesSha256);
for (const [pathKey, hashKey] of [['frozenProtocol','frozenProtocolSha256'],['trainingPath','trainingSha256'],['scratchReport','scratchReportSha256'],['scratchAudit','scratchAuditSha256']]) {
  const p = old.source[pathKey];
  assert.equal(sha(p), old.source[hashKey], 'Source hash mismatch: ' + p);
}
assert.equal(sha(old.source.scratchAudit + '.COMPLETE'), old.source.scratchAuditCompleteSha256);
const frozen = read(old.source.frozenProtocol);
const panels = readFileSync(old.source.trainingPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const byId = new Map(panels.map(p => [p.id, p]));
const targetId = old.selected.targetPanelId, sentinelId = old.selected.sentinelPanelId;
assert.equal(targetId, 'tr-06');
assert.equal(sentinelId, 'tr-03');

function makeEvent(panelId, move, index, role) {
  const panel = byId.get(panelId);
  assert.ok(panel, 'Missing training panel: ' + panelId);
  const candidate = panel.candidates.find(c => c.move === move);
  assert.ok(candidate, 'Missing candidate: ' + panelId + '/' + move);
  const board = new Chess();
  board.loadPgn(panel.pgn);
  assert.equal(board.fen(), panel.fen);
  const experience = {
    ...verifiedExperience(board, move, frozen.task, candidate.proof),
    proof: candidate.proof,
    context: { fen: panel.fen, pgn: panel.pgn, task: frozen.task },
  };
  assert.equal(experience.learningAllowed, true);
  assert.equal(experience.status, candidate.proof.status);
  return { index, panelId, move, role, status: experience.status, experience };
}
const selected = old.selected.events.map(e => makeEvent(e.panelId, e.move, e.index, e.role));
function pairShape(panel, moveAStatus, moveBStatus) {
  const a = panel.candidates.find(c => c.move === 'a1a4');
  const b = panel.candidates.find(c => c.move === 'e1e5');
  return a?.proof.status === moveAStatus && b?.proof.status === moveBStatus;
}
function rankedEligible(predicate, role) {
  return panels.filter(p => p.id !== targetId && p.id !== sentinelId && predicate(p))
    .map(p => ({ id: p.id, key: createHash('sha256').update('correction-preservation-matched-uniform-v2:20261008:' + role + ':' + p.id).digest('hex') }))
    .sort((a,b) => a.key.localeCompare(b.key));
}
const wrongPanels = rankedEligible(p => pairShape(p, 'failure', 'success'), 'wrong-pattern');
const correctPanels = rankedEligible(p => pairShape(p, 'success', 'failure'), 'correct-pattern');
assert.ok(wrongPanels.length && correctPanels.length);
const randomWrong = wrongPanels[0].id, randomCorrect = correctPanels[0].id;
assert.notEqual(randomWrong, randomCorrect);
const uniform = [
  makeEvent(randomWrong, 'a1a4', 0, 'uniform-matched-failure'),
  makeEvent(randomWrong, 'e1e5', 1, 'uniform-matched-success'),
  makeEvent(randomCorrect, 'a1a4', 2, 'uniform-matched-success'),
  makeEvent(randomCorrect, 'e1e5', 3, 'uniform-matched-failure'),
];
const signature = xs => xs.map(e => e.move + ':' + e.status).join('|');
assert.equal(signature(selected), signature(uniform), 'Schedules must match move/outcome/order');
for (const xs of [selected, uniform]) {
  assert.equal(xs.length, 4);
  assert.equal(new Set(xs.map(e => e.panelId)).size, 2);
  for (const move of ['a1a4','e1e5']) {
    assert.equal(xs.filter(e => e.move === move && e.status === 'success').length, 1);
    assert.equal(xs.filter(e => e.move === move && e.status === 'failure').length, 1);
  }
}
const artifact = {
  schema: 'correction-preservation-schedules-v2',
  source: { ...old.source, scheduleV1Path: join(v1Path, 'schedules.json'), scheduleV1Sha256: oldManifest.schedulesSha256 },
  task: frozen.task,
  matching: {
    eventsPerSchedule: 4,
    contextsPerSchedule: 2,
    moveOutcomeCounts: { a1a4: { success: 1, failure: 1 }, e1e5: { success: 1, failure: 1 } },
    eventOrder: signature(selected),
    controlSelection: 'Stable seeded hash within verified move/outcome strata; excludes the selected target and sentinel; never reads scores, margins or choices.',
  },
  selected: { method: old.selected.method, targetPanelId: targetId, sentinelPanelId: sentinelId, events: selected },
  uniform: {
    seed: 20261008,
    selection: 'One nonselected training panel with a1a4 failure/e1e5 success and one nonselected panel with a1a4 success/e1e5 failure; ranked only by stable seeded hash.',
    panels: [randomWrong, randomCorrect],
    events: uniform,
  },
  controls: {
    conditions: ['informative','no-channel','shuffled','disabled'],
    shuffled: 'Swap the two verified consequence labels within each move identity; keep certificate truth and delivered channel in separate fields. This is a deliberately mismatched control, not verified teaching.',
    noChannel: 'No external reinforcement stimulation; local activity-driven plasticity remains enabled.',
    disabled: 'Replay matched informative channel while suppressing persistent plasticity updates.',
  },
  gates: {
    narrowAcquisition: 'Correct tr-06 while preserving tr-03 at the same post-training memory; no candidate-pair regressions among the eight training and four validation panels.',
    attribution: 'Compare selected and score-blind schedules only after matching move, outcome, order, event count and context count; report per-panel margins and actual choices.',
    limitations: 'One seed, synthetic one-ply capture-retention family; not delayed biological retention, all-legal usefulness, disjoint transfer or general chess reasoning.',
  },
  status: 'Schedule preparation only; v1 preserved. A separately frozen protocol, source archive, runner, independent graph auditor and recovery validation are still required before graph use.',
};
mkdirSync(partialPath);
const scheduleFile = join(partialPath, 'schedules.json');
writeFileSync(scheduleFile, JSON.stringify(artifact, null, 2) + '\n', { flag: 'wx' });
const manifest = {
  schema: artifact.schema,
  schedulesPath: join(outPath, 'schedules.json'),
  schedulesSha256: sha(scheduleFile),
  preparationScript: '.codebase/scripts/diagnostics/prepare-correction-preservation-schedules-v2.mjs',
  preparationScriptSha256: sha('.codebase/scripts/diagnostics/prepare-correction-preservation-schedules-v2.mjs'),
  selected: selected.map(({index,panelId,move,role,status}) => ({index,panelId,move,role,status})),
  uniform: uniform.map(({index,panelId,move,role,status}) => ({index,panelId,move,role,status})),
  graphInference: false,
  finalFamilyRead: false,
};
writeFileSync(join(partialPath, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
renameSync(partialPath, outPath);
console.log(JSON.stringify({ ready: true, selected: manifest.selected, uniform: manifest.uniform, matchedMoveOutcomeOrder: true, graphInference: false }));