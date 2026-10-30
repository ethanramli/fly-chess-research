import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {encodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {restoreCurriculumStageMemory} from '../../src/puzzle-learning/curriculum-memory-handoff.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(t){
  const root=mkdtempSync(join(tmpdir(),'fly-memory-handoff-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const write=(path,value)=>{
    const target=join(root,path);mkdirSync(dirname(target),{recursive:true});
    const bytes=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value));
    writeFileSync(target,bytes);return {path,sha256:sha256(bytes)};
  };
  const initial={version:1,identity:'memory-v1',events:0,gains:[1]};
  const selected={...initial,events:8,gains:[0.75]};
  const last={...initial,events:32,gains:[0.25]};
  const learner={graph:{sha256:'b'.repeat(64)},mapping:{sha256:'c'.repeat(64)},modelSource:{sha256:'d'.repeat(64)},
    model:{steps:4},memory:{eta:0.5},replicaSeeds:{r0:42},encoder:{seed:123,taskFamily:'capture-retention'}};
  const registrationFile=write('data/stage1-registration.json',{stage:1,learner});
  const result={schema:'lichess-curriculum-matrix-result-v1',status:'training-complete',stage:1,
    identity:'matrix-v1',registrationSha256:registrationFile.sha256,replicas:['r0'],
    conditions:['informative','absent'],lineageResults:{},initialMemoryHashes:{},finalMemoryHashes:{}};
  const frozen={schema:'lichess-stage1-checkpoint-selection-v1',stage:1,status:'frozen',frozen:true,
    matrixIdentity:result.identity,registrationSha256:result.registrationSha256,selected:{}};
  const promotion={},lineageAudits={};
  const checkpoints={};
  for(const condition of result.conditions){
    const key=`r0:${condition}`,memory=condition==='informative'?selected:initial;
    const attempt=`runs/previous/r0-${condition}/attempt-001`;
    const entry={lineageKey:key,replica:'r0',condition,identity:digest(key),attempt};
    result.lineageResults[`r0/${condition}`]=entry;
    result.initialMemoryHashes[key]=digest(initial);result.finalMemoryHashes[key]=digest(last);
    const saved={schema:'lichess-curriculum-stage-v1',stage:1,identity:entry.identity,lineageKey:key,
      condition,history:Array(8).fill({}),memorySha256:digest(memory),
      block:{completedBlocks:8,pending:null,session:{pending:null,memory,presentationCount:99}}};
    const path=`${attempt}/stage-checkpoint-008.json.gz`;
    const checkpoint=write(path,encodeCheckpoint(saved));checkpoints[condition]={saved,path};
    frozen.selected[key]={blockIndex:8,checkpointSha256:checkpoint.sha256,memorySha256:digest(memory)};
    promotion[key]=digest(memory);
    lineageAudits[key]={fullNeuralReplay:true,memoryContinuityVerified:true,
      initialMemoryHashes:{[key]:digest(initial)},finalMemoryHashes:{[key]:digest(last)}};
  }
  frozen.matrixResultSha256=digest(result);
  const selectionFile=write('runs/previous/acceptance/checkpoint-selection.json',frozen);
  const audit={schema:'lichess-curriculum-matrix-audit-v1',stage:1,identity:result.identity,status:'accepted',
    stageAccepted:true,fullNeuralReplay:true,memoryContinuityVerified:true,
    initialMemoryHashes:result.initialMemoryHashes,finalMemoryHashes:result.finalMemoryHashes,
    promotionMemoryHashes:promotion,lineageAudits,acceptanceEvidence:{stageAccepted:true,
      matrixResultSha256:digest(result),registrationSha256:result.registrationSha256,
      promotionMemoryHashes:promotion,checkpointSelection:{frozen:true,artifactPath:selectionFile.path,
        artifactSha256:selectionFile.sha256,selectedMemoryHashes:promotion}}};
  write('runs/previous/result.json',result);write('runs/previous/audit.json',audit);
  let state=structuredClone(initial);
  const brain={presentations:0,memory:{snapshot:()=>structuredClone(state),restore:value=>{
    assert.equal(value.identity,initial.identity,'Incompatible neural memory');state=structuredClone(value);
  }},memoryFingerprint:()=>digest(state)};
  const args={registration:{stage:2,learner:{...structuredClone(learner),encoder:{...learner.encoder,taskFamily:'stage2-with-rehearsal'}},
    previousStage:{stage:1,registrationPath:registrationFile.path,registrationSha256:result.registrationSha256,
    result:'runs/previous/result.json',audit:'runs/previous/audit.json'}},replica:'r0',condition:'informative',
    repositoryRoot:root,brain};
  return {args,brain,root,write,initial,selected,result,frozen,audit,checkpoints};
}

test('handoff loads validation-selected memory, preserves new stage counters and supports production slash keys',t=>{
  const f=fixture(t),receipt=restoreCurriculumStageMemory(f.args);
  assert.deepEqual(f.brain.memory.snapshot(),f.selected);
  assert.equal(receipt.memorySha256,digest(f.selected));
  assert.notEqual(receipt.memorySha256,f.result.finalMemoryHashes['r0:informative']);
  assert.equal(receipt.lineageKey,'r0:informative');assert.equal(f.brain.presentations,0);
  assert.deepEqual(restoreCurriculumStageMemory(f.args),receipt,'Replay must restore the identical initial state');
});

test('handoff keeps causal controls on their own predecessor memory',t=>{
  const f=fixture(t);f.args.condition='absent';
  const receipt=restoreCurriculumStageMemory(f.args);
  assert.equal(receipt.lineageKey,'r0:absent');assert.deepEqual(f.brain.memory.snapshot(),f.initial);
});

test('a resumed predecessor lineage supplies its selected checkpoint through its result history',t=>{
  const f=fixture(t),moved='runs/previous/r0-informative/attempt-000/stage-checkpoint-008.json.gz';
  const original=join(f.root,f.checkpoints.informative.path);
  f.write(moved,encodeCheckpoint(f.checkpoints.informative.saved));rmSync(original);
  f.write('runs/previous/r0-informative/attempt-001/result.json',
    {history:[...Array(8).fill({}),{stageStartCheckpoint:join(f.root,moved)}]});
  restoreCurriculumStageMemory(f.args);
  assert.deepEqual(f.brain.memory.snapshot(),f.selected);
  f.write(moved,encodeCheckpoint({...f.checkpoints.informative.saved,memorySha256:'0'.repeat(64)}));
  assert.throws(()=>restoreCurriculumStageMemory(f.args),/checkpoint changed/);
});

test('later stages cannot silently start from scratch or skip a stage',t=>{
  const f=fixture(t);delete f.args.registration.previousStage;
  assert.throws(()=>restoreCurriculumStageMemory(f.args),/accepted predecessor/);
  f.args.registration={stage:3,previousStage:{stage:1}};
  assert.throws(()=>restoreCurriculumStageMemory(f.args),/accepted predecessor/);
  f.args.registration={stage:1};assert.equal(restoreCurriculumStageMemory(f.args),null);
  assert.deepEqual(f.brain.memory.snapshot(),f.initial);
});

test('failed, unknown and incomplete independent audits cannot supply memory',t=>{
  const f=fixture(t);
  for(const patch of [{status:'gate-failed',stageAccepted:false},{status:'unknown'},
    {fullNeuralReplay:false},{memoryContinuityVerified:false}]){
    f.write('runs/previous/audit.json',{...f.audit,...patch});
    assert.throws(()=>restoreCurriculumStageMemory(f.args));
    assert.deepEqual(f.brain.memory.snapshot(),f.initial);
  }
});

test('changed result, frozen selection or checkpoint is rejected before memory changes',t=>{
  const f=fixture(t);
  f.write('runs/previous/result.json',{...f.result,identity:'other'});
  assert.throws(()=>restoreCurriculumStageMemory(f.args));f.write('runs/previous/result.json',f.result);
  f.write('runs/previous/acceptance/checkpoint-selection.json',{...f.frozen,status:'unknown'});
  assert.throws(()=>restoreCurriculumStageMemory(f.args),/selection artifact changed/);
  f.write('runs/previous/acceptance/checkpoint-selection.json',f.frozen);
  const {saved,path}=f.checkpoints.informative;
  f.write(path,encodeCheckpoint({...saved,memorySha256:'c'.repeat(64)}));
  assert.throws(()=>restoreCurriculumStageMemory(f.args),/checkpoint changed/);
  assert.deepEqual(f.brain.memory.snapshot(),f.initial);
});

test('unknown lineage and paths outside repository are rejected',t=>{
  const f=fixture(t);f.args.replica='other';assert.throws(()=>restoreCurriculumStageMemory(f.args),/not registered/);
  f.args.replica='r0';f.args.registration.previousStage.result='../elsewhere.json';
  assert.throws(()=>restoreCurriculumStageMemory(f.args),/escapes repository/);
});

test('a guard failure after restoration rolls back persistent memory',t=>{
  const f=fixture(t);let failed=false;
  f.args.guard=()=>{if(!failed&&f.brain.memoryFingerprint()===digest(f.selected)){
    failed=true;throw Error('resource guard');
  }};
  assert.throws(()=>restoreCurriculumStageMemory(f.args),/resource guard/);
  assert.deepEqual(f.brain.memory.snapshot(),f.initial);
});

test('handoff rejects changed graph, physiology, replica seed and earlier input projection',t=>{
  const f=fixture(t),original=structuredClone(f.args.registration.learner);
  for(const change of [learner=>learner.graph.sha256='e'.repeat(64),
    learner=>learner.memory.eta=0.8,learner=>learner.replicaSeeds.r0=77,learner=>learner.encoder.seed=999]){
    f.args.registration.learner=structuredClone(original);change(f.args.registration.learner);
    assert.throws(()=>restoreCurriculumStageMemory(f.args),/Stage handoff changed/);
    assert.deepEqual(f.brain.memory.snapshot(),f.initial);
  }
});
