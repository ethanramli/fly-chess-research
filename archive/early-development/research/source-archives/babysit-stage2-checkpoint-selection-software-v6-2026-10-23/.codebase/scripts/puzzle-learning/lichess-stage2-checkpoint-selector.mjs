// Validation-only selection before the explicit retention-training phase.
import assert from 'node:assert/strict';
import {relative} from 'node:path';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {selectCurriculumCheckpoint} from '../../src/puzzle-learning/curriculum-checkpoint-selection.mjs';
import {bindLichessTrainingPanel,bindLichessEvaluationPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';
import {bindLichessStage2AvoidMatePanel} from '../../src/puzzle-learning/lichess-stage2-avoid-mate-panel.mjs';
import {readPinned,rowsFromRefs,panelMap,assessPanels,checkpointPath,restoreCheckpoint,
  publishFrozenSelection,rankingSha256} from './lichess-stage1-acceptance-evaluator.mjs';

export const stage2Strata=['actual-mate','escapable-check','mandatory-defense','misleading-improving-move'];
const conditions=['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled'];
const successful=row=>row.correct&&row.unique&&row.unaided;
const count=rows=>rows.filter(successful).length;

export function loadStage2Panels(root,rowsRef,familiesRef,split){
  const records=rowsFromRefs(root,rowsRef,split);
  const {bytes}=readPinned(root,familiesRef,8*2**20),families=JSON.parse(bytes);
  assert.equal(families.schema,split==='train'?'lichess-stage2-training-families-v1':'lichess-stage2-evaluation-families-v1');
  assert(Array.isArray(families.assignments)&&families.assignments.length>=1&&families.assignments.length<=256);
  const seen=new Set(),panels=families.assignments.map(family=>{
    assert.equal(family.split,split);assert([1,2].includes(family.stage));
    const id=family.lessonId??family.puzzleId;assert(!seen.has(id),'Duplicate Stage 2 lesson assignment');seen.add(id);
    const record=records.byPuzzle.get(id);assert(record,'Evaluation family lies outside pinned rows');
    const binding={...family,registrationSha256:familiesRef.sha256};
    return family.stage===2?bindLichessStage2AvoidMatePanel(record,binding):
      split==='train'?bindLichessTrainingPanel(record,binding):bindLichessEvaluationPanel(record,binding);
  });
  assert.equal(new Set(panels.map(panel=>panel.panelId)).size,panels.length);
  return panels;
}

export function loadStage2ValidationData(registration,root){
  const data=registration.acceptanceData;
  assert.equal(data?.schema,'lichess-stage2-acceptance-data-v1');
  const audit=JSON.parse(readPinned(root,data.audit,8*2**20).bytes);
  assert.equal(audit.schema,'lichess-stage2-acceptance-data-audit-v1');
  for(const key of ['receiverAccepted','eligibleForNeuralTeaching','familySplitsDisjoint','sourceCertificatesReplayed'])
    assert.equal(audit[key],true,`Stage 2 acceptance data denies ${key}`);
  assert.equal(audit.finalSetInspected,false,'Final families must remain sealed before checkpoint selection');
  assert.deepEqual(audit.inputs,{trainingRows:registration.trainingRows.files.map(ref=>ref.sha256),
    trainingFamiliesSha256:registration.trainingFamilies.sha256,
    validationRows:data.validationRows.files.map(ref=>ref.sha256),validationFamiliesSha256:data.validationFamilies.sha256,
    finalRows:data.finalRows.files.map(ref=>ref.sha256),finalFamiliesSha256:data.finalFamilies.sha256});
  const training=loadStage2Panels(root,registration.trainingRows,registration.trainingFamilies,'train');
  const validation=loadStage2Panels(root,data.validationRows,data.validationFamilies,'validation');
  const trainFamilies=new Set(training.map(panel=>panel.familyId));
  assert(validation.every(panel=>!trainFamilies.has(panel.familyId)),'Training and validation families overlap');
  const currentValidation=panelMap(validation,data.panelIds?.validation,16,'validation');
  assert(currentValidation.every(panel=>panel.stage===2));
  assert(stage2Strata.every(stratum=>currentValidation.filter(panel=>panel.stratum===stratum).length===4));
  const earlier=data.retention?.earlierPrinciples;assert(Array.isArray(earlier)&&earlier.length===1);
  assert.equal(earlier[0].stage,1);
  const earlierValidation=panelMap(validation,earlier[0].validationPanelIds,16,'earlier validation');
  const sentinels=panelMap(training,earlier[0].sentinelPanelIds,4,'earlier training sentinels');
  assert([...earlierValidation,...sentinels].every(panel=>panel.stage===1));
  return {training,validation,panels:{currentValidation,
    earlier:[{stage:1,validation:earlierValidation,sentinels}]},dataAuditSha256:data.audit.sha256};
}

export async function selectStage2TrainingCheckpoint({result,registration,repositoryRoot,guard,pace,createEvaluationArm}){
  assert.equal(registration.stage,2);assert.equal(result.stage,2);assert.equal(result.status,'training-complete');
  const loaded=loadStage2ValidationData(registration,repositoryRoot);
  const expected=result.replicas.flatMap(replica=>conditions.map(condition=>`${replica}:${condition}`)).sort();
  assert.deepEqual(result.conditions,conditions);
  const entries=Object.fromEntries(Object.values(result.lineageResults).map(entry=>[entry.lineageKey,entry]));
  assert.equal(Object.keys(entries).length,Object.keys(result.lineageResults).length);
  assert.deepEqual(Object.keys(entries).sort(),expected);
  const selected={},failures=[];
  for(const replica of result.replicas){
    let selectedBlock=null;
    for(const condition of conditions){
      guard();const key=`${replica}:${condition}`,entry=entries[key];
      assert.equal(entry.condition,condition);assert.equal(String(entry.replica),String(replica));
      if(condition!=='informative'&&selectedBlock===null){
        failures.push({lineageKey:key,selection:{status:'unknown',selected:null,
          reason:'Informative arm has no eligible checkpoint'}});continue;
      }
      const runtime=await createEvaluationArm({entry});assert.equal(runtime.identity,entry.identity);
      const brain=runtime.brain,initial=restoreCheckpoint(runtime,checkpointPath(repositoryRoot,entry,0),entry,0,2);
      assert.equal(initial.memorySha256,result.initialMemoryHashes[key]);
      const prior=loaded.panels.earlier[0];
      const baseline=await assessPanels(prior.validation,brain,'validation',guard);
      const baselineSentinels=await assessPanels(prior.sentinels,brain,'train',guard);
      const candidates=[],indexes=condition==='informative'?[8,16,24,32].filter(index=>index<=registration.maxBlocks):
        selectedBlock===null?[]:[selectedBlock];
      for(const index of indexes){
        const path=checkpointPath(repositoryRoot,entry,index),restored=restoreCheckpoint(runtime,path,entry,index,2);
        const current=await assessPanels(loaded.panels.currentValidation,brain,'validation',guard);
        const earlier=await assessPanels(prior.validation,brain,'validation',guard);
        const sentinels=await assessPanels(prior.sentinels,brain,'train',guard);
        candidates.push({blockIndex:index,checkpointSha256:restored.checkpointSha256,memorySha256:restored.memorySha256,
          validationChoices:current.records,validationRankingSha256:rankingSha256(current.assessments),
          earlierPrinciples:[{stage:1,before:count(baseline.records),after:count(earlier.records),
            sentinels:sentinels.records.map(row=>({panelId:row.trialId,correct:successful(row)}))}]});
      }
      let selection=condition==='informative'?selectCurriculumCheckpoint({stage:2,strata:stage2Strata,candidates}):
        candidates.length?{status:'selected',selected:candidates[0],matchedInformativeBlock:selectedBlock}:
          {status:'unknown',selected:null,reason:'Informative arm has no eligible checkpoint'};
      if(condition==='informative'&&(count(baseline.records)<14||count(baselineSentinels.records)!==4))
        selection={...selection,status:'gate-failed',selected:null,reason:'Accepted earlier mastery was not reproduced at the incoming checkpoint'};
      if(selection.status!=='selected')failures.push({lineageKey:key,selection});
      else{
        if(condition==='informative')selectedBlock=selection.selected.blockIndex;
        const candidate=candidates.find(row=>row.blockIndex===selection.selected.blockIndex);
        selected[key]={blockIndex:candidate.blockIndex,
          path:relative(repositoryRoot,checkpointPath(repositoryRoot,entry,candidate.blockIndex)).replaceAll('\\','/'),
          checkpointSha256:candidate.checkpointSha256,memorySha256:candidate.memorySha256,
          validationRankingSha256:candidate.validationRankingSha256,selection};
      }
      await pace(0);guard();
    }
  }
  const record={schema:'lichess-stage2-checkpoint-selection-v1',stage:2,status:failures.length?'gate-failed':'frozen',
    frozen:failures.length===0,matrixIdentity:result.identity,matrixResultSha256:digest(result),
    registrationSha256:result.registrationSha256,dataAuditSha256:loaded.dataAuditSha256,
    validationFamiliesSha256:registration.acceptanceData.validationFamilies.sha256,selected,failures};
  const frozen=publishFrozenSelection(repositoryRoot,entries[expected[0]],record);
  return {status:record.status,selected,checkpointSelection:{schema:record.schema,frozen:record.frozen,
    artifactPath:relative(repositoryRoot,frozen.path).replaceAll('\\','/'),artifactSha256:frozen.sha256,
    selectedMemoryHashes:Object.fromEntries(Object.entries(selected).map(([key,row])=>[key,row.memorySha256]))},
    scope:'Validation and earlier-training sentinels only; no final rows, neural teaching, retention challenge or stage acceptance'};
}
