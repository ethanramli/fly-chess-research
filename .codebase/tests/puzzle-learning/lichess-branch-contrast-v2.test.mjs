import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {findKingGuardContrast} from '../../src/puzzle-learning/lichess-branch-contrast-v2.mjs';
const fixture=()=>new Chess('8/4k3/8/3p1p2/8/8/8/K2R1R2 w - - 0 1');

test('legal king-guard branches invert two capture choices with identical legal options',async()=>{
  const board=fixture(),fen=board.fen(),pgn=board.pgn();
  const result=await findKingGuardContrast(board);
  assert(result.pair);assert.deepEqual(result.pair.captureChoices,['d1d5','f1f5']);
  const [a,b]=result.pair.variants;
  assert.notEqual(a.winner,b.winner);assert.deepEqual(a.candidates.map(c=>c.move),b.candidates.map(c=>c.move));
  for(const v of [a,b]){
    const replay=fixture();for(const move of v.branch)replay.move({from:move.slice(0,2),to:move.slice(2,4)});
    assert.equal(replay.fen(),v.context.fen);assert.equal(replay.pgn(),v.context.pgn);
    assert.equal(v.candidates.filter(c=>c.status==='success').length,1);
    for(const move of result.pair.captureChoices)
      assert.equal(v.candidates.find(c=>c.move===move).status,move===v.winner?'success':'failure');
  }
  assert.equal(board.fen(),fen);assert.equal(board.pgn(),pgn);
});

test('bounded branch exhaustion and guard failure retain exact source history',async()=>{
  const board=fixture(),pgn=board.pgn();
  const bounded=await findKingGuardContrast(board,{maxBranches:1});
  assert.equal(bounded.branches,1);assert.equal(bounded.pair,null);assert.equal(bounded.reason,'branch-bound');
  assert.equal(board.pgn(),pgn);
  await assert.rejects(findKingGuardContrast(board,{onBranch:async()=>{throw Error('guard-stop');}}),/guard-stop/);
  assert.equal(board.pgn(),pgn);
});

test('expanded search accepts the registered 4096 branch ceiling',async()=>{
  const board=fixture();
  const result=await findKingGuardContrast(board,{maxBranches:4096});
  assert(result.pair);
  assert(result.branches<=4096);
});

test('a common quiet piece move can create the capture geometry absent from king-only branches',async()=>{
  const board=new Chess('3k4/8/2p1p3/8/8/8/Q7/K7 w - - 0 1'),pgn=board.pgn();
  assert.equal((await findKingGuardContrast(board)).pair,null);
  const result=await findKingGuardContrast(board,{commonMoveKind:'any-quiet'});
  assert(result.pair);assert.notEqual(result.pair.commonMove.slice(0,2),'a1');
  for(const v of result.pair.variants)assert.equal(v.candidates.filter(c=>c.status==='success').length,1);
  assert.equal(board.pgn(),pgn);
});
