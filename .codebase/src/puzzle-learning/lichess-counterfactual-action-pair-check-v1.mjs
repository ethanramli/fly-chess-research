// Independent replay check for v1 Lichess counterfactual action-pair families.
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {checkCaptureRetentionActions} from '../search-and-feedback/capture-retention-action-domain.mjs';

const uci=move=>move.from+move.to+(move.promotion??'');
const task={objective:'capture-retention',plies:1};

export function checkLichessCounterfactualActionPair(source,pair){
  assert.equal(pair?.variants?.length,2);
  assert(['opponent-king-guard','opponent-quiet-move'].includes(pair.changedRole));
  assert(Array.isArray(pair.probeMoves)&&pair.probeMoves.length===2);
  const [probeA,probeB]=pair.probeMoves;assert.notEqual(probeA,probeB);
  const sourceFen=source.fen(),sourcePgn=source.pgn(),actor=source.turn(),verified=[];
  for(const variant of pair.variants){
    assert.equal(variant.branch.length,2);assert.equal(variant.branch[0],pair.commonMove);
    const board=new Chess();board.loadPgn(sourcePgn);assert.equal(board.fen(),sourceFen);
    for(const text of variant.branch){
      assert.match(text,/^[a-h][1-8][a-h][1-8]$/);
      const move=board.moves({verbose:true}).find(row=>uci(row)===text);assert(move,'Illegal derived continuation');
      assert(['n','b'].includes(move.flags),'Continuation must be quiet and nonpromoting');board.move(move);
      assert(!board.isGameOver(),'Terminal derived decision');
    }
    assert.equal(board.turn(),actor);assert.deepEqual(Object.keys(variant.context).sort(),['fen','pgn','task']);
    assert.deepEqual(variant.context.task,task);assert.equal(variant.context.fen,board.fen());assert.equal(variant.context.pgn,board.pgn());
    const legal=board.moves({verbose:true}).map(uci).sort();
    assert.deepEqual(variant.candidates.map(row=>row.move),legal,'Require full all-legal consequence coverage');
    const checked=checkCaptureRetentionActions(board,task,variant.candidates);
    for(const [index,candidate] of variant.candidates.entries()){
      assert.deepEqual(candidate.context,variant.context);assert.equal(candidate.actor,actor);
      assert.equal(candidate.status,checked[index].status);assert.notEqual(checked[index].status,'unknown');
      assert.equal(candidate.learningAllowed,checked[index].learningAllowed);
      assert.equal(candidate.certificateSha256,checked[index].certificateSha256);
    }
    for(const move of [probeA,probeB]){
      const row=variant.candidates.find(candidate=>candidate.move===move);assert(row,'Probe move must be legal in both positions');
      assert.equal(row.proof.certificate?.schema,'capture-retention-certificate-v1','Probe actions must be captures');
    }
    verified.push({variant,board,legal});
  }
  const [first,second]=verified;
  for(const index of [0,1]){
    const from=first.variant.branch[1].slice(0,2),other=second.variant.branch[1].slice(0,2);
    assert.equal(from,other,'The same opponent piece must move in both variants');
    assert.equal(first.variant.responsePiece,second.variant.responsePiece);
    assert.equal(first.variant.responseFlags,second.variant.responseFlags);
    if(pair.changedRole==='opponent-king-guard')assert.equal(first.variant.responsePiece,'k');
  }
  assert.notEqual(first.variant.branch[1].slice(2,4),second.variant.branch[1].slice(2,4));
  const ignored=new Set([first.variant.branch[1].slice(0,2),first.variant.branch[1].slice(2,4),second.variant.branch[1].slice(2,4)]);
  const otherPieces=row=>row.board.board().flat().filter(Boolean).map(p=>({square:p.square,type:p.type,color:p.color}))
    .filter(p=>!ignored.has(p.square)).sort((a,b)=>a.square.localeCompare(b.square));
  assert.deepEqual(otherPieces(first),otherPieces(second),'Only the responder piece may change square');
  assert.equal(first.board.fen().split(' ').slice(1).join(' '),second.board.fen().split(' ').slice(1).join(' '));
  const outcomes=verified.map(({variant})=>new Map(variant.candidates.map(row=>[row.move,row.status])));
  assert(['success','failure'].includes(outcomes[0].get(probeA))&&['success','failure'].includes(outcomes[0].get(probeB)));
  assert.notEqual(outcomes[0].get(probeA),outcomes[0].get(probeB));
  assert.equal(outcomes[1].get(probeA),outcomes[0].get(probeB),'Probe A consequence must reverse');
  assert.equal(outcomes[1].get(probeB),outcomes[0].get(probeA),'Probe B consequence must reverse');
  assert.equal(source.fen(),sourceFen);assert.equal(source.pgn(),sourcePgn);
  return {verified:true,variants:2,probeMoves:[probeA,probeB],
    scope:'Independent replay confirms source history, legal one-piece counterfactual, all-legal one-reply certificates, and crossed outcomes for the same two capture actions.'};
}
