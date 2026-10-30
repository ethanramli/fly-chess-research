// Read-only measurements of baseline, selected and actual post-interference
// neural memory. Final-test positions and teacher updates are never used here.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {Chess} from 'chess.js';
import {assessLichessEvaluationPanel,assessLichessTrainingPanel} from './lichess-curriculum-panel.mjs';
import {verifiedExperience} from '../search-and-feedback/verified-feedback.mjs';
import {checkCaptureRetentionAction} from '../search-and-feedback/capture-retention-action-domain.mjs';

const HASH=/^[a-f0-9]{64}$/;
const successful=row=>row.correct===true&&row.unique===true&&row.unaided===true;
const identityFields=['familyId','stratum','taskCriterion','positionSha256','boardHistorySha256',
  'candidateSetSha256','certificateSha256'];
const correct=rows=>rows.filter(successful).length;
const identities=rows=>JSON.stringify([...rows].sort((a,b)=>a.trialId.localeCompare(b.trialId))
  .map(row=>[row.trialId,...identityFields.map(field=>row[field])]));

function validRows(rows,count,memorySha256){
  return Array.isArray(rows)&&rows.length===count&&new Set(rows.map(row=>row?.trialId)).size===count
    &&rows.every(row=>typeof row?.trialId==='string'&&identityFields.every(field=>
      field.endsWith('Sha256')?HASH.test(row[field]??''):typeof row[field]==='string')
      &&row.memorySha256===memorySha256&&['correct','unique','unaided'].every(field=>typeof row[field]==='boolean'));
}

export function evaluatePostInterferenceRetention(observation){
  const shell={schema:'curriculum-post-interference-gate-v1',retentionPassed:false};
  const unknown=reason=>({...shell,status:'unknown',reason});
  const {stage,memoryHashes,current,earlier}=observation??{};
  if(!Number.isSafeInteger(stage)||stage<2||stage>12||!memoryHashes
    ||['baseline','selected','post'].some(key=>!HASH.test(memoryHashes[key]??'')))
    return unknown('Stage or observed memory identities are incomplete');
  if(!validRows(current?.selected,16,memoryHashes.selected)||!validRows(current?.post,16,memoryHashes.post)
    ||identities(current.selected)!==identities(current.post))
    return unknown('Current validation positions, tasks, candidates or certificates are not identical across memories');
  const strata=[...new Set(current.selected.map(row=>row.stratum))];
  if(strata.length!==4||strata.some(stratum=>current.selected.filter(row=>row.stratum===stratum).length!==4))
    return unknown('Current validation does not cover four trials in each of four strata');
  if(!Array.isArray(earlier)||earlier.length!==stage-1||earlier.some((item,index)=>item.stage!==index+1))
    return unknown('Every earlier chess foundation must be measured');
  for(const item of earlier){
    for(const [phase,memoryKey] of [['baseline','baseline'],['before','selected'],['after','post']]){
      if(!validRows(item[phase]?.validation,16,memoryHashes[memoryKey])
        ||!validRows(item[phase]?.sentinels,4,memoryHashes[memoryKey]))
        return unknown('Earlier validation and four training sentinels are missing or use another memory');
    }
    for(const group of ['validation','sentinels']){
      const expected=identities(item.baseline[group]);
      if(expected!==identities(item.before[group])||expected!==identities(item.after[group]))
        return unknown('Earlier-foundation positions or certificates changed across measurement');
    }
  }
  const metrics={currentBefore:correct(current.selected),currentAfter:correct(current.post),
    earlier:earlier.map(item=>({stage:item.stage,baseline:correct(item.baseline.validation),
      before:correct(item.before.validation),after:correct(item.after.validation),
      baselineSentinels:correct(item.baseline.sentinels),beforeSentinels:correct(item.before.sentinels),
      afterSentinels:correct(item.after.sentinels)}))};
  const checks={selectedCurrentValidation:metrics.currentBefore>=14&&strata.every(stratum=>
    current.selected.filter(row=>row.stratum===stratum&&successful(row)).length>=3),
    currentValidationRetained:metrics.currentAfter>=14,
    earlierMasteryReproduced:metrics.earlier.every(row=>row.baseline>=14&&row.baselineSentinels===4),
    earlierValidationRetained:metrics.earlier.every(row=>row.before>=row.baseline&&row.after>=row.before),
    earlierSentinelsRetained:metrics.earlier.every(row=>row.beforeSentinels===4&&row.afterSentinels===4)};
  const failed=Object.keys(checks).filter(key=>!checks[key]);
  return {...shell,status:failed.length?'gate-failed':'passed',retentionPassed:failed.length===0,
    checks,failed,metrics,scope:'Computational validation/sentinel retention after independently replayed interference; not elapsed-time biological retention or final transfer'};
}

function panelSet(panels,count,split,stage){
  assert(Array.isArray(panels)&&panels.length===count);
  assert.equal(new Set(panels.map(panel=>panel.panelId)).size,count);
  assert(panels.every(panel=>panel.stage===stage&&panel.split===split),
    'Retention measurements use registered validation and earlier training sentinels only');
}

export async function observePostInterferenceRetention({stage,replica,condition,brain,
  baselineMemory,selectedMemory,postMemory,panels,guard}){
  assert(Number.isSafeInteger(stage)&&stage>=2&&stage<=12);
  assert.equal(typeof guard,'function');
  panelSet(panels?.currentValidation,16,'validation',stage);
  assert(Array.isArray(panels.earlier)&&panels.earlier.length===stage-1);
  for(const [index,item] of panels.earlier.entries()){
    assert.equal(item.stage,index+1);panelSet(item.validation,16,'validation',item.stage);
    panelSet(item.sentinels,4,'train',item.stage);
  }
  const memoryHashes={baseline:digest(baselineMemory),selected:digest(selectedMemory),post:digest(postMemory)};
  const original=brain.memory.snapshot(),beforeCount=brain.presentations;
  async function assess(set){
    const records=[];
    for(const panel of set){
      guard();
      const {assessment}=panel.split==='train'?await assessLichessTrainingPanel(panel,brain)
        :await assessLichessEvaluationPanel(panel,brain);
      const board=new Chess();board.loadPgn(panel.context.pgn);assert.equal(board.fen(),panel.context.fen);
      assert.deepEqual(panel.experiences.map(row=>row.move).sort(),assessment.rows.map(row=>row.move).sort());
      for(const experience of panel.experiences){
        const checked=panel.context.task.objective==='capture-retention'
          ?checkCaptureRetentionAction(board,experience.move,panel.context.task,experience.proof)
          :verifiedExperience(board,experience.move,panel.context.task,experience.proof);
        assert.equal(checked.learningAllowed,true,'Unknown consequence invalidates retention measurement');
        assert.equal(checked.status,experience.status);assert.equal(checked.certificateSha256,experience.certificateSha256);
      }
      const chosen=assessment.choice,unique=typeof chosen==='string';
      records.push({trialId:panel.panelId,familyId:panel.familyId,stratum:panel.stratum,
        taskCriterion:panel.context.task.objective,memorySha256:assessment.memoryHash,
        positionSha256:digest({fen:panel.context.fen,task:panel.context.task}),
        boardHistorySha256:createHash('sha256').update(panel.context.pgn).digest('hex'),
        candidateSetSha256:digest(assessment.rows.map(row=>row.move).sort()),
        certificateSha256:digest(panel.experiences.map(row=>[row.move,row.certificateSha256]).sort(([a],[b])=>a.localeCompare(b))),
        selectedAction:chosen,correct:unique&&panel.experiences.some(row=>row.move===chosen&&row.status==='success'),
        unique,unaided:true,rankingSha256:digest(assessment.rows)});
    }
    return records;
  }
  const earlier=panels.earlier.map(item=>({stage:item.stage})),current={};
  try{
    for(const [phase,memory,memoryKey] of [['baseline',baselineMemory,'baseline'],
      ['before',selectedMemory,'selected'],['after',postMemory,'post']]){
      guard();brain.memory.restore(memory);assert.equal(brain.memoryFingerprint(),memoryHashes[memoryKey]);
      if(phase!=='baseline')current[phase==='before'?'selected':'post']=await assess(panels.currentValidation);
      for(const [index,item] of panels.earlier.entries())earlier[index][phase]={
        validation:await assess(item.validation),sentinels:await assess(item.sentinels)};
      assert.equal(brain.memoryFingerprint(),memoryHashes[memoryKey],'Retention observation altered persistent memory');
    }
    guard();
  }catch(error){brain.memory.restore(original);brain.presentations=beforeCount;throw error;}
  const observation={schema:'curriculum-post-interference-observations-v1',stage,replica,condition,memoryHashes,current,earlier};
  return {...observation,gate:evaluatePostInterferenceRetention(observation)};
}
