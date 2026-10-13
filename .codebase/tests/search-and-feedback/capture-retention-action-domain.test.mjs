import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {certifyCaptureRetention} from '../../src/search-and-feedback/capture-retention-certificate.mjs';

const task={objective:'capture-retention',plies:1};
const fixtures=['6k1/8/8/8/p6r/1P6/8/RK6 w - - 0 1','6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1'];

test('C01 domain independently checks every legal action, preserving legacy capture proofs and the real board',()=>{
  for(const fen of fixtures){
    const board=new Chess(fen),before={fen:board.fen(),pgn:board.pgn(),history:board.history()};
    const labels=[];
    for(const action of board.moves({verbose:true})){
      const move=action.from+action.to+(action.promotion??''),proof=certifyCaptureRetentionAction(board,move,task);
      const checked=checkCaptureRetentionAction(board,move,task,proof);
      assert(checked.verified&&checked.learningAllowed);assert.equal(checked.actor,board.turn());labels.push(checked.status);
      if(action.captured)assert.deepEqual(proof,certifyCaptureRetention(board,move));
      else{assert.equal(checked.status,'failure');assert.match(checked.meaning,/does not perform/);assert.match(checked.meaning,/no overall/);}
      assert.deepEqual({fen:board.fen(),pgn:board.pgn(),history:board.history()},before);
    }
    assert.equal(labels.length,board.moves().length);
    assert.equal(checkCaptureRetentionAction(board,'a1a4',task,certifyCaptureRetentionAction(board,'a1a4',task)).status,
      fen===fixtures[0]?'failure':'success');
  }
});

test('forged quiet/capture classes, mismatched history/task, illegal actions and false success are rejected',()=>{
  const board=new Chess(fixtures[0]),proof=certifyCaptureRetentionAction(board,'a1a2',task),before=board.pgn();
  for(const change of [p=>{p.status='success';},p=>{p.certificate.actor='b';},p=>{p.certificate.rootPgn+=' ';},
    p=>{p.certificate.move='a1a3';},p=>{p.certificate.task.plies=3;},p=>{p.certificateSha256='a'.repeat(64);},
    p=>{p.certificate.consequence='good-move';}]){
    const p=structuredClone(proof);change(p);assert.throws(()=>checkCaptureRetentionAction(board,'a1a2',task,p));
  }
  assert.throws(()=>checkCaptureRetentionAction(board,'a1a4',task,proof));
  assert.throws(()=>certifyCaptureRetentionAction(board,'a1a8',task),/not legal/);
  assert.throws(()=>certifyCaptureRetentionAction(board,'a1a2',{objective:'forced-mate',plies:1}),/exact one-reply/);
  assert.throws(()=>checkCaptureRetentionAction(board,'a1a2',{...task,plies:3},proof));
  assert.throws(()=>certifyCaptureRetentionAction(board,'a1a2',task,{maxReplies:0}),/reply bound/);
  assert.throws(()=>certifyCaptureRetentionAction(board,'a1a2',task,{milliseconds:1}),/reply bound/);
  assert.equal(board.pgn(),before);
});

test('exhausted capture proof and unknown quiet proof permit no event; quiet legality needs no opponent search',()=>{
  const board=new Chess(fixtures[0]);
  const exhausted=certifyCaptureRetentionAction(board,'a1a4',task,{maxReplies:1});assert.equal(exhausted.status,'unknown');
  for(const [move,proof] of [['a1a4',exhausted],['a1a2',{status:'unknown',certificate:null}]]){
    const checked=checkCaptureRetentionAction(board,move,task,proof);assert(!checked.verified&&!checked.learningAllowed);
    assert.equal(checked.experimentalPulse,null);assert.equal(checked.certificateSha256,null);
  }
  const quiet=certifyCaptureRetentionAction(board,'a1a2',task,{maxReplies:1});
  assert(checkCaptureRetentionAction(board,'a1a2',task,quiet,{maxReplies:1}).verified);
  assert.throws(()=>checkCaptureRetentionAction(board,'a1a2',task,{status:'unknown',certificate:quiet.certificate}));
});

test('en passant, both actors, capture promotions and quiet promotions keep exact task semantics',()=>{
  const cases=[
    ['7k/8/8/3pP3/8/8/8/7K w - d6 0 1','e5d6',true,'w'],
    ['7k/8/8/8/3Pp3/8/8/7K b - d3 0 1','e4d3',true,'b'],
    ['1r5k/P7/8/8/8/8/8/7K w - - 0 1','a7b8q',true,'w'],
    ['7k/P7/8/8/8/8/8/7K w - - 0 1','a7a8q',false,'w'],
    ['7k/8/8/8/8/8/p7/7K b - - 0 1','a2a1q',false,'b'],
  ];
  for(const [fen,move,captures,actor] of cases){
    const board=new Chess(fen),before=board.pgn(),proof=certifyCaptureRetentionAction(board,move,task),checked=checkCaptureRetentionAction(board,move,task,proof);
    assert(checked.verified);assert.equal(checked.actor,actor);assert.equal(board.pgn(),before);
    if(captures)assert.deepEqual(proof,certifyCaptureRetention(board,move));else assert.equal(checked.status,'failure');
  }
});

test('identical FEN with different move/repetition history cannot reuse a teaching certificate',()=>{
  const board=new Chess(fixtures[0]);
  for(const move of ['Ra2','Rh5','Ra1','Rh4'])board.move(move);
  const sameFen=new Chess(board.fen());assert.equal(sameFen.fen(),board.fen());assert.notEqual(sameFen.pgn(),board.pgn());
  for(const move of ['a1a2','a1a4']){
    const proof=certifyCaptureRetentionAction(board,move,task);
    assert(checkCaptureRetentionAction(board,move,task,proof).verified);
    assert.throws(()=>checkCaptureRetentionAction(sameFen,move,task,proof),/bind/);
  }
});
