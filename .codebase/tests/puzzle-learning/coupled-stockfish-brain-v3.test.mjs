import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';
import {ReversalMemory} from '../../src/neural-learning/reversal-memory.mjs';
import {CoupledStockfishBrain} from '../../src/puzzle-learning/coupled-stockfish-brain.mjs';
import {CoupledStockfishBrainV3,rootPerspectiveValue,deliveredValueError} from '../../src/puzzle-learning/coupled-stockfish-brain-v3.mjs';
import {bindLichessStockfishReview,stockfishReviewForAssessment} from '../../src/puzzle-learning/lichess-stockfish-review.mjs';
import {certifyCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {assessLichessTrainingPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';

// Eight-cell numerical fixture copied from coupled-stockfish-feedback.test.mjs; the
// stub encoder reports the perspective a real v2 cue would report.
function learner(Brain,perspective){
  const graph={row:Int32Array.from([0,0,0,0,0,0,0,2,4]),col:Int32Array.from([0,1,0,1]),
    sign:Int8Array.from([1,1,1,1]),initial:Float32Array.from([1,1,1,1]),input:Int32Array.from([0]),output:Int32Array.from([7])};
  const mapping={readyForCandidateExperiment:true,groups:['left','right'].flatMap((side,index)=>[
    {side,mbonType:'MBON01',danType:'PAM02',kc:[index],edges:[2+index],dan:[{index:2+index*2,rootId:String(100+index*2)}]},
    {side,mbonType:'MBON12',danType:'PPL103',kc:[index],edges:[index],dan:[{index:3+index*2,rootId:String(101+index*2)}]}])};
  const model=new SparseTrainer(graph,{inputDim:1,outputs:1});model.params.bias[6]=0.2;
  const memory=new ReversalMemory(model,mapping);model.forward([0]);
  return new Brain({model,memory,mapping,rest:Float32Array.from(model.h[model.steps]),
    encoder:{identity:'e'.repeat(64),encode:(board,action)=>({stimulation:[{index:0,current:action===null?1.25:1.5}],
      perspective:action!==null?'actor':board.history().length?perspective:'side-to-move'})},
    maxPresentations:1024,readouts:{MBON12:[{index:6}],MBON01:[{index:7}]}});
}
function panelAt(id,fen){
  const board=new Chess(fen),task={objective:'capture-retention',plies:1},context={fen:board.fen(),pgn:board.pgn(),task};
  const experiences=certifyCaptureRetentionActions(board,task).map(row=>({context,move:row.move,proof:row.proof,
    status:row.proof.status,actor:board.turn(),learningAllowed:true,certificateSha256:row.proof.certificateSha256}));
  const panel={panelId:id,familyId:`${id}-family`,familyRegistrationSha256:'f'.repeat(64),stage:1,split:'train',context,experiences};
  const engine={binarySha256:'a'.repeat(64),settingsHash:'b'.repeat(64)};
  const analyses=board.moves({verbose:true}).flatMap(move=>{
    const child=new Chess();child.loadPgn(context.pgn);child.move(move);
    return [100,200].map(budget=>({move:move.from+move.to,budget,engine,fen:child.fen(),pgn:child.pgn(),completed:true,
      transcript:['info depth 10 score cp 100 wdl 0 0 1000 nodes 100 pv a1a2']}));
  });
  const source={criterion:'full-game-expected-score',context,actor:board.turn(),chosen:experiences[0].move,
    taskProof:experiences[0].proof,engine,analyses};
  return {panel,boundReview:bindLichessStockfishReview(panel,source)};
}
async function pulses(brain,item,move){
  const {assessment}=await assessLichessTrainingPanel(item.panel,brain);
  const review=stockfishReviewForAssessment(item.panel,item.boundReview,assessment,{reviewedAction:move});
  const prepared=await brain.prepareCoupledFeedback(review);
  await brain.replayCoupledFrame(review,prepared,{phase:'task',condition:'informative',expectedMemorySha256:brain.memoryFingerprint()});
  const value=await brain.replayCoupledFrame(review,prepared,{phase:'stockfish',condition:'informative',expectedMemorySha256:brain.memoryFingerprint()});
  return {prepared,value};
}

test('perspective helpers: a mover cue keeps the root sign; side-to-move flips for the opponent', () => {
  assert.equal(rootPerspectiveValue(0.3,'mover','w','b'),0.3);
  assert.equal(rootPerspectiveValue(0.3,'side-to-move','w','b'),-0.3);
  assert.equal(rootPerspectiveValue(0.3,'side-to-move','b','b'),0.3);
  assert.equal(rootPerspectiveValue(null,'mover','w','b'),null);
  assert.equal(deliveredValueError(0.4,'mover','w','b'),0.4);
  assert.equal(deliveredValueError(0.4,'side-to-move','w','b'),-0.4);
  assert.throws(()=>deliveredValueError(0.4,'actor','w','b'),/Unregistered cue perspective/);
});

test('black mover: v3 predicts and teaches in the mover perspective; v2 behaviour is preserved for side-to-move cues', async () => {
  const item=panelAt('black','k7/7r/8/7P/8/7P/8/K6R b - - 0 1');
  const mover=await pulses(learner(CoupledStockfishBrainV3,'mover'),item,'h7g7');
  assert.equal(mover.prepared.actor,'b');assert.equal(mover.prepared.childTurn,'w');
  assert.equal(mover.prepared.childAssessment.perspective,'mover');
  assert(mover.prepared.childValue>0);assert.equal(mover.prepared.prediction,mover.prepared.childValue);
  assert(mover.prepared.error.error>0,'Stockfish rates the move above the Fly prediction');
  assert.equal(mover.value.deliveredError,mover.value.rootError);assert.equal(mover.value.rootError,mover.prepared.error.error);
  assert.equal(mover.value.channel,'PAM02','Positive root error raises the mover cue (MBON12 - MBON01)');
  assert.equal(mover.value.pulsePerspective,'b');
  const side=await pulses(learner(CoupledStockfishBrainV3,'side-to-move'),item,'h7g7');
  const old=await pulses(learner(CoupledStockfishBrain),item,'h7g7');
  for(const key of ['prediction','childValue'])assert.equal(side.prepared[key],old.prepared[key]);
  assert.deepEqual(side.prepared.error,old.prepared.error);
  assert.equal(side.prepared.prediction,-side.prepared.childValue);
  for(const key of ['deliveredError','rootError','channel','pulsePerspective'])assert.equal(side.value[key],old.value[key]);
  assert.equal(side.value.deliveredError,-side.value.rootError);
});

test('shuffled control reverses the mover-perspective error', async () => {
  const item=panelAt('black','k7/7r/8/7P/8/7P/8/K6R b - - 0 1'),brain=learner(CoupledStockfishBrainV3,'mover');
  const {assessment}=await assessLichessTrainingPanel(item.panel,brain);
  const review=stockfishReviewForAssessment(item.panel,item.boundReview,assessment,{reviewedAction:'h7g7'});
  const prepared=await brain.prepareCoupledFeedback(review);
  await brain.replayCoupledFrame(review,prepared,{phase:'task',condition:'shuffled',expectedMemorySha256:brain.memoryFingerprint()});
  const value=await brain.replayCoupledFrame(review,prepared,{phase:'stockfish',condition:'shuffled',expectedMemorySha256:brain.memoryFingerprint(),
    stockfishShuffle:{schema:'matched-stockfish-error-shuffle-v1',scheduleSha256:'d'.repeat(64),eventIndex:0,errorSign:-1}});
  assert.equal(value.deliveredError,-prepared.error.error);assert.equal(value.channel,'PPL103');
});

test('search value stays in the side-to-move perspective', async () => {
  const brain=learner(CoupledStockfishBrainV3,'mover'),child=new Chess('k7/7r/8/7P/8/7P/8/K6R b - - 0 1');
  child.move('Rg7');
  const state=await brain.estimatePositionValue(child,{objective:'capture-retention',plies:1});
  assert.equal(state.perspective,'mover');
  const evaluated=await brain.evaluate(child,child.moves({verbose:true}).slice(0,2),{objective:'capture-retention',plies:1});
  assert.equal(evaluated.value,-state.value);
});
