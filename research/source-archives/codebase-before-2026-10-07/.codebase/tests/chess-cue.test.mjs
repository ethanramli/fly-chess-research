import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createChessCueEncoder } from '../src/lowram/chess-cue.mjs';

const mapping={readyForCandidateExperiment:true,groups:[{kc:Array.from({length:200},(_,i)=>i+100)}]};
test('fixed chess cues preserve history, use only the mapped pool, and report bounded collisions/drops',()=>{
  const encoder=createChessCueEncoder(mapping), board=new Chess(), history=board.pgn();
  const cue=encoder.encode(board,'e2e4');
  assert.deepEqual(cue,encoder.encode(board,{from:'e2',to:'e4'}));
  assert.equal(board.pgn(),history); assert.ok(cue.stimulation.length<=64);
  assert.ok(cue.stimulation.every(s=>encoder.pool.includes(s.index)&&s.current>0&&s.current<=1.5));
  assert.ok(cue.accounting.totalCurrent<=24+1e-12);
  assert.equal(cue.accounting.collisions,cue.tokens.length-cue.accounting.uniqueProjectedCells);
  assert.equal(cue.accounting.droppedCells,cue.accounting.uniqueProjectedCells-cue.stimulation.length);
  assert.notDeepEqual(cue.stimulation,encoder.encode(board,'d2d4').stimulation);
  assert.ok(cue.tokens.includes('piece:w:p:e2|action:e2e4'));
});
test('same board-action has the same cue independent of puzzle ID; privileged labels and illegal actions are rejected',()=>{
  const encoder=createChessCueEncoder(mapping), a=new Chess(), b=new Chess(a.fen());
  assert.deepEqual(encoder.encode(a,'g1f3'),encoder.encode(b,'g1f3'));
  for(const extra of [{answer:'g1f3'},{reward:1},{id:'puzzle-17'},{motif:'fork'},{score:3}])
    assert.throws(()=>encoder.encode(a,'g1f3',{objective:'forced-mate',plies:1,...extra}),/teacher labels/);
  assert.throws(()=>encoder.encode(a,'e2e5'),/legal action/);
  assert.throws(()=>createChessCueEncoder({readyForCandidateExperiment:false,groups:[]}),/configuration/);
});
test('history, en passant, castling and promotion context are public inputs rather than future consequences',()=>{
  const encoder=createChessCueEncoder(mapping), board=new Chess();
  for(const move of ['Nf3','Nf6','Ng1','Ng8'])board.move(move);
  const cue=encoder.encode(board,'e2e4'), fenOnly=encoder.encode(new Chess(board.fen()),'e2e4');
  assert.equal(cue.repetitions,2);assert.equal(fenOnly.repetitions,1);assert.notDeepEqual(cue.tokens,fenOnly.tokens);
  assert.ok(cue.tokens.includes('castling:KQkq'));
  const ep=new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  assert.ok(encoder.encode(ep,'e5d6').tokens.includes('ep:d6'));
  const promotion=new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  assert.ok(encoder.encode(promotion,'a7a8n').tokens.includes('promotion:n'));
  assert.throws(()=>encoder.encode(promotion,'a7a8'),/legal action/);
});
test('oversized histories fail rather than silently dropping context',()=>{
  const encoder=createChessCueEncoder(mapping,{maxHistoryPlies:1}),board=new Chess();board.move('e4');board.move('e5');
  assert.throws(()=>encoder.encode(board,'g1f3'),/history exceeds/);
});
