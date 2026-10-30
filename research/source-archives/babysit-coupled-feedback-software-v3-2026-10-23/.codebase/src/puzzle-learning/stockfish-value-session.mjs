// One async Stockfish-value teaching transaction compatible with the resumable
// curriculum block. Engine estimates and certified task consequences stay separate.
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {stockfishReviewForAssessment} from './lichess-stockfish-review.mjs';

const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const contextKey=context=>digest({fen:context.fen,pgn:context.pgn,task:context.task,
  historyKind:context.historyKind??'standard-start-pgn',parentSourceRecordSha256:context.parentSourceRecordSha256??null});
const conditionFor={informative:'informative','outcome-only':'outcome-only',absent:'no-channel',disabled:'disabled',shuffled:'outcome-shuffled'};

function compactLearningResult(result){
  const {teacherReview,before,after,activityTrace,...kept}=result;
  return {...kept,teacherReviewIdentity:teacherReview?.identity??null,
    beforeMemoryHash:before?digest(before):result.memoryHash??null,
    afterMemoryHash:after?digest(after):null,
    activityTraceRecorded:Boolean(activityTrace)};
}

export class StockfishValueSession{
  constructor({brain,panelReviews,identity,stockfishShuffleIdentity=null}){
    assert(isHash(identity),'Require pinned Stockfish session identity');
    assert.equal(typeof brain?.replayValue,'function');assert.equal(typeof brain?.verifyExperience,'function');
    assert.equal(typeof brain?.memoryFingerprint,'function');assert.equal(typeof brain?.memory?.snapshot,'function');
    assert(isHash(brain.valueIdentity),'Require pinned Stockfish value transform identity');
    assert(Number.isSafeInteger(brain.presentations)&&brain.presentations>=0,'Require learner presentation counter');
    assert(Array.isArray(panelReviews)&&panelReviews.length>=1&&panelReviews.length<=64);
    const byContext=new Map(),byId=new Set();
    const stage=Math.max(...panelReviews.map(row=>row?.panel?.stage));
    assert(Number.isSafeInteger(stage)&&stage>=1&&stage<=2,
      'Stockfish value sessions are currently implemented only for Stages 1 and 2');
    for(const row of panelReviews){
      const {panel,boundReview}=row??{};
      assert.equal(panel?.split,'train');assert([1,2].includes(panel?.stage)&&panel.stage<=stage);
      assert.equal(boundReview?.ready,true);assert(isHash(boundReview.identity));
      assert.equal(boundReview.schema,panel.stage===1?'lichess-stockfish-panel-review-v1':'lichess-stockfish-panel-review-v2');
      if(panel.stage===2)assert.equal(boundReview.stage,panel.stage);
      assert.equal(byId.has(panel.panelId),false);byId.add(panel.panelId);
      const key=contextKey(panel.context);assert.equal(byContext.has(key),false);byContext.set(key,{panel,boundReview});
    }
    assert(stockfishShuffleIdentity===null||isHash(stockfishShuffleIdentity));
    this.brain=brain;this.memory=brain.memory;this.byContext=byContext;this.identity=identity;this.stage=stage;
    this.stockfishShuffleIdentity=stockfishShuffleIdentity;
    this.panelIdentities=[...byContext.values()].map(({panel,boundReview})=>({...(stage===2?{stage:panel.stage}:{}),panelId:panel.panelId,
      familyId:panel.familyId,familyRegistrationSha256:panel.familyRegistrationSha256,
      panelReviewIdentity:boundReview.identity})).sort((a,b)=>a.panelId.localeCompare(b.panelId));
    this.sessionIdentity=digest({schema:'stockfish-value-session-v1',identity,
      ...(stage===2?{stage}:{}),brainValueIdentity:brain.valueIdentity,stockfishShuffleIdentity,
      panelIdentities:this.panelIdentities});
    this.identity=this.sessionIdentity;
    this.episode={active:false};this.pending=null;this.presentationCount=brain.presentations;
    this.selectionPlanIdentity=null;
  }
  accountSelectionPresentations(planIdentity,count,{replay=false}={}){
    assert(isHash(planIdentity));assert(Number.isSafeInteger(count)&&count>=0);
    assert.equal(this.pending,null);assert.equal(this.episode.active,false);
    if(this.selectionPlanIdentity===planIdentity){
      assert.equal(this.brain.presentations,this.presentationCount,'Recovered selection exposure changed');
      return;
    }
    if(replay){
      assert.equal(this.brain.presentations,this.presentationCount,'Replay selection counter is not at its prefix');
      this.brain.presentations+=count;
    }else assert.equal(this.brain.presentations,this.presentationCount+count,
      'Selection assessment exposure differs from the pinned plan');
    this.presentationCount=this.brain.presentations;this.selectionPlanIdentity=planIdentity;
  }
  mode(options={}){
    assert.equal(typeof options.condition,'string');
    const mode=options.condition==='shuffled'&&options.stockfishShuffle?'shuffled':conditionFor[options.condition];
    assert(mode,'Unknown Stockfish teaching condition');
    if(mode==='shuffled'){
      const schedule=options.stockfishShuffle;
      assert(isHash(this.stockfishShuffleIdentity)&&schedule?.schema==='matched-stockfish-error-shuffle-v1'
        &&schedule.scheduleSha256===this.stockfishShuffleIdentity&&Number.isSafeInteger(schedule.eventIndex)
        &&schedule.eventIndex>=0&&schedule.errorSign===-1,
      'Stockfish shuffled feedback requires its pinned sign-reversal schedule');
      assert(options.shuffledStatus===null||options.shuffledStatus===undefined,
        'Task-outcome shuffle cannot stand in for the Stockfish-error schedule');
    }else assert(options.stockfishShuffle===null||options.stockfishShuffle===undefined,
      'Unexpected Stockfish shuffle entry in another condition');
    if(mode==='outcome-shuffled')assert(['success','failure'].includes(options.shuffledStatus),
      'Task-outcome shuffle requires its registered delivered status');
    else assert(options.shuffledStatus===null||options.shuffledStatus===undefined,
      'Outcome-shuffle labels cannot substitute for a Stockfish-error shuffle schedule');
    return mode;
  }
  verify(experience,options={}){
    const mode=this.mode(options),board=new Chess();
    assert.equal(typeof experience?.context?.pgn,'string');board.loadPgn(experience.context.pgn);
    assert.equal(board.fen(),experience.context.fen);
    const checked=this.brain.verifyExperience(board,experience.move,experience.context.task,experience.proof);
    assert.equal(checked.learningAllowed,true,'Unknown task consequence cannot enter Stockfish teaching');
    assert.equal(checked.status,experience.status);assert.equal(checked.actor,experience.actor);
    assert.equal(checked.certificateSha256,experience.certificateSha256);
    const frames=[{index:0,kind:'stockfish-value-update',identity:digest({
      session:this.sessionIdentity,experience:digest(experience),mode,
      stockfishShuffle:options.stockfishShuffle??null})}];
    const body={schema:'stockfish-value-event-plan-v1',sessionIdentity:this.sessionIdentity,
      experienceSha256:digest(experience),mode,learningAllowed:true,frames};
    return {...body,identity:digest(body)};
  }
  bind(experience,assessment,memoryHash){
    assert(isHash(memoryHash));assert.equal(assessment?.memoryHash,memoryHash,'Stale pre-feedback memory identity');
    assert.deepEqual(assessment?.task,experience.context.task);
    assert.equal(assessment?.fen,experience.context.fen);assert.equal(assessment?.pgn,experience.context.pgn);
    const registered=this.byContext.get(contextKey(experience.context));assert(registered,'Unregistered Lichess context');
    assert(registered.panel.experiences.some(row=>row.move===experience.move
      &&row.certificateSha256===experience.certificateSha256),'Planned consequence is outside the pinned panel');
    const review=stockfishReviewForAssessment(registered.panel,registered.boundReview,assessment);
    assert.equal(review.ready,true,'Fresh Fly choice has no complete Stockfish review');
    return {schema:'stockfish-value-event-binding-v1',sessionIdentity:this.sessionIdentity,
      panelId:registered.panel.panelId,familyId:registered.panel.familyId,
      panelReviewIdentity:registered.boundReview.identity,reviewIdentity:review.identity,
      reviewSha256:review.panelReviewSha256,memoryHash,assessment:structuredClone(assessment),
      plannedAction:experience.move,plannedCertificateSha256:experience.certificateSha256,
      chosenAction:review.chosen,chosenCertificateSha256:review.decision.taskProofSha256};
  }
  reviewFor(experience,binding){
    const registered=this.byContext.get(contextKey(experience.context));assert(registered);
    assert.equal(registered.panel.panelId,binding.panelId);
    const review=stockfishReviewForAssessment(registered.panel,registered.boundReview,binding.assessment);
    assert.equal(review.identity,binding.reviewIdentity,'Changed bound Stockfish review');
    return review;
  }
  start(experience,assessment,options={}){
    assert.equal(this.pending,null);assert.equal(this.episode.active,false);
    const plan=this.verify(experience,options),beforeMemoryHash=this.brain.memoryFingerprint();
    const binding=this.bind(experience,assessment,beforeMemoryHash);
    this.presentationCount=this.brain.presentations;
    this.pending={experience:structuredClone(experience),options:structuredClone(options),plan,binding,
      beforeMemoryHash,presentationCountBefore:this.presentationCount,cursor:0,frameReceipt:null};
    return {skipped:false,planIdentity:plan.identity,frameCount:1,
      reviewIdentity:binding.reviewIdentity,chosenAction:binding.chosenAction};
  }
  async step(){
    const pending=this.pending;assert(pending&&pending.cursor===0,'No pending Stockfish value update');
    assert.deepEqual(this.verify(pending.experience,pending.options),pending.plan,'Changed task proof or update plan');
    assert.equal(this.brain.memoryFingerprint(),pending.beforeMemoryHash,'Memory changed before Stockfish update');
    const mode=this.mode(pending.options),before=this.brain.memory.snapshot(),beforeCount=this.brain.presentations;
    assert.equal(beforeCount,pending.presentationCountBefore,'Presentation history changed after event binding');
    let result;
    try{
      const review=this.reviewFor(pending.experience,pending.binding);
      result=await this.brain.replayValue(review,{condition:mode,
        shuffle:mode==='shuffled'?pending.options.stockfishShuffle:null,
        shuffledStatus:mode==='outcome-shuffled'?pending.options.shuffledStatus:null});
    }catch(error){
      this.brain.memory.restore(before);this.brain.presentations=beforeCount;this.presentationCount=beforeCount;
      throw error;
    }
    const afterMemoryHash=this.brain.memoryFingerprint();
    if(result.before)assert.equal(digest(result.before),pending.beforeMemoryHash,'Value receiver used another memory prefix');
    if(result.after)assert.equal(digest(result.after),afterMemoryHash,'Value receiver receipt differs from persistent memory');
    const frameReceipt={schema:'stockfish-value-frame-receipt-v1',planIdentity:pending.plan.identity,
      bindingIdentity:digest(pending.binding),reviewIdentity:pending.binding.reviewIdentity,
      condition:mode,beforeMemoryHash:pending.beforeMemoryHash,afterMemoryHash,
      presentationCountBefore:beforeCount,presentationCountAfter:this.brain.presentations,
      skipped:result.skipped===true,learningApplied:result.learningApplied===true,
      result:compactLearningResult(result)};
    pending.cursor=1;pending.frameReceipt=frameReceipt;this.presentationCount=this.brain.presentations;
    return frameReceipt;
  }
  finish(){
    const pending=this.pending;assert(pending&&pending.cursor===1&&pending.frameReceipt);
    assert.deepEqual(this.verify(pending.experience,pending.options),pending.plan);
    const receipt={schema:'stockfish-value-event-receipt-v1',plan:pending.plan,binding:pending.binding,
      beforeMemoryHash:pending.beforeMemoryHash,afterMemoryHash:this.brain.memoryFingerprint(),
      presentationCountBefore:pending.presentationCountBefore,presentationCountAfter:this.brain.presentations,
      frameCount:1,frame:pending.frameReceipt};
    assert.equal(receipt.afterMemoryHash,pending.frameReceipt.afterMemoryHash);
    this.pending=null;return receipt;
  }
  snapshot(){return {schema:'stockfish-value-session-snapshot-v1',identity:this.sessionIdentity,
    memory:this.brain.memory.snapshot(),presentationCount:this.presentationCount,
    selectionPlanIdentity:this.selectionPlanIdentity,pending:structuredClone(this.pending)};}
  restore(snapshot){
    assert.equal(snapshot?.schema,'stockfish-value-session-snapshot-v1');assert.equal(snapshot.identity,this.sessionIdentity);
    assert(Number.isSafeInteger(snapshot.presentationCount)&&snapshot.presentationCount>=0);
    assert(snapshot.selectionPlanIdentity===null||isHash(snapshot.selectionPlanIdentity));
    assert(snapshot.pending===null||typeof snapshot.pending==='object');
    if(snapshot.pending){
      const p=snapshot.pending;assert.equal(p.plan.identity,this.verify(p.experience,p.options).identity);
      assert.deepEqual(p.plan,this.verify(p.experience,p.options));
      assert.deepEqual(p.binding,this.bind(p.experience,p.binding.assessment,p.beforeMemoryHash));
      assert(isHash(p.beforeMemoryHash));assert(p.cursor===0||p.cursor===1);
      assert(p.presentationCountBefore<=snapshot.presentationCount);
      if(p.cursor===0){assert.equal(p.frameReceipt,null);assert.equal(digest(snapshot.memory),p.beforeMemoryHash);}
      else{
        const frame=p.frameReceipt;assert.equal(frame.schema,'stockfish-value-frame-receipt-v1');
        assert.equal(frame.planIdentity,p.plan.identity);assert.equal(frame.bindingIdentity,digest(p.binding));
        assert.equal(frame.reviewIdentity,p.binding.reviewIdentity);assert.equal(frame.beforeMemoryHash,p.beforeMemoryHash);
        assert.equal(frame.afterMemoryHash,digest(snapshot.memory));
        assert.equal(frame.presentationCountAfter,snapshot.presentationCount);
      }
    }
    const before=this.brain.memory.snapshot(),oldCount=this.brain.presentations;
    try{this.brain.memory.restore(snapshot.memory);this.brain.presentations=snapshot.presentationCount;
      this.presentationCount=snapshot.presentationCount;this.selectionPlanIdentity=snapshot.selectionPlanIdentity;
      this.pending=structuredClone(snapshot.pending);}
    catch(error){this.brain.memory.restore(before);this.brain.presentations=oldCount;throw error;}
  }
}
