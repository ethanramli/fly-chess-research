import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { copyBoard, uci } from '../../src/search-and-feedback/puzzle-search.mjs';
import { verifiedMateLessonFrames, DelayedMateLessonBrain } from '../../src/puzzle-learning/delayed-mate-lesson-brain.mjs';
import { createPublicMateFrameEncoder } from '../../src/chess-input/public-lesson-frame-cue.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { DelayedReversalMemory } from '../../src/neural-learning/delayed-reversal-memory.mjs';
const mapping={readyForCandidateExperiment:true,groups:[{kc:Array.from({length:128},(_,i)=>i)}]};
test('every legal move has a checked bounded-mate criterion, including quiet/king moves; endpoints encode',()=>{
  const b=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),task={objective:'forced-mate',plies:1};
  const encoder=createPublicMateFrameEncoder(mapping),original=b.pgn();let successes=0,failures=0;
  for(const move of b.moves({verbose:true})){
    const child=copyBoard(b);child.move(move);const proof=certifyMate(child,'w',{plies:0});
    const lesson=verifiedMateLessonFrames(b,uci(move),task,proof);
    assert.equal(lesson.frames.length,2);assert.equal(lesson.frames[1].action,null);
    assert.equal(lesson.frames[1].fen,child.fen());
    for(const frame of lesson.frames)assert.ok(encoder.encode(frame).stimulation.length);
    if(lesson.status==='success')successes++;else failures++;
  }
  assert.ok(successes>0&&failures>0);assert.equal(b.pgn(),original);
});
test('bounded multi-ply failure branch is legal; incomplete/unknown proof never supplies frames',()=>{
  const b=new Chess(),task={objective:'forced-mate',plies:3},move='e2e4',child=copyBoard(b);child.move('e4');
  const proof=certifyMate(child,'w',{plies:2,maxNodes:4096,milliseconds:2000});
  assert.equal(proof.status,'failure');const lesson=verifiedMateLessonFrames(b,move,task,proof);
  const replay=copyBoard(b);for(const frame of lesson.frames){assert.equal(frame.fen,replay.fen());
    if(frame.action)replay.move({from:frame.action.slice(0,2),to:frame.action.slice(2,4)});}
  assert.equal(lesson.frames.length,4);
  assert.deepEqual(verifiedMateLessonFrames(b,move,task,{status:'unknown',certificate:null}).frames,[]);
  const forged=structuredClone(proof);forged.certificate.tree.children=[];
  assert.throws(()=>verifiedMateLessonFrames(b,move,task,forged),/certificate/);
});
test('complete mate receiver assesses all legal moves before terminal consequence and updates local memory',async()=>{
  const graph={row:Int32Array.from([0,0,0,0,0,0,0,2,4]),col:Int32Array.from([0,1,0,1]),
    sign:Int8Array.from([1,1,1,1]),initial:Float32Array.from([1,1,1,1]),input:Int32Array.from([0]),output:Int32Array.from([7])};
  const mapped={readyForCandidateExperiment:true,groups:['left','right'].flatMap((side,i)=>[
    {side,danType:'PAM02',kc:[i],edges:[2+i],dan:[{index:2+i*2,rootId:String(100+i*2)}]},
    {side,danType:'PPL103',kc:[i],edges:[i],dan:[{index:3+i*2,rootId:String(101+i*2)}]}])};
  const model=new SparseTrainer(graph,{inputDim:1,outputs:1}),memory=new DelayedReversalMemory(model,mapped);
  model.forward([0]);const rest=Float32Array.from(model.h[model.steps]);
  const brain=new DelayedMateLessonBrain({model,memory,mapping:mapped,rest,frameEncoder:createPublicMateFrameEncoder(mapped),
    episodeIdentity:'a'.repeat(64),readouts:{MBON12:[{index:6}],MBON01:[{index:7}]}});
  const b=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),task={objective:'forced-mate',plies:1},child=copyBoard(b);
  child.move('Qh7#');const proof=certifyMate(child,'w',{plies:0});
  const receipt=await brain.teach(b,'f7h7',task,proof);
  assert.equal(receipt.assessment.rows.length,b.moves().length);assert.equal(receipt.evidence.status,'success');
  assert.equal(receipt.presentation.channel,'PAM02');assert.equal(receipt.frames.length,2);
  assert.ok(receipt.update.changedEdges>0);assert.equal(brain.presentations,b.moves().length+3);
  assert.equal(memory.active,false);assert.equal(brain.episode.active,false);
});
