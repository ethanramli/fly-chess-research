import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {createBoundRayRelationalCueEncoder,createAllLegalBoundRayCueEncoder} from '../../src/chess-input/bound-ray-relational-cue.mjs';
const mapping={readyForCandidateExperiment:true,groups:[{kc:Array.from({length:120},(_,i)=>i+100)}]};
const config={seed:20261011,maxCells:8,totalCurrent:12,maxRelationCells:4};
const task={objective:'capture-retention',plies:1};

test('all-legal C01 input uses the same geometry and current for captures while declaring a distinct identity',()=>{
  const board=new Chess('6k1/8/8/8/p2p3r/8/8/3QK3 w - - 0 1');
  const old=createBoundRayRelationalCueEncoder(mapping,config),all=createAllLegalBoundRayCueEncoder(mapping,config);
  assert.notEqual(old.identity,all.identity);assert.equal(old.schema,'bound-ray-relational-cue-v1');
  assert.equal(all.schema,'bound-ray-relational-action-cue-v2');
  for(const move of ['d1a4','d1d4']){
    const a=old.encode(board,move,task),b=all.encode(board,move,task);
    for(const key of ['tokens','assignments','stimulation','relation','accounting','baseIdentity'])assert.deepEqual(b[key],a[key]);
  }
});

test('every quiet or capturing legal action is public-only, deterministic, bounded and leaves board/history unchanged',()=>{
  const board=new Chess('8/8/8/4k3/p3r3/8/8/R3R2K w - - 0 1'),before={fen:board.fen(),pgn:board.pgn()};
  const all=createAllLegalBoundRayCueEncoder(mapping,config),old=createBoundRayRelationalCueEncoder(mapping,config);
  for(const move of board.moves({verbose:true})){
    const action=move.from+move.to+(move.promotion??''),cue=all.encode(board,action,task);
    assert.deepEqual(cue,all.encode(board,action,task));assert.equal(cue.stimulation.length,8);assert.equal(cue.accounting.totalCurrent,12);
    assert(cue.stimulation.every(c=>c.current===1.5&&mapping.groups[0].kc.includes(c.index)));
    assert(!cue.tokens.some(token=>/success|failure|safe|unsafe|recaptur|certificate/.test(token)));
    assert.deepEqual({fen:board.fen(),pgn:board.pgn()},before);
    if(!move.captured)assert.throws(()=>old.encode(board,action,task),/legal capture/);
  }
  assert.throws(()=>all.encode(board,'a1a8',task),/legal action/);
  assert.throws(()=>all.encode(board,'a1a4',{...task,outcome:'success'}),/capture-retention task/);
  assert.throws(()=>all.encode(board,'a1a4',{objective:'forced-mate',plies:1}),/capture-retention task/);
});
