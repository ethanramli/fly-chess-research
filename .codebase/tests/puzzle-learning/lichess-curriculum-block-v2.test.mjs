import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {Chess} from 'chess.js';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {bindLichessStockfishReview} from '../../src/puzzle-learning/lichess-stockfish-review.mjs';
import {StockfishValueSession} from '../../src/puzzle-learning/stockfish-value-session.mjs';
import {CurriculumBlockSession} from '../../src/puzzle-learning/curriculum-block-session.mjs';
import {runLichessCurriculumStage,earlyStopDecision} from '../../src/puzzle-learning/lichess-curriculum-block-v2.mjs';
import {runLichessCurriculumStageMatrix} from '../../src/puzzle-learning/lichess-curriculum-matrix-v2.mjs';
import {auditLichessCurriculumStage} from '../../src/puzzle-learning/lichess-curriculum-stage-audit.mjs';
import {assessLichessTrainingPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';
import {trainingControls,pauseRequested} from '../../scripts/puzzle-learning/run-lichess-curriculum-matrix-v2.mjs';

// Software fixture copied from stockfish-value-session.test.mjs: two capture-retention
// panels, a stub learner that always ranks the certified move first, and the real
// session, block session, block runner, checkpoints and independent stage audit.
const task={objective:'capture-retention',plies:1};
const uci=move=>move.from+move.to+(move.promotion??'');
function panelAt(panelId,fen){
  const board=new Chess(fen);
  const context={fen:board.fen(),pgn:board.pgn(),task},experiences=board.moves({verbose:true}).map(move=>{
    const text=uci(move),proof=certifyCaptureRetentionAction(board,text,task);
    return {context,move:text,proof,...checkCaptureRetentionAction(board,text,task,proof)};
  });
  return {panelId,familyId:`${panelId}-family`,familyRegistrationSha256:'f'.repeat(64),
    puzzleId:panelId,gameId:'Game0001',stage:1,split:'train',context,experiences};
}
const panels=[panelAt('panel-a','6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1'),panelAt('panel-b','6k1/8/8/8/pP5r/8/8/R1K5 w - - 0 1')];
const registrations=panels.map(panel=>({panelId:panel.panelId,stage:1}));
const panelReviews=panels.map(panel=>{
  const board=new Chess();board.loadPgn(panel.context.pgn);
  const engine={binarySha256:'c'.repeat(64),settingsHash:'d'.repeat(64)};
  const analyses=board.moves({verbose:true}).flatMap(move=>{
    const child=new Chess();child.loadPgn(panel.context.pgn);child.move(move);
    return [100,200].map(budget=>({move:uci(move),budget,engine,fen:child.fen(),pgn:child.pgn(),completed:true,
      transcript:['info depth 10 score cp 0 wdl 500 0 500 nodes 200 pv a1a2']}));
  });
  return {panel,boundReview:bindLichessStockfishReview(panel,{criterion:'full-game-expected-score',context:panel.context,
    actor:board.turn(),chosen:panel.experiences[0].move,taskProof:panel.experiences[0].proof,engine,analyses})};
});
function learner(){
  const memory={events:0,state:0,snapshot(){return {events:this.events,state:this.state};},
    restore(value){this.events=value.events;this.state=value.state;}};
  return {memory,presentations:0,valueIdentity:'a'.repeat(64),
    memoryFingerprint(){return digest(memory.snapshot());},
    verifyExperience(board,move,taskContext,proof){return checkCaptureRetentionAction(board,move,taskContext,proof);},
    async assess(board,moves){
      const panel=panels.find(row=>row.context.fen===board.fen());
      const chosen=panel.experiences.find(row=>row.status==='success').move;this.presentations+=moves.length;
      return {rows:moves.map(move=>({move:uci(move),score:uci(move)===chosen?1:0})),choice:chosen,tiedTopMoves:[chosen]};
    },
    async replayValue(review,{condition}){
      const before=memory.snapshot();this.presentations+=3;
      if(['informative','outcome-only','outcome-shuffled','shuffled'].includes(condition)){memory.events++;memory.state++;}
      const after=memory.snapshot();
      return {schema:'test-stockfish-value-result-v1',condition,teacherReview:review,before,after,
        learningApplied:after.events>before.events,skipped:false};
    }};
}
const identity='b'.repeat(64),stageIdentity=digest({test:'lichess-curriculum-block-v2'});
function runtime(condition='informative'){
  const brain=learner(),session=new StockfishValueSession({brain,panelReviews,identity});
  return {brain,block:new CurriculumBlockSession({session,currentStage:1,registeredPanels:registrations,condition})};
}
const fresh=t=>{const dir=resolve('runs',`block-v2-test-${randomUUID()}`);t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;};
const stageArgs={panels,familyRegistrationSha256:'f'.repeat(64),identity:stageIdentity,guard:()=>{},pace:async()=>{}};

test('early-stop rule: stop when the best count has not risen within the window', () => {
  assert.equal(earlyStopDecision([2],2),null);assert.equal(earlyStopDecision([1,2],2),null);
  assert.equal(earlyStopDecision([1,2,3],2),null);assert.equal(earlyStopDecision([2,1,4,3],2),null);
  const stop=earlyStopDecision([2,4,3,3],2);
  assert.deepEqual([stop.bestBefore,stop.bestRecent,stop.windowBlocks],[4,3,2]);
  assert.match(stop.reason,/no improvement/);
  assert(earlyStopDecision([3,3,3],2));
});

test('stage v2: registered early stop publishes gate-failed with counts; cap alternates targets', async t => {
  const {brain,block}=runtime(),outputDir=fresh(t);
  const result=await runLichessCurriculumStage({...stageArgs,block,brain,outputDir,maxBlocks:6,
    planner:{maxConsecutiveTargets:1},earlyStop:{windowBlocks:2}});
  assert.equal(result.status,'gate-failed');assert.match(result.reason,/^early-stop: /);
  assert.equal(result.completedBlocks,2,'stops before block 2: counts 2,2,2 never improve');
  assert.deepEqual(result.earlyStop.counts,[2,2,2]);
  assert.deepEqual(result.history.map(row=>row.trainingCorrect),[2,2]);
  assert.notEqual(result.history[0].targetPanelId,result.history[1].targetPanelId,'cap M=1 forbids a repeat target');
  assert(existsSync(join(outputDir,'early-stop.json'))&&existsSync(join(outputDir,'result.json')));
  assert.equal(JSON.parse(readFileSync(join(outputDir,'result.json'),'utf8')).status,'gate-failed');
  assert.equal(brain.memory.events,8,'two complete blocks of four events, none of the stopped block');
  await assert.rejects(runLichessCurriculumStage({...stageArgs,...runtime(),outputDir:fresh(t),maxBlocks:2,
    earlyStop:{windowBlocks:1}}),/planner v2/);
});

test('stage v2: pause at a block boundary, then resume to the same audited result', async t => {
  let boundaries=0;
  const first=runtime(),firstDir=fresh(t);
  const paused=await runLichessCurriculumStage({...stageArgs,...first,outputDir:firstDir,maxBlocks:3,
    planner:{maxConsecutiveTargets:2},shouldPause:()=>++boundaries===2});
  assert.equal(paused.status,'paused');assert.equal(paused.completedBlocks,1);
  assert.match(paused.checkpoint,/stage-checkpoint-001\.json\.gz$/);assert(existsSync(paused.checkpoint));
  assert(!existsSync(join(firstDir,'result.json')),'a pause never publishes a training result');
  assert.equal(first.brain.memory.events,4);
  const second=runtime(),secondDir=fresh(t);
  const done=await runLichessCurriculumStage({...stageArgs,...second,outputDir:secondDir,maxBlocks:3,
    planner:{maxConsecutiveTargets:2},resumeStageFrom:paused.checkpoint});
  assert.equal(done.status,'training-complete');assert.equal(done.completedBlocks,3);
  assert.equal(second.brain.memory.events,12);
  assert.deepEqual(done.history.map(row=>row.trainingCorrect),[2,2,2]);
  const audit=await auditLichessCurriculumStage({checkpoint:done.checkpoint,identity:stageIdentity,
    createReplayBlock:async()=>{const replay=runtime();
      return {block:replay.block,selectionPresentations:panels.reduce((n,p)=>n+p.experiences.length,0),
        assess:async context=>(await assessLichessTrainingPanel(panels.find(p=>p.context.fen===context.fen),replay.brain)).assessment};},
    guard:()=>{},pace:async()=>{}});
  assert.equal(audit.fullNeuralReplay,true);assert.equal(audit.completedBlocks,3);
});

test('matrix v2: a pause leaves a resumable state without result.json; resume completes every arm', async t => {
  const conditions=['informative','absent','disabled'],base={stage:1,replicas:['r1'],conditions,maxBlocks:2,
    registrationSha256:'e'.repeat(64),guard:()=>{},pace:async()=>{},planner:{maxConsecutiveTargets:2},
    createArm:async({condition,outputDir,identity:armIdentity})=>{const arm=runtime(condition);
      return {...arm,panels,familyRegistrationSha256:'f'.repeat(64),identity:armIdentity,outputDir};}};
  let boundaries=0;const firstDir=fresh(t);
  const paused=await runLichessCurriculumStageMatrix({...base,outputDir:firstDir,shouldPause:()=>++boundaries===2});
  assert.equal(paused.status,'paused');assert.equal(paused.lineageKey,'r1:informative');
  assert(!existsSync(join(firstDir,'result.json')));
  const state=JSON.parse(readFileSync(join(firstDir,'matrix-state.json'),'utf8'));
  assert.equal(state.status,'running');assert.equal(state.active.latestCheckpoint,paused.checkpoint);
  const secondDir=fresh(t);
  const done=await runLichessCurriculumStageMatrix({...base,outputDir:secondDir,resumeStatePath:join(firstDir,'matrix-state.json')});
  assert.equal(done.status,'training-complete');assert.equal(Object.keys(done.lineageResults).length,3);
});

test('runner v2 controls and pause requests are validated', t => {
  assert.deepEqual(trainingControls({maxBlocks:8}),{planner:null,earlyStop:null});
  assert.deepEqual(trainingControls({maxBlocks:8,rehearsalPlanner:{schema:'curriculum-rehearsal-plan-v2',maxConsecutiveTargets:3},
    earlyStop:{schema:'informative-training-progress-v1',windowBlocks:4}}),{planner:{maxConsecutiveTargets:3},earlyStop:{windowBlocks:4}});
  assert.throws(()=>trainingControls({maxBlocks:8,earlyStop:{schema:'informative-training-progress-v1',windowBlocks:4}}),/planner v2/);
  assert.throws(()=>trainingControls({maxBlocks:4,rehearsalPlanner:{schema:'curriculum-rehearsal-plan-v2',maxConsecutiveTargets:3},
    earlyStop:{schema:'informative-training-progress-v1',windowBlocks:4}}),/window/);
  assert.throws(()=>trainingControls({maxBlocks:8,rehearsalPlanner:{schema:'other',maxConsecutiveTargets:3}}),/planner/);
  const dir=fresh(t);mkdirSync(dir,{recursive:true});const protocol='9'.repeat(64);
  assert.equal(pauseRequested(dir,protocol),false);
  const write=value=>writeFileSync(join(dir,'pause-request.json'),typeof value==='string'?value:JSON.stringify(value));
  write({schema:1,run:dir,protocolHash:'8'.repeat(64)});assert.equal(pauseRequested(dir,protocol),false);
  write({schema:1,run:join(dir,'..'),protocolHash:protocol});assert.equal(pauseRequested(dir,protocol),false);
  write('{not json');assert.equal(pauseRequested(dir,protocol),false);
  write({schema:1,run:dir,protocolHash:protocol,requestedAt:'now'});assert.equal(pauseRequested(dir,protocol),true);
});
