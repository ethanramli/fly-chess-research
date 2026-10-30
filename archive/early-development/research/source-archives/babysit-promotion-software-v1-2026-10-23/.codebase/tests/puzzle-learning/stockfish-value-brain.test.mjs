import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { StockfishValueBrain } from '../../src/puzzle-learning/stockfish-value-brain.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import {certifyCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {MappedPuzzleBrain} from '../../src/puzzle-learning/mapped-puzzle-brain.mjs';
function fixture(valueOptions = {}) {
  // Eight-cell numerical fixture; root IDs are not fly anatomical claims.
  const graph = { row: Int32Array.from([0,0,0,0,0,0,0,2,4]), col: Int32Array.from([0,1,0,1]),
    sign: Int8Array.from([1,1,1,1]), initial: Float32Array.from([1,1,1,1]),
    input: Int32Array.from([0]), output: Int32Array.from([7]) };
  const mapping = { readyForCandidateExperiment: true, groups: ['left','right'].flatMap((side,i) => [
    { side, mbonType:'MBON01', danType:'PAM02', kc:[i], edges:[2+i], dan:[{index:2+i*2,rootId:String(100+i*2)}] },
    { side, mbonType:'MBON12', danType:'PPL103', kc:[i], edges:[i], dan:[{index:3+i*2,rootId:String(101+i*2)}] }]) };
  const model = new SparseTrainer(graph,{inputDim:1,outputs:1});
  const memory = new ReversalMemory(model,mapping); model.forward([0]);
  const rest = Float32Array.from(model.h[model.steps]);
  const brain = new StockfishValueBrain({model,memory,mapping,rest,
    encoder:{encode:()=>({stimulation:[{index:0,current:1.5}]})},
    readouts:{MBON12:[{index:6}],MBON01:[{index:7}]} },valueOptions);
  const board = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'), task={objective:'forced-mate',plies:1};
  const experience = move => {
    const successor = new Chess(board.fen()); successor.move({from:move.slice(0,2),to:move.slice(2,4)});
    const proof=certifyMate(successor,'w',{plies:0});
    return {...verifiedExperience(board,move,task,proof),proof,context:{fen:board.fen(),pgn:board.pgn(),task}};
  };
  return {brain,memory,mapping,model,board,task,experience};
}


function reviewFor(a, win = true) {
  const engine = { binarySha256: 'a'.repeat(64), settingsHash: 'b'.repeat(64) };
  const analyses = a.board.moves({verbose:true}).flatMap(move => [100,200].map(budget => {
    const child = new Chess(); child.loadPgn(a.board.pgn()); child.move(move);
    return { move:move.from+move.to+(move.promotion??''), budget, engine, fen:child.fen(), pgn:child.pgn(), completed:true,
      transcript:['info depth 10 score cp 0 wdl '+(win?'0 0 1000':'1000 0 0')+' nodes 200 pv h8h7'] };
  }));
  const chosen='f7e7';
  return {criterion:'full-game-expected-score',context:{fen:a.board.fen(),pgn:a.board.pgn(),task:a.task},
    actor:'w',chosen,taskProof:a.experience(chosen).proof,engine,analyses};
}
function installUniqueAssessment(a) {
  // Contract-only test seam: production assessment remains the real learner;
  // this fixture gives the binding assertion one deterministic unique choice.
  a.brain.assess=async(board,moves)=>{
    const selected=moves.find(move=>{
      const child=new Chess();child.loadPgn(board.pgn());child.move(move);return child.moves().length>0;
    });
    const chosen=selected.from+selected.to+(selected.promotion??'');
    const rows=moves.map(move=>{
      const key=move.from+move.to+(move.promotion??''),score=key===chosen?1:0;
      return {move:key,score,MBON12:score,MBON01:0};
    });
    return {rows,choice:chosen,tiedTopMoves:[chosen],memoryFingerprint:a.brain.memoryFingerprint()};
  };
  return a.brain.assess(a.board,a.board.moves({verbose:true}),a.task);
}
function withoutElapsed(value) {
  if (Array.isArray(value)) return value.map(withoutElapsed);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'elapsedMs').map(([key, item]) => [key, withoutElapsed(item)]));
  return value;
}

test('value feedback scales signed error into bounded current and preserves fixed wiring',async()=>{
  for(const [win,channel] of [[true,'PAM02'],[false,'PPL103']]) {
    const a=fixture(), invariant=fixedStateHash(a.model,a.memory.edges);
    const receipt=await a.brain.replayValue(reviewFor(a,win));
    assert.equal(receipt.channel,channel); assert.ok(receipt.current>0 && receipt.current<=1.5);
    assert.equal(receipt.current,1.5*Math.abs(receipt.error.error)/2);
    assert.equal(a.memory.events,1); assert.equal(fixedStateHash(a.model,a.memory.edges),invariant);
    const b=fixture(); b.memory.restore(a.memory.snapshot());
    assert.deepEqual(withoutElapsed(await a.brain.replayValue(reviewFor(a,win))),
      withoutElapsed(await b.brain.replayValue(reviewFor(b,win))));
  }
});

test('value controls match presentation exposure while freezing or omitting the channel',async()=>{
  const informative=fixture(), absent=fixture(), disabled=fixture();
  const frozen=disabled.memory.snapshot();
  const i=await informative.brain.replayValue(reviewFor(informative));
  const n=await absent.brain.replayValue(reviewFor(absent),{condition:'no-channel'});
  const d=await disabled.brain.replayValue(reviewFor(disabled),{condition:'disabled'});
  assert.equal(informative.brain.presentations,absent.brain.presentations);
  assert.equal(informative.brain.presentations,disabled.brain.presentations);
  assert.equal(n.channel,null); assert.equal(n.current,0); assert.equal(absent.memory.events,1);
  assert.equal(d.channel,i.channel); assert.deepEqual(disabled.memory.snapshot(),frozen);
});

test('unknown target cannot adapt memory; own evaluation is read-only and bounded',async()=>{
  const a=fixture(), before=a.memory.snapshot(), review=reviewFor(a);
  review.analyses[0].completed=false;
  const receipt=await a.brain.replayValue(review);
  assert.equal(receipt.skipped,true); assert.deepEqual(a.memory.snapshot(),before);
  const result=await a.brain.evaluate(a.board,a.board.moves({verbose:true}),a.task);
  assert.ok(Number.isFinite(result.value) && Math.abs(result.value)<=1);
  assert.ok(Math.abs(result.priors.reduce((x,y)=>x+y,0)-1)<1e-12);
  assert.deepEqual(a.memory.snapshot(),before);
});

test('value prediction is bound to the post-move child and converted to root-actor perspective',async()=>{
  const a=fixture(), review=reviewFor(a), receipt=await a.brain.replayValue(review);
  const child=new Chess(); child.loadPgn(a.board.pgn()); child.move('f7e7');
  assert.equal(receipt.predictionContext.root.fen,a.board.fen());
  assert.equal(receipt.predictionContext.child.fen,child.fen());
  assert.equal(receipt.predictionContext.child.pgn,child.pgn());
  assert.equal(receipt.predictionContext.child.sideToMove,'b');
  assert.equal(receipt.predictionPerspective,'w');
  assert.equal(receipt.prediction,-receipt.childStateValue);
  assert.equal(receipt.predictionContext.memoryHash,receipt.rootAssessment.memoryFingerprint);
});

test('engine assistance consumes the recorded fresh all-legal choice and exact certificate',async()=>{
  const a=fixture(),before=await installUniqueAssessment(a);
  const review=reviewFor(a);
  review.chosen=before.choice;review.taskProof=a.experience(before.choice).proof;
  review.decision={memoryHash:before.memoryFingerprint,choice:before.choice,rows:structuredClone(before.rows),
    taskProofSha256:a.experience(before.choice).certificateSha256};
  const receipt=await a.brain.replayValue(review);
  assert.equal(receipt.rootAssessment.memoryFingerprint,before.memoryFingerprint);
  assert.equal(receipt.teacherReview.decision.choice,before.choice);
  assert.equal(receipt.taskEvidence.certificateSha256,review.decision.taskProofSha256);
});

test('engine assistance rejects a stale pre-feedback ranking before adapting',async()=>{
  const a=fixture(),before=await installUniqueAssessment(a),review=reviewFor(a);
  review.chosen=before.choice;review.taskProof=a.experience(before.choice).proof;
  review.decision={memoryHash:'0'.repeat(64),choice:before.choice,rows:structuredClone(before.rows),
    taskProofSha256:a.experience(before.choice).certificateSha256};
  const presentations=a.brain.presentations,memory=a.memory.snapshot();
  await assert.rejects(()=>a.brain.replayValue(review),/stale learner memory/);
  assert.equal(a.brain.presentations,presentations);assert.deepEqual(a.memory.snapshot(),memory);
});

test('engine assistance rejects a ranking that changed before feedback replay',async()=>{
  const a=fixture(),before=await installUniqueAssessment(a),review=reviewFor(a);
  review.chosen=before.choice;review.taskProof=a.experience(before.choice).proof;
  const changed=structuredClone(before.rows);changed[0].score+=0.25;
  review.decision={memoryHash:before.memoryFingerprint,choice:before.choice,rows:changed,
    taskProofSha256:a.experience(before.choice).certificateSha256};
  const memory=a.memory.snapshot();
  await assert.rejects(()=>a.brain.replayValue(review),/ranking differs/);
  assert.deepEqual(a.memory.snapshot(),memory);
});

test('terminal child has no fabricated value and spends no neural presentations',async()=>{
  const a=fixture(), review=reviewFor(a); review.chosen='f7h7'; review.taskProof=a.experience(review.chosen).proof;
  const before=a.brain.presentations, memory=a.memory.snapshot();
  const receipt=await a.brain.replayValue(review);
  assert.equal(receipt.skipped,true); assert.equal(receipt.learningApplied,false);
  assert.equal(receipt.childLegalMoves,0); assert.equal(receipt.requiredPresentations,0);
  assert.equal(a.brain.presentations,before); assert.deepEqual(a.memory.snapshot(),memory);
});

test('unknown independent task consequence prevents Stockfish-only teaching',async()=>{
  const a=fixture(), review=reviewFor(a), before=a.memory.snapshot();
  review.taskProof={status:'unknown',certificate:null};
  const receipt=await a.brain.replayValue(review);
  assert.equal(receipt.skipped,true); assert.equal(receipt.taskEvidence.status,'unknown');
  assert.equal(a.brain.presentations,0); assert.deepEqual(a.memory.snapshot(),before);
});

test('outcome-only uses checked task valence and ignores missing engine targets',async()=>{
  const a=fixture(), review=reviewFor(a, true);
  review.analyses=[]; // outcome-only must not consume engine estimates.
  const receipt=await a.brain.replayValue(review,{condition:'outcome-only'});
  assert.equal(receipt.skipped,undefined);
  assert.equal(receipt.teachingSignal,'verified-task-valence');
  assert.equal(receipt.taskEvidence.status,'failure'); // f7e7 misses the certified mate-in-one.
  assert.equal(receipt.channel,'PPL103');
  assert.equal(receipt.current,1.5);
  assert.equal(receipt.deliveredError,0);
  assert.equal(receipt.plasticityEnabled,true);
  assert.equal(a.memory.events,1);
});

test('shared endpoint verification accepts exact prepared quiet-action task failures',async()=>{
  const a=fixture(),board=new Chess('6k1/8/8/8/p6r/1P6/8/RK6 w - - 1 2');
  const task={objective:'capture-retention',plies:1},move='a1a2';
  const proof=certifyCaptureRetentionAction(board,move,task);
  const checked=a.brain.verifyExperience(board,move,task,proof);
  assert.equal(checked.status,'failure');assert.match(checked.meaning,/no overall move-quality/);
  const review={context:{fen:board.fen(),pgn:board.pgn(),task},actor:'w',chosen:move,taskProof:proof,analyses:[]};
  const receipt=await a.brain.replayValue(review,{condition:'outcome-only'});
  assert.equal(receipt.channel,'PPL103');assert.equal(receipt.taskEvidence.certificateSha256,checked.certificateSha256);
  assert.equal(a.memory.events,1);assert.equal(receipt.context.pgn,board.pgn());
  const b=fixture(),base=new MappedPuzzleBrain(b.brain);
  const result=await base.replay({...checked,context:review.context,proof});
  assert.equal(result.event.status,'failure');assert.equal(b.memory.events,1);
});

test('task-outcome shuffle changes only delivered valence and retains the true consequence certificate',async()=>{
  const board=new Chess('6k1/8/8/8/p6r/1P6/8/RK6 w - - 1 2');
  const task={objective:'capture-retention',plies:1},move='a1a2';
  const proof=certifyCaptureRetentionAction(board,move,task);
  const review={context:{fen:board.fen(),pgn:board.pgn(),task},actor:'w',chosen:move,taskProof:proof,analyses:[]};
  const informative=fixture(),shuffled=fixture();
  const fixed=fixedStateHash(shuffled.model,shuffled.memory.edges);
  const correct=await informative.brain.replayValue(review,{condition:'outcome-only'});
  const receipt=await shuffled.brain.replayValue(review,{condition:'outcome-shuffled',shuffledStatus:'success'});
  assert.equal(correct.channel,'PPL103');assert.equal(receipt.channel,'PAM02');
  assert.equal(receipt.taskEvidence.status,'failure');assert.equal(receipt.event.status,'failure');
  assert.equal(receipt.deliveredTaskStatus,'success');
  assert.equal(receipt.taskEvidence.certificateSha256,correct.taskEvidence.certificateSha256);
  assert.equal(shuffled.brain.presentations,informative.brain.presentations);
  assert.equal(fixedStateHash(shuffled.model,shuffled.memory.edges),fixed);
  assert.equal(shuffled.memory.events,1);
  await assert.rejects(()=>fixture().brain.replayValue(review,{condition:'outcome-shuffled',shuffledStatus:'unknown'}));
});

test('quiet-action unknown and forged proof do not trigger graph presentations or adaptation',async()=>{
  const board=new Chess('6k1/8/8/8/p6r/1P6/8/RK6 w - - 1 2'),task={objective:'capture-retention',plies:1};
  const review={context:{fen:board.fen(),pgn:board.pgn(),task},actor:'w',chosen:'a1a2',analyses:[],
    taskProof:{status:'unknown',certificate:null}};
  const a=fixture(),before=a.memory.snapshot();
  const unknown=await a.brain.replayValue(review,{condition:'outcome-only'});
  assert.equal(unknown.skipped,true);assert.equal(a.brain.presentations,0);assert.deepEqual(a.memory.snapshot(),before);
  review.taskProof=certifyCaptureRetentionAction(board,review.chosen,task);
  review.taskProof.certificate.rootPgn+=' *';
  await assert.rejects(()=>a.brain.replayValue(review,{condition:'outcome-only'}));
  assert.equal(a.brain.presentations,0);assert.deepEqual(a.memory.snapshot(),before);
});

test('adapter capture verification remains identical to the frozen capture-only helper',()=>{
  const a=fixture(),board=new Chess('6k1/8/8/8/p6r/1P6/8/RK6 w - - 1 2');
  const task={objective:'capture-retention',plies:1},move='a1a4',proof=certifyCaptureRetentionAction(board,move,task);
  assert.deepEqual(a.brain.verifyExperience(board,move,task,proof),verifiedExperience(board,move,task,proof));
});

test('matched value shuffle reverses sign at the same nonzero magnitude',async()=>{
  const source=fixture(), expected=await source.brain.replayValue(reviewFor(source));
  assert.ok(expected.error.available);
  const shuffled=fixture();
  const receipt=await shuffled.brain.replayValue(reviewFor(shuffled),{
    condition:'shuffled',shuffle:{schema:'matched-stockfish-error-shuffle-v1',
      scheduleSha256:'c'.repeat(64),eventIndex:0,error:-expected.error.error}});
  assert.equal(receipt.deliveredError,-expected.error.error);
  assert.equal(receipt.shuffle.scheduleSha256,'c'.repeat(64));
  assert.equal(receipt.channel,expected.channel==='PAM02'?'PPL103':'PAM02');
  assert.equal(receipt.current,expected.current);
});

test('registered error-sign schedule derives the matched opposite error inside the receiver',async()=>{
  const source=fixture(),expected=await source.brain.replayValue(reviewFor(source));
  const shuffled=fixture(),receipt=await shuffled.brain.replayValue(reviewFor(shuffled),{
    condition:'shuffled',shuffle:{schema:'matched-stockfish-error-shuffle-v1',
      scheduleSha256:'e'.repeat(64),eventIndex:2,errorSign:-1}});
  assert.equal(receipt.deliveredError,-expected.error.error);
  assert.equal(receipt.shuffle.error,-expected.error.error);
  assert.equal(receipt.shuffle.eventIndex,2);
});

test('outcome-only teaches certified terminal success on the root cue without engine or child prediction',async()=>{
  const a=fixture({maxReinforcementCurrent:0.5}),review=reviewFor(a);review.chosen='f7h7';
  review.taskProof=a.experience(review.chosen).proof;review.analyses=[];
  const invariant=fixedStateHash(a.model,a.memory.edges),before=a.brain.presentations;
  const memoryHash=a.brain.memoryFingerprint(),encoded=[],encode=a.brain.encoder.encode;
  a.brain.encoder.encode=(board,move,task)=>{encoded.push({fen:board.fen(),move});return encode(board,move,task);};
  const receipt=await a.brain.replayValue(review,{condition:'outcome-only'});
  assert.equal(receipt.schema,'task-consequence-feedback-receipt-v1');
  assert.equal(receipt.taskEvidence.status,'success');assert.equal(receipt.channel,'PAM02');
  assert.equal(receipt.current,0.5);assert.equal(receipt.grade,null);
  assert.equal(receipt.rootAssessment.memoryFingerprint,memoryHash);
  assert.equal(a.brain.presentations-before,receipt.rootLegalMoves+1);
  assert.equal(a.memory.events,1);assert.equal(fixedStateHash(a.model,a.memory.edges),invariant);
  assert.equal('childAssessment' in receipt,false);assert.equal('prediction' in receipt,false);
  assert.equal(receipt.context.fen,a.board.fen());
  assert(encoded.every(row=>row.fen===a.board.fen()));assert.equal(encoded.at(-1).move,review.chosen);
});

test('outcome-only presentation exhaustion and actor mismatch fail before adaptation',async()=>{
  const a=fixture(),review=reviewFor(a),before=a.memory.snapshot();
  a.brain.maxPresentations=a.board.moves().length;
  const result=await a.brain.replayValue(review,{condition:'outcome-only'});
  assert.equal(result.skipped,true);assert.equal(a.brain.presentations,0);
  assert.deepEqual(a.memory.snapshot(),before);
  review.actor='b';
  await assert.rejects(()=>a.brain.replayValue(review,{condition:'outcome-only'}),/actor mismatch/);
  assert.deepEqual(a.memory.snapshot(),before);
});

test('shuffled condition rejects an unbound or sign-aligned caller value',async()=>{
  const a=fixture(), review=reviewFor(a), expected=await a.brain.replayValue(review);
  for (const shuffle of [null,{error:-expected.error.error},
    {schema:'matched-stockfish-error-shuffle-v1',scheduleSha256:'c'.repeat(64),eventIndex:0,error:expected.error.error}]) {
    const b=fixture();
    await assert.rejects(()=>b.brain.replayValue(reviewFor(b),{condition:'shuffled',shuffle}));
  }
});

test('no-channel preserves matched exposure when neural value is silent',async()=>{
  const a=fixture();
  a.brain.readouts={MBON12:[{index:6}],MBON01:[{index:6}]};
  const receipt=await a.brain.replayValue(reviewFor(a),{condition:'no-channel'});
  assert.equal(receipt.skipped,undefined);
  assert.equal(receipt.channel,null);
  assert.equal(receipt.current,0);
  assert.equal(receipt.update.events,1);
  assert.equal(receipt.plasticityEnabled,true);
  assert.ok(a.brain.presentations>0);
});

test('opt-in feedback receipt records bounded mapped KC and DAN rates at every recurrent state',async()=>{
  const a=fixture(), receipt=await a.brain.replayValue(reviewFor(a),{captureActivityTrace:true});
  const trace=receipt.activityTrace;
  assert.equal(trace.schema,'mapped-circuit-activity-trace-v1');
  assert.equal(trace.states,a.model.h.length);
  assert.match(trace.meaning,/not biological spikes/);
  assert.equal(trace.groups.length,a.mapping.groups.length);
  for(const [i,group] of a.mapping.groups.entries()){
    assert.equal(trace.groups[i].kenyonCells.length,new Set(group.kc).size);
    assert.equal(trace.groups[i].dopamineCells.length,new Set(group.dan.map(c=>c.index)).size);
    for(const cell of [...trace.groups[i].kenyonCells,...trace.groups[i].dopamineCells]){
      assert.equal(cell.rates.length,a.model.h.length);
      assert.deepEqual(cell.rates,a.model.h.map(state=>state[cell.index]));
      assert.deepEqual(cell.excess,cell.rates.map(rate=>rate-cell.rest));
    }
  }
  const plain=fixture(), plainReceipt=await plain.brain.replayValue(reviewFor(plain));
  assert.equal(plainReceipt.activityTrace,null);
});
