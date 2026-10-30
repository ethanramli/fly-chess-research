// Stage 1 acceptance evaluator v3, validation-only (2026-10-28, ledger L056-L057). Evaluator v2 with the
// final-set section made unreachable: after the validation-only checkpoint selection it always returns,
// never opening final rows or family files, and adds a per-lineage validation summary (the informative
// arm's selected or last candidate and each matched control at that block; D1 and D2 counts) for
// engineering smokes. A smoke must not spend the sealed final test. Evaluator v2 header follows.
// Stage 1 acceptance evaluator v2 (2026-10-27): the v1 evaluator (pinned by earlier registrations)
// for the outcome-only protocol. Its registered arms are informative (verified task pulses only),
// absent, disabled and outcome-shuffled. It derives the same D1-D8 observations from the same
// data and does not evaluate the Stockfish-assistance arms (D9 does not apply). v1 header follows.
// Independent Stage 1 observations. Validation chooses and durably freezes
// checkpoints before this module opens any final-set row or family file.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,readFileSync} from 'node:fs';
import {dirname,join,relative,resolve,isAbsolute} from 'node:path';
import {decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {fixedStateHash} from '../../src/neural-learning/association-validation.mjs';
import {bindLichessEvaluationPanel,bindLichessTrainingPanel,assessLichessEvaluationPanel,assessLichessTrainingPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';
import {selectCurriculumCheckpoint} from '../../src/puzzle-learning/curriculum-checkpoint-selection.mjs';
import {provisionalMBONValue} from '../../src/search-and-feedback/stockfish-target.mjs';

const HASH=/^[a-f0-9]{64}$/;
const STRATA=['open-defender','blocked-defender','absent-defender','pinned-apparent-defender'];
const CONDITIONS=['informative','absent','disabled','shuffled'];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const actionId=move=>move.from+move.to+(move.promotion??'');

// Shared read-only mechanics; stage-specific data binders and gates stay separate.
export {readPinned,rowsFromRefs,panelMap,assessPanels,checkpointPath,restoreCheckpoint,
  publishFrozenSelection,rankingSha256};

function inside(root,path){
  const target=resolve(root,path),rel=relative(resolve(root),target);
  assert(rel===''||!rel.startsWith('..')&&!isAbsolute(rel),'Evaluator path escapes the repository');
  return target;
}

function readPinned(root,ref,maxBytes){
  assert(typeof ref?.path==='string'&&/^[A-Za-z0-9._/-]+$/.test(ref.path));
  assert(HASH.test(ref.sha256??''));
  const path=inside(root,ref.path),bytes=readFileSync(path);
  assert(bytes.length<=maxBytes,`Pinned evaluator input exceeds ${maxBytes} bytes`);
  assert.equal(sha256(bytes),ref.sha256,`Pinned evaluator input changed: ${ref.path}`);
  return {path,bytes};
}

function rowsFromRefs(root,group,split){
  assert(group&&typeof group==='object');
  assert(Array.isArray(group.files)&&group.files.length>=1&&group.files.length<=8);
  const records=[];
  for(const ref of group.files){
    const {bytes}=readPinned(root,ref,16*2**20);
    for(const line of bytes.toString('utf8').split(/\r?\n/))if(line){
      const row=JSON.parse(line);assert.equal(row.split,split);records.push(row);
    }
  }
  const byPuzzle=new Map();
  for(const record of records){
    assert.equal(record.lesson?.puzzleId,record.history?.puzzleId);
    const lessonId=record.lesson.lessonId??record.lesson.puzzleId;
    assert(typeof lessonId==='string'&&lessonId.length>0);
    assert(!byPuzzle.has(lessonId),'Duplicate task lesson row');
    byPuzzle.set(lessonId,record);
  }
  return {byPuzzle,refs:group.files.map(ref=>ref.sha256)};
}

function bindPanels(root,records,familyRef,split){
  const {bytes}=readPinned(root,familyRef,8*2**20),familyDoc=JSON.parse(bytes);
  assert.equal(familyDoc.schema,split==='train'
    ?'lichess-stage1-training-families-v1':'lichess-stage1-evaluation-families-v1');
  assert(Array.isArray(familyDoc.assignments)&&familyDoc.assignments.length>0&&familyDoc.assignments.length<=256);
  const registrationSha256=sha256(bytes),seen=new Set();
  const panels=familyDoc.assignments.map(family=>{
    assert.equal(family.split,split);assert.equal(family.stage,1);
    const lessonId=family.lessonId??family.puzzleId;
    assert(!seen.has(lessonId),'Duplicate family assignment');seen.add(lessonId);
    const record=records.byPuzzle.get(lessonId);assert(record,'Family points outside its pinned row set');
    const bound=split==='train'
      ?bindLichessTrainingPanel(record,{...family,registrationSha256})
      :bindLichessEvaluationPanel(record,{...family,registrationSha256});
    return bound;
  });
  assert.equal(new Set(panels.map(panel=>panel.panelId)).size,panels.length,'Duplicate panel identity');
  return {panels,familyRegistrationSha256:registrationSha256};
}

function panelMap(panels,ids,count,split){
  assert(Array.isArray(ids)&&ids.length===count&&new Set(ids).size===count,
    `Require exactly ${count} pre-registered ${split} panel IDs`);
  const map=new Map(panels.map(panel=>[panel.panelId,panel]));
  return ids.map(id=>{const panel=map.get(id);assert(panel,`Missing registered ${split} panel ${id}`);return panel;});
}

function choiceRecord(panel,assessment){
  const outcomes=new Map(panel.experiences.map(row=>[row.move,row.status]));
  const unique=typeof assessment.choice==='string';
  return {trialId:panel.panelId,familyId:panel.familyId,stratum:panel.stratum,
    taskCriterion:panel.taskCriterion,positionSha256:digest({fen:panel.context.fen,task:panel.context.task}),
    boardHistorySha256:sha256(Buffer.from(panel.context.pgn)),
    candidateSetSha256:digest(assessment.rows.map(row=>row.move).sort()),
    certificateSha256:digest(panel.experiences.map(row=>[row.move,row.certificateSha256]).sort((a,b)=>a[0].localeCompare(b[0]))),
    selectedAction:unique?assessment.choice:null,correct:unique&&outcomes.get(assessment.choice)==='success',
    unique,unaided:true};
}

function rankingSha256(assessments){
  return digest([...assessments.entries()].sort(([a],[b])=>a.localeCompare(b))
    .map(([panelId,row])=>[panelId,row.assessment.rows]));
}

async function assessPanels(panels,brain,split,guard){
  const records=[],assessments=new Map();
  for(const panel of panels){
    guard();
    const result=split==='train'?await assessLichessTrainingPanel(panel,brain)
      :await assessLichessEvaluationPanel(panel,brain);
    const record=choiceRecord(panel,result.assessment);
    records.push(record);assessments.set(panel.panelId,{panel,record,assessment:result.assessment});
  }
  return {records,assessments};
}

// A resumed lineage keeps earlier stage checkpoints in its parent attempts. The
// lineage result's history records each block's starting checkpoint and hash.
function checkpointPath(root,entry,index){
  const direct=join(inside(root,entry.attempt),`stage-checkpoint-${String(index).padStart(3,'0')}.json.gz`);
  if(existsSync(direct))return direct;
  const lineage=JSON.parse(readFileSync(inside(root,entry.resultPath??join(entry.attempt,'result.json')),'utf8'));
  assert(Array.isArray(lineage.history)&&Number.isSafeInteger(index)&&index>=0&&index<=lineage.history.length,
    `Missing complete checkpoint ${index}`);
  const row=lineage.history[index],path=inside(root,row?row.stageStartCheckpoint:lineage.checkpoint);
  assert(existsSync(path),`Missing complete checkpoint ${index}`);
  if(row)assert.equal(sha256(readFileSync(path)),row.stageStartCheckpointSha256,`Stage checkpoint ${index} changed`);
  return path;
}

function restoreCheckpoint(runtime,path,entry,index,stage=1){
  const saved=decodeCheckpoint(readFileSync(path));
  assert.equal(saved.schema,'lichess-curriculum-stage-v1');
  assert.equal(saved.identity,entry.identity);assert.equal(saved.lineageKey,entry.lineageKey);
  assert.equal(saved.condition,entry.condition);assert.equal(saved.stage,stage);
  assert.equal(saved.block.completedBlocks,index);assert.equal(saved.history.length,index);
  assert.equal(saved.memorySha256,digest(saved.block.session.memory));
  assert(Number.isSafeInteger(saved.block.session.presentationCount)&&saved.block.session.presentationCount>=0);
  runtime.brain.memory.restore(saved.block.session.memory);
  runtime.brain.presentations=saved.block.session.presentationCount;
  assert.equal(runtime.brain.memoryFingerprint(),saved.memorySha256,'Evaluation memory restore changed the checkpoint');
  return {saved,checkpointSha256:sha256(readFileSync(path)),memorySha256:saved.memorySha256};
}

function publishFrozenSelection(root,entry,record){
  const matrixDir=inside(root,resolve(entry.attempt,'..','..'));
  assert(relative(root,matrixDir).split(/[\\/]/)[0]==='runs','Selection artifact must stay in runs/');
  const directory=join(matrixDir,'acceptance'),path=join(directory,'checkpoint-selection.json');
  mkdirSync(directory,{recursive:true});
  const bytes=Buffer.from(JSON.stringify(record));
  if(existsSync(path)){
    assert.deepEqual(readFileSync(path),bytes,'Frozen checkpoint selection changed; preserve and register a new run');
  }else{
    const partial=path+'.partial',fd=openSync(partial,'wx');
    try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(partial,path);
  }
  return {path,sha256:sha256(bytes)};
}

function validateDataAudit(root,data,trainingRows,trainingFamilies){
  const {bytes}=readPinned(root,data.audit,8*2**20),audit=JSON.parse(bytes);
  assert.equal(audit.schema,'lichess-stage1-acceptance-data-audit-v1');
  assert.equal(audit.eligibleForNeuralTeaching,true);
  assert.equal(audit.familySplitsDisjoint,true);
  assert.equal(audit.sourceCertificatesReplayed,true);
  // Receiver acceptance (G0) is an acceptance prerequisite, reported as false
  // until G0 passes; it does not block deriving the learning observations.
  assert.equal(typeof audit.receiverAccepted,'boolean');
  assert.equal(audit.finalSetInspected,false,'Final data must remain sealed before checkpoint freeze');
  assert.deepEqual(audit.inputs,{trainingRows:trainingRows.refs,trainingFamiliesSha256:trainingFamilies.sha256,
    validationRows:data.validationRows.files.map(ref=>ref.sha256),validationFamiliesSha256:data.validationFamilies.sha256,
    finalRows:data.finalRows.files.map(ref=>ref.sha256),finalFamiliesSha256:data.finalFamilies.sha256});
  return {audit,sha256:data.audit.sha256};
}

function observationShell(result,lineageAudits,prerequisites,evidenceByReplica){
  return result.replicas.map((replica,index)=>{
    const replicaKey=String(replica),keys=result.conditions.map(condition=>`${replica}:${condition}`).sort();
    const initialMemoryHashes={},finalMemoryHashes={};
    for(const key of keys){const audit=lineageAudits[key];assert(audit);
      initialMemoryHashes[key]=audit.initialMemoryHashes[key];finalMemoryHashes[key]=audit.finalMemoryHashes[key];}
    return {replica:replicaKey,initialMemoryHashes,finalMemoryHashes,
      evidence:{prerequisites:{...prerequisites},...(evidenceByReplica?.[replicaKey]??{})}};
  });
}

/**
 * Evaluate a registered Stage 1 matrix. The final split is not read until all
 * validation-only checkpoint selections have been atomically published.
 */
export async function deriveStage1AcceptanceObservations({result,lineageAudits,registration,
  repositoryRoot,guard,pace,createEvaluationArm}){
  assert.equal(registration?.stage,1);assert.equal(typeof guard,'function');
  assert.equal(typeof pace,'function');assert.equal(typeof createEvaluationArm,'function');
  const data=registration.acceptanceData;
  assert.equal(data?.schema,'lichess-stage1-acceptance-data-v1');
  const trainingRows=rowsFromRefs(repositoryRoot,registration.trainingRows,'train');
  const trainingFamilies={sha256:registration.trainingFamilies.sha256};
  const {panels:trainingPanels,familyRegistrationSha256:trainingFamilySha256}=bindPanels(
    repositoryRoot,trainingRows,registration.trainingFamilies,'train');
  assert.equal(trainingFamilySha256,trainingFamilies.sha256);
  const auditInfo=validateDataAudit(repositoryRoot,data,trainingRows,trainingFamilies);
  const validationRows=rowsFromRefs(repositoryRoot,data.validationRows,'validation');
  const validationBound=bindPanels(repositoryRoot,validationRows,data.validationFamilies,'validation');
  const trainingIds=panelMap(trainingPanels,data.panelIds?.training,24,'training');
  const validationIds=panelMap(validationBound.panels,data.panelIds?.validation,16,'validation');
  assert(STRATA.every(stratum=>validationIds.filter(panel=>panel.stratum===stratum).length===4));
  const trainFamilyIds=new Set(trainingPanels.map(panel=>panel.familyId));
  const validationFamilyIds=new Set(validationBound.panels.map(panel=>panel.familyId));
  assert([...trainFamilyIds].every(id=>!validationFamilyIds.has(id)),'Training and validation families overlap');

  const expected=result.replicas.flatMap(replica=>result.conditions.map(condition=>`${replica}:${condition}`)).sort();
  // Matrix publications use replica/condition keys; receipt lineage identities
  // use replica:condition. Index by the verified entry, without rewriting result.
  const entries=Object.values(result.lineageResults);
  const lineageResults=Object.fromEntries(entries.map(entry=>[entry.lineageKey,entry]));
  assert.equal(Object.keys(lineageResults).length,entries.length,'Duplicate matrix lineage identity');
  assert.deepEqual(Object.keys(lineageResults).sort(),expected);
  assert.deepEqual(Object.keys(lineageAudits).sort(),expected);
  assert.deepEqual(result.conditions.slice().sort(),CONDITIONS.slice().sort());
  const lineages={},selectionFailures=[];
  for(const replica of result.replicas){
    const baselineEntry=lineageResults[`${replica}:informative`];
    const runtime=await createEvaluationArm({entry:baselineEntry});
    assert.equal(runtime.identity,baselineEntry.identity);
    let selectedBlock=null;
    for(const condition of CONDITIONS){
      const key=`${replica}:${condition}`,entry=lineageResults[key];
      guard();assert.equal(entry.lineageKey,key);assert.equal(entry.condition,condition);
      assert.equal(String(entry.replica),String(replica));
      const lineageAudit=lineageAudits[key];assert.equal(lineageAudit.fullNeuralReplay,true);
      assert.equal(lineageAudit.memoryContinuityVerified,true);
      const candidates=[],trainingByBlock=[];
      const indexes=condition==='informative'?[8,16,24,32].filter(index=>index<=registration.maxBlocks)
        :selectedBlock===null?[]:[selectedBlock];
      // Diagnosis only: informative unaided training choices from scratch onward
      // separate failed acquisition from failed transfer. Selection ignores them.
      for(const index of condition==='informative'?[0,...indexes]:indexes){
        const path=checkpointPath(repositoryRoot,entry,index),restored=restoreCheckpoint(runtime,path,entry,index);
        if(condition==='informative'){
          const trained=await assessPanels(trainingIds,runtime.brain,'train',guard);
          trainingByBlock.push({blockIndex:index,correct:trained.records.filter(row=>row.correct).length});
          if(index===0)continue;
        }
        const assessed=await assessPanels(validationIds,runtime.brain,'validation',guard);
        candidates.push({blockIndex:index,checkpointSha256:restored.checkpointSha256,
          memorySha256:restored.memorySha256,validationChoices:assessed.records,
          validationRankingSha256:rankingSha256(assessed.assessments)});
      }
      // After a failed informative selection, score each control's training boards at
      // the informative arm's last checkpoint so the stop diagnosis is causal.
      const lastInformative=Math.max(...[8,16,24,32].filter(index=>index<=registration.maxBlocks));
      if(condition!=='informative'&&selectedBlock===null&&Number.isFinite(lastInformative)){
        restoreCheckpoint(runtime,checkpointPath(repositoryRoot,entry,lastInformative),entry,lastInformative);
        const trained=await assessPanels(trainingIds,runtime.brain,'train',guard);
        trainingByBlock.push({blockIndex:lastInformative,correct:trained.records.filter(row=>row.correct).length});
      }
      const selection=condition==='informative'
        ?selectCurriculumCheckpoint({stage:1,strata:STRATA,candidates})
        :candidates.length?{schema:'matched-control-checkpoint-selection-v1',status:'selected',
          selected:candidates[0],matchedInformativeBlock:selectedBlock}
          :{schema:'matched-control-checkpoint-selection-v1',status:'unknown',selected:null,
            reason:'Informative arm has no eligible published checkpoint'};
      if(selection.status!=='selected')selectionFailures.push({lineageKey:key,selection,
        trainingByBlock:trainingByBlock.length?trainingByBlock:null});
      else{
        if(condition==='informative')selectedBlock=selection.selected.blockIndex;
        const candidate=candidates.find(row=>row.blockIndex===selection.selected.blockIndex);
        lineages[key]={entry,selection,checkpointPath:checkpointPath(repositoryRoot,entry,selection.selected.blockIndex),
          checkpointSha256:selection.selected.checkpointSha256,memorySha256:selection.selected.memorySha256,
          selectedChoices:candidate.validationChoices,selectedRankingSha256:candidate.validationRankingSha256};
      }
      await pace(0);guard();
    }
    runtime.block=null;runtime.brain=null;runtime.constructed=null;runtime.graph=null;
    runtime.memory=null;runtime.assets=null;runtime.panelReviews=null;
  }

  const selectionRecord={schema:'lichess-stage1-checkpoint-selection-v1',stage:1,
    matrixIdentity:result.identity,matrixResultSha256:digest(result),registrationSha256:result.registrationSha256,
    dataAuditSha256:auditInfo.sha256,validationFamilySha256:validationBound.familyRegistrationSha256,
    status:selectionFailures.length?'gate-failed':'frozen',frozen:selectionFailures.length===0,
    selectionFailures,selected:Object.fromEntries(Object.entries(lineages).map(([key,row])=>[key,
      {blockIndex:row.selection.selected.blockIndex,checkpointSha256:row.checkpointSha256,
        memorySha256:row.memorySha256,validationRankingSha256:row.selectedRankingSha256,
        selection:row.selection}]))};
  const firstEntry=lineageResults[expected[0]],frozen=publishFrozenSelection(repositoryRoot,firstEntry,selectionRecord);
  const checkpointSelection={schema:selectionRecord.schema,frozen:selectionRecord.frozen,
    artifactPath:relative(repositoryRoot,frozen.path).replaceAll('\\','/'),artifactSha256:frozen.sha256,
    selectedMemoryHashes:Object.fromEntries(Object.entries(lineages).map(([key,row])=>[key,row.memorySha256]))};
  const prerequisites={receiverAccepted:auditInfo.audit.receiverAccepted,
    familySplitsDisjoint:auditInfo.audit.familySplitsDisjoint,
    sourceCertificatesReplayed:auditInfo.audit.sourceCertificatesReplayed,
    finalSetSealedUntilFreeze:selectionRecord.frozen};
  const validationSummary=Object.fromEntries(Object.entries(lineages).map(([key,row])=>{
    const byStratum=Object.fromEntries(STRATA.map(stratum=>[stratum,row.selectedChoices.filter(c=>c.stratum===stratum&&c.correct).length]));
    return [key,{blockIndex:row.selection.selected.blockIndex,validationCorrect:row.selectedChoices.filter(c=>c.correct).length,
      validationPanels:row.selectedChoices.length,byStratum}];}));
  {
    return {schema:'lichess-stage1-acceptance-observations-v1',stage:1,
      matrixResultSha256:digest(result),registrationSha256:result.registrationSha256,
      replicas:observationShell(result,lineageAudits,prerequisites),checkpointSelection,validationOnly:true,validationSummary,
      selectionFailures:selectionFailures.map(({lineageKey,selection,trainingByBlock})=>({lineageKey,status:selection.status,
        reason:selection.reason??null,candidates:(selection.candidates??[]).map(row=>({blockIndex:row.blockIndex,
          correct:row.correct,byStratum:row.byStratum})),trainingByBlock}))};
  }

  // Only this point may open final rows or family assignments.
  const finalRows=rowsFromRefs(repositoryRoot,data.finalRows,'final');
  const finalBound=bindPanels(repositoryRoot,finalRows,data.finalFamilies,'final');
  const finalPanels=panelMap(finalBound.panels,data.panelIds?.final,64,'final');
  assert(STRATA.every(stratum=>finalPanels.filter(panel=>panel.stratum===stratum).length===16));
  const finalFamilyIds=new Set(finalPanels.map(panel=>panel.familyId));
  assert.equal(finalFamilyIds.size,8);assert([...finalFamilyIds].every(id=>!trainFamilyIds.has(id)&&!validationFamilyIds.has(id)));

  const evidenceByReplica={};
  for(const replica of result.replicas){
    guard();const replicaKey=String(replica);
    async function evaluateLineage(runtime,condition,index=null){
      const key=`${replica}:${condition}`,row=lineages[key];assert(row,`No validation-selected checkpoint for ${key}`);
      const entry=row.entry;
      const path=index===null?row.checkpointPath:checkpointPath(repositoryRoot,entry,index);
      const restored=restoreCheckpoint(runtime,path,entry,index===null
        ?decodeCheckpoint(readFileSync(path)).block.completedBlocks:index);
      const resultRows=await assessPanels(finalPanels,runtime.brain,'final',guard);
      const invariant=fixedStateHash(runtime.constructed.model,runtime.constructed.memory.edges);
      return {entry,restored,...resultRows,invariant};
    }
    const baselineEntry=lineageResults[`${replica}:informative`];
    const runtime=await createEvaluationArm({entry:baselineEntry});
    assert.equal(runtime.identity,baselineEntry.identity);
    const treatment=await evaluateLineage(runtime,'informative');
    const finalChoices=treatment.records;
    const controls={};const invariants=[treatment.invariant];
    const scratch=await evaluateLineage(runtime,'informative',0);controls.scratch=scratch.records;invariants.push(scratch.invariant);
    for(const name of ['absent','shuffled','disabled']){
      const arm=await evaluateLineage(runtime,name);controls[name]=arm.records;invariants.push(arm.invariant);
    }

    // Return to the selected treatment checkpoint for training and value probes.
    restoreCheckpoint(runtime,lineages[`${replica}:informative`].checkpointPath,baselineEntry,
      lineages[`${replica}:informative`].selection.selected.blockIndex);
    const trainingEval=await assessPanels(trainingIds,runtime.brain,'train',guard);
    const validationSelected=lineages[`${replica}:informative`].selectedChoices;
    // Policy B (researcher decision 2026-10-24): Stage 1 D7 is not measured here
    // (no G0 interference); Stage 2's cumulative retention gate rechecks Stage 1.
    // End-of-acquisition validation is not a substitute retention measurement.
    const retention=null,retentionDeferral='stage1-d7-rechecked-by-stage2-v1';
    const retentionUnavailable='Stage 1 D7 is deferred to the Stage 2 cumulative retention gate (policy B)';

    const treatmentAssessments=treatment.assessments;
    assert(Array.isArray(data.probeActions)&&data.probeActions.length===128);
    const probeKeys=new Set(data.probeActions.map(probe=>`${probe.panelId}:${probe.actionId}`));
    assert.equal(probeKeys.size,128,'Duplicate consequence probe action');
    const probesPerPanel=new Map();
    for(const probe of data.probeActions)probesPerPanel.set(probe.panelId,(probesPerPanel.get(probe.panelId)??0)+1);
    assert.equal(probesPerPanel.size,64);
    assert([...probesPerPanel.values()].every(count=>count===2),'Require two consequence probes per final board');
    const consequenceProbes=data.probeActions.map(probe=>{
      const board=treatmentAssessments.get(probe.panelId);assert(board,'Consequence probe board missing');
      const experience=board.panel.experiences.find(row=>row.move===probe.actionId);assert(experience,'Probe action lacks certificate');
      assert(['success','failure'].includes(experience.status));
      const action=board.assessment.rows.find(row=>row.move===probe.actionId);assert(action,'Probe action absent from all-legal ranking');
      const value=provisionalMBONValue(action,runtime.brain.valueConfig.valueScale);
      return {boardId:probe.panelId,actionId:probe.actionId,
        positionSha256:digest({fen:board.panel.context.fen,task:board.panel.context.task}),
        boardHistorySha256:sha256(Buffer.from(board.panel.context.pgn)),
        expectedSign:experience.status==='success'?1:-1,predictedSign:value===null?0:Math.sign(value),
        certificateSha256:experience.certificateSha256};
    });

    assert(Array.isArray(data.counterfactualPairs)&&data.counterfactualPairs.length===32);
    const counterfactualPairs=data.counterfactualPairs.map(pair=>{
      const first=treatmentAssessments.get(pair.firstPanelId),second=treatmentAssessments.get(pair.secondPanelId);
      assert(first&&second&&pair.firstPanelId!==pair.secondPanelId
        &&first.panel.familyId===pair.familyId&&second.panel.familyId===pair.familyId);
      assert(Array.isArray(pair.actionIds)&&pair.actionIds.length===2&&new Set(pair.actionIds).size===2);
      const outcome=(panel,id)=>panel.experiences.find(row=>row.move===id)?.status;
      const [a,b]=pair.actionIds,firstA=outcome(first.panel,a),firstB=outcome(first.panel,b);
      const secondA=outcome(second.panel,a),secondB=outcome(second.panel,b);
      const reversed=['success','failure'].includes(firstA)&&['success','failure'].includes(firstB)
        &&firstA!==firstB
        &&secondA===firstB&&secondB===firstA;
      return {pairId:pair.pairId,familyId:pair.familyId,
        first:first.record,second:second.record,probeOrderingReversed:reversed};
    });

    const scratchCorrect=controls.scratch.filter(row=>row.correct&&row.unique&&row.unaided).length;
    const informativeCorrect=finalChoices.filter(row=>row.correct&&row.unique&&row.unaided).length;
    const stateAudit={removalLosesAcquiredAdvantage:informativeCorrect>scratchCorrect,
      restoreReproducesIdenticalRankings:true,
      fixedIdentitiesUnchanged:invariants.every(value=>value===runtime.constructed.invariant),
      certificateAndUpdateReplay:expected.every(key=>lineageAudits[key].fullNeuralReplay===true),
      pendingReceiptExactlyOnce:expected.every(key=>lineageAudits[key].fullNeuralReplay===true),
      unaidedAndSearchSeparated:[...treatmentAssessments.values()].every(row=>row.record.unaided)};
    // A second read of the selected validation panels proves that read-only
    // evaluation reproduces the same ranking without changing persistent memory.
    restoreCheckpoint(runtime,lineages[`${replica}:informative`].checkpointPath,baselineEntry,
      lineages[`${replica}:informative`].selection.selected.blockIndex);
    const repeated=await assessPanels(validationIds,runtime.brain,'validation',guard);
    stateAudit.restoreReproducesIdenticalRankings=rankingSha256(repeated.assessments)
      ===lineages[`${replica}:informative`].selectedRankingSha256;
    const evidence={prerequisites:{...prerequisites,finalSetSealedUntilFreeze:true},
      trainingChoices:trainingEval.records,validationChoices:validationSelected,finalChoices,
      consequenceProbes,counterfactualPairs,controls,retention,retentionDeferral,retentionUnavailable,stateAudit};
    evidenceByReplica[replicaKey]=evidence;
    runtime.block=null;runtime.brain=null;runtime.constructed=null;runtime.graph=null;
    runtime.memory=null;runtime.assets=null;runtime.panelReviews=null;
    await pace(0);guard();
  }
  return {schema:'lichess-stage1-acceptance-observations-v1',stage:1,
    matrixResultSha256:digest(result),registrationSha256:result.registrationSha256,
    replicas:observationShell(result,lineageAudits,prerequisites,evidenceByReplica),
    promotionMemoryHashes:checkpointSelection.selectedMemoryHashes,checkpointSelection,
    dataAuditSha256:auditInfo.sha256,validationFamilySha256:validationBound.familyRegistrationSha256,
    finalFamilySha256:finalBound.familyRegistrationSha256,
    scope:'Independent Stage 1 all-legal choices, validation-only checkpoint freeze, final counterfactual and control observations; biological and cross-domain reasoning are not inferred'};
}
