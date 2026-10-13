import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createAssessmentCache } from '../../src/puzzle-learning/assessment-cache.mjs';

test('Cache returns independent exact summaries and invalidates after teaching, restoration or fixed-state changes',async()=>{
  let generation='naive',calls=0;
  const board=new Chess(),moves=board.moves({verbose:true}),task={objective:'forced-mate',plies:3};
  const cache=createAssessmentCache({identity:()=>generation,guard:()=>{},assess:async()=>{
    calls++;return {rows:moves.map(m=>({move:m.from+m.to,score:generation==='learned'?1:0})),choice:'a2a3'};
  }});
  const first=await cache.assess(board,moves,task),second=await cache.assess(board,moves,task);
  assert.deepEqual(second,first); second.rows[0].score=100;
  assert.deepEqual(await cache.assess(board,moves,task),first);assert.equal(calls,1);
  generation='learned';assert.equal((await cache.assess(board,moves,task)).rows[0].score,1);
  generation='naive';assert.deepEqual(await cache.assess(board,moves,task),first);
  generation='fixed-model-changed';await cache.assess(board,moves,task);
  assert.equal(calls,4);assert.equal(cache.stats.invalidations,3);
});
test('Cache distinguishes move order, task horizon and actual history at the same FEN',async()=>{
  let calls=0;
  const assess=async(b,m)=>{calls++;return {rows:m.map(x=>({move:x.from+x.to,score:0}))};};
  const cache=createAssessmentCache({assess,identity:()=> 'fixed',guard:()=>{},capacity:2});
  const a=new Chess(),b=new Chess();for(const m of ['Nf3','Nf6','Ng1','Ng8']) b.move(m);
  const c=new Chess(b.fen());assert.equal(b.fen(),c.fen());assert.notEqual(b.pgn(),c.pgn());
  const moves=a.moves({verbose:true});await cache.assess(a,moves,{plies:3});await cache.assess(a,moves.slice().reverse(),{plies:3});
  await cache.assess(a,moves,{plies:1});await cache.assess(b,b.moves({verbose:true}),{plies:3});
  await cache.assess(c,c.moves({verbose:true}),{plies:3});assert.equal(calls,5);
});
test('Guard runs on cache hits and failed/mutating assessments are never cached',async()=>{
  let state='a', guards=0,calls=0;
  const board=new Chess(),moves=board.moves({verbose:true});
  const cache=createAssessmentCache({identity:()=>state,guard:()=>{guards++;},assess:async()=>{
    calls++;state='b';return {rows:moves.map(()=>({score:0}))};
  }});
  await assert.rejects(cache.assess(board,moves,{}),/changed frozen identity/);
  await cache.assess(board,moves,{});await cache.assess(board,moves,{});
  assert.equal(calls,2);assert.ok(guards>=5);
});
test('Fresh checks always run the graph and prime only their unchanged result for the following search',async()=>{
  let calls=0;
  const board=new Chess(),moves=board.moves({verbose:true});
  const cache=createAssessmentCache({identity:()=> 'frozen-memory',guard:()=>{},assess:async()=>({rows:moves.map((m)=>({move:m.from+m.to,ordinal:++calls}))})});
  const fresh=await cache.assess(board,moves,{}, {fresh:true});
  assert.equal(calls,moves.length);assert.equal(cache.stats.hits,0);
  const searchedRoot=await cache.assess(board,moves,{});
  assert.deepEqual(searchedRoot,fresh);assert.equal(calls,moves.length);assert.equal(cache.stats.hits,1);
  const primed=await cache.assess(board,moves,{}, {fresh:true});assert.equal(calls,moves.length*2);
  const nextSearch=await cache.assess(board,moves,{});assert.deepEqual(nextSearch,primed);assert.equal(calls,moves.length*2);
});
