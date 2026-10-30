import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {Chess} from 'chess.js';
import {encodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {certifyCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
// Evaluator v2 (outcome-only protocol): the v1 fixture with the four registered arms.
import {deriveStage1AcceptanceObservations} from '../../scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v2.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const strata=['open-defender','blocked-defender','absent-defender','pinned-apparent-defender'];
const conditions=['informative','absent','disabled','shuffled'];
const uci=move=>move.from+move.to+(move.promotion??'');

function sourceRow(split,index){
  const puzzleId=`${split}-${index}`,gameId=`Game${split}${String(index).padStart(4,'0')}`;
  const board=new Chess('r6k/8/p7/8/p7/8/R7/7K w - - 0 1');
  const task={objective:'capture-retention',plies:1},context={fen:board.fen(),pgn:board.pgn(),task};
  const candidates=certifyCaptureRetentionActions(board,task).map(row=>({move:row.move,proof:row.proof,
    status:row.proof.status,actor:board.turn(),learningAllowed:true,certificateSha256:row.proof.certificateSha256}));
  return {split,history:{schema:'lichess-history-binding-v1',puzzleId,gameId,
    historyStatus:'verified-standard-start-prefix',context:{fen:context.fen,pgn:context.pgn},
    prefixPgnSha256:hash(Buffer.from(context.pgn))},
    lesson:{schema:'lichess-capture-lesson-v1',puzzleId,gameId,context,pieceCount:6,candidates,stage1DomainEligible:true}};
}

function writePinned(root,path,value){
  const bytes=Buffer.from(value),absolute=join(root,path);mkdirSync(join(absolute,'..'),{recursive:true});
  writeFileSync(absolute,bytes);return {path,sha256:hash(bytes)};
}

async function evaluateFixture(t,{passInformative=false,maxBlocks=8,conditions:arms=conditions}={}){
  const root=mkdtempSync(join(tmpdir(),'fly-stage1-evaluator-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const training=Array.from({length:24},(_,index)=>sourceRow('train',index));
  const validation=Array.from({length:16},(_,index)=>sourceRow('validation',index));
  const trainingRows=writePinned(root,'data/train.jsonl',Buffer.from(training.map(row=>JSON.stringify(row)).join('\n')+'\n'));
  const validationRows=writePinned(root,'data/validation.jsonl',Buffer.from(validation.map(row=>JSON.stringify(row)).join('\n')+'\n'));
  const familyDoc=(rows,split)=>({schema:split==='train'?'lichess-stage1-training-families-v1':'lichess-stage1-evaluation-families-v1',
    assignments:rows.map((row,index)=>({split,stage:1,puzzleId:row.lesson.puzzleId,panelId:`${split}-panel-${index}`,
      familyId:`${split}-family-${index}`,stratum:strata[index%strata.length]}))});
  const trainingFamilies=writePinned(root,'data/train-families.json',JSON.stringify(familyDoc(training,'train')));
  const validationFamilies=writePinned(root,'data/validation-families.json',JSON.stringify(familyDoc(validation,'validation')));
  const finalRows={path:'data/never-open-final.jsonl',sha256:'a'.repeat(64)};
  const finalFamilies={path:'data/never-open-final-families.json',sha256:'b'.repeat(64)};
  const audit=writePinned(root,'data/audit.json',JSON.stringify({schema:'lichess-stage1-acceptance-data-audit-v1',
    eligibleForNeuralTeaching:true,familySplitsDisjoint:true,sourceCertificatesReplayed:true,receiverAccepted:true,
    finalSetInspected:false,inputs:{trainingRows:[trainingRows.sha256],trainingFamiliesSha256:trainingFamilies.sha256,
      validationRows:[validationRows.sha256],validationFamiliesSha256:validationFamilies.sha256,
      finalRows:[finalRows.sha256],finalFamiliesSha256:finalFamilies.sha256}}));
  const assignments=rows=>familyDoc(rows,rows[0].split).assignments;
  const data={schema:'lichess-stage1-acceptance-data-v1',audit,validationRows:{files:[validationRows]},
    validationFamilies,finalRows:{files:[finalRows]},finalFamilies,panelIds:{
      training:assignments(training).map(row=>row.panelId),validation:assignments(validation).map(row=>row.panelId)}};
  const registration={stage:1,maxBlocks,trainingRows:{files:[trainingRows]},trainingFamilies,acceptanceData:data};

  const result={identity:'matrix-identity',registrationSha256:'c'.repeat(64),replicas:[0],conditions:arms,
    lineageResults:{},initialMemoryHashes:{},finalMemoryHashes:{}};
  const lineageAudits={};
  for(const condition of arms){
    const lineageKey=`0:${condition}`,identity=hash(Buffer.from(lineageKey)),attempt=join(root,'runs','matrix',encodeURIComponent(lineageKey),'attempt-001');
    mkdirSync(attempt,{recursive:true});
    result.lineageResults[`0/${condition}`]={lineageKey,identity,condition,replica:0,attempt};
    const memory={start:0,condition},finalMemory={start:maxBlocks,condition};
    result.initialMemoryHashes[lineageKey]=digest(memory);result.finalMemoryHashes[lineageKey]=digest(finalMemory);
    lineageAudits[lineageKey]={fullNeuralReplay:true,memoryContinuityVerified:true,
      initialMemoryHashes:{[lineageKey]:digest(memory)},finalMemoryHashes:{[lineageKey]:digest(finalMemory)}};
    for(const index of [0,...[8,16,24,32].filter(index=>index<=maxBlocks)]){
      const snapshot={start:index,condition},saved={schema:'lichess-curriculum-stage-v1',identity,lineageKey,condition,stage:1,
        history:Array(index).fill({}),block:{completedBlocks:index,session:{memory:snapshot,presentationCount:0}},
        memorySha256:digest(snapshot)};
      writeFileSync(join(attempt,`stage-checkpoint-${String(index).padStart(3,'0')}.json.gz`),encodeCheckpoint(saved));
    }
  }
  let evaluationCalls=0;
  let observations,error;
  const successMove=validation[0].lesson.candidates.find(row=>row.status==='success').move;
  try{observations=await deriveStage1AcceptanceObservations({result,lineageAudits,registration,repositoryRoot:root,
    guard:()=>{},pace:async()=>{},createEvaluationArm:async({entry})=>({identity:entry.identity,
      brain:{memory:{value:null,restore(value){this.value=structuredClone(value);}},presentations:0,
        memoryFingerprint(){return digest(this.memory.value);},async assess(_board,moves){evaluationCalls++;
          const choice=passInformative&&this.memory.value.condition==='informative'?successMove:null;
          const rows=moves.map(move=>({move:uci(move),score:uci(move)===choice?1:0}));
          return {rows,choice,tiedTopMoves:rows.filter(row=>row.score===(choice?1:0)).map(row=>row.move).sort()};}}})});}
  catch(caught){error=caught;}
  if(error&&arms!==conditions)return {error};
  const selection=JSON.parse(readFileSync(join(root,'runs','matrix','acceptance','checkpoint-selection.json'),'utf8'));
  return {observations,error,evaluationCalls,selection};
}

test('failed validation checkpoint selection never opens final rows or families',async t=>{
  const {observations,error,evaluationCalls,selection}=await evaluateFixture(t);
  assert.equal(error,undefined);
  assert.equal(observations.checkpointSelection.frozen,false);
  assert.equal(observations.replicas.length,1);
  assert.equal(evaluationCalls,16+2*24+3*24,'Only informative validation plus diagnostic training boards after failed selection');
  assert.equal(selection.status,'gate-failed');
  assert.deepEqual(observations.selectionFailures[0].trainingByBlock,[{blockIndex:0,correct:0},{blockIndex:8,correct:0}]);
  assert(observations.selectionFailures.slice(1).every(row=>row.trainingByBlock?.[0]?.blockIndex===8),
    'every control is scored on training boards at the informative arm\'s last checkpoint');
});

test('controls use the informative selected block even when every control fails its own validation',async t=>{
  const {error,evaluationCalls,selection}=await evaluateFixture(t,{passInformative:true,maxBlocks:16});
  assert.equal(selection.frozen,true);
  assert.equal(selection.status,'frozen');
  assert(Object.values(selection.selected).every(row=>row.blockIndex===8));
  for(const condition of conditions.filter(row=>row!=='informative'))
    assert.equal(selection.selected[`0:${condition}`].selection.matchedInformativeBlock,8);
  assert.equal(evaluationCalls,16*(2+conditions.length-1)+24*3);
  // Final files deliberately do not exist. The attempted read happens only
  // after the matched selection has been durably frozen.
  assert.equal(error?.code,'ENOENT');assert.match(error.path,/never-open-final/);
});

test('evaluator v2 refuses a matrix that registered Stockfish arms',async t=>{
  const {error}=await evaluateFixture(t,{conditions:['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled']});
  assert(error instanceof Error);assert.equal(error.code,'ERR_ASSERTION');
  assert.deepEqual(error.expected,['absent','disabled','informative','shuffled'],'rejected by the registered arm set');
});
