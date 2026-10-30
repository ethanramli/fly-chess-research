import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {RateTimingMemory} from '../../src/neural-learning/rate-timing-memory.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {CaptureRetentionTemporalFeedbackSession} from '../../src/puzzle-learning/capture-retention-feedback.mjs';
import {planCurriculumRehearsalBlock} from '../../src/puzzle-learning/curriculum-rehearsal-plan.mjs';
import {CurriculumBlockSession} from '../../src/puzzle-learning/curriculum-block-session.mjs';

// Four rate-array cells and synthetic reset histories: software recovery only.
// No connectome execution, learned ranking, disk durability or scientific gate.
const panels=[{panelId:'panel-a',stage:1},{panelId:'panel-b',stage:1}];
const task={objective:'capture-retention',plies:1};
function fixture(condition='informative'){
  const model={n:4,steps:2,saturation:10,config:{fixture:true},calls:0,fail:false,
    graph:{col:Int32Array.from([0,1]),sign:Int8Array.from([1,1])},
    params:{magnitude:Float32Array.from([0.5,0.4])},h:Array.from({length:3},()=>new Float32Array(4)),
    setMagnitude(e,v){this.params.magnitude[e]=v;},
    forward(input,stimulation,state){
      this.calls++;this.h[0].set(state);
      for(let t=1;t<=2;t++){
        this.h[t].set(this.h[t-1].map(v=>v*0.5));
        for(const c of stimulation)this.h[t][c.index]+=c.current;
      }
      if(this.fail)this.h[2][2]=NaN;
    }};
  const mapping={schema:'gamma2-rate-timing-map-v1',groups:[{mbonType:'MBON12',danType:'PPL103',
    kc:[0,1],kcTypes:['KCg-m','KCg-m'],edges:[0,1],dan:[{index:2}]}]};
  const memory=new RateTimingMemory(model,mapping,new Float32Array(4),{
    referenceMode:'fixed-unstimulated-model',tauKC:0.4,tauShort:0.6,tauLong:1,
    stepDuration:0.1,eta:0.5,minGain:0.2,maxGain:1.8,activityScale:1});
  const session=new CaptureRetentionTemporalFeedbackSession({model,memory,mapping,
    encoder:{encode:()=>({stimulation:[{index:0,current:1.5}]})},
    timing:{cueFrame:2,leadFrames:2,tailFrames:5,current:1.5},identity:'a'.repeat(64)});
  const block=new CurriculumBlockSession({session,currentStage:1,registeredPanels:panels,condition,
    shuffleIdentity:condition==='shuffled'?'b'.repeat(64):null});
  return {model,memory,session,block};
}
function assess(context,memory,correct=false){
  const board=new Chess();board.loadPgn(context.pgn);
  const choice=correct?'a1a4':'a1a2';
  return {...context,memoryHash:digest(memory.snapshot()),choice,
    rows:board.moves({verbose:true}).map(m=>{
      const move=m.from+m.to+(m.promotion??'');return {move,score:move===choice?1:0};
    })};
}
function plan(f){
  const observations=panels.map((panel,index)=>{
    const board=new Chess(index?'6k1/8/8/8/pP5r/8/8/R1K5 w - - 0 1':'6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1');
    const context={fen:board.fen(),pgn:board.pgn(),task};
    const experiences=board.moves({verbose:true}).map(m=>{
      const move=m.from+m.to+(m.promotion??''),proof=certifyCaptureRetentionAction(board,move,task);
      return {context,move,proof,...checkCaptureRetentionAction(board,move,task,proof)};
    });
    return {...panel,split:'train',assessment:assess(context,f.memory,index===1),experiences};
  });
  return planCurriculumRehearsalBlock(observations,digest(f.memory.snapshot()),{
    currentStage:1,blockIndex:f.block.completedBlocks,registeredPanels:panels,selectionCounts:f.block.selectionCounts});
}
function startEvent(f){return f.block.startEvent(assess(f.block.nextContext(),f.memory));}
function next(f){
  if(!f.session.pending)return {kind:'start',receipt:startEvent(f)};
  if(f.session.pending.cursor<8)return {kind:'frame',receipt:f.block.step()};
  return {kind:'finish',receipt:f.block.finishEvent()};
}
function finish(f){const rows=[];while(f.block.pending)rows.push(next(f));return rows;}

test('four-event learning block commits exposure counts only on completion',()=>{
  const f=fixture(),p=plan(f);f.block.startBlock(p);
  const context=f.block.nextContext();context.fen='changed';assert.notEqual(f.block.nextContext().fen,'changed');
  const rows=[];
  while(f.block.pending){
    assert.equal(f.block.completedBlocks,0);assert.deepEqual(f.block.selectionCounts,{'panel-a':0,'panel-b':0});
    rows.push(next(f));
  }
  assert.equal(rows.filter(r=>r.kind==='frame').length,32);assert.equal(f.memory.events,32);
  assert.equal(f.block.completedBlocks,1);assert.deepEqual(f.block.selectionCounts,{'panel-a':1,'panel-b':1});
  const receipts=rows.filter(r=>r.kind==='finish').map(r=>r.receipt);
  assert.deepEqual(receipts.map(r=>r.blockComplete),[false,false,false,true]);
  for(const [i,r] of receipts.entries()){
    const {chainHash,...body}=r;assert.equal(chainHash,digest(body));
    if(i)assert.equal(r.previousChainHash,receipts[i-1].chainHash);
  }
  assert.throws(()=>f.block.startBlock(p),/blockIndex|0 !== 1/);
});

test('JSON checkpoint prefixes resume identical receipts without repeating neural frames',()=>{
  const original=fixture();original.block.startBlock(plan(original));
  const snapshots=[{state:original.block.snapshot(),offset:0}],rows=[];
  while(original.block.pending){
    rows.push(next(original));
    if([1,4,9,10,14,20,29,39,40].includes(rows.length))snapshots.push({state:original.block.snapshot(),offset:rows.length});
  }
  for(const {state,offset} of snapshots){
    const restored=fixture();restored.block.restore(JSON.parse(JSON.stringify(state)));
    assert.deepEqual(finish(restored),rows.slice(offset));
    assert.deepEqual(restored.block.snapshot(),original.block.snapshot());
    assert.equal(restored.model.calls,rows.slice(offset).filter(r=>r.kind==='frame').length);
  }
});

test('stale ranking, changed plans, incomplete events and failed frames preserve state',()=>{
  const f=fixture();f.block.startBlock(plan(f));const stale=assess(f.block.nextContext(),f.memory);
  startEvent(f);const before=f.block.snapshot();
  assert.throws(()=>f.block.finishEvent(),/Incomplete/);assert.deepEqual(f.block.snapshot(),before);
  f.model.fail=true;assert.throws(()=>f.block.step(),/Nonfinite/);assert.deepEqual(f.block.snapshot(),before);f.model.fail=false;
  while(f.session.pending.cursor<8)f.block.step();f.block.finishEvent();
  const idle=f.block.snapshot();assert.throws(()=>f.block.startEvent(stale),/Stale/);assert.deepEqual(f.block.snapshot(),idle);
  f.block.pending.plan.events[1].role='tampered';assert.throws(()=>f.block.step(),/Changed block plan/);
  f.block.restore(idle);assert.deepEqual(f.block.snapshot(),idle);
});

test('corrupt checkpoint histories and incompatible identities reject transactionally',()=>{
  const f=fixture();f.block.startBlock(plan(f));startEvent(f);
  for(let i=0;i<8;i++)f.block.step();f.block.finishEvent();startEvent(f);f.block.step();
  const good=f.block.snapshot();
  for(const change of [s=>{s.completedBlocks++;},s=>{s.selectionCounts['panel-a']++;},
    s=>{s.pending.finishedEvents=[];},s=>{s.pending.finishedEvents[0].receipt.afterMemoryHash='c'.repeat(64);},
    s=>{s.pending.startChainHash='c'.repeat(64);},s=>{s.pending.shuffledStatuses=['success'];},
    s=>{s.session.pending.cursor++;},s=>{s.session.episode.state[0]=NaN;},s=>{s.identity='c'.repeat(64);}
  ]){
    const bad=structuredClone(good);change(bad);assert.throws(()=>f.block.restore(bad));
    assert.deepEqual(f.block.snapshot(),good);
  }
});

test('controls replay the informative plan with their own fresh memory assessments',()=>{
  const info=fixture(),p=plan(info),disabled=fixture('disabled');
  // Simulate a different valid control state before selection; no shared state.
  disabled.memory.events=7;const initial=disabled.memory.snapshot();
  const selected=disabled.block.startBlock(p);assert.notEqual(selected.conditionMemoryHash,selected.selectionMemoryHash);
  const rows=finish(disabled);assert.deepEqual(disabled.memory.snapshot(),initial);
  assert.equal(disabled.block.completedBlocks,1);assert.equal(rows.filter(r=>r.kind==='frame').length,32);
  const absent=fixture('absent');absent.block.startBlock(p);
  assert(finish(absent).filter(r=>r.kind==='frame').every(r=>r.receipt.receipt.stimulation.every(c=>c.index!==2)));
  assert.equal(absent.memory.events,32);
  const stale=fixture();stale.memory.events=7;assert.throws(()=>stale.block.startBlock(p),/Stale informative/);
});

test('shuffled feedback is pinned, resumable and does not change verified outcomes',()=>{
  const f=fixture('shuffled'),p=plan(f),statuses=['success','failure','failure','success'];
  assert.throws(()=>f.block.startBlock(p),/shuffle/);
  f.block.startBlock(p,{shuffledStatuses:statuses});startEvent(f);f.block.step();
  const restored=fixture('shuffled');restored.block.restore(f.block.snapshot());
  const a=finish(f),b=finish(restored);assert.deepEqual(a,b);
  const receipts=a.filter(r=>r.kind==='finish').map(r=>r.receipt.receipt.plan);
  assert.deepEqual(receipts.map(r=>r.teachingStatus),statuses);
  assert.deepEqual(receipts.map(r=>r.verifiedStatus),['failure','success','success','failure']);
  assert.throws(()=>fixture().block.restore(f.block.snapshot()),/identity/);
});
