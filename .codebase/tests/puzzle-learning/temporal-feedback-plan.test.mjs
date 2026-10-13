import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {certifyMate} from '../../src/search-and-feedback/mate-certificate.mjs';
import {verifiedExperience} from '../../src/search-and-feedback/verified-feedback.mjs';
import {temporalFeedbackPlan as plan} from '../../src/puzzle-learning/temporal-feedback-plan.mjs';
const board=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),task={objective:'forced-mate',plies:1};
const mapping={schema:'gamma2-rate-timing-map-v1',groups:[{danType:'PPL103',dan:[{index:2}]}]};
const encoder={encode:()=>({identity:'fixture',stimulation:[{index:0,current:1.5}]})};
const timing={cueFrame:2,leadFrames:2,tailFrames:5,current:1.5};
function experience(move){
  const successor=new Chess(board.fen());successor.move({from:move.slice(0,2),to:move.slice(2)});
  const proof=certifyMate(successor,'w',{plies:0});
  return {...verifiedExperience(board,move,task,proof),proof,context:{fen:board.fen(),pgn:board.pgn(),task}};
}
test('independent success/failure evidence controls timing with equal cue and pulse dose',()=>{
  const success=plan(experience('f7h7'),encoder,mapping,timing),failure=plan(experience('f7e6'),encoder,mapping,timing);
  assert.equal(success.verifiedStatus,'success');assert.equal(failure.verifiedStatus,'failure');
  assert.equal(success.frames.find(f=>f.hasPulse).index,0);assert.equal(failure.frames.find(f=>f.hasPulse).index,2);
  for(const p of [success,failure]){
    assert.equal(p.frames.length,8);assert.equal(p.frames.filter(f=>f.hasCue).length,1);
    assert.equal(p.frames.find(f=>f.hasCue).index,2);
    assert.equal(p.frames.flatMap(f=>f.stimulation).reduce((n,c)=>n+c.current,0),3);
  }
});
test('controls preserve cue/time exposure, disable explicitly and swap all known labels',()=>{
  const e=experience('f7h7'),informative=plan(e,encoder,mapping,timing);
  for(const condition of ['absent','disabled','swapped','shuffled']){
    const p=plan(e,encoder,mapping,timing,{condition,shuffledStatus:condition==='shuffled'?'failure':null});
    assert.equal(p.frames.length,informative.frames.length);
    assert.deepEqual(p.frames.map(f=>f.hasCue),informative.frames.map(f=>f.hasCue));
    if(condition==='absent')assert(p.frames.every(f=>!f.hasPulse));
    if(condition==='disabled'){assert.equal(p.plasticityEnabled,false);assert.deepEqual(p.frames,informative.frames);}
    if(['swapped','shuffled'].includes(condition))assert.equal(p.teachingStatus,'failure');
  }
});
test('unknown evidence supplies no presentation and forged evidence fails before encoding',()=>{
  const e=experience('f7h7'),unknownProof={status:'unknown'};
  const unknown={...e,...verifiedExperience(board,e.move,task,unknownProof),proof:unknownProof};
  const never={encode(){throw Error('encoder must not run');}};
  assert.deepEqual(plan(unknown,never,mapping,timing).frames,[]);
  assert.throws(()=>plan({...e,actor:'b'},never,mapping,timing),/Mismatched/);
  assert.throws(()=>plan({...e,context:{...e.context,fen:'incorrect'}},never,mapping,timing),/Mismatched/);
  assert.throws(()=>plan(e,encoder,mapping,{...timing,tailFrames:100}),/Invalid/);
});
