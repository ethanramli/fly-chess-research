import test from 'node:test';
import assert from 'node:assert/strict';
import {selectCurriculumCheckpoint} from '../../src/puzzle-learning/curriculum-checkpoint-selection.mjs';

const strata=['first','second','third','fourth'];
const hash='a'.repeat(64);
function candidate(blockIndex,wrong=[]){return {blockIndex,checkpointSha256:hash,memorySha256:hash,
  validationChoices:Array.from({length:16},(_,index)=>({trialId:`trial-${index}`,familyId:`family-${index%4}`,
    stratum:strata[index%4],taskCriterion:'bounded-task',positionSha256:hash,boardHistorySha256:hash,
    candidateSetSha256:hash,certificateSha256:hash,correct:!wrong.includes(index),unique:true,unaided:true}))};}
const select=candidates=>selectCurriculumCheckpoint({stage:1,strata,candidates});

test('earliest passing published checkpoint wins even when a later one scores higher',()=>{
  const result=select([candidate(8,[0,1]),candidate(16)]);
  assert.equal(result.status,'selected');assert.equal(result.selected.blockIndex,8);
  assert.equal(result.selected.correct,14);
});

test('aggregate accuracy cannot override a failed stratum or unaided-choice gate',()=>{
  const bad=candidate(8,[0,4]);assert.equal(select([bad]).status,'gate-failed');
  const next=candidate(16);next.validationChoices[0].unaided=false;
  const result=select([bad,next]);assert.equal(result.selected.blockIndex,16);
  assert.equal(result.selected.correct,15);
});

test('every-block selection, skipped publications and changed validation identities are unknown',()=>{
  assert.equal(select([candidate(1)]).status,'unknown');
  assert.equal(select([candidate(8),candidate(24)]).status,'unknown');
  const changed=candidate(16);changed.validationChoices[0].certificateSha256='b'.repeat(64);
  assert.equal(select([candidate(8),changed]).status,'unknown');
});

test('later stages need complete earlier retention observations; a regression excludes a candidate',()=>{
  const first=candidate(8),second=candidate(16);
  const run=candidates=>selectCurriculumCheckpoint({stage:2,strata,candidates});
  assert.equal(run([first]).status,'unknown');
  const prior={stage:1,before:15,after:14,sentinels:Array.from({length:4},()=>({correct:true}))};
  first.earlierPrinciples=[prior];second.earlierPrinciples=[{...prior,after:15}];
  assert.equal(run([first,second]).selected.blockIndex,16);
  second.earlierPrinciples[0].sentinels[0].correct=false;
  assert.equal(run([first,second]).status,'gate-failed');
});
