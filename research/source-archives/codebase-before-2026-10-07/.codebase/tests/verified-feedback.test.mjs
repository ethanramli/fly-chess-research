import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { certifyMate } from '../src/lowram/mate-certificate.mjs';
import { copyBoard } from '../src/lowram/puzzle-search.mjs';
import { verifiedExperience } from '../src/lowram/verified-feedback.mjs';
test('verified consequence uses acting side and task horizon; unknown supplies no teaching pulse',()=>{
  for(const[fen,bad,good]of [['7k/5Q2/6K1/8/8/8/8/8 w - - 0 1','f7a2','f7h7'],['8/8/8/8/8/6k1/5q2/7K b - - 0 1','f2a7','f2h2']]){
    const board=new Chess(fen),history=board.pgn(),task={objective:'forced-mate',plies:1};
    for(const move of[bad,good]){
      const b=copyBoard(board);b.move({from:move.slice(0,2),to:move.slice(2,4)});
      const proof=certifyMate(b,board.turn(),{plies:0});
      const event=verifiedExperience(board,move,task,proof);
      assert.equal(event.actor,board.turn());assert.equal(event.experimentalPulse,move===bad);assert.equal(event.learningAllowed,true);
      const forged=structuredClone(proof);forged.certificate.attacker=board.turn()==='w'?'b':'w';
      assert.throws(()=>verifiedExperience(board,move,task,forged));
    }
    const unknown=verifiedExperience(board,bad,task,{status:'unknown'});
    assert.equal(unknown.learningAllowed,false);assert.equal(unknown.experimentalPulse,null);assert.equal(board.pgn(),history);
  }
});
test('a claimed known outcome cannot bypass proof replay with a success flag',()=>{
  const b=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  assert.throws(()=>verifiedExperience(b,'f7a2',{objective:'forced-mate',plies:1},{status:'success',certificateCheck:{verified:true}}));
});
