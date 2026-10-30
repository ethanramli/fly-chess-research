import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {planCurriculumRehearsalBlock} from '../../src/puzzle-learning/curriculum-rehearsal-plan.mjs';

// Declared software fixtures with reset histories, not derived Lichess families.
const memoryHash='a'.repeat(64),task={objective:'capture-retention',plies:1};
function observation(panelId,stage=1,correct=false,fen=null){
  const board=new Chess(fen??(panelId.endsWith('a')?'6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1':'6k1/8/8/8/pP5r/8/8/R1K5 w - - 0 1'));
  const context={fen:board.fen(),pgn:board.pgn(),task};
  const moves=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
  const choice=correct?'a1a4':'a1a2';
  const assessment={...context,memoryHash,choice,rows:moves.map(move=>({move,score:move===choice?1:0}))};
  const experiences=moves.map(move=>{
    const proof=certifyCaptureRetentionAction(board,move,task);
    return {...context,context,move,proof,...checkCaptureRetentionAction(board,move,task,proof)};
  });
  return {panelId,stage,split:'train',assessment,experiences};
}
function setup(stage=1){
  const observations=[observation('panel-a',stage),observation('panel-b',1,true)];
  return {observations,options:{currentStage:stage,blockIndex:0,registeredPanels:observations.map(({panelId,stage})=>({panelId,stage}))}};
}

test('four-event block targets the current error, rehearses another panel and stays balanced',()=>{
  const {observations,options}=setup(),before=structuredClone(observations);
  const plan=planCurriculumRehearsalBlock(observations,memoryHash,options);
  assert(plan.ready);assert.equal(plan.targetPanelId,'panel-a');assert.equal(plan.sentinelPanelId,'panel-b');
  assert.deepEqual(plan.events.map(e=>e.experience.status),['failure','success','success','failure']);
  assert.equal(plan.events[0].experience.move,'a1a2');assert.equal(plan.events[0].role,'current-error');
  assert.deepEqual(plan.nextSelectionCounts,{'panel-a':1,'panel-b':1});
  assert.deepEqual(observations,before);assert(!Object.hasOwn(plan,'channelCounts'));
});

test('mastered/tied panels use honest practice fallback and never invent a current error',()=>{
  const {observations,options}=setup();observations[0]=observation('panel-a',1,true);
  const plan=planCurriculumRehearsalBlock(observations,memoryHash,options);
  assert.equal(plan.events[0].role,'uncovered-pair-practice');
  observations[0].assessment.rows.forEach(r=>r.score=0);observations[0].assessment.choice=null;
  assert.equal(planCurriculumRehearsalBlock(observations,memoryHash,options).events[0].role,'uncovered-pair-practice');
});

test('selection uses current training scores and deterministic saved exposure counts',()=>{
  const {observations,options}=setup();observations[0]=observation('panel-a',1,true);
  const plan=planCurriculumRehearsalBlock(observations,memoryHash,{...options,selectionCounts:{'panel-a':3,'panel-b':1}});
  assert.equal(plan.targetPanelId,'panel-b');assert.equal(plan.sentinelPanelId,'panel-a');
  assert.deepEqual(plan.nextSelectionCounts,{'panel-a':4,'panel-b':2});
});

test('validation/final rows, changed stages, stale memory and subset coverage are rejected',()=>{
  for(const mutate of [
    s=>{s.observations[0].split='validation';},s=>{s.observations[0].split='final';},
    s=>{s.observations[0].stage=2;},s=>{s.observations[0].assessment.memoryHash='b'.repeat(64);},
    s=>{s.observations[0].assessment.rows.pop();},s=>{s.observations[0].experiences.pop();},
  ]){const s=setup();mutate(s);assert.throws(()=>planCurriculumRehearsalBlock(s.observations,memoryHash,s.options));}
});

test('unknown required proof or missing balance stops before any event',()=>{
  const s=setup(),event=s.observations[0].experiences.find(e=>e.move==='a1a4');
  Object.assign(event,{status:'unknown',learningAllowed:false,certificateSha256:null,
    proof:{status:'unknown',certificate:null,certificateSha256:null}});
  const plan=planCurriculumRehearsalBlock(s.observations,memoryHash,s.options);
  assert(!plan.ready);assert.deepEqual(plan.events,[]);
  assert.equal(plan.blocked[0].reason,'unknown-required-consequence');
  const unbalanced=setup();
  unbalanced.observations[0]=observation('panel-a',1,false,'6k1/8/8/8/p6r/1P6/8/RK6 w - - 0 1');
  const missing=planCurriculumRehearsalBlock(unbalanced.observations,memoryHash,unbalanced.options);
  assert(!missing.ready);assert.deepEqual(missing.events,[]);
  assert.equal(missing.blocked[0].reason,'missing-balanced-contrast');
});

test('later stages require earlier rehearsal and the registered budget cannot auto-extend',()=>{
  const s=setup(2),plan=planCurriculumRehearsalBlock(s.observations,memoryHash,s.options);
  assert(plan.ready);assert.equal(plan.events[2].stage,1);
  const finished=planCurriculumRehearsalBlock(s.observations,memoryHash,{...s.options,blockIndex:32});
  assert(!finished.ready);assert.equal(finished.events.length,0);assert.match(finished.reason,/budget-complete/);
  s.observations[1].stage=2;s.options.registeredPanels[1].stage=2;
  assert.equal(planCurriculumRehearsalBlock(s.observations,memoryHash,s.options).reason,'missing-earlier-rehearsal-stratum');
});
