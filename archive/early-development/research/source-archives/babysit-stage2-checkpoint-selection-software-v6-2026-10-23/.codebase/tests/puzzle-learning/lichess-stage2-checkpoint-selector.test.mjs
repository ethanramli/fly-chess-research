import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {encodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {certifyCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {certifyMate} from '../../src/search-and-feedback/mate-certificate.mjs';
import {certifyAvoidMateAction} from '../../src/search-and-feedback/avoid-mate-action-domain.mjs';
import {verifiedExperience} from '../../src/search-and-feedback/verified-feedback.mjs';
import {selectStage2TrainingCheckpoint,stage2Strata} from '../../scripts/puzzle-learning/lichess-stage2-checkpoint-selector.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const conditions=['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled'];
const uci=move=>move.from+move.to+(move.promotion??'');
function template(objective){
  const board=new Chess(objective==='capture-retention'?'r6k/8/p7/8/p7/8/R7/7K w - - 0 1':
    objective==='forced-mate'?'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1':'r6k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  const task={objective,plies:objective==='avoid-mate'?3:1},context={fen:board.fen(),pgn:board.pgn(),task};
  const candidates=objective==='capture-retention'?certifyCaptureRetentionActions(board,task).map(row=>({move:row.move,
    proof:row.proof,status:row.proof.status,actor:board.turn(),learningAllowed:true,certificateSha256:row.proof.certificateSha256})):
    board.moves({verbose:true}).map(move=>{
      if(objective==='avoid-mate'){const row=certifyAvoidMateAction(board,uci(move));return {...row};}
      const child=new Chess();child.loadPgn(board.pgn());child.move(move);
      const proof=certifyMate(child,board.turn(),{plies:0});
      return {proof,...verifiedExperience(board,uci(move),task,proof)};
    });
  assert(candidates.some(row=>row.status==='success')&&candidates.some(row=>row.status==='failure'));
  return {context,candidates};
}
const templates=Object.fromEntries(['capture-retention','forced-mate','avoid-mate'].map(name=>[name,template(name)]));

function fixture(t,{forgetAt8=false,baselineFailure=false,currentFailure=false,maxBlocks=16}={}){
  const root=mkdtempSync(join(tmpdir(),'fly-stage2-selector-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const write=(path,value)=>{
    const bytes=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value));
    mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),bytes);return {path,sha256:hash(bytes)};
  };
  // Repeated board templates and fabricated source/family metadata isolate the
  // selector. These are real consequence certificates, not eligible source data.
  function rows(split,stage,count){return Array.from({length:count},(_,index)=>{
    const stratum=stage2Strata[index%4],objective=stage===1?'capture-retention':index%4<2?'forced-mate':'avoid-mate';
    const item=structuredClone(templates[objective]),id=`s${stage}-${split}-${index}`,gameId=`game-${id}`;
    return {split,history:{schema:'lichess-history-binding-v1',puzzleId:id,gameId,
      historyStatus:'verified-standard-start-prefix',context:{fen:item.context.fen,pgn:item.context.pgn},
      prefixPgnSha256:hash(Buffer.from(item.context.pgn))},lesson:{schema:stage===1?'lichess-capture-lesson-v1':'lichess-avoid-mate-lesson-v1',
      puzzleId:id,gameId,...item,stage1DomainEligible:true,stage2DomainEligible:true},fixture:{stage,stratum}};
  });}
  const train=[...rows('train',1,4),...rows('train',2,24)],validation=[...rows('validation',1,16),...rows('validation',2,16)];
  const families=(rows,split)=>({schema:split==='train'?'lichess-stage2-training-families-v1':'lichess-stage2-evaluation-families-v1',
    assignments:rows.map(row=>({split,stage:row.fixture.stage,puzzleId:row.lesson.puzzleId,gameId:row.lesson.gameId,
      panelId:row.lesson.puzzleId,familyId:`family-${row.lesson.puzzleId}`,
      stratum:row.fixture.stage===1?'open-defender':row.fixture.stratum}))});
  const trainingRows=write('data/train.jsonl',Buffer.from(train.map(row=>JSON.stringify(row)).join('\n')));
  const validationRows=write('data/validation.jsonl',Buffer.from(validation.map(row=>JSON.stringify(row)).join('\n')));
  const trainingFamilies=write('data/train-families.json',families(train,'train'));
  const validationFamilies=write('data/validation-families.json',families(validation,'validation'));
  const finalRows={path:'data/SEALED-final.jsonl',sha256:'f'.repeat(64)},finalFamilies={path:'data/SEALED-final-families.json',sha256:'e'.repeat(64)};
  const audit=write('data/audit.json',{schema:'lichess-stage2-acceptance-data-audit-v1',receiverAccepted:true,
    eligibleForNeuralTeaching:true,familySplitsDisjoint:true,sourceCertificatesReplayed:true,finalSetInspected:false,
    inputs:{trainingRows:[trainingRows.sha256],trainingFamiliesSha256:trainingFamilies.sha256,
      validationRows:[validationRows.sha256],validationFamiliesSha256:validationFamilies.sha256,
      finalRows:[finalRows.sha256],finalFamiliesSha256:finalFamilies.sha256}});
  const registration={stage:2,maxBlocks,trainingRows:{files:[trainingRows]},trainingFamilies,
    acceptanceData:{schema:'lichess-stage2-acceptance-data-v1',audit,validationRows:{files:[validationRows]},
      validationFamilies,finalRows:{files:[finalRows]},finalFamilies,panelIds:{validation:validation.filter(row=>row.fixture.stage===2).map(row=>row.lesson.puzzleId)},
      retention:{earlierPrinciples:[{stage:1,validationPanelIds:validation.filter(row=>row.fixture.stage===1).map(row=>row.lesson.puzzleId),
        sentinelPanelIds:train.filter(row=>row.fixture.stage===1).map(row=>row.lesson.puzzleId)}]}}};
  const result={identity:'matrix',stage:2,status:'training-complete',registrationSha256:'a'.repeat(64),replicas:['r0'],conditions,
    initialMemoryHashes:{},lineageResults:{}};
  for(const condition of conditions){
    const key=`r0:${condition}`,entry={lineageKey:key,condition,replica:'r0',identity:hash(Buffer.from(key)),
      attempt:join(root,'runs','matrix',encodeURIComponent(key),'attempt-001')};
    mkdirSync(entry.attempt,{recursive:true});result.lineageResults[`r0/${condition}`]=entry;
    for(const blockIndex of [0,8,...maxBlocks>=16?[16]:[]]){
      const memory={condition,blockIndex};if(blockIndex===0)result.initialMemoryHashes[key]=digest(memory);
      writeFileSync(join(entry.attempt,`stage-checkpoint-${String(blockIndex).padStart(3,'0')}.json.gz`),encodeCheckpoint({
        schema:'lichess-curriculum-stage-v1',stage:2,identity:entry.identity,lineageKey:key,condition,
        history:Array(blockIndex).fill({}),block:{completedBlocks:blockIndex,pending:null,
          session:{memory,presentationCount:0,pending:null}},memorySha256:digest(memory)}));
    }
  }
  let calls=0;
  const createEvaluationArm=async({entry})=>({identity:entry.identity,brain:{presentations:0,
    memory:{value:null,restore(value){this.value=structuredClone(value);}},memoryFingerprint(){return digest(this.memory.value);},
    async assess(board,moves,task){calls++;
      const memory=this.memory.value,prior=task.objective==='capture-retention';
      const correct=memory.condition==='informative'&&(prior?!((baselineFailure&&memory.blockIndex===0)||
        (forgetAt8&&memory.blockIndex===8)):!currentFailure);
      const choice=templates[task.objective].candidates.find(row=>row.status===(correct?'success':'failure')).move;
      return {choice,rows:moves.map(move=>({move:uci(move),score:uci(move)===choice?1:0}))};
    }}});
  return {root,registration,result,createEvaluationArm,calls:()=>calls,
    options:{registration,result,repositoryRoot:root,guard:()=>{},pace:async()=>{},createEvaluationArm}};
}

test('Stage 2 freezes the earliest retained checkpoint and yokes every control without reading final',async t=>{
  const f=fixture(t),selection=await selectStage2TrainingCheckpoint(f.options);
  assert.equal(selection.status,'frozen');assert.equal(Object.keys(selection.selected).length,6);
  assert(Object.values(selection.selected).every(row=>row.blockIndex===8));
  for(const condition of conditions.slice(1))assert.equal(selection.selected[`r0:${condition}`].selection.matchedInformativeBlock,8);
  assert.equal(existsSync(join(f.root,'data/SEALED-final.jsonl')),false);
  const frozen=JSON.parse(readFileSync(join(f.root,selection.checkpointSelection.artifactPath),'utf8'));
  assert.equal(frozen.matrixResultSha256,digest(f.result));
  assert.equal((await selectStage2TrainingCheckpoint(f.options)).checkpointSelection.artifactSha256,selection.checkpointSelection.artifactSha256);
});

test('better current accuracy cannot override forgotten earlier validation or a failed incoming foundation',async t=>{
  const forgotten=fixture(t,{forgetAt8:true}),selected=await selectStage2TrainingCheckpoint(forgotten.options);
  assert.equal(selected.selected['r0:informative'].blockIndex,16);
  const baseline=fixture(t,{baselineFailure:true}),failed=await selectStage2TrainingCheckpoint(baseline.options);
  assert.equal(failed.status,'gate-failed');assert.equal(failed.checkpointSelection.frozen,false);
  assert.equal(Object.keys(failed.selected).length,0);
});

test('failed validation preserves failure and never opens final; changed data pins fail before evaluation',async t=>{
  const f=fixture(t,{currentFailure:true,maxBlocks:8}),failed=await selectStage2TrainingCheckpoint(f.options);
  assert.equal(failed.status,'gate-failed');assert.equal(failed.checkpointSelection.frozen,false);
  const calls=f.calls();f.registration.acceptanceData.validationFamilies.sha256='0'.repeat(64);
  await assert.rejects(()=>selectStage2TrainingCheckpoint(f.options));assert.equal(f.calls(),calls);
});
