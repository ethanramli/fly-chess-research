import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {createAllLegalBoundRayCueEncoder} from '../../src/chess-input/bound-ray-relational-cue.mjs';
import {captureRetentionTemporalPlan,bindCaptureRetentionAssessment,CaptureRetentionTemporalFeedbackSession} from '../../src/puzzle-learning/capture-retention-feedback.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {RateTimingMemory} from '../../src/neural-learning/rate-timing-memory.mjs';

const task={objective:'capture-retention',plies:1};
const mapping={readyForCandidateExperiment:true,groups:[{kc:Array.from({length:120},(_,i)=>i)}]};
const encoder=createAllLegalBoundRayCueEncoder(mapping,{seed:20261011,maxCells:8,totalCurrent:12,maxRelationCells:4});
const timing={cueFrame:2,leadFrames:2,tailFrames:5,current:1.5};
const plasticityMapping={schema:'gamma2-rate-timing-map-v1',groups:[{danType:'PPL103',dan:[{index:200}]}]};
function experience(board,move){const proof=certifyCaptureRetentionAction(board,move,task);return {...checkCaptureRetentionAction(board,move,task,proof),proof,context:{fen:board.fen(),pgn:board.pgn(),task}};}
function assessment(board,exp,memoryHash){const rows=board.moves({verbose:true}).map(m=>({move:m.from+m.to+(m.promotion??''),score:m.from+m.to===exp.move?1:0}));return {fen:board.fen(),pgn:board.pgn(),task,rows,choice:exp.move,memoryHash};}

test('quiet and capture evidence independently bind to all-legal C01 assessments and temporal frames',()=>{
  const board=new Chess('6k1/8/8/8/p2p3r/8/8/3QK3 w - - 0 1');
  for(const move of ['d1a4','d1c2']){
    const exp=experience(board,move),memoryHash=digest({gains:[1]}),scores=assessment(board,exp,memoryHash);
    const binding=bindCaptureRetentionAssessment(board,task,scores,exp,memoryHash);
    assert.equal(binding.coverage,'all-legal');assert.equal(binding.status,move==='d1a4'?'success':'failure');
    const plan=captureRetentionTemporalPlan(exp,encoder,plasticityMapping,timing);
    assert.equal(plan.verifiedStatus,binding.status);assert.equal(plan.cue.move,move);
    assert.deepEqual(plan.proof,exp.proof);assert.equal(typeof plan.verificationScope,'string');
    assert.equal(plan.frames.length,8);assert.equal(plan.frames.filter(f=>f.hasCue).length,1);
    assert.equal(plan.frames.filter(f=>f.hasPulse).length,1);
    assert(plan.frames.every(f=>!f.stimulation.some(c=>c.index===200&&c.current!==1.5)));
    assert(!plan.cue.tokens.some(t=>/success|failure|safe|unsafe|certificate|recaptur/i.test(t)));
  }
});

test('unknown proof produces no plan, and mismatched or subset assessments cannot bind',()=>{
  const board=new Chess('6k1/8/8/8/p2p3r/8/8/3QK3 w - - 0 1'),base=experience(board,'d1c2');
  const unknown={...base,status:'unknown',actor:board.turn(),learningAllowed:false,certificateSha256:null,proof:{status:'unknown'}};
  assert.equal(captureRetentionTemporalPlan(unknown,encoder,plasticityMapping,timing).skipped,true);
  const memoryHash=digest({}),good=assessment(board,base,memoryHash);
  const rows=good.rows.slice(0,-1),best=Math.max(...rows.map(r=>r.score)),choice=rows.filter(r=>r.score===best);
  assert.throws(()=>bindCaptureRetentionAssessment(board,task,{...good,rows,choice:choice.length===1?choice[0].move:null},base,memoryHash),/all-legal/);
  assert.throws(()=>captureRetentionTemporalPlan({...base,move:'d1a8'},encoder,plasticityMapping,timing));
});

function sessionFixture(){
  const n=220,steps=2,mapping={schema:'gamma2-rate-timing-map-v1',readyForCandidateExperiment:true,
    groups:[{mbonType:'MBON12',danType:'PPL103',kc:Array.from({length:120},(_,i)=>i),
      kcTypes:Array(120).fill('KCg-m'),edges:Array.from({length:120},(_,i)=>i),dan:[{index:200}]}]};
  const model={n,steps,saturation:10,config:{fixture:true},graph:{col:Int32Array.from(mapping.groups[0].kc),sign:new Int8Array(120).fill(1)},
    params:{magnitude:new Float32Array(120).fill(0.5)},h:Array.from({length:steps+1},()=>new Float32Array(n)),
    setMagnitude(e,v){this.params.magnitude[e]=v;},forward(input,stimulation,state){
      this.h[0].set(state);for(let t=1;t<=steps;t++){this.h[t].set(this.h[t-1].map(v=>v*0.5));for(const c of stimulation)this.h[t][c.index]+=c.current;}return null;
    }};
  const memory=new RateTimingMemory(model,mapping,new Float32Array(n),{referenceMode:'fixed-unstimulated-model',
    tauKC:0.4,tauShort:0.6,tauLong:1,stepDuration:0.1,eta:0.5,minGain:0.2,maxGain:1.8,activityScale:1});
  const inputEncoder=createAllLegalBoundRayCueEncoder(mapping,{seed:20261011,maxCells:8,totalCurrent:12,maxRelationCells:4});
  const session=new CaptureRetentionTemporalFeedbackSession({model,memory,mapping,encoder:inputEncoder,timing,identity:'c'.repeat(64)});
  const board=new Chess('6k1/8/8/8/p2p3r/8/8/3QK3 w - - 0 1'),exp=experience(board,'d1c2');
  const scores=assessment(board,exp,digest(memory.snapshot()));return {session,model,memory,exp,scores};
}

test('C01 session inherits shared frame transactions and resumes the all-legal domain without duplicate updates',()=>{
  const a=sessionFixture(),b=sessionFixture();a.session.start(a.exp,a.scores);a.session.step();
  b.session.restore(JSON.parse(JSON.stringify(a.session.snapshot())));
  while(a.session.pending.cursor<a.session.pending.plan.frames.length)assert.deepEqual(a.session.step(),b.session.step());
  assert.equal(a.memory.events,8);assert.deepEqual(a.session.finish(),b.session.finish());
  assert.deepEqual(a.memory.snapshot(),b.memory.snapshot());assert.equal(b.model.h[0].length,220);
});
