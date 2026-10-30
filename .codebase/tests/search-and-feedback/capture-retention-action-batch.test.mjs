import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction,
  certifyCaptureRetentionActions,checkCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
const task={objective:'capture-retention',plies:1};

test('batch certificates and checks exactly equal individual full-history calls',()=>{
  for(const fen of [null,'6k1/8/8/8/p6r/1P6/8/RK6 w - - 1 2']){
    const board=new Chess(fen??undefined);
    if(!fen)board.loadPgn('1. e4 d5');
    const before={fen:board.fen(),pgn:board.pgn(),history:board.history()};
    const proofs=certifyCaptureRetentionActions(board,task);
    assert.deepEqual(proofs.map(p=>p.move),board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')).sort());
    const checked=checkCaptureRetentionActions(board,task,proofs);
    for(const [i,p] of proofs.entries()){
      assert.deepEqual(p.proof,certifyCaptureRetentionAction(board,p.move,task));
      assert.deepEqual(checked[i],checkCaptureRetentionAction(board,p.move,task,p.proof));
    }
    assert.deepEqual({fen:board.fen(),pgn:board.pgn(),history:board.history()},before);
  }
});

test('batch checker rejects omitted, duplicated, reordered and rehashed mismatched actions',()=>{
  const board=new Chess();board.loadPgn('1. e4 d5');
  const proofs=certifyCaptureRetentionActions(board,task);
  for(const bad of [proofs.slice(1),[proofs[0],...proofs.slice(0,-1)],[...proofs].reverse()])
    assert.throws(()=>checkCaptureRetentionActions(board,task,bad),/coverage/);
  const changed=structuredClone(proofs);changed[0].proof.certificate.rootPgn+=' *';
  assert.throws(()=>checkCaptureRetentionActions(board,task,changed));
  assert.throws(()=>checkCaptureRetentionActions(board,{...task,extra:true},proofs),/exact/);
});

test('bounded batch unknowns cannot teach and retain root history',()=>{
  const board=new Chess();board.loadPgn('1. e4 d5');const pgn=board.pgn();
  const proofs=certifyCaptureRetentionActions(board,task,{maxReplies:1});
  const checked=checkCaptureRetentionActions(board,task,proofs,{maxReplies:1});
  const index=proofs.findIndex(p=>p.move==='e4d5');
  assert.equal(proofs[index].proof.status,'unknown');assert.equal(checked[index].learningAllowed,false);
  assert.equal(checked[index].certificateSha256,null);assert.equal(board.pgn(),pgn);
});
