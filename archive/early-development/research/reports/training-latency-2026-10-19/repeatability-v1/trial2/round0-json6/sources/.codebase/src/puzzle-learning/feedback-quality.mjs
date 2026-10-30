import assert from 'node:assert/strict';
import { verifiedExperience } from '../search-and-feedback/verified-feedback.mjs';

export function feedbackChannel(condition, status, shuffledChannel = null) {
  assert.ok(['informative', 'no-channel', 'shuffled', 'disabled'].includes(condition), 'Unknown feedback condition');
  assert.ok(['success', 'failure', 'unknown'].includes(status), 'Unknown consequence status');
  if (status === 'unknown' || condition === 'no-channel') return null;
  if (condition === 'shuffled') {
    assert.ok(['PAM02', 'PPL103'].includes(shuffledChannel), 'Missing matched shuffle channel');
    return shuffledChannel;
  }
  return status === 'success' ? 'PAM02' : 'PPL103';
}

// This checks provenance and decision arithmetic, not the origin of neural scores.
// The caller must measure the assessment before teaching and checkpoint it with
// the pending neural receipt. Independent graph replay remains a separate audit.
export function bindFeedbackToAssessment(board, task, assessment, experience, currentMemoryHash) {
  assert.equal(assessment.fen, board.fen(), 'Assessment position mismatch');
  assert.equal(assessment.pgn, board.pgn(), 'Assessment history mismatch');
  assert.deepEqual(assessment.task, task, 'Assessment task mismatch');
  assert.equal(assessment.memoryHash, currentMemoryHash, 'Stale pre-feedback memory');
  assert.ok(typeof currentMemoryHash === 'string' && /^[a-f0-9]{64}$/.test(currentMemoryHash));
  const legal = board.moves({ verbose: true }).map(move => move.from + move.to + (move.promotion ?? ''));
  const rows = assessment.rows;
  assert.ok(Array.isArray(rows) && rows.length > 0 && rows.length <= 256, 'Invalid candidate bound');
  assert.equal(new Set(rows.map(row => row.move)).size, rows.length, 'Duplicate candidate');
  assert.ok(rows.every(row => legal.includes(row.move) && Number.isFinite(row.score)), 'Illegal or nonfinite assessment');
  const best = Math.max(...rows.map(row => row.score));
  const tied = rows.filter(row => row.score === best).map(row => row.move).sort();
  assert.equal(assessment.choice, tied.length === 1 ? tied[0] : null, 'Choice does not match ranking');
  assert.ok(rows.some(row => row.move === experience.move), 'Teaching action was not assessed');
  assert.deepEqual(experience.context, { fen: board.fen(), pgn: board.pgn(), task }, 'Teaching context mismatch');
  const checked = verifiedExperience(board, experience.move, task, experience.proof);
  for (const key of ['status', 'actor', 'learningAllowed', 'certificateSha256'])
    assert.equal(experience[key], checked[key], `Teaching ${key} mismatch`);
  return {
    schema: 'assessed-feedback-binding-v1',
    assessment: structuredClone(assessment),
    coverage: rows.length === legal.length ? 'all-legal' : 'candidate-subset',
    legalMoveCount: legal.length, assessedMoveCount: rows.length, tiedTopMoves: tied,
    reviewedMove: experience.move,
    role: assessment.choice === null ? 'candidate-review-after-tie'
      : assessment.choice === experience.move ? 'chosen-action-review' : 'alternative-action-review',
    status: checked.status, learningAllowed: checked.learningAllowed,
    certificateSha256: checked.certificateSha256,
    meaning: checked.meaning ?? 'Unresolved consequence; no teaching event',
  };
}
