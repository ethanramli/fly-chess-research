// Teacher/specification checks only. This script never loads or trains the graph.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
import { certifyCaptureRetention } from '../../../.codebase/src/search-and-feedback/capture-retention-certificate.mjs';
import { checkCaptureRetentionCertificate } from '../../../.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs';
import { verifiedExperience } from '../../../.codebase/src/search-and-feedback/verified-feedback.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const input = readFileSync(resolve(directory, 'curriculum.json'), 'utf8');
const spec = JSON.parse(input);
const clone = value => JSON.parse(JSON.stringify(value));

function validate(s) {
  assert.equal(s.schema, 'flychess-principles-curriculum-v1');
  assert.equal(s.graphLaunchAuthorized, false);
  assert.deepEqual(s.learnedStages, []);
  assert.equal(s.prerequisites.id, 'G0');
  assert.equal(s.prerequisites.status, 'not-passed-for-this-curriculum');
  assert.equal(s.training.replicas, 3);
  assert.equal(s.training.maxTeachingEventsPerLessonPerReplica,
    s.training.blocks * s.training.eventsPerBlock);
  assert.deepEqual(s.training.conditions, ['informative', 'absent', 'matched-shuffled', 'disabled']);
  for (const panel of Object.values(s.datasets.perLesson)) {
    assert.equal(panel.boards, panel.pairs * 2);
    assert.equal(panel.boards % panel.families, 0);
  }
  assert.equal(s.gates.D1.total, s.datasets.perLesson.train.boards);
  assert.equal(s.gates.D2.total, s.datasets.perLesson.validation.boards);
  assert.equal(s.gates.D3.total, s.datasets.perLesson.final.boards);
  assert.equal(s.gates.D4.total, s.gates.D3.total * s.datasets.minimumCertifiedProbeActionsPerBoard);
  assert.equal(s.gates.D5.total, s.datasets.perLesson.final.pairs);
  for (const gate of Object.values(s.gates)) {
    for (const key of ['required', 'perStratumRequired', 'perFamilyRequired', 'newPrincipleRequired']) {
      if (gate[key] !== undefined) {
        const totalKey = key.replace('Required', 'Total').replace('required', 'total');
        assert(Number.isSafeInteger(gate[key]) && gate[key] > 0 && gate[key] <= gate[totalKey]);
      }
    }
  }
  assert.equal(s.gates.D3.perStratumTotal * 4, s.gates.D3.total);
  assert.equal(s.gates.D3.perFamilyTotal * s.datasets.perLesson.final.families, s.gates.D3.total);
  assert.equal(s.gates.D5.requiredProbeOrderingReversal, true);
  assert.equal(s.datasets.requireEveryLegalActionCertified, true);
  assert.equal(s.datasets.unknownFinalPolicy, 'invalid audit; no advancement, no silent replacement or denominator reduction');
  assert.equal(s.training.rollbackInsidePrimaryTrajectory, false);
  for (const [id, mode] of Object.entries(s.feedback)) {
    assert.equal(mode.teacherComputesNeuralDeltas, false);
    if (id === 'F2') {
      assert.equal(mode.unknownTaskSuppressesAllTeaching, true);
      assert.equal(mode.unknownEngineSuppressesOnlyAdditionalSignal, true);
    } else assert.equal(mode.unknownProducesFrames, false);
  }
  const r = s.resources;
  assert.equal(r.heapMiB, 256); assert.equal(r.maxRssMiB, 768);
  assert.equal(r.minFreeMiB, 256); assert.equal(r.cpuDuty, 0.5);
  assert.equal(r.positionsAtOnce, 1); assert.equal(r.graphRunsSerial, true);
  assert.equal(r.unknownIsNotDraw, true);
  assert(r.quietReserve > 0 && r.quietReserve <= r.maxSelectedCandidates);
  assert.equal(s.lessons.length, 12);
  const ids = s.lessons.map(l => l.id);
  assert.equal(new Set(ids).size, ids.length);
  const capabilityIds = new Set(s.capabilities.map(c => c.id));
  const curriculum = readFileSync(resolve(root, s.documents.curriculum), 'utf8');
  s.lessons.forEach((lesson, i) => {
    assert.equal(lesson.id, `C${String(i + 1).padStart(2, '0')}`);
    assert.equal(lesson.order, i + 1);
    assert.deepEqual(lesson.prerequisites, [i ? ids[i - 1] : 'G0']);
    assert.equal(lesson.status, 'specified-not-trained');
    for (const field of ['principle', 'definition', 'target', 'positive', 'negative', 'counterfactual', 'opponent', 'done'])
      assert.equal(typeof lesson[field], 'string', `${lesson.id}.${field}`);
    for (const field of ['tasks', 'feedback', 'capabilities']) assert(lesson[field].length > 0);
    for (const task of lesson.tasks) {
      assert(s.taskContracts[task], `${lesson.id}: unknown task ${task}`);
      assert(lesson.horizon <= s.taskContracts[task].maxHorizon);
    }
    for (const mode of lesson.feedback) assert(s.feedback[mode]);
    for (const capability of lesson.capabilities) assert(capabilityIds.has(capability));
    assert.equal(lesson.definitionOfDone.commonGate, 'D1-D8');
    assert.equal(lesson.definitionOfDone.specialization, lesson.done);
    assert(curriculum.includes(`### ${lesson.id}: ${lesson.principle}`));
  });
  for (const stages of Object.values(s.principlesCoverage))
    for (const stage of stages) assert(ids.includes(stage));
  assert.deepEqual(s.principlesCoverage['opponent moves and plans'], ids);
  for (const path of Object.values(s.documents)) assert(existsSync(resolve(root, path)), path);
  for (const c of s.capabilities) {
    if (c.path) assert(existsSync(resolve(root, c.path)), c.path);
    else assert(/not-implemented|required/.test(c.status), c.id);
  }
  return true;
}

validate(spec);
const rejected = [];
for (const [name, mutate] of [
  ['cyclic prerequisite', s => { s.lessons[0].prerequisites = ['C12']; }],
  ['impossible threshold', s => { s.gates.D3.required = 65; }],
  ['teaching on unknown', s => { s.feedback.F0.unknownProducesFrames = true; }]
]) {
  const changed = clone(spec); mutate(changed);
  assert.throws(() => validate(changed)); rejected.push(name);
}

const task = { objective: 'capture-retention', plies: 1 };
const teacherExamples = [
  { id: 'blocked-defender', fen: 'r6k/8/p7/8/p7/8/R7/7K w - - 0 1', expected: 'success' },
  { id: 'open-defender', fen: 'r6k/8/1p6/8/p7/8/R7/7K w - - 0 1', expected: 'failure' }
].map(example => {
  const board = new Chess(example.fen), originalPgn = board.pgn(), action = 'a2a4';
  const proof = certifyCaptureRetention(board, action);
  const checked = checkCaptureRetentionCertificate(board, action, proof);
  const receipt = verifiedExperience(board, action, task, proof);
  assert.equal(checked.verified, true); assert.equal(checked.status, example.expected);
  assert.equal(receipt.status, example.expected); assert.equal(receipt.learningAllowed, true);
  assert.equal(board.fen(), example.fen); assert.equal(board.pgn(), originalPgn);
  const forged = clone(proof); forged.certificate.replies.pop();
  assert.throws(() => checkCaptureRetentionCertificate(board, action, forged));
  const bounded = certifyCaptureRetention(board, action, { maxReplies: 1 });
  const unknown = verifiedExperience(board, action, task, bounded);
  assert.equal(unknown.status, 'unknown'); assert.equal(unknown.learningAllowed, false);
  assert.equal(unknown.experimentalPulse, null);
  return { ...example, action, task, proof, checked, receipt,
    excludedFromAllDatasetSplits: true, neuralDeliveryPerformed: false,
    rejectedIncompleteProof: true, exhaustedVerificationTeachesNothing: true };
});

writeFileSync(resolve(directory, 'teacher-examples.json'), JSON.stringify(teacherExamples, null, 2) + '\n');
const auditPath = resolve(directory, 'audit.json');
const documents = [spec.documents.curriculum, spec.documents.earlierDiscussion,
  'research/data/principles-curriculum-v1/README.md',
  'research/data/principles-curriculum-v1/source-evidence.md',
  'research/data/principles-curriculum-v1/completion-audit.md'];
let localLinksChecked = 0;
for (const path of documents) {
  const content = readFileSync(resolve(root, path), 'utf8');
  for (const match of content.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    const destination = resolve(dirname(resolve(root, path)), target);
    assert(destination === auditPath || existsSync(destination), `${path}: ${target}`);
    localLinksChecked++;
  }
}
const evidence = {
  schema: 'curriculum-specification-audit-v1', date: '2026-10-11',
  curriculumSha256: sha(input), validatorSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  specificationComplete: true, trainingReady: false, learningDemonstrated: false,
  graphLoaded: false, stagesChecked: spec.lessons.length, prerequisite: 'G0 not passed',
  corruptionChecksRejected: rejected, teacherExamplesIndependentlyChecked: teacherExamples.length,
  localLinksChecked, linkScope: 'local file existence; external URLs and Markdown anchors not validated',
  documentHashes: Object.fromEntries(documents.map(p => [p, sha(readFileSync(resolve(root, p)))])),
  scope: 'Internal specification invariants and bounded teacher evidence only; not biological or learning validation.'
};
writeFileSync(auditPath, JSON.stringify(evidence, null, 2) + '\n');
assert(existsSync(auditPath));
console.log(JSON.stringify(evidence, null, 2));
