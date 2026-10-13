import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { bindFeedbackToAssessment, feedbackChannel } from '../../src/puzzle-learning/feedback-quality.mjs';

function fixture() {
  const board = new Chess('4r1k1/8/8/4p3/pP5r/8/8/RK2R3 w - - 0 1');
  const task = { objective: 'capture-retention', plies: 1 }, memoryHash = 'a'.repeat(64);
  const assessment = { fen: board.fen(), pgn: board.pgn(), task, memoryHash,
    rows: [{ move: 'a1a4', score: 0.1 }, { move: 'e1e5', score: 0.2 }], choice: 'e1e5' };
  const makeExperience = (move, proof = certifyCaptureRetention(board, move)) => ({
    ...verifiedExperience(board, move, task, proof), proof,
    context: { fen: board.fen(), pgn: board.pgn(), task },
  });
  return { board, task, memoryHash, assessment, makeExperience };
}

test('feedback identifies the selected error and verified alternative without claiming full legal coverage', () => {
  const { board, task, memoryHash, assessment, makeExperience } = fixture();
  const history = board.pgn();
  const failure = bindFeedbackToAssessment(board, task, assessment, makeExperience('e1e5'), memoryHash);
  const alternative = bindFeedbackToAssessment(board, task, assessment, makeExperience('a1a4'), memoryHash);
  assert.equal(failure.role, 'chosen-action-review'); assert.equal(failure.status, 'failure');
  assert.equal(alternative.role, 'alternative-action-review'); assert.equal(alternative.status, 'success');
  assert.equal(failure.coverage, 'candidate-subset'); assert.equal(failure.assessedMoveCount, 2);
  assert.ok(failure.legalMoveCount > 2); assert.equal(board.pgn(), history);
  assessment.rows[0].score = 99;
  assert.equal(failure.assessment.rows[0].score, 0.1, 'Binding must retain its own decision snapshot');
});

test('stale memory, forged rankings, mismatched context and incomplete evidence cannot bind a teaching event', () => {
  const { board, task, memoryHash, assessment, makeExperience } = fixture();
  const experience = makeExperience('e1e5');
  const bind = (a = assessment, e = experience, hash = memoryHash) => bindFeedbackToAssessment(board, task, a, e, hash);
  assert.throws(() => bind(assessment, experience, 'b'.repeat(64)), /Stale/);
  assert.throws(() => bind({ ...assessment, choice: 'a1a4' }), /ranking/);
  assert.throws(() => bind({ ...assessment, pgn: '' }), /history/);
  assert.throws(() => bind({ ...assessment, rows: [{ move: 'e1e5', score: NaN }] }), /nonfinite/);
  const forged = structuredClone(experience); forged.proof.certificate.replies.pop();
  assert.throws(() => bind(assessment, forged), /omits/);
  assert.throws(() => bind(assessment, { ...experience, status: 'success' }), /status mismatch/);
});

test('ties and unknown consequences are explicit and unknown supplies no teaching channel', () => {
  const { board, task, memoryHash, assessment, makeExperience } = fixture();
  const tied = { ...assessment, rows: assessment.rows.map(row => ({ ...row, score: 0 })), choice: null };
  const result = bindFeedbackToAssessment(board, task, tied,
    makeExperience('e1e5', { status: 'unknown', certificate: null }), memoryHash);
  assert.equal(result.role, 'candidate-review-after-tie'); assert.equal(result.learningAllowed, false);
  assert.equal(result.certificateSha256, null);
  for (const condition of ['informative', 'no-channel', 'shuffled', 'disabled'])
    assert.equal(feedbackChannel(condition, 'unknown', 'PAM02'), null);
});

test('no-channel control cannot silently receive informative reinforcement', () => {
  for (const status of ['success', 'failure']) assert.equal(feedbackChannel('no-channel', status), null);
  assert.equal(feedbackChannel('informative', 'success'), 'PAM02');
  assert.equal(feedbackChannel('informative', 'failure'), 'PPL103');
  assert.equal(feedbackChannel('disabled', 'failure'), 'PPL103');
  assert.equal(feedbackChannel('shuffled', 'failure', 'PAM02'), 'PAM02');
  assert.throws(() => feedbackChannel('absent', 'success'), /condition/);
  assert.throws(() => feedbackChannel('shuffled', 'success'), /shuffle/);
});
