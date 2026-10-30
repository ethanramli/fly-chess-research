// Reproducible shared auditor edit; no graph or learner execution.
import { readFileSync, writeFileSync } from 'node:fs';
const path = '.codebase/src/puzzle-learning/plasticity-mechanism-assay.mjs';
let source = readFileSync(path, 'utf8');
const start = source.indexOf('export async function auditAssayRecords(');
const end = source.indexOf('export function loadPinnedJson(', start);
if (start < 0 || end < 0) throw Error('Expected audit edit anchors missing');
source = source.slice(0, start) + String.raw`export async function auditAssayRecords({ protocol, schedule, experiences, recordsByCondition, verify,
  receiptDigests, adapterStates, initialPhysiologicalHashes }) {
  assert.ok(receiptDigests && adapterStates && initialPhysiologicalHashes, 'Committed checkpoints/digests required for audit');
  const plans = Object.fromEntries(CONDITIONS.map(c => [c, planDeliveries(schedule, c, protocol.seed)]));
  assertMatchedExposure(schedule, plans);
  const byId = new Map(experiences.map(e => [e.id, e])), checks = new Map();
  for (const e of experiences) checks.set(e.id, await verify(e));
  const certified = experiences.filter(e => checks.get(e.id)?.learningAllowed === true);
  const allRecords = [], exposureReference = new Map(), audited = {};
  assert.equal(Object.keys(receiptDigests).length, CONDITIONS.length * schedule.length, 'Acknowledged receipt count mismatch');
  for (const condition of CONDITIONS) {
    const rows = recordsByCondition[condition];
    assert.ok(Array.isArray(rows) && rows.length === schedule.length, condition + ': record count mismatch');
    let physiology = initialPhysiologicalHashes[condition], presentations = 0, evaluations = 0;
    for (let i = 0; i < schedule.length; i++) {
      const slot = schedule[i], event = byId.get(slot.experienceId), row = rows[i];
      assert.ok(event, 'Unknown experience');
      assert.equal(row.id, condition + '-' + slot.id, 'Receipt order/identity mismatch');
      assert.equal(receiptDigest(row), receiptDigests[row.id], 'Acknowledged receipt digest mismatch');
      assert.equal(row.schema, 'plasticity-assay-receipt-v2');
      assert.equal(row.condition, condition); assert.deepEqual(row.slot, slot);
      assert.deepEqual(row.context, { fen: event.fen, pgn: event.pgn, task: event.task, action: event.action });
      assert.equal(row.cueIdentity, cueIdentity(row.context));
      validateRanking(row.unaidedRanking, event, protocol.budgets.maxLegalMoves);
      validateRanking(row.postRanking, event, protocol.budgets.maxLegalMoves);
      const verification = checks.get(event.id);
      const verified = event.status !== 'unknown' && verification.learningAllowed === true;
      if (verified) makeVerifiedReceipt({ event, assessment: row.unaidedRanking, verification, signal: null, neural: null });
      const teaching = verified && !slot.probe;
      const channel = teaching ? plans[condition].assignments[i] : null;
      const signal = channel === null ? null : { channel, delaySteps: slot.delaySteps, plasticityEnabled: condition !== 'disabled' };
      assert.deepEqual(row.deliveredSignal, signal, 'Delivered signal mismatch');
      assert.equal(row.plasticityEnabled, condition !== 'disabled');
      assert.equal(row.skipped, !teaching || channel === null);
      assert.equal(row.teacherEvidence.verified, verified);
      assert.equal(row.teacherEvidence.status, verified ? verification.status : 'unknown');
      assert.equal(row.teacherEvidence.certificateSha256, verified ? verification.certificateSha256 : null);
      assert.equal(row.teacherEvidence.scope, verified ? verification.verifiedScope : null);
      const before = verified ? behavioralMargin(row.unaidedRanking, event, certified) : null;
      const after = verified ? behavioralMargin(row.postRanking, event, certified) : null;
      assert.deepEqual(row.behavioral, { metric: 'candidate-against-certified-opponents-v1', beforeMargin: before,
        afterMargin: after, change: before === null || after === null ? null : after - before }, 'Behavioral margin evidence mismatch');
      if (teaching) validateNeuralReceipt(row.neural);
      else { assert.equal(row.neural, null, 'Unknown/probe reached teaching'); assert.deepEqual(row.postRanking, row.unaidedRanking); }
      assert.equal(row.physiologicalHashes.before, physiology, 'Persistent state continuity mismatch');
      assert.ok(/^[a-f0-9]{64}$/.test(row.physiologicalHashes.after));
      assert.equal(row.postRanking.memoryHash, row.physiologicalHashes.after, 'Post-ranking state hash mismatch');
      if (condition === 'disabled') {
        assert.equal(row.physiologicalHashes.after, physiology, 'Disabled persistent state changed');
        assert.equal(row.unaidedRanking.memoryHash, physiology, 'Disabled assessment state changed');
      }
      physiology = row.physiologicalHashes.after;
      const expected = { assessmentEvaluations: row.unaidedRanking.evaluations, preReadoutEvaluations: 0,
        assessmentPresentations: row.unaidedRanking.presentations, neuralPresentations: row.neural?.presentations ?? 0,
        postReadoutEvaluations: teaching ? row.postRanking.evaluations : 0,
        postReadoutPresentations: teaching ? row.postRanking.presentations : 0 };
      assert.deepEqual(row.exposure, expected, 'Exposure/ranking count mismatch');
      for (const n of Object.values(expected)) assert.ok(Number.isSafeInteger(n) && n >= 0, 'Invalid work count');
      assert.ok(expected.assessmentEvaluations >= 1 && expected.assessmentEvaluations <= protocol.budgets.maxEvaluationsPerAssessment);
      assert.ok(expected.postReadoutEvaluations <= protocol.budgets.maxEvaluationsPerAssessment);
      if (teaching) assert.ok(expected.postReadoutEvaluations >= 1);
      presentations += expected.assessmentPresentations + expected.neuralPresentations + expected.postReadoutPresentations;
      evaluations += expected.assessmentEvaluations + expected.postReadoutEvaluations;
      assert.ok(presentations <= protocol.budgets.maxPresentations && evaluations <= protocol.budgets.maxEvaluations, 'Arm work budget exceeded');
      assert.ok(Number.isFinite(row.resources.rssMiB) && row.resources.rssMiB >= 0
        && Number.isFinite(row.resources.freeMiB) && row.resources.freeMiB >= 0, 'Invalid resource sample');
      guardResources({ rssBytes: row.resources.rssMiB * 2 ** 20, freeBytes: row.resources.freeMiB * 2 ** 20 }, protocol.runtime);
      if (exposureReference.has(slot.id)) assert.deepEqual(row.exposure, exposureReference.get(slot.id), 'Control exposure mismatch');
      else exposureReference.set(slot.id, row.exposure);
      allRecords.push(row);
    }
    assert.equal(digest(adapterStates[condition].physiological), physiology, 'Final checkpoint physiology mismatch');
    audited[condition] = { records: rows.length, verifiedTeachingEvents: rows.filter(r => r.teacherEvidence.verified && !r.skipped).length,
      unaidedProbes: rows.filter(r => r.slot.probe).length, presentations, evaluations };
  }
  return { passed: true, arms: audited, gates: evaluateAssayGates(allRecords, protocol),
    scope: 'Committed receipt/certificate/ranking/control audit; graph update replay and biological validation remain separate' };
}

` + source.slice(end);
writeFileSync(path, source);
