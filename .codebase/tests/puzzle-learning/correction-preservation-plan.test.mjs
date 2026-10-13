import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { planCorrectionAndPreservation } from '../../src/puzzle-learning/correction-preservation-plan.mjs';
const memoryHash='a'.repeat(64),task={objective:'capture-retention',plies:1};
function observation(panelId,margin) {
  const board=new Chess('4r1k1/8/8/4p3/pP5r/8/8/RK2R3 w - - 0 1');
  const assessment={fen:board.fen(),pgn:board.pgn(),task,memoryHash,
    rows:[{move:'a1a4',score:margin},{move:'e1e5',score:0}],choice:margin>0?'a1a4':margin<0?'e1e5':null};
  const experiences=['a1a4','e1e5'].map(move=>{
    const proof=certifyCaptureRetention(board,move);
    return {...verifiedExperience(board,move,task,proof),proof,context:{fen:board.fen(),pgn:board.pgn(),task}};
  });
  return {panelId,split:'train',assessment,experiences};
}
test('bounded plan targets an actual error and protects the least-confident correct choice',()=>{
  const input=[observation('bad-b',-0.5),observation('good-b',0.8),observation('bad-a',-0.9),observation('good-a',0.1)];
  const plan=planCorrectionAndPreservation(input,memoryHash);
  assert.equal(plan.ready,true);assert.equal(plan.targetPanelId,'bad-a');assert.equal(plan.sentinelPanelId,'good-a');
  assert.deepEqual(plan.experiences.map(row=>row.role),['target-failure','target-success','preserve-success','preserve-failure']);
  assert.deepEqual(plan.channelCounts,{PAM02:2,PPL103:2});assert.equal(plan.experiences.length,4);
  input[2].experiences[0].move='forged';assert.equal(plan.experiences[1].experience.move,'a1a4');
});
test('unknown target and tied choices cannot be turned into corrective reinforcement',()=>{
  const unknown=observation('unknown',-1),good=observation('good',0.1),tied=observation('tie',0);
  unknown.experiences[1]={...unknown.experiences[1],status:'unknown',learningAllowed:false,experimentalPulse:null,
    certificateSha256:null,proof:{status:'unknown',certificate:null}};
  const plan=planCorrectionAndPreservation([unknown,good,tied],memoryHash);
  assert.equal(plan.ready,false);assert.equal(plan.experiences.length,0);assert.equal(plan.excluded.length,2);
});
test('stale memory, forged certificate, validation/final selection and duplicate panels are rejected',()=>{
  const bad=observation('bad',-0.1),good=observation('good',0.1);
  assert.throws(()=>planCorrectionAndPreservation([bad,good],'b'.repeat(64)),/Stale/);
  for(const split of ['validation','final'])assert.throws(()=>planCorrectionAndPreservation([{...bad,split},good],memoryHash),/training/);
  assert.throws(()=>planCorrectionAndPreservation([bad,bad],memoryHash),/Duplicate/);
  const forged=structuredClone(bad);forged.experiences[1].proof.certificate.replies.pop();
  assert.throws(()=>planCorrectionAndPreservation([forged,good],memoryHash));
});
test('no sentinel gives an explicit unready result; priorities have deterministic ties',()=>{
  const a=observation('bad-a',-0.1),b=observation('bad-b',-0.1);
  assert.equal(planCorrectionAndPreservation([b,a],memoryHash).ready,false);
  const good=observation('good',0.1);
  assert.equal(planCorrectionAndPreservation([b,a,good],memoryHash).targetPanelId,'bad-a');
});
