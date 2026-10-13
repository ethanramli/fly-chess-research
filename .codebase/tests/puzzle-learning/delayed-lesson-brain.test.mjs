import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { DelayedReversalMemory } from '../../src/neural-learning/delayed-reversal-memory.mjs';
import { DelayedLessonBrain } from '../../src/puzzle-learning/delayed-lesson-brain.mjs';
import { createPublicLessonFrameEncoder } from '../../src/chess-input/public-lesson-frame-cue.mjs';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
function fixture(condition) {
  const graph={row:Int32Array.from([0,0,0,0,0,0,0,2,4]),col:Int32Array.from([0,1,0,1]),
    sign:Int8Array.from([1,1,1,1]),initial:Float32Array.from([1,1,1,1]),input:Int32Array.from([0]),output:Int32Array.from([7])};
  const mapping={readyForCandidateExperiment:true,groups:['left','right'].flatMap((side,i)=>[
    {side,danType:'PAM02',kc:[i],edges:[2+i],dan:[{index:2+i*2,rootId:String(100+i*2)}]},
    {side,danType:'PPL103',kc:[i],edges:[i],dan:[{index:3+i*2,rootId:String(101+i*2)}]}])};
  const model=new SparseTrainer(graph,{inputDim:1,outputs:1});
  const memory=new DelayedReversalMemory(model,mapping);model.forward([0]);
  const rest=Float32Array.from(model.h[model.steps]);
  const brain=new DelayedLessonBrain({model,memory,mapping,rest,
    frameEncoder:createPublicLessonFrameEncoder(mapping),episodeIdentity:'a'.repeat(64),maxLegalMoves:256,
    readouts:{MBON12:[{index:6}],MBON01:[{index:7}]}});
  const board=new Chess('4r1k1/8/8/4p3/pP5r/8/8/RK2R3 w - - 0 1'),task={objective:'capture-retention',plies:1};
  return {brain,memory,model,board,task,condition};
}
test('certified sequence records prior all-legal ordinal ranking, delayed activity, controls and fixed wiring',async()=>{
  const receipts=[];
  for(const condition of ['informative','no-channel','disabled']) {
    const f=fixture(condition), before=f.memory.snapshot(), hash=fixedStateHash(f.model,f.memory.edges), history=f.board.pgn();
    const receipt=await f.brain.teach(f.board,'e1e5',f.task,certifyCaptureRetention(f.board,'e1e5'),{condition});
    assert.equal(receipt.assessment.rows.length,f.board.moves().length);
    assert.equal(receipt.prediction.memoryHash,digest(before));
    assert.equal(receipt.frames.length,3);assert.equal(receipt.evidence.status,'failure');
    assert.equal(receipt.presentation.channel,condition==='no-channel'?null:'PPL103');
    assert.equal(fixedStateHash(f.model,f.memory.edges),hash);assert.equal(f.board.pgn(),history);
    assert.equal(f.memory.active,false);assert.equal(f.brain.episode.active,false);
    if(condition==='disabled')assert.deepEqual(f.memory.snapshot(),before);
    else if(condition==='informative')assert.equal(receipt.learningApplied,true);
    receipts.push({presentations:f.brain.presentations,prediction:receipt.prediction});
  }
  assert.equal(receipts[0].presentations,receipts[1].presentations);
  assert.equal(receipts[0].presentations,receipts[2].presentations);
  assert.deepEqual(receipts[0].prediction,receipts[1].prediction);
});
test('unknown, forged proof and exhausted complete budget cause zero neural presentations',async()=>{
  const f=fixture(), before=f.memory.snapshot();
  assert.equal((await f.brain.teach(f.board,'e1e5',f.task,{status:'unknown',certificate:null})).skipped,true);
  const proof=certifyCaptureRetention(f.board,'e1e5');
  await assert.rejects(f.brain.teach(f.board,'e1e5',f.task,{...proof,status:'success'}));
  f.brain.maxPresentations=1;await assert.rejects(f.brain.teach(f.board,'e1e5',f.task,proof),/bound/);
  assert.equal(f.brain.presentations,0);assert.deepEqual(f.memory.snapshot(),before);
});
