// Matrix coordinator v2 (2026-10-24, fix goal task 2). Same as
// lichess-curriculum-matrix.mjs (pinned by earlier runs) but runs the v2 stage
// runner with the registered planner cap, informative-arm early stop and a
// cooperative block-boundary pause. A pause returns {status:'paused'} without a
// result.json and leaves matrix-state.json resumable. The independent audit is
// the unchanged v1 function, re-exported below.
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,fsyncSync,closeSync,renameSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {decodeCheckpoint} from '../runtime/checkpoint-codec.mjs';
import {runLichessCurriculumStage} from './lichess-curriculum-block-v2.mjs';

const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const safeId=value=>typeof value==='string'&&/^[A-Za-z0-9._:-]{1,128}$/.test(value);

function atomicJson(path,value){
  mkdirSync(join(path,'..'),{recursive:true});
  const partial=path+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);
}

function latestCheckpoint(directory){
  if(!existsSync(directory))return null;
  const direct=readdirSync(directory).filter(name=>/^stage-checkpoint-\d{3}\.json\.gz$/.test(name)).sort();
  if(direct.length)return join(directory,direct.at(-1));
  const rows=readdirSync(directory,{withFileTypes:true})
    .filter(row=>row.isDirectory()&&/^attempt-\d{3}$/.test(row.name))
    .map(row=>join(directory,row.name)).sort();
  for(const attempt of rows.reverse()){
    const files=readdirSync(attempt).filter(name=>/^stage-checkpoint-\d{3}\.json\.gz$/.test(name)).sort();
    if(files.length)return join(attempt,files.at(-1));
  }
  return null;
}

function blockResumeCheckpoint(directory,completedBlocks){
  if(!existsSync(directory))return null;
  const blockDir=join(directory,`block-${String(completedBlocks+1).padStart(2,'0')}`);
  if(!existsSync(blockDir))return null;
  const files=readdirSync(blockDir).filter(name=>/^checkpoint-\d{6}\.json\.gz$/.test(name)).sort();
  return files.length?join(blockDir,files.at(-1)):null;
}

function plansFromResult(result){
  assert.equal(result?.status,'training-complete');
  assert(Array.isArray(result.history)&&result.history.length===result.completedBlocks);
  return result.history.map((entry,index)=>{
    assert.equal(entry.blockIndex,index);assert(isHash(entry.checkpointSha256));
    const saved=decodeCheckpoint(readFileSync(entry.checkpoint));
    assert.equal(saved.schema,'curriculum-block-run-v1');
    assert.equal(saved.planSha256,entry.planSha256);
    const {planSha256,...planBody}=saved.plan;
    assert.equal(planSha256,digest(planBody),'Invalid saved yoked plan');
    return saved.plan;
  });
}

function lineageName(replica,condition){return `${replica}:${condition}`;}

/**
 * Run a serial condition/replica matrix. createArm must construct each pinned
 * runtime from its registered initial snapshot and return stage-runner inputs,
 * including an attempt outputDir. For controls, plans are copied from the
 * informative arm after each replica completes. The caller owns model/data
 * pin validation and must not bypass its readiness gates.
 */
export async function runLichessCurriculumStageMatrix({stage,replicas,conditions,
  scheduleCondition='informative',maxBlocks=32,registrationSha256,resumeStatePath=null,
  outputDir,createArm,guard,pace,protocolBytes=null,onProgress=()=>{},
  completeTraining=null,completionIdentity=null,planner=null,earlyStop=null,shouldPause=()=>false}){
  assert.equal(typeof shouldPause,'function');
  assert(Number.isSafeInteger(stage)&&stage>=1&&stage<=12);
  assert(Array.isArray(replicas)&&replicas.length>=1&&replicas.length<=16);
  assert(replicas.every(safeId)&&new Set(replicas).size===replicas.length);
  assert(Array.isArray(conditions)&&conditions.length>=3&&conditions.includes(scheduleCondition));
  assert(conditions.every(safeId)&&new Set(conditions).size===conditions.length);
  assert(Number.isSafeInteger(maxBlocks)&&maxBlocks>=1&&maxBlocks<=32);
  assert(isHash(registrationSha256),'Require pinned matrix registration');
  assert(typeof outputDir==='string'&&typeof createArm==='function');
  assert.equal(typeof guard,'function');assert.equal(typeof pace,'function');assert.equal(typeof onProgress,'function');
  assert(completeTraining===null||typeof completeTraining==='function');
  assert(completeTraining===null?completionIdentity===null:isHash(completionIdentity),
    'Additional training phases require a pinned completion identity');
  assert(!existsSync(outputDir),'Matrix requires a new publication directory');
  mkdirSync(outputDir,{recursive:false});
  if(protocolBytes!==null){
    assert(Buffer.isBuffer(protocolBytes),'Protocol publication must use the pinned source bytes');
    const path=join(outputDir,'protocol.json'),partial=path+'.partial',fd=openSync(partial,'wx');
    try{writeFileSync(fd,protocolBytes);fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(partial,path);
  }
  const orderedConditions=[scheduleCondition,...conditions.filter(c=>c!==scheduleCondition)];
  const identity=digest({schema:'lichess-curriculum-matrix-v1',stage,replicas,conditions:orderedConditions,maxBlocks,registrationSha256,
    ...(completionIdentity===null?{}:{completionIdentity})});
  const statePath=join(outputDir,'matrix-state.json');
  let state={schema:'lichess-curriculum-matrix-state-v1',identity,stage,replicas,conditions:orderedConditions,
    completed:{},plans:{},initialMemoryHashes:{},finalMemoryHashes:{},status:'running'};
  if(resumeStatePath!==null){
    const saved=JSON.parse(readFileSync(resumeStatePath,'utf8'));
    assert.equal(saved.schema,'lichess-curriculum-matrix-state-v1');
    assert.equal(saved.identity,identity,'Changed matrix registration; preserve the old campaign');
    assert.equal(saved.status,'running','A terminal matrix requires a reviewed new registration');
    assert(saved.completed&&saved.plans&&saved.initialMemoryHashes&&saved.finalMemoryHashes);
    state=structuredClone(saved);
  }
  const publishState=()=>atomicJson(statePath,state);
  publishState();
  const totalLineages=replicas.length*orderedConditions.length;
  const progress=(event,details={})=>onProgress({event,stage,completedLineages:Object.keys(state.completed).length,
    totalLineages,...details});
  progress('matrix-started');
  for(const replica of replicas){
    for(const condition of orderedConditions){
      guard();const lineageKey=lineageName(replica,condition),key=`${replica}/${condition}`;
      if(state.completed[key])continue;
      const plans=condition===scheduleCondition?null:state.plans[replica];
      if(condition!==scheduleCondition)assert(Array.isArray(plans)&&plans.length===maxBlocks,
        'Yoked control requires the complete informative plan schedule');
      const lineageDir=join(outputDir,encodeURIComponent(lineageKey));
      mkdirSync(lineageDir,{recursive:true});
      const savedActive=state.active?.key===key?state.active:null;
      const previous=savedActive?.latestCheckpoint&&existsSync(savedActive.latestCheckpoint)
        ?savedActive.latestCheckpoint:savedActive?.attempt?latestCheckpoint(savedActive.attempt):latestCheckpoint(lineageDir);
      const prefixBlocks=previous?decodeCheckpoint(readFileSync(previous)).block.completedBlocks:0;
      const previousBlock=savedActive?.latestBlockCheckpoint&&existsSync(savedActive.latestBlockCheckpoint)
        ?savedActive.latestBlockCheckpoint:savedActive?.attempt?blockResumeCheckpoint(savedActive.attempt,prefixBlocks):null;
      const attempts=readdirSync(lineageDir,{withFileTypes:true})
        .filter(row=>row.isDirectory()&&/^attempt-\d{3}$/.test(row.name)).length;
      const attempt=join(lineageDir,`attempt-${String(attempts+1).padStart(3,'0')}`);
      state.active={key,lineageKey,replica,condition,attempt,latestCheckpoint:previous,
        latestBlockCheckpoint:previousBlock};publishState();
      progress('lineage-started',{replica,condition,lineageKey});
      const runtime=await createArm({stage,replica,condition,lineageKey,plans,
        resumeStageFrom:previous,resumeBlockFrom:previousBlock,outputDir:attempt,identity:digest({identity,lineageKey})});
      assert(runtime&&Array.isArray(runtime.panels)&&runtime.block&&runtime.brain);
      assert(isHash(runtime.familyRegistrationSha256)&&isHash(runtime.identity));
      assert.equal(runtime.outputDir,attempt,'Runtime factory changed the registered attempt path');
      const originalGuard=runtime.guard??guard;
      const guarded=()=>{guard();originalGuard();};
      let result;
      try{
        result=await runLichessCurriculumStage({...runtime,stage:undefined,
          identity:runtime.identity,lineageKey,outputDir:attempt,maxBlocks,
          resumeStageFrom:previous,resumeBlockFrom:previousBlock,plans,guard:guarded,pace:runtime.pace??pace,
          planner,earlyStop:condition===scheduleCondition?earlyStop:null,shouldPause});
      }catch(error){
        const latest=latestCheckpoint(attempt),completed=latest?decodeCheckpoint(readFileSync(latest)).block.completedBlocks:0;
        state.active={key,lineageKey,replica,condition,attempt,latestCheckpoint:latest,
          latestBlockCheckpoint:blockResumeCheckpoint(attempt,completed),error:String(error).slice(0,500)};
        publishState();throw error;
      }
      if(result.status==='paused'){
        // No result.json: the active lineage resumes from its durable stage checkpoint.
        state.active={key,lineageKey,replica,condition,attempt,latestCheckpoint:result.checkpoint,latestBlockCheckpoint:null};
        publishState();progress('lineage-paused',{replica,condition,lineageKey,completedBlocks:result.completedBlocks});
        return {status:'paused',stage,lineageKey,completedBlocks:result.completedBlocks,checkpoint:result.checkpoint,
          statePath,scope:result.scope};
      }
      if(result.status!=='training-complete'){
        const blocked={schema:'lichess-curriculum-matrix-result-v1',identity,stage,status:result.status,
          registrationSha256,...(result.earlyStop?{earlyStop:result.earlyStop}:{}),
          lineageKey,reason:result.reason??'lineage did not complete training',lineageResults:state.completed,
          scope:'Matrix stopped at the first non-complete learner result; no later condition or stage was run'};
        // Publish the terminal result first. If power fails before the state
        // update, the supervisor still sees the authoritative terminal result.
        atomicJson(join(outputDir,'result.json'),blocked);
        state.status=result.status;state.active={key,attempt,result};publishState();
        progress('lineage-stopped',{replica,condition,lineageKey,status:result.status});return blocked;
      }
      assert.equal(result.lineageKey,lineageKey);assert(isHash(result.initialMemorySha256)&&isHash(result.finalMemorySha256));
      if(condition===scheduleCondition){
        const yoked=plansFromResult(result);assert.equal(yoked.length,maxBlocks);
        state.plans[replica]=yoked;
      }
      state.initialMemoryHashes[lineageKey]=result.initialMemorySha256;
      state.finalMemoryHashes[lineageKey]=result.finalMemorySha256;
      state.completed[key]={lineageKey,condition,replica,identity:runtime.identity,attempt,resultPath:join(attempt,'result.json'),
        resultSha256:digest(result),checkpoint:result.checkpoint};
      state.active=null;publishState();progress('lineage-complete',{replica,condition,lineageKey});
    }
  }
  const expected=replicas.length*orderedConditions.length;
  assert.equal(Object.keys(state.completed).length,expected);
  const result={schema:'lichess-curriculum-matrix-result-v1',identity,stage,status:'training-complete',
    registrationSha256,
    conditions:orderedConditions,replicas,lineageResults:state.completed,
    initialMemoryHashes:state.initialMemoryHashes,finalMemoryHashes:state.finalMemoryHashes,
    stageAccepted:false,scope:'All registered arms completed on per-replica yoked lesson plans; independent audits and acceptance remain required'};
  if(completeTraining!==null){
    const matrixResultSha256=digest(result);
    if(state.trainingPhase)assert.equal(state.trainingPhase.matrixResultSha256,matrixResultSha256,
      'Additional training belongs to another acquisition result');
    const checkpointPhase=progress=>{
      assert(progress&&typeof progress==='object'&&!Array.isArray(progress));
      assert(Buffer.byteLength(JSON.stringify(progress))<=65536,'Training phase progress exceeds bound');
      state.trainingPhase={matrixResultSha256,progress:JSON.parse(JSON.stringify(progress))};
      publishState();
    };
    progress('additional-training-started');
    const phase=await completeTraining({result,outputDir,
      resume:state.trainingPhase?.progress??null,checkpointPhase});
    assert(phase&&['training-complete','gate-failed','unknown','readiness-blocked'].includes(phase.status),
      'Additional training returned an invalid terminal state');
    assert.equal(digest(result),matrixResultSha256,'Additional training mutated the acquisition result');
    atomicJson(join(outputDir,'training-phases.json'),{...phase,schema:'curriculum-training-phases-v1',
      completionIdentity,matrixResultSha256});
    if(phase.status!=='training-complete'){
      const stopped={...result,status:phase.status,trainingPhase:phase};
      atomicJson(join(outputDir,'result.json'),stopped);state.status=phase.status;publishState();
      progress('additional-training-stopped',{status:phase.status});return stopped;
    }
    progress('additional-training-complete');
  }
  // A missing result with a running state is recoverable; a result is the
  // supervisor's boundary for switching from training to independent audit.
  atomicJson(join(outputDir,'result.json'),result);state.status=result.status;publishState();progress('matrix-complete');return result;
}

export {auditLichessCurriculumStageMatrix} from './lichess-curriculum-matrix.mjs';
