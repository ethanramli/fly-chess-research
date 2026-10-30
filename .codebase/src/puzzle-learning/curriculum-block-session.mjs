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
    assert(['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled'].includes(condition));
    assert(condition==='shuffled'||condition==='stockfish-shuffled'?isHash(shuffleIdentity):shuffleIdentity===null);
    Object.assign(this,{session,currentStage,registeredPanels:structuredClone(registeredPanels),condition,shuffleIdentity});
    this.identity=digest({schema:'curriculum-block-session-v1',session:session.identity,currentStage,registeredPanels,condition,shuffleIdentity});
    this.completedBlocks=0;this.selectionCounts=Object.fromEntries(registeredPanels.map(p=>[p.panelId,0]));
    this.pending=null;this.chainHash=digest({identity:this.identity});
  }
  options(statuses,index){return this.condition==='stockfish-shuffled'
    ?{condition:'shuffled',shuffledStatus:null,stockfishShuffle:{schema:'matched-stockfish-error-shuffle-v1',
      scheduleSha256:this.shuffleIdentity,eventIndex:index,errorSign:-1}}
    :{condition:this.condition,shuffledStatus:this.condition==='shuffled'?statuses[index]:null};}
  active(){
    assert(this.pending,'No pending curriculum block');
    const {planSha256,...body}=this.pending.plan;
    assert.equal(planSha256,digest(body),'Changed block plan');
    return this.pending;
  }
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
    this.pending={plan:structuredClone(plan),shuffledStatuses:structuredClone(shuffledStatuses),
      beforeMemoryHash:memoryHash,lastFinishedMemoryHash:memoryHash,startChainHash:this.chainHash,finishedEvents:[]};
    return {planSha256:plan.planSha256,blockIndex:this.completedBlocks,eventCount:4,
      selectionMemoryHash:plan.memoryHash,conditionMemoryHash:memoryHash};
  }
  nextContext(){
    const p=this.active();assert(this.session.pending===null,'No event awaiting assessment');
    return structuredClone(p.plan.events[p.finishedEvents.length].experience.context);
  }
  startEvent(assessment){
    const p=this.active();assert(this.session.pending===null,'No event awaiting assessment');
    assert.equal(digest(this.session.memory.snapshot()),p.lastFinishedMemoryHash,'Unrecorded between-event memory change');
    const index=p.finishedEvents.length;
    return this.session.start(p.plan.events[index].experience,assessment,this.options(p.shuffledStatuses,index));
  }
  step(){
    const p=this.active();assert(this.session.pending,'No pending curriculum frame');
    const event={blockPlanSha256:p.plan.planSha256,blockIndex:this.completedBlocks,eventIndex:p.finishedEvents.length};
    const receipt=this.session.step();
    return receipt&&typeof receipt.then==='function'?receipt.then(value=>({...event,receipt:value}))
      :{...event,receipt};
  }
  finishEvent(){
    const p=this.active();assert(this.session.pending,'No pending curriculum event');
    const index=p.finishedEvents.length,blockComplete=index===3;
    const receipt={schema:'curriculum-event-receipt-v1',blockPlanSha256:p.plan.planSha256,
      blockIndex:this.completedBlocks,eventIndex:index,condition:this.condition,blockComplete,
      selectionMemoryHash:p.plan.memoryHash,receipt:this.session.finish(),previousChainHash:this.chainHash};
    this.chainHash=digest(receipt);p.lastFinishedMemoryHash=receipt.receipt.afterMemoryHash;
    const published={...receipt,chainHash:this.chainHash};p.finishedEvents.push(published);
    if(blockComplete){this.selectionCounts=structuredClone(p.plan.nextSelectionCounts);this.completedBlocks++;this.pending=null;}
    return published;
  }
  snapshot(){return {schema:'curriculum-block-session-v1',identity:this.identity,completedBlocks:this.completedBlocks,
    selectionCounts:structuredClone(this.selectionCounts),chainHash:this.chainHash,
    pending:structuredClone(this.pending),session:this.session.snapshot()};}
  restore(s){
    assert.equal(s.schema,'curriculum-block-session-v1');assert.equal(s.identity,this.identity);
    assert(Number.isSafeInteger(s.completedBlocks)&&s.completedBlocks>=0&&s.completedBlocks<=32);
    assert(isHash(s.chainHash));assert.deepEqual(Object.keys(s.selectionCounts).sort(),Object.keys(this.selectionCounts).sort());
    const counts=Object.values(s.selectionCounts);
    assert(counts.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=s.completedBlocks));
    assert.equal(counts.reduce((a,b)=>a+b,0),s.completedBlocks*2,'Invalid acknowledged block history');
    assert(s.pending===null||(typeof s.pending==='object'&&s.pending!==null),'Missing block state');
    if(s.pending){
      const p=s.pending;
      assert(Array.isArray(p.finishedEvents)&&p.finishedEvents.length<4);
      assert(isHash(p.beforeMemoryHash)&&isHash(p.lastFinishedMemoryHash)&&isHash(p.startChainHash));
      this.validatePlan(p.plan,s.completedBlocks,s.selectionCounts,p.shuffledStatuses);
      if(this.condition==='informative')assert.equal(p.plan.memoryHash,p.beforeMemoryHash);
      let chain=p.startChainHash,memoryHash=p.beforeMemoryHash;
      for(const [index,event] of p.finishedEvents.entries()){
        const {chainHash,...body}=event,experience=p.plan.events[index].experience;
        assert.equal(chainHash,digest(body));assert.equal(event.previousChainHash,chain);
        assert.equal(event.blockPlanSha256,p.plan.planSha256);assert.equal(event.blockIndex,s.completedBlocks);
        assert.equal(event.eventIndex,index);assert.equal(event.condition,this.condition);assert.equal(event.blockComplete,false);
        assert.equal(event.selectionMemoryHash,p.plan.memoryHash);assert.equal(event.receipt.beforeMemoryHash,memoryHash);
        assert.deepEqual(event.receipt.plan,this.session.verify(experience,this.options(p.shuffledStatuses,index)));
        assert.deepEqual(event.receipt.binding,this.session.bind(experience,event.receipt.binding.assessment,memoryHash));
        assert(isHash(event.receipt.afterMemoryHash));chain=chainHash;memoryHash=event.receipt.afterMemoryHash;
      }
      assert.equal(chain,s.chainHash);assert.equal(memoryHash,p.lastFinishedMemoryHash);
      const index=p.finishedEvents.length;
      if(s.session.pending){
        assert.deepEqual(s.session.pending.experience,p.plan.events[index].experience);
        assert.deepEqual(s.session.pending.options,this.options(p.shuffledStatuses,index));
        assert.equal(s.session.pending.beforeMemoryHash,p.lastFinishedMemoryHash);
      }else assert.equal(digest(s.session.memory),p.lastFinishedMemoryHash);
    }else assert.equal(s.session.pending,null,'Orphaned neural event');
    // Validate every wrapper field before invoking the inner transactional restore.
    this.session.restore(s.session);
    this.completedBlocks=s.completedBlocks;this.selectionCounts=structuredClone(s.selectionCounts);
    this.chainHash=s.chainHash;this.pending=structuredClone(s.pending);
  }
}
