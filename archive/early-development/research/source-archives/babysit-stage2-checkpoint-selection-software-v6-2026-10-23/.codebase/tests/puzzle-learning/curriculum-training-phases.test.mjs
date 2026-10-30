import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {runLichessCurriculumStageMatrix} from '../../src/puzzle-learning/lichess-curriculum-matrix.mjs';

function fixture(t){
  // Seed a fabricated completed acquisition state to isolate the real publication
  // and recovery transaction. This is not a learner or neural replay fixture.
  const root=mkdtempSync(join(tmpdir(),'fly-training-phases-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const base={stage:2,replicas:['r0'],conditions:['informative','absent','disabled'],
    maxBlocks:1,registrationSha256:'a'.repeat(64),completionIdentity:'b'.repeat(64),
    createArm:()=>{throw Error('Acquisition must not restart');},guard:()=>{},pace:async()=>{}};
  const identity=digest({schema:'lichess-curriculum-matrix-v1',stage:2,replicas:base.replicas,
    conditions:base.conditions,maxBlocks:1,registrationSha256:base.registrationSha256,
    completionIdentity:base.completionIdentity});
  const state={schema:'lichess-curriculum-matrix-state-v1',identity,stage:2,
    replicas:base.replicas,conditions:base.conditions,status:'running',active:null,
    completed:Object.fromEntries(base.conditions.map(condition=>[`r0/${condition}`,{lineageKey:`r0:${condition}`} ])),
    plans:{},initialMemoryHashes:{},finalMemoryHashes:{}};
  const resumeStatePath=join(root,'acquisition-state.json');writeFileSync(resumeStatePath,JSON.stringify(state));
  return {root,base,state,resumeStatePath,read:path=>JSON.parse(readFileSync(path,'utf8'))};
}

test('result publication waits for explicit additional training; acquisition is immutable',async t=>{
  const f=fixture(t),outputDir=join(f.root,'run');
  const result=await runLichessCurriculumStageMatrix({...f.base,outputDir,resumeStatePath:f.resumeStatePath,
    completeTraining:async({result,checkpointPhase})=>{
      assert.equal(existsSync(join(outputDir,'result.json')),false);
      checkpointPhase({phase:'retention',completedBlocks:4});
      assert.equal(f.read(join(outputDir,'matrix-state.json')).status,'running');
      assert.equal(result.status,'training-complete');
      return {status:'training-complete',retentionResult:{path:'fixture-only'}};
    }});
  const phases=f.read(join(outputDir,'training-phases.json'));
  assert.equal(phases.matrixResultSha256,digest(result));assert.equal(phases.completionIdentity,f.base.completionIdentity);
  assert.equal(f.read(join(outputDir,'result.json')).status,'training-complete');
  assert.equal(f.read(join(outputDir,'matrix-state.json')).status,'training-complete');
});

test('an interruption resumes phase progress without rerunning acquisition or acknowledging completion',async t=>{
  const f=fixture(t),first=join(f.root,'first'),second=join(f.root,'second');
  await assert.rejects(runLichessCurriculumStageMatrix({...f.base,outputDir:first,resumeStatePath:f.resumeStatePath,
    completeTraining:async({checkpointPhase})=>{checkpointPhase({phase:'retention',cursor:4});throw Error('power cut');}}),/power cut/);
  assert.equal(existsSync(join(first,'result.json')),false);
  const result=await runLichessCurriculumStageMatrix({...f.base,outputDir:second,resumeStatePath:join(first,'matrix-state.json'),
    completeTraining:async({resume,checkpointPhase})=>{
      assert.deepEqual(resume,{phase:'retention',cursor:4});checkpointPhase({phase:'retention',cursor:8});
      return {status:'training-complete'};
    }});
  assert.equal(result.status,'training-complete');
  assert.equal(f.read(join(second,'matrix-state.json')).trainingPhase.progress.cursor,8);
});

test('measured phase failure stops before audit and preserves its diagnosis',async t=>{
  const f=fixture(t),outputDir=join(f.root,'failed');
  const result=await runLichessCurriculumStageMatrix({...f.base,outputDir,resumeStatePath:f.resumeStatePath,
    completeTraining:async()=>({status:'gate-failed',reason:'Validation lost a foundation'})});
  assert.equal(result.status,'gate-failed');assert.equal(result.trainingPhase.reason,'Validation lost a foundation');
  assert.equal(f.read(join(outputDir,'matrix-state.json')).status,'gate-failed');
});

test('phase identity changes and acquisition mutation fail without a completion publication',async t=>{
  const f=fixture(t);
  await assert.rejects(runLichessCurriculumStageMatrix({...f.base,completionIdentity:'c'.repeat(64),
    outputDir:join(f.root,'changed'),resumeStatePath:f.resumeStatePath,completeTraining:async()=>({status:'training-complete'})}),/Changed matrix registration/);
  const outputDir=join(f.root,'mutated');
  await assert.rejects(runLichessCurriculumStageMatrix({...f.base,outputDir,resumeStatePath:f.resumeStatePath,
    completeTraining:async({result})=>{result.finalMemoryHashes.invalid='x';return {status:'training-complete'};}}),/mutated the acquisition result/);
  assert.equal(existsSync(join(outputDir,'result.json')),false);
});
