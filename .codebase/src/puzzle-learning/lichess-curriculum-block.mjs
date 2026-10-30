// Connect audited Lichess training panels to the existing rehearsal block runner.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,copyFileSync} from 'node:fs';
import {join} from 'node:path';
import {encodeCheckpoint,decodeCheckpoint} from '../runtime/checkpoint-codec.mjs';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {planCurriculumRehearsalBlock} from './curriculum-rehearsal-plan.mjs';
import {runCurriculumBlock} from './curriculum-block-runner.mjs';
import {assessLichessTrainingPanel} from './lichess-curriculum-panel.mjs';

const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const contextKey=context=>digest({fen:context.fen,pgn:context.pgn,task:context.task,
  historyKind:context.historyKind??'standard-start-pgn',parentSourceRecordSha256:context.parentSourceRecordSha256??null});
const fileSha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

export async function runLichessCurriculumBlock({panels,block,brain,familyRegistrationSha256,
  identity,outputDir,resumeFrom=null,plan=null,planFamilyRegistrationSha256=null,
  shuffledStatuses=null,guard,pace}){
  assert(isHash(familyRegistrationSha256),'Require pinned family registration');
  assert(isHash(identity),'Require pinned block identity');
  assert.equal(brain?.memory,block?.session?.memory,'Assessment and feedback must share persistent memory');
  assert.equal(brain?.memoryFingerprint?.(),digest(block.session.memory.snapshot()),'Stale learner memory');
  assert(Array.isArray(panels)&&panels.length===block.registeredPanels.length);
  const tracksPresentations=Number.isSafeInteger(brain.presentations);
  const byId=new Map(),byContext=new Map();
  for(const panel of panels){
    assert.equal(panel.split,'train');assert.equal(panel.familyRegistrationSha256,familyRegistrationSha256);
    assert.equal(block.registeredPanels.some(p=>p.panelId===panel.panelId&&p.stage===panel.stage),true,
      'Unregistered Lichess panel');
    assert(!byId.has(panel.panelId),'Duplicate Lichess panel');byId.set(panel.panelId,panel);
    const key=contextKey(panel.context);assert(!byContext.has(key),'Ambiguous panel context');byContext.set(key,panel);
  }
  assert.deepEqual([...byId.keys()].sort(),block.registeredPanels.map(p=>p.panelId).sort(),
    'Missing registered training panel');

  let observedSelection=false;
  const presentationsBeforeSelection=tracksPresentations?brain.presentations:null;
  if(resumeFrom){
    const saved=decodeCheckpoint(readFileSync(resumeFrom));
    const savedPlan=saved.plan;
    if(savedPlan){assert(plan===null||plan.planSha256===savedPlan.planSha256,'Changed recovery plan');plan=savedPlan;}
    else assert(plan,'The initial checkpoint needs its registered plan to recover');
    if(planFamilyRegistrationSha256===null)planFamilyRegistrationSha256=familyRegistrationSha256;
  }else{
    if(plan===null){
      const observations=[];
      for(const panel of panels){
        const result=await assessLichessTrainingPanel(panel,brain);
        observations.push({...result,split:'train'});
      }
      observedSelection=true;
      plan=planCurriculumRehearsalBlock(observations,digest(block.session.memory.snapshot()),{
        currentStage:block.currentStage,blockIndex:block.completedBlocks,
        registeredPanels:block.registeredPanels,selectionCounts:block.selectionCounts});
      if(!plan.ready)return {ready:false,reason:plan.reason,blocked:plan.blocked??[],scope:plan.scope};
      planFamilyRegistrationSha256=familyRegistrationSha256;
    }else{
      // Yoked controls use the informative plan but still pay the same fresh
      // all-legal selection exposure before teaching.
      for(const panel of panels)await assessLichessTrainingPanel(panel,brain);
      observedSelection=true;
    }
    assert.equal(planFamilyRegistrationSha256,familyRegistrationSha256,'Yoked plan uses another panel registration');
    const {planSha256,...planBody}=plan;
    assert(isHash(planSha256)&&digest(planBody)===planSha256,'Changed planned block');
    assert.equal(plan.currentStage,block.currentStage);assert.equal(plan.blockIndex,block.completedBlocks);
    assert.equal(plan.registrationSha256,digest(block.registeredPanels));
  }
  if(observedSelection&&tracksPresentations)assert.equal(brain.presentations-presentationsBeforeSelection,plan.selectionPresentations,
    'Selection exposure differs from all-legal plan');
  assert.equal(planFamilyRegistrationSha256,familyRegistrationSha256,'Plan uses another panel registration');
  block.session.accountSelectionPresentations?.(plan.planSha256,plan.selectionPresentations);

  const assess=async context=>{
    const panel=byContext.get(contextKey(context));assert(panel,'Event context is outside the pinned Lichess training panels');
    return (await assessLichessTrainingPanel(panel,brain)).assessment;
  };
  return {ready:true,plan,planFamilyRegistrationSha256,...await runCurriculumBlock({block,plan,shuffledStatuses,identity,outputDir,
    resumeFrom,assess,guard,pace})};
}

// Repeat bounded blocks for one stage. Stage checkpoints preserve the latest
// completed block; the block runner's own checkpoints preserve an interrupted
// block. This layer deliberately never accepts a stage.
export async function runLichessCurriculumStage({panels,block,brain,familyRegistrationSha256,
  identity,outputDir,maxBlocks=32,resumeStageFrom=null,resumeBlockFrom=null,
  plans=null,shuffledStatusesForBlock=()=>null,lineageKey=null,guard,pace}){
  assert(isHash(identity),'Require pinned stage identity');
  assert(lineageKey===null||typeof lineageKey==='string'&&/^[A-Za-z0-9._:-]{1,128}$/.test(lineageKey),
    'Invalid condition/replica memory lineage key');
  assert(Number.isSafeInteger(maxBlocks)&&maxBlocks>=1&&maxBlocks<=32,'Stage block budget must be 1-32');
  assert(!existsSync(outputDir),'Stage invocation requires a fresh output directory');
  assert.equal(typeof shuffledStatusesForBlock,'function');
  if(plans!==null)assert(Array.isArray(plans)&&plans.length>=maxBlocks,'Require one yoked plan per registered block');

  let history=[];
  if(resumeStageFrom){
    const saved=decodeCheckpoint(readFileSync(resumeStageFrom));
    assert.equal(saved.schema,'lichess-curriculum-stage-v1');
    assert.equal(saved.identity,identity);assert.equal(saved.blockIdentity,block.identity);
    assert.equal(saved.stage,block.currentStage);assert.equal(saved.condition,block.condition);
    assert.equal(saved.lineageKey,lineageKey,'Changed memory lineage key during recovery');
    assert.equal(saved.maxBlocks,maxBlocks);assert(saved.block.completedBlocks<=maxBlocks);
    block.restore(saved.block);history=structuredClone(saved.history);
    assert.equal(history.length,block.completedBlocks,'Stage checkpoint history mismatch');
  }
  let completedResumeBlock=null;
  if(resumeBlockFrom){
    assert(resumeStageFrom,'An interrupted block requires its last completed stage checkpoint');
    const saved=decodeCheckpoint(readFileSync(resumeBlockFrom));
    assert.equal(saved.schema,'curriculum-block-run-v1');
    assert.equal(saved.blockIdentity,block.identity);assert.equal(saved.identity,
      digest({stageIdentity:identity,stage:block.currentStage,condition:block.condition,blockIndex:block.completedBlocks}));
    assert.equal(saved.startBlock,block.completedBlocks,'Interrupted block does not follow the completed stage prefix');
    assert.equal(history.length,block.completedBlocks,'Interrupted block requires its completed stage checkpoint');
    block.restore(saved.block);
    if(saved.block.completedBlocks===saved.startBlock+1&&saved.pendingReceipt===null){
      completedResumeBlock={blockIndex:saved.startBlock,planSha256:saved.planSha256,
        checkpoint:resumeBlockFrom,receiptCount:saved.receiptCount,chainHash:saved.chainHash,
        checkpointSha256:fileSha256(resumeBlockFrom),stageStartCheckpoint:resumeStageFrom,
        stageStartCheckpointSha256:fileSha256(resumeStageFrom)};
    }
  }

  const initialStageCheckpoint=history[0]?.stageStartCheckpoint??resumeStageFrom;
  const initialMemorySha256=initialStageCheckpoint
    ?digest(decodeCheckpoint(readFileSync(initialStageCheckpoint)).block.session.memory)
    :digest(block.snapshot().session.memory);

  mkdirSync(outputDir,{recursive:false});
  const stageCheckpoint=(sequence)=>{
    const blockState=block.snapshot();
    const state={schema:'lichess-curriculum-stage-v1',identity,blockIdentity:block.identity,
      stage:block.currentStage,condition:block.condition,maxBlocks,history,initialMemorySha256,
      lineageKey,memorySha256:digest(blockState.session.memory),block:blockState,stageAccepted:false};
    const bytes=encodeCheckpoint(state);assert(bytes.length<=16*2**20,'Stage checkpoint exceeds 16 MiB');
    const target=join(outputDir,`stage-checkpoint-${String(sequence).padStart(3,'0')}.json.gz`),partial=target+'.partial';
    const fd=openSync(partial,'wx');try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(partial,target);return target;
  };
  const publishStop=(name,value)=>{
    const target=join(outputDir,name),partial=target+'.partial',fd=openSync(partial,'wx');
    try{writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(partial,target);return target;
  };

  if(completedResumeBlock)history.push(completedResumeBlock);
  let resume=completedResumeBlock?null:resumeBlockFrom,latestCheckpoint=resumeStageFrom;
  if(resumeBlockFrom&&!completedResumeBlock){
    // Keep the clean completed-block prefix as the auditor's replay boundary;
    // the active partial block remains in its own resumable checkpoint.
    latestCheckpoint=join(outputDir,`stage-checkpoint-${String(history.length).padStart(3,'0')}.json.gz`);
    copyFileSync(resumeStageFrom,latestCheckpoint);
  }else latestCheckpoint=stageCheckpoint(history.length);
  while(block.completedBlocks<maxBlocks){
    guard();const blockIndex=block.completedBlocks;
    const stageStartCheckpoint=latestCheckpoint;
    const suppliedPlan=plans?.[blockIndex]??null;
    const shuffledStatuses=shuffledStatusesForBlock(blockIndex,suppliedPlan);
    const runDir=join(outputDir,`block-${String(blockIndex+1).padStart(2,'0')}`);
    const result=await runLichessCurriculumBlock({panels,block,brain,familyRegistrationSha256,
      identity:digest({stageIdentity:identity,stage:block.currentStage,condition:block.condition,blockIndex}),
      outputDir:runDir,resumeFrom:resume,plan:suppliedPlan,
      planFamilyRegistrationSha256:suppliedPlan?familyRegistrationSha256:null,
      shuffledStatuses,guard,pace});
    resume=null;
    if(!result.ready){
      const finalMemorySha256=digest(block.snapshot().session.memory);
      const state={status:'readiness-blocked',identity,blockIdentity:block.identity,
        stage:block.currentStage,condition:block.condition,completedBlocks:block.completedBlocks,
        reason:result.reason,blocked:result.blocked??[],stageAccepted:false,history,scope:result.scope,
        initialMemorySha256,finalMemorySha256,checkpoint:latestCheckpoint,
        ...(lineageKey===null?{}:{lineageKey,initialMemoryHashes:{[lineageKey]:initialMemorySha256},
          finalMemoryHashes:{[lineageKey]:finalMemorySha256}})};
      publishStop('readiness-stop.json',state);publishStop('result.json',state);return state;
    }
    history.push({blockIndex,planSha256:result.plan.planSha256,checkpoint:result.checkpoint,
      checkpointSha256:fileSha256(result.checkpoint),receiptCount:result.receiptCount,chainHash:result.chainHash,
      stageStartCheckpoint,stageStartCheckpointSha256:fileSha256(stageStartCheckpoint)});
    latestCheckpoint=stageCheckpoint(history.length);
  }
  const finalMemorySha256=digest(block.snapshot().session.memory);
  const result={status:'training-complete',identity,blockIdentity:block.identity,
    stage:block.currentStage,condition:block.condition,
    completedBlocks:block.completedBlocks,history,checkpoint:latestCheckpoint,
    initialMemorySha256,finalMemorySha256,
    ...(lineageKey===null?{}:{lineageKey,initialMemoryHashes:{[lineageKey]:initialMemorySha256},
      finalMemoryHashes:{[lineageKey]:finalMemorySha256}}),
    stageAccepted:false,scope:'Registered training blocks completed; independent replay, validation gates and stage acceptance remain required'};
  publishStop('result.json',result);return result;
}
