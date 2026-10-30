// Separate derivation/certificate verifier; never imports the family producer.
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {checkCaptureRetentionActions} from '../search-and-feedback/capture-retention-action-domain.mjs';
const uci=m=>m.from+m.to+(m.promotion??'');
const task={objective:'capture-retention',plies:1};

export function checkLegalBranchContrast(source,pair,{commonMoveKind='king',responseMoveKind='king'}={}){
  assert(['king','any-quiet'].includes(commonMoveKind));
  assert(['king','any-quiet'].includes(responseMoveKind));
  assert.equal(pair.variants.length,2);
  assert.equal(pair.changedRole,responseMoveKind==='king'?'opponent-king-guard':'opponent-quiet-move');
  assert.equal(pair.captureChoices.length,2);assert.equal(new Set(pair.captureChoices).size,2);
  assert.deepEqual(pair.captureChoices,[...pair.captureChoices].sort());
  const pgn=source.pgn(),fen=source.fen(),actor=source.turn(),verified=[];
  for(const variant of pair.variants){
    assert.equal(variant.branch.length,2);assert.equal(variant.branch[0],pair.commonMove);
    const board=new Chess();board.loadPgn(pgn);assert.equal(board.fen(),fen);
    for(const [i,text] of variant.branch.entries()){
      assert.match(text,/^[a-h][1-8][a-h][1-8]$/);
      const move=board.moves({verbose:true}).find(m=>uci(m)===text);assert(move,'Illegal derived continuation');
      assert(['n','b'].includes(move.flags),'Continuation must be quiet/nonpromoting/noncastling');
      if(i===1||commonMoveKind==='king')assert.equal(move.piece,'k');
      if(i===1){
        if(responseMoveKind==='king')assert.equal(move.piece,'k');
        assert.equal(move.piece,variant.responsePiece);assert.equal(move.flags,variant.responseFlags);
      }
      board.move(move);assert(!board.isGameOver(),'Terminal derived decision');
    }
    assert.equal(board.turn(),actor);
    assert.deepEqual(Object.keys(variant.context).sort(),['fen','pgn','task']);
    assert.deepEqual(variant.context.task,task);assert.equal(variant.context.fen,board.fen());
    assert.equal(variant.context.pgn,board.pgn(),'Derived history mismatch');
    const legal=board.moves({verbose:true}).map(uci).sort();
    assert.deepEqual(variant.candidates.map(c=>c.move),legal);
    const checks=checkCaptureRetentionActions(board,task,variant.candidates);
    for(const [i,c] of variant.candidates.entries()){
      assert.deepEqual(c.context,variant.context);assert.equal(c.actor,actor);
      assert.equal(c.status,checks[i].status);assert.notEqual(checks[i].status,'unknown');
      assert.equal(c.learningAllowed,checks[i].learningAllowed);
      assert.equal(c.certificateSha256,checks[i].certificateSha256);
    }
    const success=variant.candidates.filter(c=>c.status==='success');
    assert.equal(success.length,1);assert.equal(success[0].move,variant.winner);
    assert(pair.captureChoices.includes(variant.winner));
    for(const move of pair.captureChoices){
      const c=variant.candidates.find(c=>c.move===move);assert(c);
      assert.equal(c.proof.certificate.schema,'capture-retention-certificate-v1');
      assert.equal(c.status,move===variant.winner?'success':'failure');
    }
    const response=variant.branch[1];
    verified.push({legal,fen:board.fen(),winner:variant.winner,
      responseFrom:response.slice(0,2),responseTo:response.slice(2,4),
      responsePiece:variant.responsePiece,responseFlags:variant.responseFlags,
      pieces:board.board().flat().filter(Boolean).map(p=>({square:p.square,type:p.type,color:p.color}))});
  }
  assert.equal(verified[0].responseFrom,verified[1].responseFrom);
  assert.notEqual(verified[0].responseTo,verified[1].responseTo);
  assert.equal(verified[0].responsePiece,verified[1].responsePiece);
  assert.equal(verified[0].responseFlags,verified[1].responseFlags);
  const ignored=new Set([verified[0].responseFrom,verified[0].responseTo,verified[1].responseTo]);
  const otherPieces=row=>row.pieces.filter(piece=>!ignored.has(piece.square)).sort((a,b)=>a.square.localeCompare(b.square));
  assert.deepEqual(otherPieces(verified[0]),otherPieces(verified[1]),'Only one quiet responder piece may differ');
  assert.deepEqual(verified[0].legal,verified[1].legal);
  assert.equal(verified[0].fen.split(' ').slice(1).join(' '),verified[1].fen.split(' ').slice(1).join(' '));
  assert.notEqual(verified[0].winner,verified[1].winner);
  assert.equal(source.fen(),fen);assert.equal(source.pgn(),pgn);
  return {verified:true,variants:2,captureChoices:[...pair.captureChoices],
    scope:'Legal continuation and exact immediate-task counterfactual only; source-game authenticity, family splits, neural learning and reasoning remain separate.'};
}
