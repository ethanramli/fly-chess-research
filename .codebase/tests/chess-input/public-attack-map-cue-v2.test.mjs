import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {createPublicAttackMapEncoderV1} from '../../src/chess-input/public-attack-map-cue-v1.mjs';
import {createPublicAttackMapEncoderV2} from '../../src/chess-input/public-attack-map-cue-v2.mjs';

const range=(a,n)=>Array.from({length:n},(_,i)=>a+i);
const mapping={readyForCandidateExperiment:true,groups:['MBON01','MBON12','MBON07'].map((mbonType,i)=>({mbonType,kc:range(1000*i,1000)}))};
const task={objective:'capture-retention',plies:1};
const encoder=createPublicAttackMapEncoderV2(mapping,{seed:20261027});
const tokens=(fen,move)=>encoder.encode(new Chess(fen),move,task).tokens;

test('attack tokens are conjoined with the capture or quiet tag', () => {
  const fen='k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1';
  assert.deepEqual(tokens(fen,'g5h4'),['act:capture','act:capture|att:none']);
  assert.deepEqual(tokens(fen,'g5f4'),['act:capture','act:capture|att:r:free']);
  assert.deepEqual(tokens(fen,'a8b8'),['act:quiet','act:quiet|att:none']);
});

test('a pin by the mover\'s slider behind the attacker is marked pin, created or broken by the move', () => {
  // Training board f0-pin-p0a: after hxg5 the knight is pinned by Qg7; after Qxg5 it is not.
  const f0='8/K3knQ1/8/6p1/7P/8/8/8 w - - 0 1';
  assert.deepEqual(tokens(f0,'h4g5'),['act:capture','act:capture|att:n:pin']);
  assert.deepEqual(tokens(f0,'g7g5'),['act:capture','act:capture|att:n:kline']);
  assert.deepEqual(tokens(f0,'g7f7'),['act:capture','act:capture|att:k:free']);
  // Training board f2-pin-p0a: after Rxf6 the queen on f2 is pinned on the e1-h4 diagonal; after Qxf6 it is not.
  const f2='8/5R2/4Kb2/8/7Q/8/5q2/4k3 w - - 0 1';
  assert(tokens(f2,'f7f6').includes('act:capture|att:q:pin'));
  assert(!tokens(f2,'h4f6').includes('act:capture|att:q:pin'));
  assert(tokens(f2,'h4f6').includes('act:capture|att:q:kline'));
  for(const [fen,mark] of [
    ['8/K2k1nQ1/8/6p1/7P/8/8/8 w - - 0 1','pin'],    // gap between king and attacker, queen behind
    ['8/K2kpnQ1/8/6p1/7P/8/8/8 w - - 0 1','free'],   // blocked king line
    ['4k3/K4nQ1/8/6p1/7P/8/8/8 w - - 0 1','kline'],  // diagonal king line, nothing behind on it
    ['8/K3knB1/8/6p1/7P/8/8/8 w - - 0 1','kline'],   // a bishop does not pin along a rank
    ['8/K4nQ1/8/6p1/7P/8/1k6/8 w - - 0 1','free']])  // not on a king line
    assert.deepEqual(tokens(fen,'h4g5'),['act:capture',`act:capture|att:n:${mark}`],fen);
  // A piece of the attacker's own side behind it is no pin.
  assert(tokens('8/K3knq1/8/6p1/7P/8/8/8 w - - 0 1','h4g5').includes('act:capture|att:n:kline'));
});

test('v2 carries the v1 facts: removing the tag prefix and folding pin into kline gives the v1 tokens', () => {
  const v1=createPublicAttackMapEncoderV1(mapping,{seed:20261027});
  for(const fen of ['k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1','8/K3knQ1/8/6p1/7P/8/8/8 w - - 0 1','8/5R2/4Kb2/8/7Q/8/5q2/4k3 w - - 0 1']){
    const board=new Chess(fen);
    for(const move of board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''))){
      const folded=encoder.encode(board,move,task).tokens.map(t=>t.replace(/^act:(capture|quiet)\|/,'').replace(/:pin$/,':kline'));
      assert.deepEqual([...new Set(folded)].sort(),v1.encode(board,move,task).tokens,`${fen} ${move}`);
    }
  }
});

test('the child cue after a move repeats the move cue from the mover side', () => {
  for(const [fen,move] of [['k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1','g5f4'],['8/K3knQ1/8/6p1/7P/8/8/8 w - - 0 1','h4g5'],
    ['8/K3knQ1/8/6p1/7P/8/8/8 w - - 0 1','a7a6'],['8/5R2/4Kb2/8/7Q/8/5q2/4k3 w - - 0 1','f7f6']]){
    const board=new Chess(fen),child=new Chess();child.loadPgn(board.pgn());child.move({from:move.slice(0,2),to:move.slice(2,4)});
    const action=encoder.encode(board,move,task),value=encoder.encode(child,null,task);
    assert.equal(action.perspective,'actor');assert.equal(value.perspective,'mover');
    assert.deepEqual(value.tokens,action.tokens,`${fen} ${move}`);
    assert.deepEqual(value.stimulation,action.stimulation);
  }
});

test('each token drives cellsPerToken hashed cells in every pool within the cell budget', () => {
  const board=new Chess('k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1'),cue=encoder.encode(board,'g5f4',task);
  assert.equal(cue.assignments.length,2*3*20);
  for(const a of cue.assignments) assert(mapping.groups.find(g=>g.mbonType===a.compartment).kc.includes(a.index));
  assert.equal(cue.stimulation.length,120-cue.accounting.collisions);
  assert(cue.stimulation.every(s=>s.current===1.5));
  const capped=createPublicAttackMapEncoderV2(mapping,{seed:20261027,maxCells:32,totalCurrent:24}).encode(board,'g5f4',task);
  assert.equal(capped.stimulation.length,32);assert(capped.stimulation.every(s=>s.current===0.75));
  const other=createPublicAttackMapEncoderV2(mapping,{seed:7}).encode(board,'g5f4',task);
  assert.deepEqual(other.tokens,cue.tokens);assert.notDeepEqual(other.stimulation,cue.stimulation);
  assert.notEqual(encoder.identity,createPublicAttackMapEncoderV1(mapping,{seed:20261027}).identity);
});

test('rejects teacher labels, illegal actions, positions without a public move and bad budgets', () => {
  const board=new Chess('k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1');
  assert.throws(()=>encoder.encode(board,'g5g3',task),/Illegal/);
  assert.throws(()=>encoder.encode(board,null,task),/needs an action/);
  assert.throws(()=>encoder.encode(board,'g5f4',{...task,label:'success'}),/no teacher labels/);
  assert.throws(()=>createPublicAttackMapEncoderV2({...mapping,readyForCandidateExperiment:false}),/Invalid/);
  assert.throws(()=>createPublicAttackMapEncoderV2(mapping,{cellsPerToken:33}),/Invalid/);
});
