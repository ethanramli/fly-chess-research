import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {encodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';
import {publishRetentionPromotion,validateRetentionPromotion} from '../../src/puzzle-learning/curriculum-retention-promotion.mjs';
import {restoreCurriculumStageMemory} from '../../src/puzzle-learning/curriculum-memory-handoff.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const conditions=['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled'];
function fixture(t){
  // Fabricated audit contracts test artifact/state binding only. Actual delivery
  // and measured rankings have separate real-certificate replay fixtures.
  const root=mkdtempSync(join(tmpdir(),'fly-retention-promotion-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const write=(path,value)=>{
    const bytes=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value));
    mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),bytes);
    return {path,sha256:sha256(bytes)};
  };
  const baseline={identity:'memory-v1',events:0,gains:[1]},selected={...baseline,events:8,gains:[0.8]},
    last={...baseline,events:32,gains:[0.5]},post={...baseline,events:40,gains:[0.7]};
  const learner={graph:{sha256:'a'.repeat(64)},mapping:{sha256:'b'.repeat(64)},modelSource:{sha256:'c'.repeat(64)},
    model:{steps:4},memory:{eta:0.5},replicaSeeds:{r0:42},encoder:{seed:123,taskFamily:'stage2-with-rehearsal'}};
  const registration=write('data/stage2-registration.json',{stage:2,learner});
  const parent={schema:'lichess-curriculum-matrix-result-v1',stage:2,status:'training-complete',
    identity:'main-matrix',registrationSha256:registration.sha256,replicas:['r0'],conditions,
    initialMemoryHashes:{},finalMemoryHashes:{},lineageResults:{}};
  const selection={schema:'lichess-stage2-checkpoint-selection-v1',stage:2,status:'frozen',frozen:true,
    matrixIdentity:parent.identity,registrationSha256:parent.registrationSha256,selected:{}};
  const retained={...parent,identity:'retention-matrix',lineageResults:{},initialMemoryHashes:{},finalMemoryHashes:{}};
  const audit={schema:'lichess-curriculum-matrix-audit-v1',stage:2,identity:retained.identity,status:'unknown',
    stageAccepted:false,fullNeuralReplay:true,memoryContinuityVerified:true,lineageAudits:{}};
  const observations={};
  const rows=(prefix,count,memory)=>Array.from({length:count},(_,index)=>({trialId:`${prefix}-${index}`,
    familyId:`${prefix}-family-${index%4}`,stratum:`stratum-${index%4}`,taskCriterion:'bounded-task',
    positionSha256:'d'.repeat(64),boardHistorySha256:'e'.repeat(64),candidateSetSha256:'f'.repeat(64),
    certificateSha256:'1'.repeat(64),memorySha256:digest(memory),correct:true,unique:true,unaided:true}));
  for(const condition of conditions){
    const key=`r0:${condition}`,attempt=`runs/main/${condition}/attempt-001`,identity=digest(key);
    parent.initialMemoryHashes[key]=digest(baseline);parent.finalMemoryHashes[key]=digest(last);
    parent.lineageResults[`r0/${condition}`]={lineageKey:key,condition,replica:'r0',attempt,identity};
    const source=write(`${attempt}/stage-checkpoint-008.json.gz`,encodeCheckpoint({
      schema:'lichess-curriculum-stage-v1',stage:2,identity,lineageKey:key,condition,
      memorySha256:digest(selected),history:Array(8).fill({}),
      block:{completedBlocks:8,pending:null,session:{pending:null,memory:selected}}}));
    selection.selected[key]={blockIndex:8,checkpointSha256:source.sha256,memorySha256:digest(selected)};
    const path=`runs/retention/${condition}/stage-checkpoint-008.json.gz`,retentionIdentity=digest(`retention:${key}`);
    write(path,encodeCheckpoint({schema:'lichess-curriculum-stage-v1',stage:1,identity:retentionIdentity,
      lineageKey:key,condition,maxBlocks:8,history:Array(8).fill({}),memorySha256:digest(post),
      block:{completedBlocks:8,pending:null,session:{pending:null,memory:post}}}));
    retained.lineageResults[`r0/${condition}`]={lineageKey:key,condition,replica:'r0',identity:retentionIdentity,
      checkpoint:path,attempt:`runs/retention/${condition}`};
    retained.initialMemoryHashes[key]=digest(selected);retained.finalMemoryHashes[key]=digest(post);
    audit.lineageAudits[key]={fullNeuralReplay:true,memoryContinuityVerified:true,completedBlocks:8,
      blockAudits:Array.from({length:8},(_,index)=>({blockIndex:index,fullNeuralReplay:true})),
      initialMemoryHashes:{[key]:digest(selected)},finalMemoryHashes:{[key]:digest(post)}};
    observations[key]={schema:'curriculum-post-interference-observations-v1',stage:2,replica:'r0',condition,
      memoryHashes:{baseline:digest(baseline),selected:digest(selected),post:digest(post)},
      current:{selected:rows('current',16,selected),post:rows('current',16,post)},earlier:[{stage:1,
        baseline:{validation:rows('earlier',16,baseline),sentinels:rows('sentinel',4,baseline)},
        before:{validation:rows('earlier',16,selected),sentinels:rows('sentinel',4,selected)},
        after:{validation:rows('earlier',16,post),sentinels:rows('sentinel',4,post)}}]};
  }
  selection.matrixResultSha256=digest(parent);
  const selectionRef=write('runs/main/acceptance/selection.json',selection);
  const checkpointSelection={frozen:true,artifactPath:selectionRef.path,artifactSha256:selectionRef.sha256,
    selectedMemoryHashes:retained.initialMemoryHashes};
  const sourceIdentities=Object.fromEntries(Object.keys(selection.selected).sort().map(key=>[key,{
    checkpointSha256:selection.selected[key].checkpointSha256,memorySha256:selection.selected[key].memorySha256}]));
  retained.registrationSha256=digest({schema:'curriculum-retention-registration-v1',stage:2,replicas:parent.replicas,
    parentRegistrationSha256:parent.registrationSha256,selected:sourceIdentities,blocks:8,eventsPerBlock:4});
  audit.initialMemoryHashes=retained.initialMemoryHashes;audit.finalMemoryHashes=retained.finalMemoryHashes;
  audit.acceptanceEvidence={schema:'curriculum-retention-delivery-v1',challengeDelivered:true,blocksPerLineage:8,
    eventsPerLineage:32,parentStage:2,parentRegistrationSha256:parent.registrationSha256,retentionPassed:true,
    selectedMemoryHashes:retained.initialMemoryHashes,postMemoryHashes:retained.finalMemoryHashes,
    observations,observationsSha256:digest(observations)};
  write('runs/retention/result.json',retained);write('runs/retention/audit.json',audit);
  write('runs/main/result.json',parent);
  return {root,write,parent,checkpointSelection,audit,retained,baseline,selected,last,post,learner,registration,
    args:{repositoryRoot:root,parentResult:parent,checkpointSelection,
      retentionResultPath:'runs/retention/result.json',retentionAuditPath:'runs/retention/audit.json',
      outputPath:'runs/main/acceptance/post-interference-promotion.json'}};
}

test('promotion binds the actual post-challenge memory and publication is idempotent',t=>{
  const f=fixture(t),first=publishRetentionPromotion(f.args),again=publishRetentionPromotion(f.args);
  assert.deepEqual(again,first);
  const artifact=validateRetentionPromotion({repositoryRoot:f.root,descriptor:first.descriptor,
    parentResult:f.parent,checkpointSelection:f.checkpointSelection});
  assert.equal(artifact.promotionMemoryHashes['r0:informative'],digest(f.post));
  assert.notEqual(artifact.promotionMemoryHashes['r0:informative'],digest(f.selected));
  assert.notEqual(artifact.promotionMemoryHashes['r0:informative'],digest(f.last));
});

test('a passed-looking summary cannot override measured sentinel loss',t=>{
  const f=fixture(t);
  f.audit.acceptanceEvidence.observations['r0:informative'].earlier[0].after.sentinels[0].correct=false;
  f.audit.acceptanceEvidence.observationsSha256=digest(f.audit.acceptanceEvidence.observations);
  f.write('runs/retention/audit.json',f.audit);
  assert.throws(()=>publishRetentionPromotion(f.args),/Measured retention failed/);
});

test('missing replay, stale selection, and changed checkpoint bytes cannot promote',t=>{
  const f=fixture(t);f.audit.fullNeuralReplay=false;f.write('runs/retention/audit.json',f.audit);
  assert.throws(()=>publishRetentionPromotion(f.args));
  f.audit.fullNeuralReplay=true;f.write('runs/retention/audit.json',f.audit);
  const stale=structuredClone(f.checkpointSelection);stale.selectedMemoryHashes['r0:informative']='0'.repeat(64);
  assert.throws(()=>publishRetentionPromotion({...f.args,checkpointSelection:stale}));
  const promotion=publishRetentionPromotion(f.args);
  f.write(f.retained.lineageResults['r0/informative'].checkpoint,encodeCheckpoint({changed:true}));
  assert.throws(()=>validateRetentionPromotion({repositoryRoot:f.root,descriptor:promotion.descriptor,
    parentResult:f.parent,checkpointSelection:f.checkpointSelection}));
});

test('the next stage restores the post-interference checkpoint rather than the selected or last acquisition memory',t=>{
  const f=fixture(t),promotion=publishRetentionPromotion(f.args);
  const lineageAudits=Object.fromEntries(conditions.map(condition=>{
    const key=`r0:${condition}`;return [key,{fullNeuralReplay:true,memoryContinuityVerified:true,
      initialMemoryHashes:{[key]:f.parent.initialMemoryHashes[key]},finalMemoryHashes:{[key]:f.parent.finalMemoryHashes[key]}}];
  }));
  f.write('runs/main/audit.json',{schema:'lichess-curriculum-matrix-audit-v1',stage:2,identity:f.parent.identity,
    status:'accepted',stageAccepted:true,fullNeuralReplay:true,memoryContinuityVerified:true,lineageAudits,
    initialMemoryHashes:f.parent.initialMemoryHashes,finalMemoryHashes:f.parent.finalMemoryHashes,
    promotionMemoryHashes:promotion.promotionMemoryHashes,acceptanceEvidence:{stageAccepted:true,
      matrixResultSha256:digest(f.parent),registrationSha256:f.parent.registrationSha256,
      promotionMemoryHashes:promotion.promotionMemoryHashes,checkpointSelection:f.checkpointSelection,
      retentionPromotion:promotion.descriptor}});
  let state=structuredClone(f.baseline);
  const brain={memory:{snapshot:()=>structuredClone(state),restore:value=>{state=structuredClone(value);}},
    memoryFingerprint:()=>digest(state)};
  const receipt=restoreCurriculumStageMemory({repositoryRoot:f.root,replica:'r0',condition:'informative',brain,
    registration:{stage:3,learner:{...f.learner,encoder:{...f.learner.encoder,taskFamily:'later-curriculum'}},
      previousStage:{stage:2,registrationPath:f.registration.path,registrationSha256:f.registration.sha256,
        result:'runs/main/result.json',audit:'runs/main/audit.json'}}});
  assert.deepEqual(state,f.post);assert.equal(receipt.memorySha256,digest(f.post));
  assert.equal(receipt.retentionPromotionSha256,promotion.descriptor.artifactSha256);
});
