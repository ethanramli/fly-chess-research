// Bind bounded Stockfish estimates to an audited training panel and the Fly's
// fresh unaided choice. Engine values remain a separate teacher signal.
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {digest} from '../neural-learning/mushroom-body.mjs';
import {gradeStockfishChoice} from '../search-and-feedback/stockfish-feedback-rubric.mjs';
import {verifiedExperience} from '../search-and-feedback/verified-feedback.mjs';
import {checkCaptureRetentionAction} from '../search-and-feedback/capture-retention-action-domain.mjs';

const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const uci=move=>move.from+move.to+(move.promotion??'');
const checkPanelExperience=(board,experience,task)=>task?.objective==='capture-retention'
  ?checkCaptureRetentionAction(board,experience.move,task,experience.proof)
  :verifiedExperience(board,experience.move,task,experience.proof);

function assertPanel(panel){
  assert.equal(panel?.split,'train','Stockfish teaching may use training panels only');
  assert([1,2].includes(panel?.stage),'This review binding is registered only for Stages 1 and 2');
  assert(isHash(panel?.familyRegistrationSha256),'Require pinned family registration');
  assert(typeof panel?.panelId==='string'&&typeof panel?.familyId==='string');
  const task=panel.context?.task;
  if(panel.stage===1)assert.deepEqual(task,{objective:'capture-retention',plies:1});
  else{
    assert.deepEqual(Object.keys(task??{}).sort(),['objective','plies']);
    assert(task.objective==='avoid-mate'&&task.plies===3
      ||task.objective==='forced-mate'&&[1,3].includes(task.plies),
    'Stage 2 Stockfish panels require a registered bounded mate task');
  }
  const board=new Chess();board.loadPgn(panel.context.pgn);
  assert.equal(board.fen(),panel.context.fen,'Panel history/position mismatch');
  assert(Array.isArray(panel.experiences),'Missing independently checked action certificates');
  const legal=board.moves({verbose:true}).map(uci).sort();
  assert.deepEqual(panel.experiences.map(row=>row.move).sort(),legal,'Require one proof for every legal action');
  for(const experience of panel.experiences){
    assert.deepEqual(experience.context,panel.context,'Action proof belongs to another panel');
    const checked=checkPanelExperience(board,experience,panel.context.task);
    assert.equal(checked.learningAllowed,true,'Unknown task consequence cannot enter a teaching panel');
    for(const key of ['status','actor','certificateSha256'])assert.equal(experience[key],checked[key],`Changed ${key}`);
  }
  return {board,legal};
}

// The review must contain every legal child at the same two or more fixed
// budgets. Re-grade each action so a prepared review cannot hide an omitted
// action behind a convenient selected move.
export function bindLichessStockfishReview(panel,review,{maxBytes=8*2**20}={}){
  const {board,legal}=assertPanel(panel);
  assert.deepEqual(review?.context,panel.context,'Stockfish review uses another puzzle history/task');
  assert.equal(review.actor,board.turn(),'Stockfish review actor mismatch');
  assert.equal(review.criterion,'full-game-expected-score');
  assert(Number.isSafeInteger(maxBytes)&&maxBytes>=1024&&maxBytes<=16*2**20);
  const encoded=JSON.stringify(review);
  assert(Buffer.byteLength(encoded)<=maxBytes,'Stockfish review exceeds the registered byte bound');
  assert(Array.isArray(review.analyses)&&review.analyses.length<=4096,'Bound Stockfish analysis records');
  const byMove=new Map(panel.experiences.map(row=>[row.move,row]));
  const grades=[];
  for(const move of legal){
    const experience=byMove.get(move);
    const candidateReview={...review,chosen:move,taskProof:experience.proof};
    const grade=gradeStockfishChoice(candidateReview);
    if(grade.grade==='unknown'||!grade.selectedExpectedScore){
      return {ready:false,reason:grade.reason??'Incomplete all-legal Stockfish evidence',
        blockedMove:move,scope:'No Stockfish teaching event is eligible from this panel'};
    }
    grades.push({move,grade});
  }
  const engine=structuredClone(review.engine);
  const fields={panelId:panel.panelId,familyId:panel.familyId,
    familyRegistrationSha256:panel.familyRegistrationSha256,puzzleId:panel.puzzleId,gameId:panel.gameId,
    context:structuredClone(panel.context),engine,analyses:structuredClone(review.analyses),
    grades,reviewSha256:digest(review),candidateCount:legal.length,
    scope:'All-legal child-position Stockfish estimates at matched bounded budgets; estimates are not verified consequences'};
  const body=panel.stage===1
    ?{schema:'lichess-stockfish-panel-review-v1',...fields}
    :{schema:'lichess-stockfish-panel-review-v2',stage:panel.stage,...fields};
  return {...body,ready:true,identity:digest(body)};
}

// Build the StockfishValueBrain input from the exact fresh all-legal ranking.
// Ties are unresolved and produce no engine-assisted event.
export function stockfishReviewForAssessment(panel,boundReview,assessment,{reviewedAction}={}){
  assert.equal(boundReview?.ready,true,'Panel lacks a complete bound Stockfish review');
  const {identity,ready,...boundBody}=boundReview;
  assert.equal(identity,digest(boundBody),'Changed bound Stockfish review');
  assert.equal(boundReview.panelId,panel.panelId);
  assert.equal(boundReview.schema,panel.stage===1?'lichess-stockfish-panel-review-v1':'lichess-stockfish-panel-review-v2');
  if(panel.stage===2)assert.equal(boundReview.stage,panel.stage);
  assert.equal(boundReview.familyRegistrationSha256,panel.familyRegistrationSha256);
  const {board,legal}=assertPanel(panel);
  assert.deepEqual(boundReview.context,panel.context);
  assert.deepEqual(assessment?.fen,board.fen(),'Unaided assessment position mismatch');
  assert.equal(assessment.pgn,board.pgn(),'Unaided assessment history mismatch');
  assert.deepEqual(assessment.task,panel.context.task,'Unaided assessment task mismatch');
  assert(isHash(assessment.memoryHash),'Require current memory identity');
  assert(Array.isArray(assessment.rows));
  const rows=[...assessment.rows].sort((a,b)=>a.move.localeCompare(b.move));
  assert.deepEqual(rows.map(row=>row.move),legal,'Require a fresh all-legal learner ranking');
  assert(rows.every(row=>Number.isFinite(row.score)),'Invalid learner score');
  const best=Math.max(...rows.map(row=>row.score));
  const tied=rows.filter(row=>row.score===best).map(row=>row.move).sort();
  assert.equal(assessment.choice,tied.length===1?tied[0]:null,'Learner choice/ranking mismatch');
  const candidateReview=reviewedAction!==undefined;
  if(!candidateReview&&tied.length!==1)return {ready:false,reason:'Learner has no unique action to review',tiedTopMoves:tied};
  const action=candidateReview?reviewedAction:assessment.choice;
  assert(legal.includes(action),'Reviewed candidate must be legal in the exact task context');
  const experience=panel.experiences.find(row=>row.move===action);
  const grade=boundReview.grades.find(row=>row.move===action)?.grade;
  assert(experience&&grade,'Missing chosen-action proof or engine target');
  const review={criterion:'full-game-expected-score',context:structuredClone(panel.context),
    actor:experience.actor,chosen:experience.move,taskProof:structuredClone(experience.proof),
    engine:structuredClone(boundReview.engine),analyses:structuredClone(boundReview.analyses),
    panelReviewIdentity:boundReview.identity,panelReviewSha256:boundReview.reviewSha256,
    decision:{memoryHash:assessment.memoryHash,rows:structuredClone(rows),choice:assessment.choice,
      taskProofSha256:experience.certificateSha256,
      ...(candidateReview?{schema:'planned-candidate-review-decision-v1',reviewedAction:action}:{} )},grade:structuredClone(grade),
    scope:candidateReview?'Planned candidate reviewed with the fresh own ranking/choice recorded separately; not a relabeled learner choice':
      'Own unaided all-legal action reviewed against separately pinned engine estimates and independently checked task consequence'};
  return {...review,ready:true,identity:digest(review)};
}
