// Inert four-event curriculum planning. Neural delivery must freshly assess/bind
// each event and publish its pending receipt through the registered session.
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {bindCaptureRetentionAssessment} from './capture-retention-feedback.mjs';
import {bindFeedbackToAssessment} from './feedback-quality.mjs';

const byId=(a,b)=>a.panelId.localeCompare(b.panelId);

export function planCurriculumRehearsalBlock(observations,memoryHash,{
  currentStage,blockIndex,registeredPanels,selectionCounts={},
}={}){
  assert.match(memoryHash,/^[a-f0-9]{64}$/,'Require current memory identity');
  assert(Number.isSafeInteger(currentStage)&&currentStage>=1&&currentStage<=12,'Invalid current stage');
  assert(Number.isSafeInteger(blockIndex)&&blockIndex>=0&&blockIndex<=32,'Invalid frozen block budget');
  assert(Array.isArray(registeredPanels)&&registeredPanels.length>=2&&registeredPanels.length<=64,'Invalid registered panel bound');
  const ids=registeredPanels.map(p=>p.panelId);
  assert(ids.every(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id)),'Invalid panel ID');
  assert.equal(new Set(ids).size,ids.length,'Duplicate registered panel');
  assert(registeredPanels.every(p=>Number.isSafeInteger(p.stage)&&p.stage>=1&&p.stage<=currentStage),'Invalid panel stage');
  assert(Object.entries(selectionCounts).every(([id,n])=>ids.includes(id)&&Number.isSafeInteger(n)&&n>=0&&n<=64),'Invalid selection history');
  const base={schema:'curriculum-rehearsal-block-v1',currentStage,blockIndex,memoryHash,
    registrationSha256:digest(registeredPanels),ready:false,events:[],
    scope:'Training-only four-event plan; no neural update, stage acceptance, reward channel or biological claim'};
  if(blockIndex===32)return {...base,reason:'registered-32-block-budget-complete'};
  assert(Array.isArray(observations)&&observations.length===registeredPanels.length,'Missing registered training observations');
  assert.deepEqual(observations.map(p=>p.panelId).sort(),[...ids].sort(),'Observation panel mismatch');
  const rows=[],blocked=[];
  for(const observation of observations){
    const {panelId,stage,assessment,experiences}=observation;
    assert.equal(observation.split,'train','Only training families may select experiences');
    assert.equal(stage,registeredPanels.find(p=>p.panelId===panelId).stage,'Panel stage mismatch');
    assert(typeof assessment?.pgn==='string'&&assessment.pgn.length<=65536,'Unbounded assessment history');
    const board=new Chess();board.loadPgn(assessment.pgn);
    const legal=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')).sort();
    assert(legal.length>0&&legal.length<=256,'Invalid all-legal action bound');
    assert(Array.isArray(experiences)&&experiences.length===legal.length,'Require all-legal consequences');
    assert.deepEqual(experiences.map(e=>e.move).sort(),legal,'Missing or duplicate consequence');
    const binder=assessment.task?.objective==='capture-retention'?bindCaptureRetentionAssessment:bindFeedbackToAssessment;
    const checked=experiences.map(experience=>{
      const binding=binder(board,assessment.task,assessment,experience,memoryHash);
      assert.equal(binding.coverage,'all-legal','Require all-legal unaided ranking');
      return {experience,status:binding.status,score:assessment.rows.find(r=>r.move===experience.move).score};
    });
    if(checked.some(e=>e.status==='unknown')){blocked.push({panelId,reason:'unknown-required-consequence'});continue;}
    const order=(a,b)=>b.score-a.score||a.experience.move.localeCompare(b.experience.move);
    const success=checked.filter(e=>e.status==='success').sort(order)[0];
    const failure=checked.filter(e=>e.status==='failure').sort(order)[0];
    if(!success||!failure){blocked.push({panelId,reason:'missing-balanced-contrast'});continue;}
    const chosen=checked.find(e=>e.experience.move===assessment.choice);
    rows.push({panelId,stage,selectionPresentations:legal.length,success,failure,choiceStatus:chosen?.status??'tie',
      correct:chosen?.status==='success',error:chosen?.status==='failure',
      margin:success.score-failure.score,selections:selectionCounts[panelId]??0,
      assessmentSha256:digest(assessment)});
  }
  // Never silently discard an unresolved stratum to create a balanced block.
  if(blocked.length)return {...base,reason:'registered-panel-not-teachable',blocked};
  const current=rows.filter(r=>r.stage===currentStage);
  if(!current.length)return {...base,reason:'missing-current-stage-panels'};
  const oldest=(a,b)=>a.selections-b.selections||byId(a,b);
  const errors=current.filter(r=>r.error).sort((a,b)=>a.margin-b.margin||oldest(a,b));
  const target=errors[0]??[...current].sort(oldest)[0];
  const earlier=rows.filter(r=>currentStage===1?r.panelId!==target.panelId:r.stage<currentStage);
  if(!earlier.length)return {...base,reason:'missing-earlier-rehearsal-stratum'};
  const sentinel=[...earlier].sort((a,b)=>Number(b.correct)-Number(a.correct)||oldest(a,b))[0];
  const pair=[
    [target,target.failure,target.error?'current-error':'uncovered-pair-practice'],
    [target,target.success,'verified-successful-alternative'],
    [sentinel,sentinel.success,sentinel.correct?'preserve-correct-sentinel':'rehearse-successful-action'],
    [sentinel,sentinel.failure,'rehearse-failed-counterexample'],
  ];
  // Keep state unchanged until the runner acknowledges the entire saved block.
  const nextSelectionCounts=Object.fromEntries([...ids].sort().map(id=>[id,
    (selectionCounts[id]??0)+Number(id===target.panelId)+Number(id===sentinel.panelId)]));
  const plan={...base,ready:true,targetPanelId:target.panelId,sentinelPanelId:sentinel.panelId,
    selectionPresentations:rows.reduce((sum,row)=>sum+row.selectionPresentations,0),
    selectionRule:'Worst current verified-error margin; otherwise oldest registered current pair. Prefer currently correct earlier sentinel, then oldest; Stage1 rehearses a different Stage1 panel.',
    events:pair.map(([row,event,role],index)=>({index,panelId:row.panelId,stage:row.stage,role,
      initialAssessmentSha256:row.assessmentSha256,experience:structuredClone(event.experience)})),
    outcomeCounts:{success:2,failure:2},nextSelectionCounts,
    delivery:'Yoke contexts/actions/proofs/order/timing to all conditions. Reassess every event against current memory; this plan is not a reusable post-update assessment.'};
  return {...plan,planSha256:digest(plan)};
}
