// Additional earlier-foundation learning, separate from acquisition. These
// routines deliver/replay the challenge; the acceptance evaluator must still
// measure post-challenge validation and previously mastered sentinels.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import {isAbsolute,relative,resolve} from 'node:path';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {decodeCheckpoint} from '../runtime/checkpoint-codec.mjs';
import {runLichessCurriculumStageMatrix,auditLichessCurriculumStageMatrix} from './lichess-curriculum-matrix.mjs';

const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const conditions=['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled'];

function sources({stage,replicas,selected,repositoryRoot}){
  assert(Number.isSafeInteger(stage)&&stage>=2&&stage<=12,'Chess rehearsal challenge requires an earlier chess foundation');
  assert(Array.isArray(replicas)&&replicas.length>0&&new Set(replicas).size===replicas.length);
  const keys=replicas.flatMap(replica=>conditions.map(condition=>`${replica}:${condition}`)).sort();
  assert.deepEqual(Object.keys(selected??{}).sort(),keys,'Retention sources must cover every matched arm/replica');
  const memory={},identities={};
  for(const key of keys){
    const ref=selected[key];assert(hash(ref?.checkpointSha256)&&hash(ref.memorySha256));
    assert(typeof ref.path==='string');
    const path=resolve(repositoryRoot,ref.path),rel=relative(resolve(repositoryRoot),path);
    assert(rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel),'Retention source escapes repository');
    assert(statSync(path).size<=16*2**20,'Retention source exceeds checkpoint bound');
    const bytes=readFileSync(path);assert.equal(sha256(bytes),ref.checkpointSha256,'Retention source checkpoint changed');
    const saved=decodeCheckpoint(bytes);
    assert.equal(saved.schema,'lichess-curriculum-stage-v1');assert.equal(saved.stage,stage);
    assert.equal(saved.lineageKey,key);assert.equal(saved.condition,key.slice(key.lastIndexOf(':')+1));
    assert.equal(saved.memorySha256,ref.memorySha256);
    assert.equal(digest(saved.block?.session?.memory),ref.memorySha256);
    assert.equal(saved.block.pending,null);assert.equal(saved.block.session.pending,null);
    assert([8,16,24,32].includes(saved.block.completedBlocks),'Retention must start at a published selected checkpoint');
    memory[key]=saved.block.session.memory;
    identities[key]={checkpointSha256:ref.checkpointSha256,memorySha256:ref.memorySha256};
  }
  return {memory,identities};
}

function checkedRuntime(runtime,{stage,lineageKey,initialMemorySha256}){
  assert(runtime?.brain&&runtime.block&&Array.isArray(runtime.panels));
  assert.equal(runtime.brain.memoryFingerprint(),initialMemorySha256,'Retention did not start at the selected learner memory');
  assert(runtime.panels.length>=2&&runtime.panels.every(panel=>panel.split==='train'&&panel.stage<stage),
    'Interference may teach earlier training foundations only');
  assert(runtime.block.currentStage<stage,'Interference cannot be additional current-stage acquisition');
  assert.equal(runtime.block.completedBlocks,0,'Retention starts a new eight-block transaction history');
  assert.equal(runtime.block.pending,null);assert.equal(runtime.block.session.pending,null);
  assert.equal(runtime.block.condition,lineageKey.slice(lineageKey.lastIndexOf(':')+1));
  return runtime;
}

export async function runCurriculumRetentionChallenge({stage,replicas,selected,repositoryRoot,
  parentRegistrationSha256,outputDir,resumeStatePath=null,createArm,guard,pace,onProgress=()=>{}}){
  guard();assert(hash(parentRegistrationSha256));assert.equal(typeof createArm,'function');
  const source=sources({stage,replicas,selected,repositoryRoot});guard();
  const registrationSha256=digest({schema:'curriculum-retention-registration-v1',stage,replicas,
    parentRegistrationSha256,selected:source.identities,blocks:8,eventsPerBlock:4});
  return runLichessCurriculumStageMatrix({stage,replicas,conditions,scheduleCondition:'informative',
    maxBlocks:8,registrationSha256,outputDir,resumeStatePath,guard,pace,onProgress,
    createArm:async context=>checkedRuntime(await createArm({...context,
      sourceMemory:structuredClone(source.memory[context.lineageKey])}),
      {stage,lineageKey:context.lineageKey,initialMemorySha256:source.identities[context.lineageKey].memorySha256})});
}

export async function auditCurriculumRetentionChallenge({stage,replicas,selected,repositoryRoot,
  parentRegistrationSha256,resultPath,outputPath,createReplayArm,guard,pace}){
  guard();assert(hash(parentRegistrationSha256));
  const source=sources({stage,replicas,selected,repositoryRoot});guard();
  const result=JSON.parse(readFileSync(resultPath,'utf8'));
  const expected=digest({schema:'curriculum-retention-registration-v1',stage,replicas,
    parentRegistrationSha256,selected:source.identities,blocks:8,eventsPerBlock:4});
  assert.equal(result.registrationSha256,expected,'Retention used another selection or registration');
  assert.equal(result.stage,stage);assert.deepEqual(result.replicas,replicas);
  assert.deepEqual(result.conditions,conditions);
  assert.deepEqual(result.initialMemoryHashes,Object.fromEntries(Object.entries(source.identities)
    .map(([key,row])=>[key,row.memorySha256])),'Retention reset or mixed the selected source memories');
  for(const entry of Object.values(result.lineageResults)){
    const saved=decodeCheckpoint(readFileSync(entry.checkpoint));
    assert.equal(saved.maxBlocks,8);assert.equal(saved.history.length,8);
    assert(saved.stage<stage,'Retention checkpoint contains current-stage acquisition');
  }
  return auditLichessCurriculumStageMatrix({resultPath,outputPath,guard,pace,
    createReplayArm:entry=>createReplayArm({entry,sourceMemory:structuredClone(source.memory[entry.lineageKey])}),
    deriveAcceptanceEvidence:async()=>({schema:'curriculum-retention-delivery-v1',status:'unknown',stageAccepted:false,
      challengeDelivered:true,blocksPerLineage:8,eventsPerLineage:32,
      unknown:['Independent post-interference validation and sentinel observations are required for retention acceptance'],
      parentStage:stage,parentRegistrationSha256,selectedMemoryHashes:result.initialMemoryHashes,
      scope:'Additional interference delivery and full replay; does not by itself pass a retention or curriculum gate'})});
}
