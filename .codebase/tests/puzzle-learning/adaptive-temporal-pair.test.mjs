import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {certifyMate} from '../../src/search-and-feedback/mate-certificate.mjs';
import {verifiedExperience} from '../../src/search-and-feedback/verified-feedback.mjs';
import {selectTemporalPair} from '../../src/puzzle-learning/adaptive-temporal-pair.mjs';

test('feedback follows replacement errors, stops at correct/tied choices, and rejects stale evidence',()=>{
  const board=new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'),task={objective:'forced-mate',plies:1};
  const moves=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
  const experiences=new Map(moves.map(move=>{
    const next=new Chess(board.fen());next.move({from:move.slice(0,2),to:move.slice(2,4)});
    const proof=certifyMate(next,board.turn(),{plies:0});
    return [move,{...verifiedExperience(board,move,task,proof),proof}];
  }));
  const assessment=choice=>({fen:board.fen(),pgn:board.pgn(),task,choice,
    rows:moves.map(move=>({move,score:move===choice?1:0}))});
  for(const wrong of ['f7g8','f7d7']) assert.deepEqual(
    selectTemporalPair(board,task,assessment(wrong),experiences,'f7h7').moves,[wrong,'f7h7']);
  assert.equal(selectTemporalPair(board,task,assessment('f7h7'),experiences,'f7h7').reason,'verified-success');
  assert.equal(selectTemporalPair(board,task,assessment(null),experiences,'f7h7').reason,'tied-choice');
  const unknown=structuredClone(experiences);
  unknown.set('f7g8',{...unknown.get('f7g8'),status:'unknown',learningAllowed:false,
    certificateSha256:null,proof:{status:'unknown'}});
  assert.equal(selectTemporalPair(board,task,assessment('f7g8'),unknown,'f7h7').reason,'unknown-choice');
  const forged=structuredClone(experiences);forged.get('f7g8').status='success';
  assert.throws(()=>selectTemporalPair(board,task,assessment('f7g8'),forged,'f7h7'));
  assert.throws(()=>selectTemporalPair(board,task,{...assessment('f7g8'),rows:[]},experiences,'f7h7'));
});
