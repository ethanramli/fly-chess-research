import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {certifyMate} from '../../src/search-and-feedback/mate-certificate.mjs';
import {verifiedExperience} from '../../src/search-and-feedback/verified-feedback.mjs';
import {RateTimingMemory} from '../../src/neural-learning/rate-timing-memory.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {TemporalFeedbackSession} from '../../src/puzzle-learning/temporal-feedback-session.mjs';

// Mechanical rate-array fixture: no connectome, trained policy or graph execution.
function fixture(){
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
  const session=new TemporalFeedbackSession({model,memory,mapping,
    encoder:{encode:()=>({stimulation:[{index:0,current:1.5}]})},
    timing:{cueFrame:2,leadFrames:2,tailFrames:5,current:1.5},identity:'a'.repeat(64)});
  const board=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),task={objective:'forced-mate',plies:1},move='f7h7';
  const successor=new Chess(board.fen());successor.move({from:'f7',to:'h7'});
  const proof=certifyMate(successor,'w',{plies:0});
  const experience={...verifiedExperience(board,move,task,proof),proof,context:{fen:board.fen(),pgn:board.pgn(),task}};
  const rows=board.moves({verbose:true}).map(m=>({move:m.from+m.to+(m.promotion??''),score:m.to==='h7'?1:0}));
  const assessment={...experience.context,rows,choice:move,memoryHash:digest(memory.snapshot())};
  return {model,memory,session,experience,assessment};
}

test('published frame prefixes resume without duplicating a frame or losing physiological state',()=>{
  const a=fixture(),b=fixture();a.session.start(a.experience,a.assessment);
  for(let i=0;i<3;i++)a.session.step();
  b.session.restore(JSON.parse(JSON.stringify(a.session.snapshot())));
  for(let i=3;i<8;i++)assert.deepEqual(a.session.step(),b.session.step());
  assert.equal(b.model.calls,5);assert.deepEqual(a.session.snapshot(),b.session.snapshot());
  const c=fixture();c.session.restore(a.session.snapshot());
  assert.deepEqual(a.session.finish(),c.session.finish());assert.equal(c.model.calls,0);
  assert.throws(()=>c.session.step(),/No pending/);
});

test('failed frames roll back both states and retry; disabled condition holds all memory fixed',()=>{
  const a=fixture();a.session.start(a.experience,a.assessment);a.session.step();
  const before=a.session.snapshot();a.model.fail=true;
  assert.throws(()=>a.session.step(),/Nonfinite/);assert.deepEqual(a.session.snapshot(),before);
  a.model.fail=false;a.session.step();assert.equal(a.session.pending.cursor,2);
  const b=fixture(),initial=b.memory.snapshot();b.session.start(b.experience,b.assessment,{condition:'disabled'});
  for(let i=0;i<8;i++)b.session.step();b.session.finish();assert.deepEqual(b.memory.snapshot(),initial);
});

test('stale assessment, changed proof and incompatible checkpoint fail without state mutation',()=>{
  const a=fixture(),initial=a.session.snapshot();
  assert.throws(()=>a.session.start(a.experience,{...a.assessment,memoryHash:'b'.repeat(64)}),/Stale/);
  assert.deepEqual(a.session.snapshot(),initial);
  a.session.start(a.experience,a.assessment);a.session.step();const before=a.session.snapshot();
  for(const change of [s=>{delete s.pending;},s=>{s.pending.cursor++;},s=>{s.episode.state[0]=NaN;}]){
    const broken=structuredClone(before);change(broken);assert.throws(()=>a.session.restore(broken));
    assert.deepEqual(a.session.snapshot(),before);
  }
  a.session.pending.experience.actor='b';assert.throws(()=>a.session.step(),/Mismatched/);
  assert.equal(a.session.pending.cursor,1);
});
