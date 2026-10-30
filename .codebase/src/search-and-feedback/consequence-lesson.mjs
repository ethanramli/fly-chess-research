// Teacher-side executable lesson evidence. No neural update or inferred explanation channel.
// Sources/limits: research/literature/feedback-quality-deep-review-2026-10-08/.
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { digest } from '../neural-learning/mushroom-body.mjs';
import { verifiedExperience } from './verified-feedback.mjs';
import { bindFeedbackToAssessment } from '../puzzle-learning/feedback-quality.mjs';

export function compileConsequenceLesson(board, task, assessment, experiences, currentMemoryHash,
  { maxExperiences = 4 } = {}) {
  assert.ok(Number.isSafeInteger(maxExperiences) && maxExperiences >= 1 && maxExperiences <= 16);
  assert.ok(Array.isArray(experiences) && experiences.length > 0 && experiences.length <= maxExperiences);
  assert.ok(Object.keys(task).every(key => ['objective', 'plies'].includes(key)), 'Ambiguous task contract');
  assert.equal(new Set(experiences.map(event => event.move)).size, experiences.length, 'Duplicate reviewed action');
  const fen = board.fen(), pgn = board.pgn();
  const reviews = experiences.map(experience => {
    const binding = bindFeedbackToAssessment(board, task, assessment, experience, currentMemoryHash);
    const checked = verifiedExperience(board, experience.move, task, experience.proof);
    const child = new Chess(); child.loadPgn(pgn);
    const action = child.moves({verbose:true}).find(move => move.from + move.to + (move.promotion ?? '') === experience.move);
    child.move(action);
    const consequence = {objective: task.objective, plies: task.plies, status: checked.status,
      evidenceClass: checked.learningAllowed ? 'independently-checked-certificate' : 'unknown',
      strategicMoveQualityEstablished: false, delayedCausalCreditEstablished: false};
    if (checked.learningAllowed && task.objective === 'capture-retention') {
      const certificate = experience.proof.certificate;
      consequence.defenseCoverage = {kind:'all-legal-immediate-replies', count:certificate.replies.length};
      consequence.witness = {target:certificate.target, recaptures:[...certificate.recaptures],
        statement: checked.status === 'success' ? 'No legal immediate reply recaptures the moved capturing piece'
          : 'A legal immediate reply can recapture the moved capturing piece'};
    } else if (checked.learningAllowed && task.objective === 'avoid-mate') {
      consequence.defenseCoverage = {kind:'bounded-opponent-mate-certificate',remainingPlies:task.plies-1,
        attacker:experience.proof.actor==='w'?'b':'w'};
      consequence.witness = {opponentMateStatus:checked.opponentMateStatus,
        statement:checked.status==='success'
          ?'The opponent has no certified forced mate within the remaining two plies'
          :'The opponent has a certified forced mate within the remaining two plies'};
    } else if (checked.learningAllowed) {
      consequence.defenseCoverage = {kind:'certificate-required-branches',
        meaning:'Only the independently checked forced-mate quantifiers within the declared horizon; not every game continuation'};
    }
    return {move:experience.move, binding, consequence,
      transition:{actor:board.turn(),from:action.from,to:action.to,piece:action.piece,
        captured:action.captured ?? null,promotion:action.promotion ?? null,childFen:child.fen(),childPgn:child.pgn()},
      experience:structuredClone(experience)};
  });
  assert.equal(board.fen(),fen); assert.equal(board.pgn(),pgn);
  const known = reviews.filter(review => review.binding.learningAllowed);
  const success = known.filter(review => review.consequence.status === 'success');
  const failure = known.filter(review => review.consequence.status === 'failure');
  const choice = reviews.find(review => review.move === assessment.choice);
  const contrast = success.length && failure.length ? {
    available:true, successfulMoves:success.map(review=>review.move), failingMoves:failure.map(review=>review.move),
    committedFailure:choice?.consequence.status === 'failure',
    scope:'Same-context verified alternatives under this task, not intrinsic piece values or full-game rankings',
  } : {available:false, reason:'No checked success/failure contrast in the reviewed actions'};
  const coverage = reviews[0].binding.coverage;
  const lesson = {schema:'checked-consequence-lesson-v1',context:{fen,pgn,task:structuredClone(task)},
    initialAssessment:structuredClone(assessment),memoryHash:currentMemoryHash,coverage,contrast,reviews,
    replayExperiences:known.map(review=>structuredClone(review.experience)),
    unknownMoves:reviews.filter(review=>!review.binding.learningAllowed).map(review=>review.move),
    eventBudget:{maximum:maxExperiences,scheduled:known.length},
    delivery:{teacherEvidence:['certificate','transition','checked-consequence-witness','candidate-contrast'],
      existingNeuralInput:['board-action-cue','declared-experimental-reinforcement'],
      explanationSemanticsDelivered:false,transitionSequenceDelivered:false,teacherComputesParameterDeltas:false,
      requirement:'Reassess and independently bind each replay to its current memory before delivery; this initial ranking cannot be reused after an update'},
    quality:{contextBound:true,criterionMatched:true,checkedContrast:Boolean(contrast.available),
      allLegalInitialRanking:coverage==='all-legal',neuralSelectivity:'unmeasured',retention:'unmeasured',transfer:'unmeasured'}};
  return {...lesson,lessonSha256:digest(lesson)};
}
