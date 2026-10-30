import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {findLichessCounterfactualActionPair} from '../../src/puzzle-learning/lichess-counterfactual-action-pairs-v1.mjs';
import {findLichessCounterfactualActionPair as findPairV2} from '../../src/puzzle-learning/lichess-counterfactual-action-pairs-v2.mjs';
import {checkLichessCounterfactualActionPair} from '../../src/puzzle-learning/lichess-counterfactual-action-pair-check-v1.mjs';

test('same two captures exchange certified outcomes across a legal one-piece counterfactual',async()=>{
  const board=new Chess('8/4k3/8/3p1p2/8/8/8/K2R1R2 w - - 0 1'),fen=board.fen(),pgn=board.pgn();
  const result=await findPairV2(board,{commonMoveKind:'king',responseMoveKind:'king'});
  assert(result.pair);assert.equal(result.pair.changedRole,'opponent-king-guard');
  assert.deepEqual(result.pair.probeMoves,['d1d5','f1f5']);
  for(const variant of result.pair.variants)for(const move of result.pair.probeMoves)
    assert.equal(variant.candidates.find(row=>row.move===move)?.proof?.certificate?.schema,'capture-retention-certificate-v1');
  const checked=checkLichessCounterfactualActionPair(board,result.pair);assert.equal(checked.verified,true);
  assert.equal(board.fen(),fen);assert.equal(board.pgn(),pgn);
});

test('branch bound and unknown source are not converted into families',async()=>{
  const board=new Chess('8/4k3/8/3p1p2/8/8/8/K2R1R2 w - - 0 1'),pgn=board.pgn();
  const bounded=await findLichessCounterfactualActionPair(board,{commonMoveKind:'king',responseMoveKind:'king',maxBranches:1});
  assert.equal(bounded.pair,null);assert.equal(bounded.reason,'branch-bound');
  await assert.rejects(findLichessCounterfactualActionPair(board,{commonMoveKind:'king',responseMoveKind:'king',
    onBranch:async()=>{throw Error('guard-stop');}}),/guard-stop/);
  assert.equal(board.pgn(),pgn);
});

test('a probe must remain a certified capture in both counterfactual positions',async()=>{
  const board=new Chess('5K2/1Q6/8/2k1q1P1/8/8/8/8 b - - 4 58');
  const legacy=await findLichessCounterfactualActionPair(board,{maxBranches:4096});
  assert(legacy.pair,'Regression fixture must reproduce the old false-positive pair');
  assert.throws(()=>checkLichessCounterfactualActionPair(board,legacy.pair),/Probe actions must be captures/);
  const result=await findPairV2(board,{maxBranches:4096});
  assert.equal(result.pair,null);
  assert.notEqual(result.reason,'branch-bound');
});
