// Bind the memory carried forward to the actual independently replayed challenge
// and measured retention gate, preserving the earlier frozen selection as source.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,statSync,existsSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {dirname,isAbsolute,relative,resolve} from 'node:path';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {decodeCheckpoint} from '../runtime/checkpoint-codec.mjs';
import {evaluatePostInterferenceRetention} from './curriculum-retention-observations.mjs';

const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const conditions=['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled'];
function inside(root,path){
  assert(typeof path==='string'&&path.length>0);
  const target=resolve(root,path),rel=relative(resolve(root),target);
  assert(rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel),'Retention promotion path escapes repository');
  return target;
}
function read(root,ref,limit,guard){
  guard();const path=inside(root,typeof ref==='string'?ref:ref.path);
  assert(statSync(path).size<=limit,'Retention promotion artifact exceeds bound');
  const bytes=readFileSync(path),hash=sha256(bytes);
  if(typeof ref!=='string')assert.equal(hash,ref.sha256,'Pinned retention promotion input changed');
  guard();return {bytes,ref:{path:relative(root,path).replaceAll('\\','/'),sha256:hash}};
}

function derive({repositoryRoot:root,parentResult,checkpointSelection,retentionResult,retentionAudit,guard}){
  assert.equal(parentResult?.schema,'lichess-curriculum-matrix-result-v1');
  assert.equal(parentResult.status,'training-complete');assert(parentResult.stage>=2&&parentResult.stage<=12);
  assert(isHash(parentResult.registrationSha256));
  const keys=parentResult.replicas.flatMap(replica=>conditions.map(condition=>`${replica}:${condition}`)).sort();
  assert.deepEqual([...parentResult.conditions].sort(),[...conditions].sort());
  assert.equal(checkpointSelection?.frozen,true);assert(isHash(checkpointSelection.artifactSha256));
  const selectedFile=read(root,{path:checkpointSelection.artifactPath,sha256:checkpointSelection.artifactSha256},8*2**20,guard);
  const selection=JSON.parse(selectedFile.bytes);
  assert.equal(selection.schema,`lichess-stage${parentResult.stage}-checkpoint-selection-v1`);
  assert.equal(selection.stage,parentResult.stage);assert.equal(selection.status,'frozen');assert.equal(selection.frozen,true);
  assert.equal(selection.matrixIdentity,parentResult.identity);
  assert.equal(selection.matrixResultSha256,digest(parentResult));
  assert.equal(selection.registrationSha256,parentResult.registrationSha256);
  assert.deepEqual(Object.keys(selection.selected).sort(),keys);
  const selectedHashes=Object.fromEntries(keys.map(key=>[key,selection.selected[key].memorySha256]));
  assert.deepEqual(checkpointSelection.selectedMemoryHashes,selectedHashes);
  const resultFile=read(root,retentionResult,16*2**20,guard),result=JSON.parse(resultFile.bytes);
  const auditFile=read(root,retentionAudit,32*2**20,guard),audit=JSON.parse(auditFile.bytes);
  const sourceIdentities=Object.fromEntries(keys.map(key=>{
    const row=selection.selected[key];assert(isHash(row.checkpointSha256)&&isHash(row.memorySha256));
    return [key,{checkpointSha256:row.checkpointSha256,memorySha256:row.memorySha256}];
  }));
  const expectedRegistration=digest({schema:'curriculum-retention-registration-v1',stage:parentResult.stage,
    replicas:parentResult.replicas,parentRegistrationSha256:parentResult.registrationSha256,
    selected:sourceIdentities,blocks:8,eventsPerBlock:4});
  assert.equal(result.schema,'lichess-curriculum-matrix-result-v1');assert.equal(result.status,'training-complete');
  assert.equal(result.stage,parentResult.stage);assert.equal(result.registrationSha256,expectedRegistration);
  assert.deepEqual(result.replicas,parentResult.replicas);assert.deepEqual(result.conditions,conditions);
  assert.deepEqual(result.initialMemoryHashes,selectedHashes);
  assert.deepEqual(Object.keys(result.finalMemoryHashes).sort(),keys);
  assert.equal(audit.schema,'lichess-curriculum-matrix-audit-v1');assert.equal(audit.stage,result.stage);
  assert.equal(audit.identity,result.identity);assert.equal(audit.fullNeuralReplay,true);
  assert.equal(audit.memoryContinuityVerified,true);
  assert.deepEqual(audit.initialMemoryHashes,result.initialMemoryHashes);assert.deepEqual(audit.finalMemoryHashes,result.finalMemoryHashes);
  const evidence=audit.acceptanceEvidence;
  assert.equal(evidence?.schema,'curriculum-retention-delivery-v1');assert.equal(evidence.challengeDelivered,true);
  assert.equal(evidence.blocksPerLineage,8);assert.equal(evidence.eventsPerLineage,32);
  assert.equal(evidence.parentStage,parentResult.stage);assert.equal(evidence.parentRegistrationSha256,parentResult.registrationSha256);
  assert.deepEqual(evidence.selectedMemoryHashes,selectedHashes);assert.deepEqual(evidence.postMemoryHashes,result.finalMemoryHashes);
  assert.deepEqual(Object.keys(evidence.observations??{}).sort(),keys);
  assert.equal(evidence.observationsSha256,digest(evidence.observations));
  const entries=Object.values(result.lineageResults);
  assert.equal(new Set(entries.map(row=>row.lineageKey)).size,keys.length);assert.equal(entries.length,keys.length);
  const lineages={};
  for(const key of keys){
    guard();const entry=entries.find(row=>row.lineageKey===key);assert(entry);
    const observed=evidence.observations[key];assert.equal(observed.schema,'curriculum-post-interference-observations-v1');
    assert.equal(observed.stage,result.stage);assert.equal(observed.replica,entry.replica);assert.equal(observed.condition,entry.condition);
    assert.equal(observed.memoryHashes?.baseline,parentResult.initialMemoryHashes[key]);
    assert.equal(observed.memoryHashes?.selected,selectedHashes[key]);
    assert.equal(observed.memoryHashes?.post,result.finalMemoryHashes[key]);
    const gate=evaluatePostInterferenceRetention(observed);
    if(entry.condition==='informative')assert.equal(gate.retentionPassed,true,'Measured retention failed; cannot promote');
    else assert.notEqual(gate.status,'unknown','Control retention observations are incomplete');
    const replay=audit.lineageAudits?.[key];assert.equal(replay?.fullNeuralReplay,true);
    assert.equal(replay.memoryContinuityVerified,true);assert.equal(replay.completedBlocks,8);
    assert(Array.isArray(replay.blockAudits)&&replay.blockAudits.length===8
      &&replay.blockAudits.every((block,index)=>block.blockIndex===index&&block.fullNeuralReplay===true));
    assert.deepEqual(replay.initialMemoryHashes,{[key]:selectedHashes[key]});
    assert.deepEqual(replay.finalMemoryHashes,{[key]:result.finalMemoryHashes[key]});
    const checkpoint=read(root,entry.checkpoint,16*2**20,guard),saved=decodeCheckpoint(checkpoint.bytes);
    assert.equal(saved.schema,'lichess-curriculum-stage-v1');assert(saved.stage>=1&&saved.stage<result.stage);
    assert.equal(saved.identity,entry.identity);assert.equal(saved.lineageKey,key);assert.equal(saved.condition,entry.condition);
    assert.equal(saved.maxBlocks,8);assert.equal(saved.history?.length,8);assert.equal(saved.block.completedBlocks,8);
    assert.equal(saved.block.pending,null);assert.equal(saved.block.session.pending,null);
    assert.equal(saved.memorySha256,result.finalMemoryHashes[key]);assert.equal(digest(saved.block.session.memory),saved.memorySha256);
    lineages[key]={replica:entry.replica,condition:entry.condition,checkpointPath:checkpoint.ref.path,
      checkpointSha256:checkpoint.ref.sha256,checkpointIdentity:saved.identity,checkpointStage:saved.stage,
      memorySha256:saved.memorySha256,selectedSourceMemorySha256:selectedHashes[key]};
  }
  assert.equal(evidence.retentionPassed,true);
  return {schema:'curriculum-post-interference-promotion-v1',stage:parentResult.stage,
    parentMatrixIdentity:parentResult.identity,parentMatrixResultSha256:digest(parentResult),
    parentRegistrationSha256:parentResult.registrationSha256,
    sources:{selection:selectedFile.ref,retentionResult:resultFile.ref,retentionAudit:auditFile.ref},
    observationsSha256:evidence.observationsSha256,lineages,promotionMemoryHashes:result.finalMemoryHashes,
    scope:'Actual tested post-interference memory; promotion also requires the independent parent stage to pass all its learning/transfer gates'};
}

export function publishRetentionPromotion({repositoryRoot,parentResult,checkpointSelection,
  retentionResultPath,retentionAuditPath,outputPath,guard=()=>{}}){
  const artifact=derive({repositoryRoot,parentResult,checkpointSelection,retentionResult:retentionResultPath,
    retentionAudit:retentionAuditPath,guard});
  const path=inside(repositoryRoot,outputPath),bytes=Buffer.from(JSON.stringify(artifact));
  mkdirSync(dirname(path),{recursive:true});
  if(existsSync(path))assert.deepEqual(readFileSync(path),bytes,'Preserve changed retention promotion publication');
  else{
    const partial=path+'.partial',fd=openSync(partial,'wx');
    try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(partial,path);
  }
  return {descriptor:{schema:artifact.schema,artifactPath:relative(repositoryRoot,path).replaceAll('\\','/'),
    artifactSha256:sha256(bytes)},promotionMemoryHashes:artifact.promotionMemoryHashes};
}

export function validateRetentionPromotion({repositoryRoot,descriptor,parentResult,checkpointSelection,guard=()=>{}}){
  assert.equal(descriptor?.schema,'curriculum-post-interference-promotion-v1');assert(isHash(descriptor.artifactSha256));
  const file=read(repositoryRoot,{path:descriptor.artifactPath,sha256:descriptor.artifactSha256},8*2**20,guard);
  const artifact=JSON.parse(file.bytes);
  const derived=derive({repositoryRoot,parentResult,checkpointSelection,
    retentionResult:artifact.sources?.retentionResult,retentionAudit:artifact.sources?.retentionAudit,guard});
  assert.deepEqual(artifact,derived,'Post-interference promotion differs from independent evidence');
  return artifact;
}
