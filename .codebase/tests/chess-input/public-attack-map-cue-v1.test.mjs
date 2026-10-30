import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {createPublicAttackMapEncoderV1} from '../../src/chess-input/public-attack-map-cue-v1.mjs';

const range=(a,n)=>Array.from({length:n},(_,i)=>a+i);
const mapping={readyForCandidateExperiment:true,groups:['MBON01','MBON12','MBON07'].map((mbonType,i)=>({mbonType,kc:range(1000*i,1000)}))};
const task={objective:'capture-retention',plies:1};
const encoder=createPublicAttackMapEncoderV1(mapping,{seed:20261027});

test('tokens are capture or quiet and the enemy attackers of the landing square after the move', () => {
  const board=new Chess('k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1');
  assert.deepEqual(encoder.encode(board,'g5h4',task).tokens,['act:capture','att:none']);
  assert.deepEqual(encoder.encode(board,'g5f4',task).tokens,['act:capture','att:r:free']);
  assert.deepEqual(encoder.encode(board,'a8b8',task).tokens,['act:quiet','att:none']);
  assert.equal(board.fen(),'k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1');
});

test('an attacker on a clear line with its own king is marked kline', () => {
  const board=new Chess('8/K3knQ1/8/6p1/7P/8/8/8 w - - 0 1');
  assert.deepEqual(encoder.encode(board,'h4g5',task).tokens,['act:capture','att:n:kline']);
  assert.deepEqual(encoder.encode(board,'g7f7',task).tokens,['act:capture','att:k:free']);
  for(const [fen,mark] of [['8/K2k1nQ1/8/6p1/7P/8/8/8 w - - 0 1','kline'],['8/K2kpnQ1/8/6p1/7P/8/8/8 w - - 0 1','free'],
    ['4k3/K4nQ1/8/6p1/7P/8/8/8 w - - 0 1','kline'],['8/K4nQ1/8/6p1/7P/8/1k6/8 w - - 0 1','free']])
    assert.deepEqual(encoder.encode(new Chess(fen),'h4g5',task).tokens,['act:capture',`att:n:${mark}`],fen);
});

test('the child cue after a move repeats the move cue from the mover side', () => {
  for(const [fen,move] of [['k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1','g5f4'],['8/K3knQ1/8/6p1/7P/8/8/8 w - - 0 1','g7f7'],
    ['8/K3knQ1/8/6p1/7P/8/8/8 w - - 0 1','a7a6']]){
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
  const small=createPublicAttackMapEncoderV1(mapping,{seed:20261027,cellsPerToken:1}).encode(board,'g5f4',task);
  assert.equal(small.assignments.length,6);assert.deepEqual(small.tokens,cue.tokens);
  const capped=createPublicAttackMapEncoderV1(mapping,{seed:20261027,maxCells:32,totalCurrent:24}).encode(board,'g5f4',task);
  assert.equal(capped.stimulation.length,32);assert(capped.stimulation.every(s=>s.current===0.75));
  assert(capped.stimulation.every(s=>cue.stimulation.some(c=>c.index===s.index)));
  const other=createPublicAttackMapEncoderV1(mapping,{seed:7}).encode(board,'g5f4',task);
  assert.deepEqual(other.tokens,cue.tokens);assert.notDeepEqual(other.stimulation,cue.stimulation);
});

test('rejects teacher labels, illegal actions, positions without a public move and bad budgets', () => {
  const board=new Chess('k7/5R2/8/6p1/5N1P/8/8/2K5 b - - 0 1');
  assert.throws(()=>encoder.encode(board,'g5g3',task),/Illegal/);
  assert.throws(()=>encoder.encode(board,null,task),/needs an action/);
  assert.throws(()=>encoder.encode(board,'g5f4',{...task,label:'success'}),/no teacher labels/);
  assert.throws(()=>createPublicAttackMapEncoderV1({...mapping,readyForCandidateExperiment:false}),/Invalid/);
  assert.throws(()=>createPublicAttackMapEncoderV1(mapping,{cellsPerToken:33}),/Invalid/);
});
