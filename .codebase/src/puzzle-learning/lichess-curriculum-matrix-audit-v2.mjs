// Matrix audit v2 (2026-10-29, parallel replicas; researcher instruction, decision log). The v1 audit
// (auditLichessCurriculumStageMatrix in lichess-curriculum-matrix.mjs, pinned by earlier runs) split in two:
// replayLichessCurriculumReplica runs v1's independent per-lineage neural replay for one replica in its own
// process, and auditLichessCurriculumStageMatrixFromReplays checks those replays against the matrix result
// and then runs v1's matrix-level acceptance derivation unchanged. Acceptance stays one step over all replicas,
// because the evaluator opens the final families only after every replica passes validation selection.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,openSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {auditLichessCurriculumStage} from './lichess-curriculum-stage-audit.mjs';

const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

function atomicJson(path,value){
  mkdirSync(join(path,'..'),{recursive:true});
  const partial=path+'.partial',fd=openSync(partial,'wx');
  try{writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(partial,path);
}

function readResult(resultPath){
  const bytes=readFileSync(resultPath),result=JSON.parse(bytes);
  assert.equal(result.schema,'lichess-curriculum-matrix-result-v1');
  assert.equal(result.status,'training-complete');
  assert(isHash(result.registrationSha256));
  return {result,resultSha256:sha256(bytes)};
}

// v1's per-lineage checks and replay, for the lineages of one replica.
async function replayEntry({entry,result,createReplayArm,guard,pace}){
  const lineageResult=JSON.parse(readFileSync(entry.resultPath,'utf8'));
  assert.equal(digest(lineageResult),entry.resultSha256,'A lineage result changed after matrix publication');
  assert.equal(lineageResult.status,'training-complete');assert.equal(lineageResult.lineageKey,entry.lineageKey);
  assert.equal(lineageResult.identity,entry.identity);assert.equal(lineageResult.checkpoint,entry.checkpoint);
  assert.deepEqual(lineageResult.initialMemoryHashes,{[entry.lineageKey]:result.initialMemoryHashes[entry.lineageKey]});
  assert.deepEqual(lineageResult.finalMemoryHashes,{[entry.lineageKey]:result.finalMemoryHashes[entry.lineageKey]});
  guard();const runtime=await createReplayArm(entry);
  assert(runtime&&typeof runtime.checkpoint==='string'&&isHash(runtime.identity));
  const audit=await auditLichessCurriculumStage({...runtime,guard,pace});
  assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.memoryContinuityVerified,true);
  assert.deepEqual(audit.initialMemoryHashes,{[entry.lineageKey]:result.initialMemoryHashes[entry.lineageKey]});
  assert.deepEqual(audit.finalMemoryHashes,{[entry.lineageKey]:result.finalMemoryHashes[entry.lineageKey]});
  return audit;
}

export async function replayLichessCurriculumReplica({resultPath,replica,outputPath,createReplayArm,guard,pace}){
  assert(typeof resultPath==='string'&&typeof outputPath==='string'&&typeof replica==='string');
  assert.equal(typeof createReplayArm,'function');assert.equal(typeof guard,'function');assert.equal(typeof pace,'function');
  assert(!existsSync(outputPath),'Preserve any existing replica replay');
  const {result,resultSha256}=readResult(resultPath);
  assert(result.replicas.includes(replica),'Replay replica is not in the matrix result');
  const entries=Object.values(result.lineageResults).filter(entry=>entry.replica===replica);
  assert.equal(entries.length,result.conditions.length,'Matrix result lacks a lineage of this replica');
  const lineageAudits={};
  for(const entry of entries)lineageAudits[entry.lineageKey]=await replayEntry({entry,result,createReplayArm,guard,pace});
  const replay={schema:'lichess-curriculum-replica-replay-v1',replica,resultSha256,matrixIdentity:result.identity,lineageAudits};
  atomicJson(outputPath,replay);return replay;
}

export async function auditLichessCurriculumStageMatrixFromReplays({resultPath,outputPath,replayPaths,
  deriveAcceptanceEvidence,guard,pace}){
  assert(typeof resultPath==='string'&&typeof outputPath==='string'&&Array.isArray(replayPaths));
  assert.equal(typeof deriveAcceptanceEvidence,'function');assert.equal(typeof guard,'function');assert.equal(typeof pace,'function');
  assert(!existsSync(outputPath),'Preserve any existing independent matrix audit');
  const {result,resultSha256}=readResult(resultPath);
  assert.equal(result.stage,1,'Replay-split audit covers stage 1 only');
  const lineageAudits={},replays=[];
  for(const path of replayPaths){
    const bytes=readFileSync(path),replay=JSON.parse(bytes);
    assert.equal(replay.schema,'lichess-curriculum-replica-replay-v1');
    assert.equal(replay.resultSha256,resultSha256,'Replica replay belongs to another matrix result');
    assert.equal(replay.matrixIdentity,result.identity);
    for(const [key,audit] of Object.entries(replay.lineageAudits)){
      assert(!(key in lineageAudits),'Duplicate lineage replay');assert(key.startsWith(`${replay.replica}:`));
      assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.memoryContinuityVerified,true);
      assert.deepEqual(audit.initialMemoryHashes,{[key]:result.initialMemoryHashes[key]});
      assert.deepEqual(audit.finalMemoryHashes,{[key]:result.finalMemoryHashes[key]});
      lineageAudits[key]=audit;
    }
    replays.push({replica:replay.replica,path,sha256:sha256(bytes)});
  }
  assert.deepEqual(Object.keys(lineageAudits).sort(),Object.keys(result.finalMemoryHashes).sort(),'Replays do not cover every lineage');
  guard();
  const acceptanceEvidence=await deriveAcceptanceEvidence({result,lineageAudits});
  assert(acceptanceEvidence&&typeof acceptanceEvidence==='object');
  // From here as v1 for stage 1: promotion must equal the frozen validation-based selection.
  let stageAccepted=acceptanceEvidence.stageAccepted===true,promotionMemoryHashes=null,evidence=acceptanceEvidence;
  if(stageAccepted){
    promotionMemoryHashes=acceptanceEvidence.promotionMemoryHashes;let reason=null;
    if(!promotionMemoryHashes||typeof promotionMemoryHashes!=='object'||Array.isArray(promotionMemoryHashes))
      reason='Accepted evidence omitted validation-selected promotion memory hashes';
    else if(JSON.stringify(Object.keys(promotionMemoryHashes).sort())!==JSON.stringify(Object.keys(result.finalMemoryHashes).sort()))
      reason='Promotion memory map omits a registered condition/replica lineage';
    else if(acceptanceEvidence.checkpointSelection?.frozen!==true)
      reason='Promotion lacks recorded frozen validation-based checkpoint selection';
    else if(acceptanceEvidence.retentionPromotion)
      reason='Retention promotion is not supported by the replay-split audit; use the v1 audit';
    else for(const [key,value] of Object.entries(promotionMemoryHashes))
      if(!isHash(value)||acceptanceEvidence.checkpointSelection?.selectedMemoryHashes?.[key]!==value){
        reason='Promotion hash differs from the independently recorded checkpoint selection';break;}
    if(reason){promotionMemoryHashes=null;stageAccepted=false;
      evidence={...acceptanceEvidence,status:'unknown',stageAccepted:false,
        unknown:[...(Array.isArray(acceptanceEvidence.unknown)?acceptanceEvidence.unknown:[]),reason]};}
  }
  const status=stageAccepted?'accepted':evidence.status==='unknown'?'unknown':'gate-failed';
  const diagnosis=(Array.isArray(evidence.reports)?evidence.reports:[]).map(report=>{
    const m=report.metrics??{},parts=[`replica ${report.replica}: ${report.status}`];
    if(report.failed?.length)parts.push(`failed ${report.failed.join(',')}`);
    if(report.missingPrerequisites?.length)parts.push(`missing ${report.missingPrerequisites.join(',')}`);
    if(Array.isArray(m.validationByCheckpoint))parts.push(`validation by block ${m.validationByCheckpoint
      .map(row=>`${row.blockIndex}:${row.correct}/16`).join(' ')} (needs 14/16 and 3/4 per stratum)`);
    if(Array.isArray(m.trainingByBlock))parts.push(`training boards by block ${m.trainingByBlock
      .map(row=>`${row.blockIndex}:${row.correct}/24`).join(' ')}`);
    if(m.controlTraining&&Object.keys(m.controlTraining).length)parts.push(`controls' training boards ${Object.entries(m.controlTraining)
      .map(([name,row])=>`${name} ${row.correct}/24@${row.blockIndex}`).join(', ')}`);
    if(m.trainingCorrect!==undefined)parts.push(`train ${m.trainingCorrect}/24, validation ${m.validationCorrect}/16, final ${m.finalCorrect}/64, probe signs ${m.consequenceSignCorrect}/128, pairs ${m.counterfactualPairsCorrect}/32, advantage ${JSON.stringify(m.causalAdvantages)}`);
    if(report.unknown?.length)parts.push(`unknown: ${report.unknown.join('; ')}`);
    return parts.join('; ');
  });
  const audit={schema:'lichess-curriculum-matrix-audit-v1',identity:result.identity,stage:result.stage,
    status,diagnosis,fullNeuralReplay:true,memoryContinuityVerified:true,stageAccepted,
    initialMemoryHashes:result.initialMemoryHashes,finalMemoryHashes:result.finalMemoryHashes,
    ...(promotionMemoryHashes===null?{}:{promotionMemoryHashes}),
    lineageAudits,acceptanceEvidence:evidence,replicaReplays:replays,
    scope:'Independent per-lineage replay (one process per replica, matrix audit v2) plus matrix-level registered acceptance derivation; promotion carries only a frozen validation-selected checkpoint'};
  atomicJson(outputPath,audit);return audit;
}
