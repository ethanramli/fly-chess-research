import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { compileConsequenceLesson } from '../../src/search-and-feedback/consequence-lesson.mjs';
function fixture() {
  const board=new Chess('4r1k1/8/8/4p3/pP5r/8/8/RK2R3 w - - 0 1');
  const task={objective:'capture-retention',plies:1},memoryHash='a'.repeat(64);
  const assessment={fen:board.fen(),pgn:board.pgn(),task,memoryHash,
    rows:[{move:'a1a4',score:0.1},{move:'e1e5',score:0.2}],choice:'e1e5'};
  const make=(move,proof=certifyCaptureRetention(board,move))=>({...verifiedExperience(board,move,task,proof),proof,
    context:{fen:board.fen(),pgn:board.pgn(),task}});
  return {board,task,memoryHash,assessment,make};
}
test('checked lesson distinguishes refutation, transition, task scope and information actually delivered',()=>{
  const f=fixture(),history=f.board.pgn();
  const lesson=compileConsequenceLesson(f.board,f.task,f.assessment,[f.make('e1e5'),f.make('a1a4')],f.memoryHash);
  assert.equal(lesson.contrast.committedFailure,true);
  assert.deepEqual(lesson.reviews[0].consequence.witness.recaptures,['e8e5']);
  assert.equal(lesson.reviews[0].transition.captured,'p');
  assert.equal(lesson.reviews[0].consequence.strategicMoveQualityEstablished,false);
  assert.equal(lesson.delivery.explanationSemanticsDelivered,false);
  assert.equal(lesson.quality.neuralSelectivity,'unmeasured');
  assert.equal(lesson.coverage,'candidate-subset');
  assert.equal(f.board.pgn(),history);
  f.assessment.rows[0].score=100; assert.equal(lesson.initialAssessment.rows[0].score,0.1);
});
test('unknown is retained in coverage but cannot be scheduled as a teaching event',()=>{
  const f=fixture();
  const lesson=compileConsequenceLesson(f.board,f.task,f.assessment,
    [f.make('e1e5',{status:'unknown',certificate:null}),f.make('a1a4')],f.memoryHash);
  assert.deepEqual(lesson.unknownMoves,['e1e5']); assert.equal(lesson.replayExperiences.length,1);
  assert.equal(lesson.contrast.available,false); assert.equal(lesson.eventBudget.scheduled,1);
});
test('forged defense proof, stale ranking memory, repeated action and budget excess are rejected',()=>{
  const f=fixture(),events=[f.make('e1e5'),f.make('a1a4')];
  const run=(e=events,hash=f.memoryHash,options={})=>compileConsequenceLesson(f.board,f.task,f.assessment,e,hash,options);
  assert.throws(()=>run(events,'b'.repeat(64)),/Stale/);
  assert.throws(()=>run([events[0],events[0]]),/Duplicate/);
  assert.throws(()=>run(events,f.memoryHash,{maxExperiences:1}));
  const forged=structuredClone(events); forged[0].proof.certificate.replies.pop();
  assert.throws(()=>run(forged));
});
test('full legal ranking coverage is explicit and cannot be inferred from reviewed actions',()=>{
  const f=fixture();
  f.assessment.rows=f.board.moves({verbose:true}).map(m=>({move:m.from+m.to+(m.promotion??''),score:m.from==='e1'&&m.to==='e5'?1:0}));
  const lesson=compileConsequenceLesson(f.board,f.task,f.assessment,[f.make('e1e5'),f.make('a1a4')],f.memoryHash);
  assert.equal(lesson.quality.allLegalInitialRanking,true); assert.equal(lesson.reviews.length,2);
  assert.equal(lesson.quality.transfer,'unmeasured');
});
