import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { bindCounterfactualTeachingRecord } from '../../src/puzzle-learning/counterfactual-teaching-record.mjs';

function fixture() {
  const board = new Chess('4r1k1/8/8/4p3/pP5r/8/8/RK2R3 w - - 0 1');
  const task = { objective: 'capture-retention', plies: 1 }, memoryHash = 'a'.repeat(64);
  const assessment = { fen: board.fen(), pgn: board.pgn(), task, memoryHash,
    rows: [{ move: 'a1a4', score: 0.1 }, { move: 'e1e5', score: 0.2 }], choice: 'e1e5' };
  const experience = move => { const proof = certifyCaptureRetention(board, move); return {
    ...verifiedExperience(board, move, task, proof), proof, context: { fen: board.fen(), pgn: board.pgn(), task } }; };
  const prediction = { schema: 'learner-consequence-prediction-v1', source: 'declared-neural-output',
    context: { fen: board.fen(), pgn: board.pgn(), task }, memoryHash,
    rows: [{ move: 'e1e5', predictedStatus: 'success', confidence: 0.8 }, { move: 'a1a4', predictedStatus: 'failure', confidence: 0.6 }] };
  return { board, task, memoryHash, assessment, attempted: experience('e1e5'), alternative: experience('a1a4'), prediction };
}

test('counterfactual record binds an unaided error, certified refutation, alternative, and declared learner prediction', () => {
  const { board, task, memoryHash, assessment, attempted, alternative, prediction } = fixture();
  const record = bindCounterfactualTeachingRecord(board, task, assessment, attempted, alternative, prediction, memoryHash);
  assert.equal(record.attempt.status, 'failure'); assert.equal(record.survivingAlternative.status, 'success');
  assert.deepEqual(record.verifiedContrast.certifiedRefutingReplies, ['e8e5']);
  assert.equal(record.learnerPrediction.rows[0].predictedStatus, 'success');
  assert.match(record.receiverContract.prohibited, /teacher score/);
});

test('unknown, teacher-origin predictions, stale state, missing refutation, and nonchosen attempts are rejected', () => {
  const f = fixture();
  const bind = (attempted = f.attempted, alternative = f.alternative, prediction = f.prediction, hash = f.memoryHash) =>
    bindCounterfactualTeachingRecord(f.board, f.task, f.assessment, attempted, alternative, prediction, hash);
  assert.throws(() => bind(f.attempted, f.alternative, { ...f.prediction, source: 'teacher-engine' }), /teacher estimate/);
  assert.throws(() => bind(f.attempted, f.alternative, { ...f.prediction, memoryHash: 'b'.repeat(64) }), /stale/);
  assert.throws(() => bind({ ...f.attempted, proof: { ...f.attempted.proof, certificate: { ...f.attempted.proof.certificate, recaptures: [] } } }), /certificate failed|refutation|omits/);
  assert.throws(() => bind(f.alternative, f.attempted), /chosen action/);
});
