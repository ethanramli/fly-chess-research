// Independently replay every block named by a saved Lichess stage checkpoint.
// Caller must construct a fresh audit-side learner/session from the pinned model.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {dirname,basename} from 'node:path';
import {decodeCheckpoint} from '../runtime/checkpoint-codec.mjs';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {auditCurriculumBlock} from './curriculum-block-audit.mjs';
import {evaluateStage1Acceptance,evaluateStage1ReplicasAcceptance} from './curriculum-stage-acceptance.mjs';

const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const fileSha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

export async function auditLichessCurriculumStage({checkpoint,identity,createReplayBlock,deriveAcceptanceEvidence=null,guard,pace,auditOutputPath=null}){
  assert(isHash(identity),'Require pinned stage identity');assert.equal(typeof createReplayBlock,'function');
  assert(deriveAcceptanceEvidence===null||typeof deriveAcceptanceEvidence==='function');
  assert.equal(typeof guard,'function');assert.equal(typeof pace,'function');
  assert(auditOutputPath===null||typeof auditOutputPath==='string'&&basename(auditOutputPath)==='audit.json');
  const stage=decodeCheckpoint(readFileSync(checkpoint));
  assert.equal(stage.schema,'lichess-curriculum-stage-v1');assert.equal(stage.identity,identity);
  const lineageKey=stage.lineageKey??null;
  assert(lineageKey===null||typeof lineageKey==='string'&&/^[A-Za-z0-9._:-]{1,128}$/.test(lineageKey),
    'Invalid checkpoint memory lineage key');
  assert.equal(stage.stageAccepted,false,'Training checkpoint cannot self-accept a stage');
  assert(isHash(stage.initialMemorySha256)&&isHash(stage.memorySha256),'Missing stage memory identities');
  assert.equal(stage.memorySha256,digest(stage.block.session.memory),'Stage final memory hash mismatch');
  assert(stage.history.length===stage.maxBlocks&&stage.block.completedBlocks===stage.maxBlocks,
    'Only a complete registered block sequence can be stage-audited');
  assert(stage.maxBlocks>=1&&stage.maxBlocks<=32);
  assert.equal(stage.history.length,stage.block.completedBlocks);
  const blockAudits=[];let previousFinal=null;
  for(const [index,entry] of stage.history.entries()){
    guard();assert.equal(entry.blockIndex,index,'Nonsequential stage block history');
    assert(isHash(entry.planSha256)&&isHash(entry.checkpointSha256)
      &&isHash(entry.stageStartCheckpointSha256),'Missing stage audit file pins');
    assert.equal(fileSha256(entry.checkpoint),entry.checkpointSha256,'Block checkpoint changed');
    assert.equal(fileSha256(entry.stageStartCheckpoint),entry.stageStartCheckpointSha256,'Stage prefix checkpoint changed');
    const prefix=decodeCheckpoint(readFileSync(entry.stageStartCheckpoint));
    assert.equal(prefix.schema,'lichess-curriculum-stage-v1');assert.equal(prefix.identity,identity);
    assert.equal(prefix.lineageKey??null,lineageKey,'Stage prefix changed memory lineage');
    assert.equal(prefix.initialMemorySha256,stage.initialMemorySha256,'Changed initial stage memory identity');
    assert.equal(prefix.memorySha256,digest(prefix.block.session.memory),'Stage prefix memory hash mismatch');
    assert.equal(prefix.blockIdentity,stage.blockIdentity);assert.equal(prefix.stage,stage.stage);
    assert.equal(prefix.condition,stage.condition);assert.equal(prefix.block.completedBlocks,index);
    assert.equal(prefix.history.length,index,'Stage prefix/history length mismatch');
    if(previousFinal)assert.equal(digest(prefix.block),digest(previousFinal),'Block state continuity mismatch');
    else assert.equal(digest(prefix.block.session.memory),stage.initialMemorySha256,'Initial stage memory mismatch');

    const saved=decodeCheckpoint(readFileSync(entry.checkpoint));
    assert.equal(saved.schema,'curriculum-block-run-v1');assert.equal(saved.blockIdentity,stage.blockIdentity);
    assert.equal(saved.startBlock,index);assert.equal(saved.block.completedBlocks,index+1);
    assert.equal(saved.pendingReceipt,null);assert.equal(saved.planSha256,entry.planSha256);
    assert.equal(saved.receiptCount,entry.receiptCount);assert.equal(saved.chainHash,entry.chainHash);
    const runtime=await createReplayBlock({stageCheckpoint:prefix,blockIndex:index});
    assert(runtime?.block&&typeof runtime.assess==='function','Audit factory must return a fresh block and assessment function');
    if(stage.condition==='shuffled'){
      assert.equal(typeof runtime.shuffledStatusesForBlock,'function','Task-shuffled replay requires the pinned schedule');
      assert.deepEqual(saved.shuffledStatuses,runtime.shuffledStatusesForBlock(index,saved.plan),
        'Task-shuffled receipt differs from the registered schedule');
    }
    if(typeof runtime.block.session.accountSelectionPresentations==='function')
      assert(Number.isSafeInteger(runtime.selectionPresentations)&&runtime.selectionPresentations>=0,
        'Audit factory must independently derive selection exposure from registered source panels');
    runtime.block.restore(prefix.block);
    assert.equal(digest(runtime.block.snapshot()),digest(prefix.block),'Audit runtime failed to restore exact block prefix');
    const audit=await auditCurriculumBlock({block:runtime.block,plan:saved.plan,
      shuffledStatuses:saved.shuffledStatuses,identity:saved.identity,runDir:dirname(entry.checkpoint),
      checkpoint:entry.checkpoint,assess:runtime.assess,selectionPresentations:runtime.selectionPresentations,guard,pace});
    assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.planSha256,entry.planSha256);
    assert.equal(audit.finalBlockSha256,digest(saved.block),'Independent block final state mismatch');
    blockAudits.push({blockIndex:index,planSha256:entry.planSha256,checkpointSha256:entry.checkpointSha256,
      auditChainHash:audit.chainHash,receiptCount:audit.receiptCount,fullNeuralReplay:true});
    previousFinal=saved.block;
  }
  assert.equal(digest(previousFinal),digest(stage.block),'Stage checkpoint does not match final replayed block');
  const finalMemorySha256=digest(stage.block.session.memory);
  const acceptanceEvidence=deriveAcceptanceEvidence===null?null:
    await deriveAcceptanceEvidence({checkpoint,identity,stage,blockAudits});
  const auditedPrerequisites=value=>({...value,prerequisites:{...(value?.prerequisites??{}),
    independentStageReplay:true,memoryContinuityVerified:true}});
  const pinnedAcceptanceEvidence=Array.isArray(acceptanceEvidence?.replicas)
    ?{...acceptanceEvidence,replicas:acceptanceEvidence.replicas.map(auditedPrerequisites)}
    :acceptanceEvidence&&typeof acceptanceEvidence==='object'?auditedPrerequisites(acceptanceEvidence):acceptanceEvidence;
  const acceptance=pinnedAcceptanceEvidence===null?null:
    (Array.isArray(pinnedAcceptanceEvidence?.replicas)
      ?evaluateStage1ReplicasAcceptance(pinnedAcceptanceEvidence)
      :evaluateStage1Acceptance(pinnedAcceptanceEvidence));
  const result={schema:'lichess-curriculum-stage-replay-audit-v1',identity,stage:stage.stage,
    condition:stage.condition,completedBlocks:blockAudits.length,fullNeuralReplay:true,
    initialMemorySha256:stage.initialMemorySha256,finalMemorySha256,
    ...(lineageKey===null?{}:{lineageKey,initialMemoryHashes:{[lineageKey]:stage.initialMemorySha256},
      finalMemoryHashes:{[lineageKey]:finalMemorySha256}}),
    blockAudits,memoryContinuityVerified:true,stageAccepted:acceptance?.stageAccepted===true,
    acceptanceStatus:acceptance?.status??'unknown',acceptance,
    scope:'Independent full neural receipt replay for registered stage blocks; learning, retention and scientific stage gates remain separate'};
  if(auditOutputPath!==null){
    assert(!existsSync(auditOutputPath),'Preserve any existing independent audit');
    const partial=auditOutputPath+'.partial',fd=openSync(partial,'wx');
    try{writeFileSync(fd,JSON.stringify(result));fsyncSync(fd);}finally{closeSync(fd);}
    renameSync(partial,auditOutputPath);
  }
  return result;
}
