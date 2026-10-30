// Separate derivation/certificate verifier; never imports the family producer.
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {checkCaptureRetentionActions} from '../search-and-feedback/capture-retention-action-domain.mjs';
const uci=m=>m.from+m.to+(m.promotion??'');
const task={objective:'capture-retention',plies:1};

export function checkLegalBranchContrast(source,pair,{commonMoveKind='king'}={}){
  assert(['king','any-quiet'].includes(commonMoveKind));
  assert.equal(pair.variants.length,2);assert.equal(pair.changedRole,'opponent-king-guard');
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
      if(i===1)assert.equal(move.flags,'n');
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
    verified.push({legal,fen:board.fen(),winner:variant.winner,
      defender:board.board().flat().find(p=>p&&p.type==='k'&&p.color!==actor).square,
      others:board.board().flat().filter(p=>p&&!(p.type==='k'&&p.color!==actor))});
  }
  assert.notEqual(verified[0].defender,verified[1].defender);
  assert.deepEqual(verified[0].others,verified[1].others,'Only the defending king may differ');
  assert.deepEqual(verified[0].legal,verified[1].legal);
  assert.equal(verified[0].fen.split(' ').slice(1).join(' '),verified[1].fen.split(' ').slice(1).join(' '));
  assert.notEqual(verified[0].winner,verified[1].winner);
  assert.equal(source.fen(),fen);assert.equal(source.pgn(),pgn);
  return {verified:true,variants:2,captureChoices:[...pair.captureChoices],
    scope:'Legal continuation and exact immediate-task counterfactual only; source-game authenticity, family splits, neural learning and reasoning remain separate.'};
}
