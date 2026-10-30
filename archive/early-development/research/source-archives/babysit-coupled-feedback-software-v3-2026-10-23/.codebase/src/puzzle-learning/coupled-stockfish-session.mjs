// Versioned three-frame transaction: frozen neural preparation, task pulse,
// separate value pulse. The existing runner checkpoints every frame/update.
import assert from 'node:assert/strict';
import {StockfishValueSession} from './stockfish-value-session.mjs';
import {stockfishReviewForAssessment} from './lichess-stockfish-review.mjs';
import {digest} from '../neural-learning/mushroom-body.mjs';

const phases=['prepare','task','stockfish'];
const jsonRecord=value=>JSON.parse(JSON.stringify(value));
const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const contextKey=context=>digest({fen:context.fen,pgn:context.pgn,task:context.task,
  historyKind:context.historyKind??'standard-start-pgn',parentSourceRecordSha256:context.parentSourceRecordSha256??null});
function compactPulse(result){
  const {before,after,...body}=result;
  return jsonRecord({...body,beforeMemoryHash:digest(before),afterMemoryHash:digest(after)});
}

export class CoupledStockfishSession extends StockfishValueSession{
  constructor(args){
    assert.equal(args.feedbackProtocol,'verified-outcome-plus-stockfish-v1');
    super(args);
    for(const method of ['prepareCoupledFeedback','validateCoupledPreparation','replayCoupledFrame'])
      assert.equal(typeof this.brain[method],'function');
    assert(isHash(this.brain.coupledIdentity));
    this.sessionIdentity=digest({schema:'coupled-stockfish-session-v1',parentIdentity:this.sessionIdentity,
      protocolIdentity:this.brain.coupledIdentity});this.identity=this.sessionIdentity;
  }
  verify(experience,options={}){
    const checked=super.verify(experience,options);
    const frames=phases.map((kind,index)=>({index,kind,identity:digest({session:this.sessionIdentity,
      experience:checked.experienceSha256,mode:checked.mode,kind,
      shuffledStatus:options.shuffledStatus??null,stockfishShuffle:options.stockfishShuffle??null})}));
    const body={schema:'coupled-stockfish-event-plan-v1',sessionIdentity:this.sessionIdentity,
      experienceSha256:checked.experienceSha256,mode:checked.mode,learningAllowed:true,frames};
    return {...body,identity:digest(body)};
  }
  bind(experience,assessment,memoryHash){
    assert(isHash(memoryHash));assert.equal(assessment?.memoryHash,memoryHash);
    const registered=this.byContext.get(contextKey(experience.context));assert(registered);
    assert(registered.panel.experiences.some(row=>row.move===experience.move
      &&row.certificateSha256===experience.certificateSha256));
    const review=stockfishReviewForAssessment(registered.panel,registered.boundReview,assessment,{reviewedAction:experience.move});
    assert.equal(review.ready,true);
    return {schema:'coupled-stockfish-event-binding-v1',sessionIdentity:this.sessionIdentity,
      panelId:registered.panel.panelId,familyId:registered.panel.familyId,
      panelReviewIdentity:registered.boundReview.identity,reviewIdentity:review.identity,
      reviewSha256:review.panelReviewSha256,memoryHash,assessment:jsonRecord(assessment),
      plannedAction:experience.move,plannedCertificateSha256:experience.certificateSha256,
      chosenAction:assessment.choice,chosenCertificateSha256:assessment.choice===null?null:
        registered.panel.experiences.find(row=>row.move===assessment.choice)?.certificateSha256};
  }
  reviewFor(experience,binding){
    const registered=this.byContext.get(contextKey(experience.context));assert(registered);
    assert.equal(registered.panel.panelId,binding.panelId);
    const review=stockfishReviewForAssessment(registered.panel,registered.boundReview,binding.assessment,{reviewedAction:experience.move});
    assert.equal(review.identity,binding.reviewIdentity);return review;
  }
  start(experience,assessment,options={}){
    assert.equal(this.pending,null);assert.equal(this.episode.active,false);
    const plan=this.verify(experience,options),beforeMemoryHash=this.brain.memoryFingerprint();
    const binding=this.bind(experience,assessment,beforeMemoryHash);
    this.presentationCount=this.brain.presentations;
    this.pending={experience:structuredClone(experience),options:structuredClone(options),plan,binding,
      beforeMemoryHash,presentationCountBefore:this.presentationCount,cursor:0,prepared:null,frameReceipts:[]};
    return {skipped:false,planIdentity:plan.identity,frameCount:3,
      reviewIdentity:binding.reviewIdentity,chosenAction:binding.chosenAction,plannedAction:binding.plannedAction};
  }
  async step(){
    const pending=this.pending;assert(pending&&pending.cursor<3);
    assert.deepEqual(this.verify(pending.experience,pending.options),pending.plan);
    const index=pending.cursor,last=pending.frameReceipts.at(-1);
    const beforeHash=last?.afterMemoryHash??pending.beforeMemoryHash;
    const beforeCount=last?.presentationCountAfter??pending.presentationCountBefore;
    assert.equal(this.brain.memoryFingerprint(),beforeHash);assert.equal(this.brain.presentations,beforeCount);
    const before=this.brain.memory.snapshot(),review=this.reviewFor(pending.experience,pending.binding);
    const mode=this.mode(pending.options);let result,receipt;
    try{
      result=index===0?await this.brain.prepareCoupledFeedback(review):
        await this.brain.replayCoupledFrame(review,pending.prepared,{phase:phases[index],condition:mode,
          expectedMemorySha256:beforeHash,shuffledStatus:pending.options.shuffledStatus??null,
          stockfishShuffle:pending.options.stockfishShuffle??null});
      if(index===0)assert.equal(this.brain.memoryFingerprint(),beforeHash,'Preparation changed lasting memory');
      receipt={schema:'coupled-stockfish-frame-receipt-v1',index,phase:phases[index],
        planIdentity:pending.plan.identity,bindingIdentity:digest(pending.binding),reviewIdentity:review.identity,
        condition:mode,beforeMemoryHash:beforeHash,afterMemoryHash:this.brain.memoryFingerprint(),
        presentationCountBefore:beforeCount,presentationCountAfter:this.brain.presentations,
        learningApplied:result.learningApplied===true,result:index===0?result:compactPulse(result)};
      assert.equal(receipt.presentationCountAfter-beforeCount,index===0?result.preparationPresentations:1);
    }catch(error){
      this.brain.memory.restore(before);this.brain.presentations=beforeCount;this.presentationCount=beforeCount;throw error;
    }
    if(index===0)pending.prepared=result;
    pending.frameReceipts.push(receipt);pending.cursor++;this.presentationCount=this.brain.presentations;
    return receipt;
  }
  finish(){
    const pending=this.pending;assert(pending&&pending.cursor===3&&pending.frameReceipts.length===3);
    assert.deepEqual(this.verify(pending.experience,pending.options),pending.plan);
    const afterMemoryHash=this.brain.memoryFingerprint();
    assert.equal(afterMemoryHash,pending.frameReceipts.at(-1).afterMemoryHash);
    assert.equal(this.brain.presentations-pending.presentationCountBefore,pending.prepared.requiredPresentations);
    const receipt={schema:'coupled-stockfish-event-receipt-v1',plan:pending.plan,binding:pending.binding,
      beforeMemoryHash:pending.beforeMemoryHash,afterMemoryHash,
      presentationCountBefore:pending.presentationCountBefore,presentationCountAfter:this.brain.presentations,
      frameCount:3,teachingPulses:2,frames:structuredClone(pending.frameReceipts),
      scope:'Verified planned-action outcome plus separately controlled Stockfish assistance, with fresh own rankings and matched neural exposure'};
    this.pending=null;return receipt;
  }
  snapshot(){return {schema:'coupled-stockfish-session-snapshot-v1',identity:this.sessionIdentity,
    memory:this.brain.memory.snapshot(),presentationCount:this.presentationCount,
    selectionPlanIdentity:this.selectionPlanIdentity,pending:structuredClone(this.pending)};}
  restore(snapshot){
    assert.equal(snapshot?.schema,'coupled-stockfish-session-snapshot-v1');assert.equal(snapshot.identity,this.sessionIdentity);
    assert(Number.isSafeInteger(snapshot.presentationCount)&&snapshot.presentationCount>=0);
    assert(snapshot.selectionPlanIdentity===null||isHash(snapshot.selectionPlanIdentity));
    const p=snapshot.pending;
    assert(p===null||typeof p==='object');
    if(p){
      assert.deepEqual(p.plan,this.verify(p.experience,p.options));
      assert.deepEqual(p.binding,this.bind(p.experience,p.binding.assessment,p.beforeMemoryHash));
      assert(Number.isSafeInteger(p.cursor)&&p.cursor>=0&&p.cursor<=3);
      assert(Array.isArray(p.frameReceipts)&&p.frameReceipts.length===p.cursor);
      assert(Number.isSafeInteger(p.presentationCountBefore)&&p.presentationCountBefore>=0);
      if(p.cursor===0)assert.equal(p.prepared,null);
      else{
        this.brain.validateCoupledPreparation(this.reviewFor(p.experience,p.binding),p.prepared);
        assert.equal(p.prepared.memorySha256,p.beforeMemoryHash);
        assert.deepEqual(p.frameReceipts[0].result,p.prepared);
      }
      let memoryHash=p.beforeMemoryHash,count=p.presentationCountBefore;
      for(const [index,frame] of p.frameReceipts.entries()){
        assert.equal(frame.schema,'coupled-stockfish-frame-receipt-v1');assert.equal(frame.index,index);
        assert.equal(frame.phase,phases[index]);assert.equal(frame.planIdentity,p.plan.identity);
        assert.equal(frame.bindingIdentity,digest(p.binding));assert.equal(frame.reviewIdentity,p.binding.reviewIdentity);
        assert.equal(frame.condition,this.mode(p.options));assert.equal(frame.beforeMemoryHash,memoryHash);
        assert(isHash(frame.afterMemoryHash));assert.equal(frame.presentationCountBefore,count);
        assert.equal(frame.presentationCountAfter-count,index===0?p.prepared.preparationPresentations:1);
        if(index===0)assert.equal(frame.afterMemoryHash,memoryHash);
        else{
          assert.equal(frame.result.beforeMemoryHash,memoryHash);assert.equal(frame.result.afterMemoryHash,frame.afterMemoryHash);
          assert.equal(frame.result.phase,phases[index]);assert.equal(frame.result.reviewedAction,p.experience.move);
          assert.equal(frame.result.certificateSha256,p.experience.certificateSha256);
        }
        memoryHash=frame.afterMemoryHash;count=frame.presentationCountAfter;
      }
      assert.equal(digest(snapshot.memory),memoryHash);assert.equal(snapshot.presentationCount,count);
    }
    const before=this.brain.memory.snapshot(),beforeCount=this.brain.presentations;
    try{
      this.brain.memory.restore(snapshot.memory);this.brain.presentations=snapshot.presentationCount;
      this.presentationCount=snapshot.presentationCount;this.selectionPlanIdentity=snapshot.selectionPlanIdentity;
      this.pending=structuredClone(p);
    }catch(error){this.brain.memory.restore(before);this.brain.presentations=beforeCount;throw error;}
  }
}
