// Block v3 regression (2026-10-30, ledger L106): a stage resume from a block checkpoint taken inside an
// event completes to the uninterrupted result, and the same resume through v2 throws.
// ponytail: fixtures copied from lichess-curriculum-block-v2.test.mjs, not imported, because importing that
// file would register its tests here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {Chess} from 'chess.js';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {bindLichessStockfishReview} from '../../src/puzzle-learning/lichess-stockfish-review.mjs';
import {StockfishValueSession} from '../../src/puzzle-learning/stockfish-value-session.mjs';
import {CurriculumBlockSession} from '../../src/puzzle-learning/curriculum-block-session.mjs';
import {runLichessCurriculumStage} from '../../src/puzzle-learning/lichess-curriculum-block-v3.mjs';
import {runLichessCurriculumStage as runLichessCurriculumStageV2} from '../../src/puzzle-learning/lichess-curriculum-block-v2.mjs';

// Software fixture copied from stockfish-value-session.test.mjs: two capture-retention
// panels, a stub learner that always ranks the certified move first, and the real
// session, block session, block runner and checkpoints.
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
const identity='b'.repeat(64),stageIdentity=digest({test:'lichess-curriculum-block-v3'});
function runtime(condition='informative'){
  const brain=learner(),session=new StockfishValueSession({brain,panelReviews,identity});
  return {brain,block:new CurriculumBlockSession({session,currentStage:1,registeredPanels:registrations,condition})};
}
const fresh=t=>{const dir=resolve('runs',`block-v3-test-${randomUUID()}`);t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;};
const stageArgs={panels,familyRegistrationSha256:'f'.repeat(64),identity:stageIdentity,guard:()=>{},pace:async()=>{}};

test('block v3: resume from a mid-event block checkpoint matches the uninterrupted run; v2 throws', async t => {
  const planner={maxConsecutiveTargets:2},maxBlocks=2;
  const reference=runtime(),done=await runLichessCurriculumStage({...stageArgs,...reference,outputDir:fresh(t),maxBlocks,planner});
  assert.equal(done.status,'training-complete');

  // Crash at the first pace call of block 2, after its first event has started: the newest block
  // checkpoint is then the acknowledged event-start state, with the event still open.
  const crashed=runtime(),crashDir=fresh(t);
  await assert.rejects(runLichessCurriculumStage({...stageArgs,...crashed,outputDir:crashDir,maxBlocks,planner,
    pace:async()=>{if(crashed.block.completedBlocks===1)throw Object.assign(new Error('simulated crash'),{code:'SIMULATED_CRASH'});}}),
  /simulated crash/);
  const blockDir=join(crashDir,'block-02'),stageCheckpoint=join(crashDir,'stage-checkpoint-001.json.gz');
  const blockCheckpoint=join(blockDir,readdirSync(blockDir).filter(name=>/^checkpoint-\d{6}\.json\.gz$/.test(name)).sort().at(-1));
  const midEvent=decodeCheckpoint(readFileSync(blockCheckpoint));
  assert.equal(midEvent.startBlock,1);assert.notEqual(midEvent.block.session.pending,null,'checkpoint must be mid-event');

  const resumed=runtime(),resumedDone=await runLichessCurriculumStage({...stageArgs,...resumed,outputDir:fresh(t),maxBlocks,planner,
    resumeStageFrom:stageCheckpoint,resumeBlockFrom:blockCheckpoint});
  assert.equal(resumedDone.status,'training-complete');
  assert.deepEqual(resumedDone.history.map(row=>[row.chainHash,row.receiptCount]),done.history.map(row=>[row.chainHash,row.receiptCount]));
  assert.equal(resumedDone.finalMemorySha256,done.finalMemorySha256);
  assert.equal(digest(resumed.block.snapshot()),digest(reference.block.snapshot()));

  // The same resume through block v2 is the registered bug: it asserts no pending event before the restored event.
  await assert.rejects(runLichessCurriculumStageV2({...stageArgs,...runtime(),outputDir:fresh(t),maxBlocks,planner,
    resumeStageFrom:stageCheckpoint,resumeBlockFrom:blockCheckpoint}),/Expected values to be strictly equal/);
});
