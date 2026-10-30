import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {bindLichessTrainingPanel,assessLichessTrainingPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';
import {bindLichessStockfishReview,stockfishReviewForAssessment} from '../../src/puzzle-learning/lichess-stockfish-review.mjs';
import {collectLichessStockfishReview} from '../../src/puzzle-learning/stockfish-review-collector.mjs';
import {planCurriculumRehearsalBlock} from '../../src/puzzle-learning/curriculum-rehearsal-plan.mjs';
import {certifyCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';

const uci=move=>move.from+move.to+(move.promotion??'');
const hash=value=>createHash('sha256').update(value).digest('hex');

function fixture(split='train'){
  const board=new Chess('r6k/8/p7/8/p7/8/R7/7K w - - 0 1');
  const task={objective:'capture-retention',plies:1},context={fen:board.fen(),pgn:board.pgn(),task};
  const candidates=certifyCaptureRetentionActions(board,task);
  const lesson={schema:'lichess-capture-lesson-v1',puzzleId:'puzzle1',gameId:'Game1234',context,
    pieceCount:6,candidates:candidates.map(candidate=>({move:candidate.move,proof:candidate.proof,
      status:candidate.proof.status,actor:board.turn(),learningAllowed:true,
      certificateSha256:candidate.proof.certificateSha256})),stage1DomainEligible:true};
  const history={schema:'lichess-history-binding-v1',puzzleId:'puzzle1',gameId:'Game1234',
    historyStatus:'verified-standard-start-prefix',context:{fen:context.fen,pgn:context.pgn},
    prefixPgnSha256:hash(context.pgn)};
  const record={split,history,lesson};
  const family={panelId:'panel1',familyId:'family1',puzzleId:'puzzle1',stage:1,split,stratum:'open-defender',
    registrationSha256:'a'.repeat(64)};
  return {record,family,board,task};
}

test('binds a training family to the checked all-legal Lichess lesson',()=>{
  const {record,family,board}=fixture();
  const panel=bindLichessTrainingPanel(record,family);
  assert.equal(panel.panelId,'panel1');assert.equal(panel.familyId,'family1');
  assert.deepEqual(panel.experiences.map(experience=>experience.move),board.moves({verbose:true}).map(uci).sort());
  assert(panel.experiences.some(experience=>experience.status==='success'));
  assert(panel.experiences.some(experience=>experience.status==='failure'));
});

test('training binding refuses reserved splits, missing actions and forged certificates',()=>{
  const reserved=fixture('validation');
  assert.throws(()=>bindLichessTrainingPanel(reserved.record,reserved.family),/Expected train source row/);
  const incomplete=fixture();incomplete.record.lesson.candidates.pop();
  assert.throws(()=>bindLichessTrainingPanel(incomplete.record,incomplete.family),/all-legal/);
  const forged=fixture();forged.record.lesson.candidates[0].proof.certificateSha256='0'.repeat(64);
  assert.throws(()=>bindLichessTrainingPanel(forged.record,forged.family));
});

test('captures a fresh all-legal unaided choice and records ties without changing memory',async()=>{
  const {record,family,board,task}=fixture(),panel=bindLichessTrainingPanel(record,family);
  const memoryHash='b'.repeat(64),brain={memoryFingerprint:()=>memoryHash,
    async assess(position,moves,assessedTask){
      assert.equal(position.pgn(),board.pgn());assert.deepEqual(assessedTask,task);
      const rows=moves.map(move=>({move:uci(move),score:0}));
      return {rows,choice:null,tiedTopMoves:rows.map(row=>row.move).sort(),memoryFingerprint:memoryHash};
    }};
  const observation=await assessLichessTrainingPanel(panel,brain);
  assert.equal(observation.assessment.choice,null);
  assert.deepEqual(observation.assessment.tiedTopMoves,observation.assessment.rows.map(row=>row.move).sort());
  assert.equal(observation.assessment.memoryHash,memoryHash);
  assert.deepEqual(observation.experiences,panel.experiences);
  const second={...structuredClone(observation),panelId:'panel2',familyId:'family2'};
  const planned=planCurriculumRehearsalBlock([observation,second],memoryHash,{currentStage:1,blockIndex:0,
    registeredPanels:[{panelId:'panel1',stage:1},{panelId:'panel2',stage:1}]});
  assert.equal(planned.ready,true,'Assessment output must be directly consumable by the rehearsal planner');
});

function stockfishReview(panel){
  const board=new Chess();board.loadPgn(panel.context.pgn);
  const engine={binarySha256:'c'.repeat(64),settingsHash:'d'.repeat(64)};
  const analyses=board.moves({verbose:true}).flatMap(move=>{
    const child=new Chess();child.loadPgn(panel.context.pgn);child.move(move);
    return [100,200].map(budget=>({move:uci(move),budget,engine,fen:child.fen(),pgn:child.pgn(),completed:true,
      transcript:['info depth 10 score cp 0 wdl 500 0 500 nodes 200 pv a1a2']}));
  });
  return {criterion:'full-game-expected-score',context:structuredClone(panel.context),actor:board.turn(),
    chosen:panel.experiences[0].move,taskProof:panel.experiences[0].proof,engine,analyses};
}

test('binds all-legal Stockfish child estimates to the training panel and fresh Fly choice',()=>{
  const {record,family}=fixture(),panel=bindLichessTrainingPanel(record,family);
  const bound=bindLichessStockfishReview(panel,stockfishReview(panel));
  assert.equal(bound.ready,true);assert.equal(bound.candidateCount,panel.experiences.length);
  assert(bound.grades.every(row=>row.grade.selectedExpectedScore));
  const selected=panel.experiences.at(-1).move;
  const assessment={fen:panel.context.fen,pgn:panel.context.pgn,task:panel.context.task,memoryHash:'e'.repeat(64),
    choice:selected,rows:panel.experiences.map(row=>({move:row.move,score:row.move===selected?1:0}))};
  const review=stockfishReviewForAssessment(panel,bound,assessment);
  assert.equal(review.ready,true);assert.equal(review.chosen,selected);
  assert.equal(review.decision.taskProofSha256,panel.experiences.find(row=>row.move===selected).certificateSha256);
  assert.equal(review.decision.memoryHash,assessment.memoryHash);
});

test('Stockfish review refuses incomplete all-legal budgets and tied or stale Fly rankings',()=>{
  const {record,family}=fixture(),panel=bindLichessTrainingPanel(record,family),raw=stockfishReview(panel);
  raw.analyses.pop();
  const blocked=bindLichessStockfishReview(panel,raw);
  assert.equal(blocked.ready,false);assert.match(blocked.reason,/every legal action|two or more budgets/);
  const bound=bindLichessStockfishReview(panel,stockfishReview(panel));
  const tied={fen:panel.context.fen,pgn:panel.context.pgn,task:panel.context.task,memoryHash:'e'.repeat(64),
    choice:null,rows:panel.experiences.map(row=>({move:row.move,score:0}))};
  assert.equal(stockfishReviewForAssessment(panel,bound,tied).ready,false);
  const stale={...tied,choice:panel.experiences[0].move,rows:tied.rows.map((row,index)=>({...row,score:index?0:1})),
    fen:'8/8/8/8/8/8/8/K6k w - - 0 1'};
  assert.throws(()=>stockfishReviewForAssessment(panel,bound,stale),/position mismatch/);
});

test('collects pinned matched-budget Stockfish estimates for every legal child and binds the review',async()=>{
  const board=new Chess();for(const move of ['e2e4','e7e5','g1f3'])board.move(move);
  const task={objective:'capture-retention',plies:1},context={fen:board.fen(),pgn:board.pgn(),task};
  const panel={panelId:'uci-panel',familyId:'uci-family',familyRegistrationSha256:'f'.repeat(64),
    puzzleId:'uci-puzzle',gameId:'Game0001',stage:1,split:'train',context,
    experiences:certifyCaptureRetentionActions(board,task).map(row=>({context,move:row.move,proof:row.proof,
      ...((row.proof.status==='unknown')?{}:{status:row.proof.status,actor:board.turn(),learningAllowed:true,
        certificateSha256:row.proof.certificateSha256})}))};
  const executable=process.execPath,args=[];
  let guards=0,lines=0;const guard=()=>guards++,positions=[];
  const review=await collectLichessStockfishReview(panel,{executable,args,budgets:[1000,2000],timeoutMs:5000,
    guard,record:()=>lines++,analyzerFactory:()=>({name:'Stockfish fixture engine',
      async initialize(){lines+=6;},async analyze(position,budget){
        guard();assert.match(position,/^startpos/);positions.push(position);assert([1000,2000].includes(budget));lines+=2;
        return {completed:true,transcript:['info depth 8 score cp 0 wdl 500 0 500 nodes 1000 pv a2a3']};
      },close(){}})});
  const legalCount=board.moves({verbose:true}).length;
  assert.equal(review.ready,true);assert.equal(review.candidateCount,legalCount);assert.equal(review.analyses.length,legalCount*2);
  assert.equal(review.grades.length,legalCount);assert(guards>=legalCount*3);assert(lines>=6+legalCount*4);
  assert(positions.every(position=>position.includes('moves e2e4 e7e5 g1f3 ')));
  assert(review.analyses.every(row=>row.completed&&row.transcript.some(line=>line.includes('wdl 500 0 500'))));
  assert.equal(review.engine.binarySha256,hash((await import('node:fs')).readFileSync(executable)));
  assert.equal(review.engine.name,'Stockfish fixture engine');
});
