import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {searchPuzzle} from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
import {uci} from '../../src/search-and-feedback/puzzle-search.mjs';
test('async policy is awaited, terminal perspective is correct, and real task history is preserved',async()=>{
  for(const[fen,wanted]of[['7k/5Q2/6K1/8/8/8/8/8 w - - 0 1','f7g7'],['8/8/8/8/8/6k1/5q2/7K b - - 0 1','f2g2']]){
    const b=new Chess(fen),history=b.pgn();let awaited=false;
    const policy={evaluate:async(board,moves)=>{await new Promise(r=>setImmediate(r));awaited=true;return{priors:moves.map(m=>uci(m)===wanted?1:0),value:0};}};
    const r=await searchPuzzle(policy,b,{simulations:3,maxEvaluations:2,milliseconds:10000});
    assert.equal(awaited,true);assert.equal(uci(r.move),wanted);assert.equal(r.candidates.find(c=>c.uci===wanted).value,1);assert.equal(b.pgn(),history);assert.equal(r.stoppedBy.simulations,true);
  }
});
test('an asynchronous evaluator failure unwinds hypothetical moves without losing repetition context',async()=>{
  const b=new Chess();for(const m of['Nf3','Nf6','Ng1','Ng8'])b.move(m);const history=b.pgn();let calls=0;
  await assert.rejects(searchPuzzle({evaluate:async(board,moves)=>{await new Promise(r=>setImmediate(r));if(++calls>1)throw Error('async failure');return{priors:moves.map(()=>1),value:0};}},b,{milliseconds:10000}),/async failure/);
  assert.equal(b.pgn(),history);
});
