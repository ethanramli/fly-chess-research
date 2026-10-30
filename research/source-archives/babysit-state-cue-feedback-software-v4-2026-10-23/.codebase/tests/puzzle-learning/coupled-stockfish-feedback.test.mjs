import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,mkdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {Chess} from 'chess.js';
import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';
import {ReversalMemory} from '../../src/neural-learning/reversal-memory.mjs';
import {fixedStateHash} from '../../src/neural-learning/association-validation.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {CoupledStockfishBrain} from '../../src/puzzle-learning/coupled-stockfish-brain.mjs';
import {CoupledStockfishSession} from '../../src/puzzle-learning/coupled-stockfish-session.mjs';
import {bindLichessStockfishReview,stockfishReviewForAssessment} from '../../src/puzzle-learning/lichess-stockfish-review.mjs';
import {certifyCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {assessLichessTrainingPanel} from '../../src/puzzle-learning/lichess-curriculum-panel.mjs';
import {CurriculumBlockSession} from '../../src/puzzle-learning/curriculum-block-session.mjs';
import {runLichessCurriculumBlock} from '../../src/puzzle-learning/lichess-curriculum-block.mjs';
import {auditCurriculumBlock} from '../../src/puzzle-learning/curriculum-block-audit.mjs';
import {encodeCheckpoint,decodeCheckpoint} from '../../src/runtime/checkpoint-codec.mjs';
import {certifyMate} from '../../src/search-and-feedback/mate-certificate.mjs';
import {verifiedExperience} from '../../src/search-and-feedback/verified-feedback.mjs';
import {planCurriculumRehearsalBlock} from '../../src/puzzle-learning/curriculum-rehearsal-plan.mjs';
import {runCurriculumBlock} from '../../src/puzzle-learning/curriculum-block-runner.mjs';

const uci=move=>move.from+move.to+(move.promotion??'');
const protocol='verified-outcome-plus-stockfish-v2';
function learner({silent=false,skew=false,maxPresentations=1024}={}){
  // Eight-cell numerical mechanism fixture. These IDs and constant symbolic
  // cues are not a released fly mapping or evidence of relational learning.
  const graph={row:Int32Array.from([0,0,0,0,0,0,0,2,4]),col:Int32Array.from([0,1,0,1]),
    sign:Int8Array.from([1,1,1,1]),initial:Float32Array.from([1,1,1,1]),input:Int32Array.from([0]),output:Int32Array.from([7])};
  const mapping={readyForCandidateExperiment:true,groups:['left','right'].flatMap((side,index)=>[
    {side,mbonType:'MBON01',danType:'PAM02',kc:[index],edges:[2+index],dan:[{index:2+index*2,rootId:String(100+index*2)}]},
    {side,mbonType:'MBON12',danType:'PPL103',kc:[index],edges:[index],dan:[{index:3+index*2,rootId:String(101+index*2)}]}])};
  const model=new SparseTrainer(graph,{inputDim:1,outputs:1});
  // Numerical zero-readout fixture only: keep complete output populations but
  // set their initial drive below activation; no production model is edited.
  if(silent){model.params.bias[6]=-10;model.params.bias[7]=-10;}
  else if(skew)model.params.bias[6]=0.2;
  const memory=new ReversalMemory(model,mapping);
  model.forward([0]);
  return new CoupledStockfishBrain({model,memory,mapping,rest:Float32Array.from(model.h[model.steps]),
    encoder:{identity:'e'.repeat(64),encode:(board,action)=>({stimulation:[{index:0,current:action===null?1.25:1.5}]})},
    maxPresentations,readouts:{MBON12:[{index:6}],MBON01:[{index:7}]}});
}
function panelAt(id,fen,{stage=1,task={objective:'capture-retention',plies:1}}={}){
  const board=new Chess(fen);
  const context={fen:board.fen(),pgn:board.pgn(),task};
  const experiences=stage===1?certifyCaptureRetentionActions(board,task).map(row=>({context,move:row.move,proof:row.proof,
    status:row.proof.status,actor:board.turn(),learningAllowed:true,certificateSha256:row.proof.certificateSha256})):
    board.moves({verbose:true}).map(move=>{
      const child=new Chess();child.loadPgn(context.pgn);child.move(move);
      const proof=certifyMate(child,board.turn(),{plies:0});
      return {context,move:uci(move),proof,...verifiedExperience(board,uci(move),task,proof)};
    });
  const panel={panelId:id,familyId:`${id}-family`,familyRegistrationSha256:'f'.repeat(64),stage,split:'train',context,experiences};
  const engine={binarySha256:'a'.repeat(64),settingsHash:'b'.repeat(64)};
  const analyses=board.moves({verbose:true}).flatMap(move=>{
    const child=new Chess();child.loadPgn(context.pgn);child.move(move);
    return [100,200].map(budget=>({move:uci(move),budget,engine,fen:child.fen(),pgn:child.pgn(),completed:true,
      transcript:['info depth 10 score cp 100 wdl 0 0 1000 nodes 100 pv a1a2']}));
  });
  const source={criterion:'full-game-expected-score',context,actor:board.turn(),chosen:experiences[0].move,
    taskProof:experiences[0].proof,engine,analyses};
  return {panel,boundReview:bindLichessStockfishReview(panel,source)};
}
const first=panelAt('z-panel','r6k/8/p7/8/p7/8/R7/7K w - - 0 1');
const second=panelAt('a-panel','7k/8/8/8/p7/8/8/R6K w - - 0 1');
const reviews=[first,second];
const session=brain=>new CoupledStockfishSession({brain,panelReviews:reviews,identity:'c'.repeat(64),feedbackProtocol:protocol});

test('all six modes evaluate the same planned root/child and deliver two separate controlled pulses',async()=>{
  const exposures=[],signals={};
  for(const condition of ['informative','outcome-only','outcome-shuffled','no-channel','shuffled','disabled']){
    const brain=learner(),initial=brain.memory.snapshot(),fixed=fixedStateHash(brain.model,brain.memory.edges);
    const {assessment}=await assessLichessTrainingPanel(first.panel,brain);
    const review=stockfishReviewForAssessment(first.panel,first.boundReview,assessment,{reviewedAction:'a2b2'});
    assert.equal(review.decision.choice,null,'The numerical cue fixture deliberately ties all actions');
    const count=brain.presentations,prepared=await brain.prepareCoupledFeedback(review);
    const task=await brain.replayCoupledFrame(review,prepared,{phase:'task',condition,
      expectedMemorySha256:brain.memoryFingerprint(),shuffledStatus:condition==='outcome-shuffled'?'success':null});
    const value=await brain.replayCoupledFrame(review,prepared,{phase:'stockfish',condition,
      expectedMemorySha256:brain.memoryFingerprint(),stockfishShuffle:condition==='shuffled'?{
        schema:'matched-stockfish-error-shuffle-v1',scheduleSha256:'d'.repeat(64),eventIndex:0,errorSign:-1}:null});
    assert.equal(task.cueContext.action,'a2b2');assert.equal(task.cueContext.fen,first.panel.context.fen);
    assert.equal(value.cueContext.action,null);assert.equal(value.cueContext.fen,prepared.childFen);
    assert.equal(value.cueSha256,prepared.childAssessment.cueSha256);assert.notEqual(task.cueSha256,value.cueSha256);
    assert.equal(value.pulsePerspective,prepared.childTurn);
    assert.equal(task.verifiedTaskStatus,'failure');assert.equal(task.reviewedAction,'a2b2');
    assert.equal(fixedStateHash(brain.model,brain.memory.edges),fixed);
    exposures.push(brain.presentations-count);signals[condition]=[task.channel,value.channel];
    assert.equal(brain.presentations-count,prepared.requiredPresentations);
    if(condition==='disabled')assert.deepEqual(brain.memory.snapshot(),initial);
    else assert.equal(brain.memory.events,2);
  }
  assert.equal(new Set(exposures).size,1);
  assert.deepEqual(signals.informative,['PPL103','PPL103']);
  assert.deepEqual(signals['outcome-only'],['PPL103',null]);
  assert.deepEqual(signals['outcome-shuffled'],['PAM02',null]);
  assert.deepEqual(signals['no-channel'],[null,null]);
  assert.deepEqual(signals.shuffled,['PPL103','PAM02']);
  assert.deepEqual(signals.disabled,['PPL103','PPL103']);
});

test('a planned alternative is kept distinct from the own choice and from a tie',async()=>{
  const brain=learner(),{assessment}=await assessLichessTrainingPanel(first.panel,brain);
  const own='a2b2',planned='a2a4';
  const synthetic={...assessment,choice:own,rows:assessment.rows.map(row=>({...row,score:row.move===own?1:0}))};
  const review=stockfishReviewForAssessment(first.panel,first.boundReview,synthetic,{reviewedAction:planned});
  assert.equal(review.chosen,planned);assert.equal(review.decision.choice,own);
  assert.equal(review.taskProof.status,'success');
  const current=session(brain),experience=first.panel.experiences.find(row=>row.move===planned);
  current.start(experience,assessment,{condition:'informative'});
  assert.equal(current.pending.binding.plannedAction,planned);
  assert.equal(current.pending.binding.chosenAction,null,'A tie is recorded, never converted into a claimed Fly choice');
});

test('disk recovery after the task pulse continues only the second pulse',async()=>{
  const original=learner(),live=session(original),experience=first.panel.experiences.find(row=>row.move==='a2b2');
  const {assessment}=await assessLichessTrainingPanel(first.panel,original);
  live.start(experience,assessment,{condition:'informative'});await live.step();await live.step();
  assert.equal(original.memory.events,1);
  const checkpoint=decodeCheckpoint(encodeCheckpoint({session:live.snapshot()})).session;
  const recovered=learner(),resumed=session(recovered);resumed.restore(checkpoint);
  assert.equal(recovered.memory.events,1);await resumed.step();const receipt=resumed.finish();
  await live.step();live.finish();
  assert.equal(recovered.memory.events,2);assert.equal(receipt.frameCount,3);
  assert.equal(recovered.memoryFingerprint(),original.memoryFingerprint());
  assert.equal(recovered.presentations,original.presentations);
});

test('terminal state has a measured prediction; only silent value gets a neutral engine slot',async()=>{
  const mate=panelAt('mate','7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',{
    stage:2,task:{objective:'forced-mate',plies:1}});
  for(const [item,brain] of [[mate,learner()],[first,learner({silent:true})]]){
    const move=item.panel.experiences.find(row=>row.status===(item===mate?'success':'failure')).move;
    const {assessment}=await assessLichessTrainingPanel(item.panel,brain);
    const review=stockfishReviewForAssessment(item.panel,item.boundReview,assessment,{reviewedAction:move});
    const prepared=await brain.prepareCoupledFeedback(review);
    assert.equal(prepared.childAssessment.context.action,null);
    assert.equal(prepared.prediction===null,item!==mate);assert.equal(prepared.error.available,item===mate);
    const task=await brain.replayCoupledFrame(review,prepared,{phase:'task',condition:'informative',expectedMemorySha256:brain.memoryFingerprint()});
    const value=await brain.replayCoupledFrame(review,prepared,{phase:'stockfish',condition:'informative',expectedMemorySha256:brain.memoryFingerprint()});
    assert.equal(task.channel,item===mate?'PAM02':'PPL103');assert.equal(value.channel,item===mate?'PPL103':null);
    assert.equal(brain.memory.events,2);
  }
});

test('black actor perspective is preserved and whole-event capacity is checked before preparation',async()=>{
  const item=panelAt('black','k7/7r/8/7P/8/7P/8/K6R b - - 0 1'),brain=learner({skew:true});
  const {assessment}=await assessLichessTrainingPanel(item.panel,brain);
  const review=stockfishReviewForAssessment(item.panel,item.boundReview,assessment,{reviewedAction:'h7g7'});
  const prepared=await brain.prepareCoupledFeedback(review);
  assert.equal(prepared.actor,'b');assert.equal(prepared.childTurn,'w');assert(prepared.error.error>0);
  assert(prepared.childValue>0);assert.equal(prepared.prediction,-prepared.childValue);
  assert.equal(prepared.grade.selectedExpectedScore.low,1);
  await brain.replayCoupledFrame(review,prepared,{phase:'task',condition:'informative',expectedMemorySha256:brain.memoryFingerprint()});
  const pulse=await brain.replayCoupledFrame(review,prepared,{phase:'stockfish',condition:'informative',expectedMemorySha256:brain.memoryFingerprint()});
  assert.equal(pulse.rootError,prepared.error.error);assert.equal(pulse.deliveredError,-pulse.rootError);
  assert.equal(pulse.pulsePerspective,'w');assert.equal(pulse.channel,'PPL103');
  assert.equal(pulse.cueContext.action,null);assert.equal(pulse.cueContext.fen,prepared.childFen);
  const limited=learner({maxPresentations:first.panel.experiences.length+1});
  const own=await assessLichessTrainingPanel(first.panel,limited),before=limited.memory.snapshot(),count=limited.presentations;
  const bounded=stockfishReviewForAssessment(first.panel,first.boundReview,own.assessment,{reviewedAction:'a2b2'});
  await assert.rejects(()=>limited.prepareCoupledFeedback(bounded),/whole-event neural presentation budget/);
  assert.deepEqual(limited.memory.snapshot(),before);assert.equal(limited.presentations,count);
});

test('unknown proofs and rehashed error tampering are rejected before another pulse',async()=>{
  const brain=learner(),live=session(brain),experience=first.panel.experiences.find(row=>row.move==='a2b2');
  const {assessment}=await assessLichessTrainingPanel(first.panel,brain),before=brain.memory.snapshot();
  const invalid={...experience,proof:{status:'unknown',certificate:null}};
  assert.throws(()=>live.start(invalid,assessment,{condition:'informative'}));
  assert.equal(live.pending,null);assert.deepEqual(brain.memory.snapshot(),before);
  live.start(experience,assessment,{condition:'informative'});await live.step();
  const snapshot=live.snapshot(),prepared=snapshot.pending.prepared;
  prepared.error.error=-prepared.error.error;
  const {identity,...body}=prepared;prepared.identity=digest(body);
  snapshot.pending.frameReceipts[0].result=prepared;
  const other=learner(),restored=session(other),initial=other.memory.snapshot();
  assert.throws(()=>restored.restore(snapshot));assert.deepEqual(other.memory.snapshot(),initial);
});

test('pending and appended task-pulse receipts recover without duplicating either update',async t=>{
  const panels=reviews.map(row=>row.panel),make=()=>{
    const brain=learner(),block=new CurriculumBlockSession({session:session(brain),currentStage:1,
      registeredPanels:panels.map(panel=>({panelId:panel.panelId,stage:1}))});return {brain,block};
  };
  for(const injection of ['interruptAfterPending','interruptAfterAppend']){
    const live=make(),observations=[];
    for(const panel of panels)observations.push(await assessLichessTrainingPanel(panel,live.brain));
    const plan=planCurriculumRehearsalBlock(observations,live.brain.memoryFingerprint(),{currentStage:1,
      blockIndex:0,registeredPanels:live.block.registeredPanels,selectionCounts:live.block.selectionCounts});
    live.block.session.accountSelectionPresentations(plan.planSha256,plan.selectionPresentations);
    const root=resolve('runs',`coupled-recovery-fixture-${randomUUID()}`),identity='b'.repeat(64);
    mkdirSync(root,{recursive:true});
    let passed=false;t.after(()=>{if(passed)rmSync(root,{recursive:true,force:true});});
    const args=runtime=>({block:runtime.block,plan,identity,
      assess:async context=>(await assessLichessTrainingPanel(panels.find(panel=>panel.context.fen===context.fen),runtime.brain)).assessment,
      guard:()=>{},pace:async()=>{}});
    let interrupted;
    try{await runCurriculumBlock({...args(live),outputDir:join(root,'first'),[injection]:3});}
    catch(error){interrupted=error;}
    assert.equal(interrupted?.code,'CURRICULUM_INTERRUPTED');assert.equal(live.brain.memory.events,1);
    const resumed=make(),result=await runCurriculumBlock({...args(resumed),outputDir:join(root,'resumed'),resumeFrom:interrupted.checkpoint});
    assert.equal(resumed.brain.memory.events,8);assert.equal(result.receiptCount,21);
    const replay=make(),audit=await auditCurriculumBlock({...args(replay),runDir:join(root,'resumed'),
      checkpoint:result.checkpoint,selectionPresentations:plan.selectionPresentations});
    assert.equal(audit.fullNeuralReplay,true);assert.equal(replay.brain.memoryFingerprint(),resumed.brain.memoryFingerprint());
    passed=true;
  }
});

test('a complete coupled block persists and independently replays preparation and both teaching pulses',async t=>{
  const panels=reviews.map(row=>row.panel),make=()=>{
    const brain=learner(),block=new CurriculumBlockSession({session:session(brain),currentStage:1,
      registeredPanels:panels.map(panel=>({panelId:panel.panelId,stage:1}))});return {brain,block};
  };
  const run=make(),out=resolve('runs',`coupled-feedback-fixture-${randomUUID()}`);
  let passed=false;t.after(()=>{if(passed)rmSync(out,{recursive:true,force:true});});t.diagnostic(`Coupled fixture: ${out}`);
  const result=await runLichessCurriculumBlock({...run,panels,familyRegistrationSha256:'f'.repeat(64),
    identity:'a'.repeat(64),outputDir:out,guard:()=>{},pace:async()=>{}});
  assert.equal(result.ready,true);assert.equal(run.brain.memory.events,8);
  const replay=make(),firstReceipt=JSON.parse(readFileSync(join(out,'receipts.jsonl'),'utf8').split('\n')[0]);
  const audit=await auditCurriculumBlock({block:replay.block,plan:result.plan,identity:firstReceipt.identity,
    runDir:out,checkpoint:result.checkpoint,selectionPresentations:panels.reduce((sum,panel)=>sum+panel.experiences.length,0),
    assess:async context=>(await assessLichessTrainingPanel(panels.find(panel=>panel.context.fen===context.fen),replay.brain)).assessment,
    guard:()=>{},pace:async()=>{}});
  assert.equal(audit.fullNeuralReplay,true);assert.equal(replay.brain.memoryFingerprint(),run.brain.memoryFingerprint());
  passed=true;
});
