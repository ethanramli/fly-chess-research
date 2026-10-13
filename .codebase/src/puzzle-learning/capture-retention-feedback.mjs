// C01 evidence adapter for the shared, frame-transactional temporal session.
// Quiet legal actions fail this exact task; they are not globally bad moves.
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {checkCaptureRetentionAction} from '../search-and-feedback/capture-retention-action-domain.mjs';
import {temporalStimulusFrames,validateTemporalOptions} from './temporal-feedback-plan.mjs';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {TemporalFeedbackSession} from './temporal-feedback-session.mjs';

function checkedExperience(board,experience){
  const checked=checkCaptureRetentionAction(board,experience.move,experience.context.task,experience.proof);
  const normalized=checked.status==='unknown'
    ?{...checked,actor:board.turn(),move:experience.move,learningAllowed:false,certificateSha256:null}
    :checked;
  for(const key of ['status','actor','learningAllowed','certificateSha256'])
    assert.equal(experience[key],normalized[key],`Mismatched C01 ${key}`);
  return normalized;
}

export function captureRetentionTemporalPlan(experience,encoder,mapping,timing,{
  condition='informative',shuffledStatus=null,
}={}){
  validateTemporalOptions(timing,{condition,shuffledStatus});
  const context=experience?.context;
  if(typeof context?.pgn!=='string'||context.pgn.length>65536)throw Error('Missing bounded C01 history');
  const board=new Chess();board.loadPgn(context.pgn);
  if(board.fen()!==context.fen||board.history().length>512)throw Error('Mismatched C01 context/history');
  const checked=checkedExperience(board,experience);
  if(checked.status==='unknown')return {skipped:true,frames:[],learningAllowed:false,reason:'Unknown consequence'};
  const cue=encoder.encode(board,experience.move,context.task);
  const stimulus=temporalStimulusFrames(cue,mapping,timing,checked.status,{condition,shuffledStatus});
  const plan={schema:'c01-verified-temporal-feedback-plan-v1',context:structuredClone(context),move:experience.move,
    proof:structuredClone(experience.proof),certificateSha256:checked.certificateSha256,
    verificationScope:checked.meaning,verifiedStatus:checked.status,teachingStatus:stimulus.teachingStatus,
    condition,plasticityEnabled:stimulus.plasticityEnabled,cue,frames:stimulus.frames,timing:{...timing},
    scope:'One-ply capture-retention consequence; independently checked legal replies; shared gamma2 timing hypothesis; no overall move-quality claim'};
  return {...plan,identity:digest(plan),skipped:false,learningAllowed:true};
}

// Keep all-legal unaided choice binding, but route task proof through C01's
// independently checked capture-or-quiet-action domain.
export function bindCaptureRetentionAssessment(board,task,assessment,experience,currentMemoryHash){
  assert.equal(assessment.fen,board.fen(),'Assessment position mismatch');
  assert.equal(assessment.pgn,board.pgn(),'Assessment history mismatch');
  assert.deepEqual(assessment.task,task,'Assessment task mismatch');
  assert.equal(assessment.memoryHash,currentMemoryHash,'Stale pre-feedback memory');
  assert.ok(typeof currentMemoryHash==='string'&&/^[a-f0-9]{64}$/.test(currentMemoryHash));
  const legal=board.moves({verbose:true}).map(move=>move.from+move.to+(move.promotion??''));
  const rows=assessment.rows;
  assert.ok(Array.isArray(rows)&&rows.length>0&&rows.length<=256,'Invalid candidate bound');
  assert.equal(new Set(rows.map(row=>row.move)).size,rows.length,'Duplicate candidate');
  assert.ok(rows.every(row=>legal.includes(row.move)&&Number.isFinite(row.score)),'Illegal or nonfinite assessment');
  const best=Math.max(...rows.map(row=>row.score));
  const tied=rows.filter(row=>row.score===best).map(row=>row.move).sort();
  assert.equal(assessment.choice,tied.length===1?tied[0]:null,'Choice does not match ranking');
  assert.equal(rows.length,legal.length,'Require all-legal unaided assessment');
  assert.deepEqual(experience.context,{fen:board.fen(),pgn:board.pgn(),task},'Teaching context mismatch');
  const checked=checkedExperience(board,experience);
  return {schema:'c01-assessed-feedback-binding-v1',assessment:structuredClone(assessment),coverage:'all-legal',
    legalMoveCount:legal.length,assessedMoveCount:rows.length,tiedTopMoves:tied,reviewedMove:experience.move,
    role:assessment.choice===null?'candidate-review-after-tie':assessment.choice===experience.move?'chosen-action-review':'alternative-action-review',
    status:checked.status,learningAllowed:checked.learningAllowed,certificateSha256:checked.certificateSha256,
    meaning:checked.meaning??'Unknown consequence; no teaching event'};
}

export class CaptureRetentionTemporalFeedbackSession extends TemporalFeedbackSession{
  verify(experience,options){return captureRetentionTemporalPlan(experience,this.encoder,this.mapping,this.timing,options);}
  bind(experience,assessment,memoryHash){
    const board=new Chess();board.loadPgn(experience.context.pgn);
    return bindCaptureRetentionAssessment(board,experience.context.task,assessment,experience,memoryHash);
  }
}
