// A provenance contract for a future contrastive lesson.  It is deliberately
// separate from the current binary-pulse receiver: no prose, reply, or teacher
// score reaches the neural update until a separately frozen interface does so.
import assert from 'node:assert/strict';
import { bindFeedbackToAssessment } from './feedback-quality.mjs';

function checkedPrediction(board, task, prediction, attemptedMove, alternativeMove, memoryHash) {
  assert.equal(prediction?.schema, 'learner-consequence-prediction-v1');
  assert.deepEqual(prediction.context, { fen: board.fen(), pgn: board.pgn(), task });
  assert.equal(prediction.memoryHash, memoryHash, 'Prediction has stale memory');
  assert.equal(prediction.source, 'declared-neural-output', 'Prediction must not be a teacher estimate');
  assert.ok(Array.isArray(prediction.rows) && prediction.rows.length === 2, 'Need paired learner predictions');
  const byMove = new Map(prediction.rows.map(row => [row.move, row]));
  assert.equal(byMove.size, 2, 'Duplicate learner prediction');
  for (const move of [attemptedMove, alternativeMove]) {
    const row = byMove.get(move);
    assert.ok(row, 'Prediction omitted reviewed move');
    assert.ok(['success', 'failure', 'unknown'].includes(row.predictedStatus), 'Invalid predicted consequence');
    assert.ok(Number.isFinite(row.confidence) && row.confidence >= 0 && row.confidence <= 1, 'Invalid prediction confidence');
  }
  return structuredClone(prediction);
}

function captureRetentionContrast(attempted, alternative) {
  const failed = attempted.status === 'failure' ? attempted : alternative;
  const succeeded = attempted.status === 'success' ? attempted : alternative;
  const refutations = failed.proof?.certificate?.recaptures;
  assert.ok(Array.isArray(refutations) && refutations.length > 0, 'Failure lacks a certified refutation');
  assert.equal(succeeded.proof?.certificate?.recaptures?.length, 0, 'Success has an incompatible recapture record');
  return { criterion: 'capture-retention', failedMove: failed.move, successfulMove: succeeded.move,
    certifiedRefutingReplies: [...refutations].sort(),
    scope: 'Immediate recapture under every legal reply in the certificate; not strategic move quality or delayed credit.' };
}

export function bindCounterfactualTeachingRecord(board, task, assessment, attempted, alternative, prediction, currentMemoryHash) {
  assert.notEqual(attempted.move, alternative.move, 'Attempt and alternative must differ');
  const attemptedBinding = bindFeedbackToAssessment(board, task, assessment, attempted, currentMemoryHash);
  const alternativeBinding = bindFeedbackToAssessment(board, task, assessment, alternative, currentMemoryHash);
  assert.equal(attemptedBinding.role, 'chosen-action-review', 'Attempt must be the unaided chosen action');
  assert.ok(['success', 'failure'].includes(attemptedBinding.status) && ['success', 'failure'].includes(alternativeBinding.status),
    'Unknown evidence cannot form a teaching record');
  assert.notEqual(attemptedBinding.status, alternativeBinding.status, 'Counterfactual outcomes must contrast');
  const learnerPrediction = checkedPrediction(board, task, prediction, attempted.move, alternative.move, currentMemoryHash);
  assert.equal(task.objective, 'capture-retention', 'Only capture-retention contrast is currently specified');
  assert.equal(task.plies, 1, 'Only one-ply capture retention is currently specified');
  return {
    schema: 'counterfactual-teaching-record-v1',
    context: { fen: board.fen(), pgn: board.pgn(), task }, memoryHash: currentMemoryHash,
    attempt: attemptedBinding, survivingAlternative: alternativeBinding, learnerPrediction,
    verifiedContrast: captureRetentionContrast(attempted, alternative),
    receiverContract: {
      currentDelivery: 'The current receiver may consume only the separately bound board/action cue and experimental channel.',
      prohibited: 'No teacher score, refutation prose, certificate-derived parameter delta, external search, or calibrated target may enter the neural update.',
      nextRequirement: 'A new frozen encoder/interface must state which verified relation is physically represented before this record can be used for neural teaching.'
    },
    scope: 'Checked teacher record only. It is not a neural delivery, learned value prediction, retention result, or transferable-reasoning result.'
  };
}
