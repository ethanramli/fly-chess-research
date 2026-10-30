// Continue a condition/replica from its independently accepted, validation-selected
// predecessor. Carry neural memory only; the new stage owns its own transactions.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {decodeCheckpoint} from '../runtime/checkpoint-codec.mjs';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {validateRetentionPromotion} from './curriculum-retention-promotion.mjs';

const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function restoreCurriculumStageMemory({registration,replica,condition,repositoryRoot,brain,guard=()=>{}}){
  const stage=registration?.stage,prior=registration?.previousStage;
  assert(Number.isSafeInteger(stage)&&stage>=1&&stage<=12);
  if(stage===1){assert(prior===undefined,'Stage 1 must start from scratch');return null;}
  assert.equal(prior?.stage,stage-1,'Later stages require an accepted predecessor memory source');
  assert(isHash(prior.registrationSha256),'Pin the preceding stage registration');
  const inside=path=>{
    assert(typeof path==='string'&&path.length>0);
    const target=resolve(repositoryRoot,path),rel=relative(resolve(repositoryRoot),target);
    assert(rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel),'Memory handoff path escapes repository');
    return target;
  };
  const read=(path,maxBytes)=>{
    guard();const target=inside(path);
    assert(statSync(target).size<=maxBytes,'Memory handoff input exceeds bound');
    const bytes=readFileSync(target);guard();return bytes;
  };
  // Output hashes are unknown before training. The pinned previous registration,
  // independently audited result digest and frozen artifact bind them at runtime.
  const registrationBytes=read(prior.registrationPath,8*2**20);
  assert.equal(sha256(registrationBytes),prior.registrationSha256,'Predecessor registration changed');
  const previousRegistration=JSON.parse(registrationBytes);
  assert.equal(previousRegistration.stage,stage-1);
  const previousLearner=previousRegistration.learner,currentLearner=registration.learner;
  assert(previousLearner&&currentLearner,'Both stages must declare learner identities');
  for(const field of ['graph','mapping','modelSource'])
    assert.equal(currentLearner[field]?.sha256,previousLearner[field]?.sha256,`Stage handoff changed ${field}`);
  assert.deepEqual(currentLearner.model,previousLearner.model,'Stage handoff changed model configuration');
  assert.deepEqual(currentLearner.memory,previousLearner.memory,'Stage handoff changed plasticity configuration');
  assert.equal(currentLearner.replicaSeeds?.[replica],previousLearner.replicaSeeds?.[replica],
    'Stage handoff changed the from-scratch replica seed');
  const {taskFamily:previousTask,...previousProjection}=previousLearner.encoder??{};
  const {taskFamily:currentTask,...currentProjection}=currentLearner.encoder??{};
  assert(previousTask&&currentTask,'Both stage input contracts must be declared');
  assert.deepEqual(currentProjection,previousProjection,'Stage handoff changed earlier input projection settings');
  const resultBytes=read(prior.result,16*2**20),result=JSON.parse(resultBytes);
  const auditBytes=read(prior.audit,32*2**20),audit=JSON.parse(auditBytes);
  assert.equal(result.schema,'lichess-curriculum-matrix-result-v1');
  assert.equal(result.status,'training-complete');assert.equal(result.stage,stage-1);
  assert.equal(result.registrationSha256,prior.registrationSha256);
  assert.equal(audit.schema,'lichess-curriculum-matrix-audit-v1');
  assert.equal(audit.stage,result.stage);assert.equal(audit.identity,result.identity);
  assert.equal(audit.status,'accepted');
  for(const flag of ['stageAccepted','fullNeuralReplay','memoryContinuityVerified'])
    assert.equal(audit[flag],true,`Predecessor audit lacks ${flag}`);
  assert.deepEqual(audit.initialMemoryHashes,result.initialMemoryHashes);
  assert.deepEqual(audit.finalMemoryHashes,result.finalMemoryHashes);
  const evidence=audit.acceptanceEvidence;
  assert.equal(evidence?.stageAccepted,true);
  assert.equal(evidence.matrixResultSha256,digest(result));
  assert.equal(evidence.registrationSha256,prior.registrationSha256);
  assert.deepEqual(evidence.promotionMemoryHashes,audit.promotionMemoryHashes);
  const selection=evidence.checkpointSelection;
  assert.equal(selection?.frozen,true);assert(isHash(selection.artifactSha256));
  const postPromotion=evidence.retentionPromotion;
  if(result.stage>1)assert(postPromotion,'Later foundations must carry their tested post-interference memory');
  if(!postPromotion)assert.deepEqual(selection.selectedMemoryHashes,audit.promotionMemoryHashes);
  const selectionBytes=read(selection.artifactPath,8*2**20);
  assert.equal(sha256(selectionBytes),selection.artifactSha256,'Predecessor selection artifact changed');
  const frozen=JSON.parse(selectionBytes);
  assert.equal(frozen.schema,`lichess-stage${stage-1}-checkpoint-selection-v1`);
  assert.equal(frozen.stage,stage-1);assert.equal(frozen.status,'frozen');assert.equal(frozen.frozen,true);
  assert.equal(frozen.matrixIdentity,result.identity);
  assert.equal(frozen.matrixResultSha256,digest(result));
  assert.equal(frozen.registrationSha256,prior.registrationSha256);
  const lineageKey=`${replica}:${condition}`;
  assert(result.replicas.includes(replica)&&result.conditions.includes(condition),'Predecessor lineage not registered');
  const entries=Object.values(result.lineageResults);
  assert.equal(new Set(entries.map(row=>row.lineageKey)).size,entries.length,'Duplicate predecessor lineage');
  const entry=entries.find(row=>row.lineageKey===lineageKey);
  assert(entry,'Predecessor checkpoint missing for this condition/replica');
  assert.equal(entry.replica,replica);assert.equal(entry.condition,condition);
  const accepted=audit.lineageAudits?.[lineageKey];
  assert.equal(accepted?.fullNeuralReplay,true);assert.equal(accepted.memoryContinuityVerified,true);
  assert.deepEqual(accepted.initialMemoryHashes,{[lineageKey]:result.initialMemoryHashes[lineageKey]});
  assert.deepEqual(accepted.finalMemoryHashes,{[lineageKey]:result.finalMemoryHashes[lineageKey]});
  const selected=frozen.selected?.[lineageKey];
  assert(Number.isSafeInteger(selected?.blockIndex)&&selected.blockIndex>=0&&selected.blockIndex<=32);
  assert(isHash(selected.checkpointSha256)&&isHash(selected.memorySha256));
  let checkpointPath=join(inside(entry.attempt),`stage-checkpoint-${String(selected.blockIndex).padStart(3,'0')}.json.gz`);
  if(!postPromotion&&!existsSync(checkpointPath)){
    // A resumed lineage keeps earlier checkpoints in parent attempts; its result
    // history names them. The pinned checkpoint hash below still decides.
    const lineage=JSON.parse(read(entry.resultPath??join(entry.attempt,'result.json'),16*2**20));
    const row=lineage.history?.[selected.blockIndex];
    checkpointPath=inside(row?row.stageStartCheckpoint:lineage.checkpoint);
  }
  let expectedIdentity=entry.identity,expectedStage=stage-1,expectedBlocks=selected.blockIndex;
  let expectedCheckpointSha256=selected.checkpointSha256,expectedMemorySha256=selected.memorySha256;
  if(postPromotion){
    const promoted=validateRetentionPromotion({repositoryRoot,descriptor:postPromotion,parentResult:result,checkpointSelection:selection,guard});
    assert.deepEqual(promoted.promotionMemoryHashes,audit.promotionMemoryHashes);
    const row=promoted.lineages[lineageKey];assert(row);
    assert.equal(row.selectedSourceMemorySha256,selected.memorySha256);
    checkpointPath=inside(row.checkpointPath);expectedIdentity=row.checkpointIdentity;
    expectedStage=row.checkpointStage;expectedBlocks=8;
    expectedCheckpointSha256=row.checkpointSha256;expectedMemorySha256=row.memorySha256;
  }
  assert.equal(expectedMemorySha256,audit.promotionMemoryHashes[lineageKey]);
  const checkpointBytes=read(checkpointPath,256*2**20);
  assert.equal(sha256(checkpointBytes),expectedCheckpointSha256,'Accepted predecessor checkpoint changed');
  const saved=decodeCheckpoint(checkpointBytes),session=saved?.block?.session;
  assert.equal(saved.schema,'lichess-curriculum-stage-v1');assert.equal(saved.stage,expectedStage);
  assert.equal(saved.identity,expectedIdentity);assert.equal(saved.lineageKey,lineageKey);
  assert.equal(saved.condition,condition);assert.equal(saved.block.completedBlocks,expectedBlocks);
  assert.equal(saved.history?.length,expectedBlocks);
  assert.equal(saved.block.pending,null,'Predecessor has an unfinished block transaction');
  assert.equal(session?.pending,null,'Predecessor has an unfinished teaching transaction');
  assert.equal(saved.memorySha256,expectedMemorySha256);
  assert.equal(digest(session.memory),expectedMemorySha256,'Predecessor memory differs from accepted promotion');
  assert.equal(typeof brain?.memory?.restore,'function');
  assert.equal(typeof brain?.memory?.snapshot,'function');
  assert.equal(typeof brain?.memoryFingerprint,'function');
  const before=brain.memory.snapshot();
  try{
    brain.memory.restore(session.memory);
    assert.equal(brain.memoryFingerprint(),expectedMemorySha256,'Restored predecessor memory changed');
    guard();
  }catch(error){brain.memory.restore(before);throw error;}
  return {schema:'curriculum-accepted-memory-handoff-v1',stage,previousStage:stage-1,lineageKey,
    registrationSha256:prior.registrationSha256,resultSha256:sha256(resultBytes),
    auditSha256:sha256(auditBytes),selectionSha256:selection.artifactSha256,
    checkpointSha256:expectedCheckpointSha256,memorySha256:expectedMemorySha256,
    ...(postPromotion?{retentionPromotionSha256:postPromotion.artifactSha256}:{})};
}
