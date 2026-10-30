import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {planCurriculumRehearsalBlock} from '../../src/puzzle-learning/curriculum-rehearsal-plan.mjs';
import {planCurriculumRehearsalBlockV2} from '../../src/puzzle-learning/curriculum-rehearsal-plan-v2.mjs';

// Same declared software fixture as curriculum-rehearsal-plan.test.mjs, with three panels.
const memoryHash='a'.repeat(64),task={objective:'capture-retention',plies:1};
function observation(panelId,correct=false){
  const board=new Chess(panelId.endsWith('b')?'6k1/8/8/8/pP5r/8/8/R1K5 w - - 0 1':'6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1');
  const context={fen:board.fen(),pgn:board.pgn(),task};
  const moves=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
  const choice=correct?'a1a4':'a1a2';
  const assessment={...context,memoryHash,choice,rows:moves.map(move=>({move,score:move===choice?1:0}))};
  const experiences=moves.map(move=>{
    const proof=certifyCaptureRetentionAction(board,move,task);
    return {...context,context,move,proof,...checkCaptureRetentionAction(board,move,task,proof)};
  });
  return {panelId,stage:1,split:'train',assessment,experiences};
}
const observations=()=>[observation('panel-a'),observation('panel-b',true),observation('panel-c',true)];
const registeredPanels=['panel-a','panel-b','panel-c'].map(panelId=>({panelId,stage:1}));
const options=(blockIndex,extra={})=>({currentStage:1,blockIndex,registeredPanels,...extra});

test('below the cap the v2 plan selects exactly what v1 selects and records the cap', () => {
  for(const recentTargets of [[],['panel-a'],['panel-b','panel-a']]){
    const blockIndex=recentTargets.length,counts=Object.fromEntries(recentTargets.map(id=>[id,1]));
    const v1=planCurriculumRehearsalBlock(observations(),memoryHash,options(blockIndex,{selectionCounts:counts}));
    const v2=planCurriculumRehearsalBlockV2(observations(),memoryHash,options(blockIndex,{selectionCounts:counts,recentTargets,maxConsecutiveTargets:2}));
    assert.equal(v2.targetPanelId,v1.targetPanelId);assert.equal(v2.sentinelPanelId,v1.sentinelPanelId);
    assert.deepEqual(v2.events,v1.events);assert.deepEqual(v2.nextSelectionCounts,v1.nextSelectionCounts);
    assert.equal(v2.schema,'curriculum-rehearsal-block-v1');assert.equal(v2.plannerVersion,'curriculum-rehearsal-plan-v2');
    assert.equal(v2.targetCap.applied,false);
  }
});

test('a panel targeted in each of the last M blocks yields to the oldest other current panel', () => {
  const counts={'panel-a':2,'panel-b':2};
  const v1=planCurriculumRehearsalBlock(observations(),memoryHash,options(2,{selectionCounts:counts}));
  assert.equal(v1.targetPanelId,'panel-a','v1 would retarget the same worst error');
  const v2=planCurriculumRehearsalBlockV2(observations(),memoryHash,options(2,{selectionCounts:counts,
    recentTargets:['panel-a','panel-a'],maxConsecutiveTargets:2}));
  assert.equal(v2.targetPanelId,'panel-c','oldest uncovered current pair (fewest selections)');
  assert.equal(v2.events[0].role,'uncovered-pair-practice');
  assert.deepEqual(v2.targetCap,{maxConsecutiveTargets:2,recentTargets:['panel-a','panel-a'],cappedPanelId:'panel-a',applied:true});
  assert.notEqual(v2.sentinelPanelId,v2.targetPanelId);
  assert.deepEqual(v2.events.map(e=>e.experience.status),['failure','success','success','failure']);
  // With M = 3 the same history is below the cap.
  const uncapped=planCurriculumRehearsalBlockV2(observations(),memoryHash,options(2,{selectionCounts:counts,
    recentTargets:['panel-a','panel-a'],maxConsecutiveTargets:3}));
  assert.equal(uncapped.targetPanelId,'panel-a');
});

test('the cap needs a registered M and the target of every completed block', () => {
  assert.throws(()=>planCurriculumRehearsalBlockV2(observations(),memoryHash,options(0,{recentTargets:[]})),/consecutive-target cap/);
  assert.throws(()=>planCurriculumRehearsalBlockV2(observations(),memoryHash,options(2,{recentTargets:['panel-a'],maxConsecutiveTargets:2})),/every completed block/);
});
