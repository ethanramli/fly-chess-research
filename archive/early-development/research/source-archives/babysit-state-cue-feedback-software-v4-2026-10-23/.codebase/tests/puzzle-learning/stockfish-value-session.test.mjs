import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {Chess} from 'chess.js';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {certifyMate} from '../../src/search-and-feedback/mate-certificate.mjs';
import {verifiedExperience} from '../../src/search-and-feedback/verified-feedback.mjs';
import {bindLichessStockfishReview} from '../../src/puzzle-learning/lichess-stockfish-review.mjs';
import {StockfishValueSession} from '../../src/puzzle-learning/stockfish-value-session.mjs';
import {CurriculumBlockSession} from '../../src/puzzle-learning/curriculum-block-session.mjs';
import {runLichessCurriculumBlock} from '../../src/puzzle-learning/lichess-curriculum-block.mjs';
import {runLichessCurriculumStage} from '../../src/puzzle-learning/lichess-curriculum-block.mjs';
import {auditCurriculumBlock} from '../../src/puzzle-learning/curriculum-block-audit.mjs';
import {auditLichessCurriculumStage} from '../../src/puzzle-learning/lichess-curriculum-stage-audit.mjs';
import {assessLichessTrainingPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';
import {runCurriculumRetentionChallenge,auditCurriculumRetentionChallenge} from '../../src/puzzle-learning/curriculum-retention-challenge.mjs';
import {registeredOutcomeShuffle} from '../../src/puzzle-learning/curriculum-outcome-shuffle.mjs';
import {encodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';
import {createHash} from 'node:crypto';
import {observePostInterferenceRetention} from '../../src/puzzle-learning/curriculum-retention-observations.mjs';

const task={objective:'capture-retention',plies:1};
const uci=move=>move.from+move.to+(move.promotion??'');

function panelFixture(){
  return panelAt('session-panel','session-family','6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1');
}
function matePanelFixture(){
  const board=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),mateTask={objective:'forced-mate',plies:1};
  const context={fen:board.fen(),pgn:board.pgn(),task:mateTask};
  const experiences=board.moves({verbose:true}).map(move=>{
    const child=new Chess();child.loadPgn(context.pgn);child.move(move);
    const proof=certifyMate(child,'w',{plies:0});
    return {context,move:uci(move),proof,...verifiedExperience(board,uci(move),mateTask,proof)};
  });
  return {panelId:'stage2-mate',familyId:'stage2-family',familyRegistrationSha256:'f'.repeat(64),
    stage:2,split:'train',context,experiences};
}
function panelAt(panelId,familyId,fen){
  const board=new Chess(fen);
  const context={fen:board.fen(),pgn:board.pgn(),task},experiences=board.moves({verbose:true}).map(move=>{
    const text=uci(move),proof=certifyCaptureRetentionAction(board,text,task);
    return {context,move:text,proof,...checkCaptureRetentionAction(board,text,task,proof)};
  });
  const panel={panelId,familyId,familyRegistrationSha256:'f'.repeat(64),
    puzzleId:panelId,gameId:'Game0001',stage:1,split:'train',context,experiences};
  const engine={binarySha256:'c'.repeat(64),settingsHash:'d'.repeat(64)};
  const analyses=board.moves({verbose:true}).flatMap(move=>{
    const child=new Chess();child.loadPgn(context.pgn);child.move(move);
    return [100,200].map(budget=>({move:uci(move),budget,engine,fen:child.fen(),pgn:child.pgn(),completed:true,
      transcript:['info depth 10 score cp 0 wdl 500 0 500 nodes 200 pv a1a2']}));
  });
  const review={criterion:'full-game-expected-score',context,actor:board.turn(),
    chosen:experiences[0].move,taskProof:experiences[0].proof,engine,analyses};
  return {panel,boundReview:bindLichessStockfishReview(panel,review)};
}

function learner({events=0,presentations=0,calls=[]}={}){
  const memory={events,state:0,snapshot(){return {events:this.events,state:this.state};},
    restore(value){this.events=value.events;this.state=value.state;}};
  const brain={memory,presentations,valueIdentity:'a'.repeat(64),calls,
    memoryFingerprint(){return digest(memory.snapshot());},
    verifyExperience(board,move,taskContext,proof){return checkCaptureRetentionAction(board,move,taskContext,proof);},
    async assess(board,moves){
      const selected=moves[0],choice=uci(selected);this.presentations+=moves.length;
      return {choice,rows:moves.map(move=>({move:uci(move),score:uci(move)===choice?1:0}))};
    },
    async replayValue(review,{condition,shuffle=null}){
      const before=memory.snapshot();this.presentations+=3;calls.push({condition,move:review.chosen,shuffle});
      if(['informative','outcome-only','outcome-shuffled','shuffled'].includes(condition)){memory.events++;memory.state++;}
      const after=memory.snapshot();
      return {schema:'test-stockfish-value-result-v1',condition,teacherReview:review,before,after,
        learningApplied:after.events>before.events,skipped:false};
    }};
  return brain;
}

function stockfishPanelReview(panel){
  const board=new Chess();board.loadPgn(panel.context.pgn);
  const engine={binarySha256:'c'.repeat(64),settingsHash:'d'.repeat(64)};
  const analyses=board.moves({verbose:true}).flatMap(move=>{
    const child=new Chess();child.loadPgn(panel.context.pgn);child.move(move);
    return [100,200].map(budget=>({move:uci(move),budget,engine,fen:child.fen(),pgn:child.pgn(),completed:true,
      transcript:['info depth 10 score cp 0 wdl 500 0 500 nodes 200 pv a1a2']}));
  });
  return bindLichessStockfishReview(panel,{criterion:'full-game-expected-score',context:panel.context,
    actor:board.turn(),chosen:panel.experiences[0].move,taskProof:panel.experiences[0].proof,engine,analyses});
}

function assessment(panel,brain){
  const board=new Chess();board.loadPgn(panel.context.pgn);const moves=board.moves({verbose:true});
  const choice=uci(moves[0]);
  return {fen:board.fen(),pgn:board.pgn(),task:panel.context.task,memoryHash:brain.memoryFingerprint(),choice,
    rows:moves.map(move=>({move:uci(move),score:uci(move)===choice?1:0}))};
}

test('eight-block retention matrix teaches all six matched arms, resumes stored memory and independently replays',async t=>{
  // Synthetic transaction fixture: real chess certificates, mock neural/value
  // updates and mock engine responses. It does not demonstrate learned skill.
  const root=resolve('runs',`retention-matrix-fixture-${randomUUID()}`);
  let passed=false;
  mkdirSync(root,{recursive:true});t.after(()=>{if(passed)rmSync(root,{recursive:true,force:true});});
  t.diagnostic(`Synthetic retention fixture: ${root}`);
  const first=panelFixture(),second=panelAt('earlier-second','earlier-family','7k/8/8/8/p7/8/8/R6K w - - 0 1');
  const panelReviews=[first,second],panels=panelReviews.map(row=>row.panel);
  const conditions=['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled'];
  const scheduleBody={schema:'matched-task-outcome-shuffle-v1',blocks:Array.from({length:8},()=>['success','failure','failure','success'])};
  const schedule=registeredOutcomeShuffle({...scheduleBody,sha256:digest(scheduleBody)});
  const sourceMemory={events:5,state:7},selected={};
  for(const condition of conditions){
    const lineageKey=`r0:${condition}`,path=join(root,`${condition}-selected.json.gz`);
    const bytes=encodeCheckpoint({schema:'lichess-curriculum-stage-v1',stage:2,lineageKey,condition,
      memorySha256:digest(sourceMemory),block:{completedBlocks:8,pending:null,session:{pending:null,memory:sourceMemory}}});
    writeFileSync(path,bytes);selected[lineageKey]={path,checkpointSha256:createHash('sha256').update(bytes).digest('hex'),
      memorySha256:digest(sourceMemory)};
  }
  const createArm=({condition,sourceMemory:initial,identity,outputDir})=>{
    const brain=learner();brain.memory.restore(initial);
    const session=new StockfishValueSession({brain,panelReviews,identity:'b'.repeat(64),
      stockfishShuffleIdentity:condition==='stockfish-shuffled'?'a'.repeat(64):null});
    const block=new CurriculumBlockSession({session,currentStage:1,condition,
      registeredPanels:panels.map(row=>({panelId:row.panelId,stage:row.stage})),
      shuffleIdentity:condition==='shuffled'?schedule.identity:condition==='stockfish-shuffled'?'a'.repeat(64):null});
    return {panels,brain,block,identity,outputDir,familyRegistrationSha256:'f'.repeat(64),
      shuffledStatusesForBlock:condition==='shuffled'?schedule.statusesForBlock:()=>null};
  };
  const args={stage:2,replicas:['r0'],selected,repositoryRoot:root,parentRegistrationSha256:'e'.repeat(64),
    outputDir:join(root,'challenge'),guard:()=>{},pace:async()=>{},createArm};
  const result=await runCurriculumRetentionChallenge(args);
  assert.equal(result.status,'training-complete',JSON.stringify(result));assert.equal(Object.keys(result.lineageResults).length,6);
  assert(Object.values(result.initialMemoryHashes).every(value=>value===digest(sourceMemory)));
  assert.equal(result.finalMemoryHashes['r0:absent'],digest(sourceMemory));
  assert.equal(result.finalMemoryHashes['r0:disabled'],digest(sourceMemory));
  assert.equal(result.finalMemoryHashes['r0:informative'],digest({events:37,state:39}));
  const mate=matePanelFixture();
  const copies=(panel,split,count)=>Array.from({length:count},(_,index)=>({...panel,split,
    panelId:`${panel.stage}-${split}-${index}`,stratum:`fixture-stratum-${index%4}`}));
  const evaluationPanels={currentValidation:copies(mate,'validation',16),earlier:[{stage:1,
    validation:copies(first.panel,'validation',16),sentinels:copies(first.panel,'train',4)}]};
  const audit=await auditCurriculumRetentionChallenge({...args,resultPath:join(root,'challenge','result.json'),
    outputPath:join(root,'challenge','audit.json'),observePostInterference:({entry,selectedMemory,postMemory})=>{
      const brain=learner();
      // Deliberately perfect mock ranking isolates retention measurement wiring;
      // equal success in every arm cannot establish acquired chess reasoning.
      brain.assess=async function(board,moves){
        this.presentations+=moves.length;
        const panel=board.fen()===mate.context.fen?mate:first.panel;
        const choice=panel.experiences.find(row=>row.status==='success').move;
        return {choice,rows:moves.map(move=>({move:uci(move),score:uci(move)===choice?1:0}))};
      };
      return observePostInterferenceRetention({stage:2,replica:entry.replica,condition:entry.condition,brain,
        baselineMemory:sourceMemory,selectedMemory,postMemory,panels:evaluationPanels,guard:()=>{}});
    },createReplayArm:({entry,sourceMemory})=>{
      const runtime=createArm({...entry,outputDir:entry.attempt,sourceMemory});
      return {checkpoint:entry.checkpoint,identity:entry.identity,createReplayBlock:async()=>({
        block:runtime.block,shuffledStatusesForBlock:runtime.shuffledStatusesForBlock,
        selectionPresentations:panels.reduce((count,panel)=>count+panel.experiences.length,0),
        assess:async context=>(await assessLichessTrainingPanel(panels.find(panel=>panel.context.fen===context.fen),runtime.brain)).assessment})};
    }});
  assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.memoryContinuityVerified,true);
  assert.equal(audit.stageAccepted,false,'Challenge delivery is not post-interference retention acceptance');
  assert.equal(audit.acceptanceEvidence.eventsPerLineage,32);
  assert.equal(audit.acceptanceEvidence.retentionPassed,true);
  assert.equal(Object.keys(audit.acceptanceEvidence.observations).length,6);
  assert.equal(audit.acceptanceEvidence.observations['r0:informative'].memoryHashes.post,result.finalMemoryHashes['r0:informative']);
  passed=true;
});

test('Stage 2 block teaches current mate tasks and rehearses Stage 1 through the same resumable session',async t=>{
  const earlier=panelFixture(),panel=matePanelFixture();
  const panelReviews=[earlier,{panel,boundReview:stockfishPanelReview(panel)}];
  const panels=panelReviews.map(row=>row.panel),identity='b'.repeat(64);
  const createBrain=()=>{
    const brain=learner();brain.verifyExperience=(position,move,criterion,proof)=>criterion.objective==='capture-retention'
      ?checkCaptureRetentionAction(position,move,criterion,proof):verifiedExperience(position,move,criterion,proof);
    return brain;
  };
  const createBlock=brain=>new CurriculumBlockSession({session:new StockfishValueSession({brain,panelReviews,identity}),
    currentStage:2,registeredPanels:panels.map(row=>({panelId:row.panelId,stage:row.stage}))});
  const brain=createBrain(),block=createBlock(brain);
  const out=resolve('runs',`stage2-rehearsal-fixture-${randomUUID()}`);
  t.after(()=>rmSync(out,{recursive:true,force:true}));
  const result=await runLichessCurriculumBlock({panels,block,brain,familyRegistrationSha256:'f'.repeat(64),
    identity,outputDir:out,guard:()=>{},pace:async()=>{}});
  assert.equal(result.ready,true);assert.deepEqual(result.plan.events.map(row=>row.stage),[2,2,1,1]);
  assert.equal(brain.memory.events,4);assert.equal(block.pending,null);
  const replayBrain=createBrain(),replayBlock=createBlock(replayBrain);
  const first=JSON.parse(readFileSync(join(out,'receipts.jsonl'),'utf8').split('\n')[0]);
  const audit=await auditCurriculumBlock({block:replayBlock,plan:result.plan,identity:first.identity,
    runDir:out,checkpoint:result.checkpoint,selectionPresentations:panels.reduce((n,row)=>n+row.experiences.length,0),
    assess:async taskContext=>{
      const found=panels.find(row=>row.context.fen===taskContext.fen);assert(found);
      return (await assessLichessTrainingPanel(found,replayBrain)).assessment;
    },guard:()=>{},pace:async()=>{}});
  assert.equal(audit.fullNeuralReplay,true);
  assert.equal(replayBrain.memoryFingerprint(),brain.memoryFingerprint());
});

test('Stockfish value event restores and replays one async teaching update exactly once',async()=>{
  const {panel,boundReview}=panelFixture(),identity='b'.repeat(64),experience=panel.experiences[0];
  const original=learner(),initial=original.memory.snapshot();
  const session=new StockfishValueSession({brain:original,panelReviews:[{panel,boundReview}],identity});
  session.start(experience,assessment(panel,original),{condition:'informative',shuffledStatus:null});
  const beforeFrame=session.snapshot();

  const resumedBrain=learner();const resumed=new StockfishValueSession({brain:resumedBrain,
    panelReviews:[{panel,boundReview}],identity});resumed.restore(beforeFrame);
  const frame=await resumed.step();assert.equal(frame.learningApplied,true);assert.equal(resumedBrain.memory.events,1);
  const afterFrame=resumed.snapshot(),auditBrain=learner();
  const auditSession=new StockfishValueSession({brain:auditBrain,panelReviews:[{panel,boundReview}],identity});
  auditSession.restore(afterFrame);const receipt=auditSession.finish();
  assert.equal(auditBrain.memory.events,1);assert.equal(auditBrain.calls.length,0,'Finishing recovery must not replay adaptation');
  assert.equal(receipt.frame.reviewIdentity,frame.reviewIdentity);assert.equal(receipt.beforeMemoryHash,digest(initial));
  assert.equal(receipt.afterMemoryHash,digest(auditBrain.memory.snapshot()));

  const independentBrain=learner(),independent=new StockfishValueSession({brain:independentBrain,
    panelReviews:[{panel,boundReview}],identity});
  independent.start(experience,assessment(panel,independentBrain),{condition:'informative',shuffledStatus:null});
  const replay=await independent.step();assert.deepEqual(replay,frame);
  assert.deepEqual(independent.finish(),receipt);
});

test('curriculum stockfish-shuffled condition carries its pinned error-sign schedule',async()=>{
  const {panel,boundReview}=panelFixture(),brain=learner(),scheduleSha256='e'.repeat(64);
  const session=new StockfishValueSession({brain,panelReviews:[{panel,boundReview}],identity:'b'.repeat(64),
    stockfishShuffleIdentity:scheduleSha256});
  const block=new CurriculumBlockSession({session,currentStage:1,
    registeredPanels:[{panelId:panel.panelId,stage:1},{panelId:'other',stage:1}],
    condition:'stockfish-shuffled',shuffleIdentity:scheduleSha256});
  const options=block.options(null,2),experience=panel.experiences[0];
  assert.deepEqual(options,{condition:'shuffled',shuffledStatus:null,stockfishShuffle:{
    schema:'matched-stockfish-error-shuffle-v1',scheduleSha256,eventIndex:2,errorSign:-1}});
  const started=session.start(experience,assessment(panel,brain),options);
  assert.equal(started.skipped,false);
  const resumedBrain=learner(),resumed=new StockfishValueSession({brain:resumedBrain,
    panelReviews:[{panel,boundReview}],identity:'b'.repeat(64),stockfishShuffleIdentity:scheduleSha256});
  resumed.restore(session.snapshot());const receipt=await resumed.step(),reference=await session.step();
  assert.deepEqual(receipt,reference);
  assert.equal(receipt.condition,'shuffled');assert.equal(resumedBrain.calls[0].condition,'shuffled');
  assert.deepEqual(resumedBrain.calls[0].shuffle,options.stockfishShuffle);
  assert.deepEqual(resumed.finish(),session.finish());
});

test('Lichess block runner and independent audit accept the async Stockfish value session',async t=>{
  const panels=[panelAt('panel-a','family-a','6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1').panel,
    panelAt('panel-b','family-b','6k1/8/8/8/pP5r/8/8/R1K5 w - - 0 1').panel];
  const panelReviews=panels.map(panel=>({panel,boundReview:stockfishPanelReview(panel)}));
  const calls=[],identity='b'.repeat(64),registrations=panels.map(panel=>({panelId:panel.panelId,stage:1}));
  const createBlock=brain=>{
    const session=new StockfishValueSession({brain,panelReviews,identity});
    return new CurriculumBlockSession({session,currentStage:1,registeredPanels:registrations,condition:'informative'});
  };
  const createBrain=()=>{
    const brain=learner({calls});
    brain.assess=async(board,moves)=>{
      const panel=panels.find(row=>row.context.fen===board.fen());assert(panel);
      const chosen=panel.experiences.find(row=>row.status==='success').move;brain.presentations+=moves.length;
      const rows=moves.map(move=>({move:uci(move),score:uci(move)===chosen?1:0}));
      return {rows,choice:chosen,tiedTopMoves:[chosen]};
    };
    return brain;
  };
  const brain=createBrain(),block=createBlock(brain),outputDir=resolve('runs',`stockfish-value-session-${randomUUID()}`);
  t.after(()=>rmSync(outputDir,{recursive:true,force:true}));
  const familyRegistrationSha256='f'.repeat(64),stageIdentity=digest({test:'stockfish-value-block'});
  const result=await runLichessCurriculumBlock({panels,block,brain,
    familyRegistrationSha256,identity:stageIdentity,outputDir,
    guard:()=>{},pace:async()=>{}});
  assert.equal(result.ready,true);assert.equal(result.completedBlocks,1);assert.equal(brain.memory.events,4);
  assert.equal(calls.length,4);assert(calls.every(row=>row.condition==='informative'));

  const auditBrain=createBrain(),auditBlock=createBlock(auditBrain),assess=async context=>{
    const panel=panels.find(row=>row.context.fen===context.fen);assert(panel);
    const board=new Chess();board.loadPgn(context.pgn);
    return (await assessLichessTrainingPanel(panel,auditBrain)).assessment;
  };
  assert.equal(auditBrain.memoryFingerprint(),result.plan.memoryHash,'Audit learner must start from the pinned prefix');
  const auditIdentity=JSON.parse(readFileSync(join(outputDir,'receipts.jsonl'),'utf8').split('\n')[0]).identity;
  const audit=await auditCurriculumBlock({block:auditBlock,plan:result.plan,identity:auditIdentity,
    runDir:outputDir,checkpoint:result.checkpoint,assess,
    selectionPresentations:panels.reduce((sum,panel)=>sum+panel.experiences.length,0),guard:()=>{},pace:async()=>{}});
  assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.stageAccepted,false);
  assert.equal(auditBrain.memory.events,4);

  const controlBrain=createBrain(),controlSession=new StockfishValueSession({brain:controlBrain,panelReviews,identity});
  const controlBlock=new CurriculumBlockSession({session:controlSession,currentStage:1,
    registeredPanels:registrations,condition:'outcome-only'});
  const controlDir=resolve('runs',`stockfish-value-control-${randomUUID()}`);
  t.after(()=>rmSync(controlDir,{recursive:true,force:true}));
  const control=await runLichessCurriculumBlock({panels,block:controlBlock,brain:controlBrain,
    familyRegistrationSha256,identity:stageIdentity,outputDir:controlDir,plan:result.plan,
    planFamilyRegistrationSha256:familyRegistrationSha256,guard:()=>{},pace:async()=>{}});
  assert.equal(control.ready,true);assert.equal(controlBrain.presentations,brain.presentations,
    'Outcome-only arm must match informative all-legal presentation exposure');
  const controlAuditBrain=createBrain(),controlAuditBlock=new CurriculumBlockSession({
    session:new StockfishValueSession({brain:controlAuditBrain,panelReviews,identity}),currentStage:1,
    registeredPanels:registrations,condition:'outcome-only'});
  const controlAudit=await auditCurriculumBlock({block:controlAuditBlock,plan:control.plan,
    identity:JSON.parse(readFileSync(join(controlDir,'receipts.jsonl'),'utf8').split('\n')[0]).identity,
    runDir:controlDir,checkpoint:control.checkpoint,assess:async context=>{
      const panel=panels.find(row=>row.context.fen===context.fen);assert(panel);
      return (await assessLichessTrainingPanel(panel,controlAuditBrain)).assessment;
    },selectionPresentations:panels.reduce((sum,panel)=>sum+panel.experiences.length,0),
    guard:()=>{},pace:async()=>{}});
  assert.equal(controlAudit.fullNeuralReplay,true);assert.equal(controlAuditBrain.memory.events,4);

  const shuffleIdentity='e'.repeat(64),shuffleCalls=calls.length,shuffleBrain=createBrain();
  const shuffleSession=new StockfishValueSession({brain:shuffleBrain,panelReviews,identity,
    stockfishShuffleIdentity:shuffleIdentity});
  const shuffleBlock=new CurriculumBlockSession({session:shuffleSession,currentStage:1,
    registeredPanels:registrations,condition:'stockfish-shuffled',shuffleIdentity});
  const shuffleDir=resolve('runs',`stockfish-value-shuffle-${randomUUID()}`);
  t.after(()=>rmSync(shuffleDir,{recursive:true,force:true}));
  const shuffled=await runLichessCurriculumBlock({panels,block:shuffleBlock,brain:shuffleBrain,
    familyRegistrationSha256,identity:stageIdentity,outputDir:shuffleDir,plan:result.plan,
    planFamilyRegistrationSha256:familyRegistrationSha256,guard:()=>{},pace:async()=>{}});
  assert.equal(shuffled.ready,true);assert.equal(shuffleCalls+4,calls.length);
  assert(calls.slice(shuffleCalls).every(row=>row.condition==='shuffled'
    &&row.shuffle?.scheduleSha256===shuffleIdentity&&row.shuffle.errorSign===-1));
  const shuffleAuditBrain=createBrain(),shuffleAuditBlock=new CurriculumBlockSession({
    session:new StockfishValueSession({brain:shuffleAuditBrain,panelReviews,identity,
      stockfishShuffleIdentity:shuffleIdentity}),currentStage:1,registeredPanels:registrations,
    condition:'stockfish-shuffled',shuffleIdentity});
  const shuffleAudit=await auditCurriculumBlock({block:shuffleAuditBlock,plan:shuffled.plan,
    identity:JSON.parse(readFileSync(join(shuffleDir,'receipts.jsonl'),'utf8').split('\n')[0]).identity,
    runDir:shuffleDir,checkpoint:shuffled.checkpoint,assess:async context=>{
      const panel=panels.find(row=>row.context.fen===context.fen);assert(panel);
      return (await assessLichessTrainingPanel(panel,shuffleAuditBrain)).assessment;
    },selectionPresentations:panels.reduce((sum,panel)=>sum+panel.experiences.length,0),
    guard:()=>{},pace:async()=>{}});
  assert.equal(shuffleAudit.fullNeuralReplay,true);assert.equal(shuffleAuditBrain.memory.events,4);

  const stageBrain=createBrain(),stageSession=new StockfishValueSession({brain:stageBrain,panelReviews,identity});
  const stageBlock=new CurriculumBlockSession({session:stageSession,currentStage:1,
    registeredPanels:registrations,condition:'informative'});
  const stageDir=resolve('runs',`stockfish-value-stage-${randomUUID()}`);
  t.after(()=>rmSync(stageDir,{recursive:true,force:true}));
  const stage=await runLichessCurriculumStage({panels,block:stageBlock,brain:stageBrain,
    familyRegistrationSha256,identity:stageIdentity,outputDir:stageDir,maxBlocks:1,
    guard:()=>{},pace:async()=>{}});
  assert.equal(stage.status,'training-complete');assert.equal(stage.stageAccepted,false);
  const stageAudit=await auditLichessCurriculumStage({checkpoint:stage.checkpoint,identity:stageIdentity,
    createReplayBlock:async()=>{
      const replayBrain=createBrain(),replaySession=new StockfishValueSession({brain:replayBrain,panelReviews,identity});
      const replayBlock=new CurriculumBlockSession({session:replaySession,currentStage:1,
        registeredPanels:registrations,condition:'informative'});
      return {block:replayBlock,selectionPresentations:panels.reduce((sum,panel)=>sum+panel.experiences.length,0),
        assess:async context=>{
          const panel=panels.find(row=>row.context.fen===context.fen);assert(panel);
          return (await assessLichessTrainingPanel(panel,replayBrain)).assessment;
        }};
    },guard:()=>{},pace:async()=>{}});
  assert.equal(stageAudit.fullNeuralReplay,true);assert.equal(stageAudit.completedBlocks,1);
  assert.equal(stageAudit.stageAccepted,false);assert.equal(stageBrain.memory.events,4);
});
