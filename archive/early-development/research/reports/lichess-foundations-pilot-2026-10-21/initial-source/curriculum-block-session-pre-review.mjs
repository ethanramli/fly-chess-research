// Four-event state around the existing frame transaction. The outer runner must
// publish this snapshot plus its pending receipt before acknowledging an update.
import assert from 'node:assert/strict';
import {digest} from '../neural-learning/mushroom-body.mjs';

const isHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);

export class CurriculumBlockSession{
  constructor({session,currentStage,registeredPanels,condition='informative',shuffleIdentity=null}){
    assert(isHash(session?.identity)&&session.pending===null&&!session.episode.active,'Require idle pinned temporal session');
    assert(Number.isSafeInteger(currentStage)&&currentStage>=1&&currentStage<=12);
    assert(Array.isArray(registeredPanels)&&registeredPanels.length>=2&&registeredPanels.length<=64);
    assert(registeredPanels.every(p=>typeof p.panelId==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(p.panelId)
      &&Number.isSafeInteger(p.stage)&&p.stage>=1&&p.stage<=currentStage));
    assert.equal(new Set(registeredPanels.map(p=>p.panelId)).size,registeredPanels.length);
    assert(['informative','absent','disabled','shuffled'].includes(condition));
    assert(condition==='shuffled'?isHash(shuffleIdentity):shuffleIdentity===null);
    Object.assign(this,{session,currentStage,registeredPanels:structuredClone(registeredPanels),condition,shuffleIdentity});
    this.identity=digest({schema:'curriculum-block-session-v1',session:session.identity,currentStage,registeredPanels,condition,shuffleIdentity});
    this.completedBlocks=0;this.selectionCounts=Object.fromEntries(registeredPanels.map(p=>[p.panelId,0]));
    this.pending=null;this.chainHash=digest({identity:this.identity});
  }
  options(statuses,index){return {condition:this.condition,shuffledStatus:this.condition==='shuffled'?statuses[index]:null};}
  validatePlan(plan,completedBlocks,selectionCounts,statuses){
    const {planSha256,...body}=plan;
    assert.equal(planSha256,digest(body),'Changed block plan');
    assert.equal(plan.schema,'curriculum-rehearsal-block-v1');assert.equal(plan.ready,true);
    assert.equal(plan.currentStage,this.currentStage);assert.equal(plan.blockIndex,completedBlocks);
    assert(completedBlocks<32,'Registered block budget complete');assert(isHash(plan.memoryHash));
    assert.equal(plan.registrationSha256,digest(this.registeredPanels),'Changed panel registration');
    assert(Array.isArray(plan.events)&&plan.events.length===4);
    assert.deepEqual(plan.events.map(e=>e.experience.status),['failure','success','success','failure']);
    assert.deepEqual(plan.outcomeCounts,{success:2,failure:2});
    assert.notEqual(plan.targetPanelId,plan.sentinelPanelId);
    assert.deepEqual(plan.events.map(e=>e.panelId),[plan.targetPanelId,plan.targetPanelId,plan.sentinelPanelId,plan.sentinelPanelId]);
    assert(this.condition==='shuffled'?Array.isArray(statuses)&&statuses.length===4
      &&statuses.every(s=>['success','failure'].includes(s)):statuses===null,'Invalid registered shuffle');
    for(const [index,event] of plan.events.entries()){
      const registered=this.registeredPanels.find(p=>p.panelId===event.panelId);
      assert(registered&&registered.stage===event.stage&&event.index===index,'Unregistered block event');
      assert(index<2?event.stage===this.currentStage:this.currentStage===1?event.stage===1:event.stage<this.currentStage);
      assert.equal(this.session.verify(event.experience,this.options(statuses,index)).learningAllowed,true,'Unknown block event');
    }
    const next=Object.fromEntries(this.registeredPanels.map(p=>[p.panelId,(selectionCounts[p.panelId]??0)
      +Number(p.panelId===plan.targetPanelId)+Number(p.panelId===plan.sentinelPanelId)]));
    assert.deepEqual(plan.nextSelectionCounts,next,'Changed selection-history transition');
  }
  startBlock(plan,{shuffledStatuses=null}={}){
    assert(this.pending===null&&this.session.pending===null&&!this.session.episode.active,'Finish current block first');
    this.validatePlan(plan,this.completedBlocks,this.selectionCounts,shuffledStatuses);
    const memoryHash=digest(this.session.memory.snapshot());
    if(this.condition==='informative')assert.equal(plan.memoryHash,memoryHash,'Stale informative selection');
    this.pending={plan:structuredClone(plan),cursor:0,shuffledStatuses:structuredClone(shuffledStatuses),
      lastFinishedMemoryHash:memoryHash};
    return {planSha256:plan.planSha256,blockIndex:this.completedBlocks,eventCount:4,
      selectionMemoryHash:plan.memoryHash,conditionMemoryHash:memoryHash};
  }
  nextContext(){
    assert(this.pending&&this.session.pending===null,'No event awaiting assessment');
    return structuredClone(this.pending.plan.events[this.pending.cursor].experience.context);
  }
  startEvent(assessment){
    assert(this.pending&&this.session.pending===null,'No event awaiting assessment');
    const p=this.pending;
    assert.equal(digest(this.session.memory.snapshot()),p.lastFinishedMemoryHash,'Unrecorded between-event memory change');
    return this.session.start(p.plan.events[p.cursor].experience,assessment,this.options(p.shuffledStatuses,p.cursor));
  }
  step(){
    assert(this.pending&&this.session.pending,'No pending curriculum frame');
    return {blockPlanSha256:this.pending.plan.planSha256,blockIndex:this.completedBlocks,
      eventIndex:this.pending.cursor,receipt:this.session.step()};
  }
  finishEvent(){
    assert(this.pending&&this.session.pending,'No pending curriculum event');
    const p=this.pending;
    const receipt={schema:'curriculum-event-receipt-v1',blockPlanSha256:p.plan.planSha256,
      blockIndex:this.completedBlocks,eventIndex:p.cursor,condition:this.condition,
      selectionMemoryHash:p.plan.memoryHash,receipt:this.session.finish(),previousChainHash:this.chainHash};
    this.chainHash=digest(receipt);p.lastFinishedMemoryHash=receipt.receipt.afterMemoryHash;p.cursor++;
    const blockComplete=p.cursor===4;
    if(blockComplete){this.selectionCounts=structuredClone(p.plan.nextSelectionCounts);this.completedBlocks++;this.pending=null;}
    return {...receipt,chainHash:this.chainHash,blockComplete};
  }
  snapshot(){return {schema:'curriculum-block-session-v1',identity:this.identity,completedBlocks:this.completedBlocks,
    selectionCounts:structuredClone(this.selectionCounts),chainHash:this.chainHash,
    pending:structuredClone(this.pending),session:this.session.snapshot()};}
  restore(s){
    assert.equal(s.schema,'curriculum-block-session-v1');assert.equal(s.identity,this.identity);
    assert(Number.isSafeInteger(s.completedBlocks)&&s.completedBlocks>=0&&s.completedBlocks<=32);
    assert(isHash(s.chainHash));assert.deepEqual(Object.keys(s.selectionCounts).sort(),Object.keys(this.selectionCounts).sort());
    const counts=Object.values(s.selectionCounts);
    assert(counts.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=32));
    assert.equal(counts.reduce((a,b)=>a+b,0),s.completedBlocks*2,'Invalid acknowledged block history');
    assert(s.pending===null||(typeof s.pending==='object'&&s.pending!==null),'Missing block state');
    if(s.pending){
      const p=s.pending;
      assert(Number.isSafeInteger(p.cursor)&&p.cursor>=0&&p.cursor<4&&isHash(p.lastFinishedMemoryHash));
      this.validatePlan(p.plan,s.completedBlocks,s.selectionCounts,p.shuffledStatuses);
      if(s.session.pending){
        assert.deepEqual(s.session.pending.experience,p.plan.events[p.cursor].experience);
        assert.deepEqual(s.session.pending.options,this.options(p.shuffledStatuses,p.cursor));
        assert.equal(s.session.pending.beforeMemoryHash,p.lastFinishedMemoryHash);
      }else assert.equal(digest(s.session.memory),p.lastFinishedMemoryHash);
    }else assert.equal(s.session.pending,null,'Orphaned neural event');
    // Validate every wrapper field before invoking the inner transactional restore.
    this.session.restore(s.session);
    this.completedBlocks=s.completedBlocks;this.selectionCounts=structuredClone(s.selectionCounts);
    this.chainHash=s.chainHash;this.pending=structuredClone(s.pending);
  }
}
