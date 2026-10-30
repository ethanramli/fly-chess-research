// Inert teacher preparation. The temporal session still requires a fresh unaided
// all-legal ranking and the separately registered receiver/protocol before teaching.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../search-and-feedback/capture-retention-action-domain.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');

export function prepareLichessCaptureLesson(binding,{maxReplies=256}={}){
  assert.equal(binding?.schema,'lichess-history-binding-v1','Require checked source binding');
  assert.equal(binding.historyStatus,'verified-standard-start-prefix','Unresolved source history');
  assert.equal(hash(binding.context.pgn),binding.prefixPgnSha256,'Changed source prefix');
  const board=new Chess();board.loadPgn(binding.context.pgn);
  assert.equal(board.fen(),binding.context.fen,'Changed source position');
  const task={objective:'capture-retention',plies:1};
  const context={...binding.context,task};
  const pieceCount=board.board().flat().filter(Boolean).length;
  if(board.isGameOver())return {schema:'lichess-capture-lesson-v1',puzzleId:binding.puzzleId,
    gameId:binding.gameId,context,pieceCount,candidates:[],stage1DomainEligible:false,
    reasons:['terminal-position'],neuralEventsDelivered:0};
  const moves=board.moves({verbose:true}).map(move=>move.from+move.to+(move.promotion??'')).sort();
  assert(moves.length>0&&moves.length<=256,'Invalid all-legal action bound');
  const candidates=moves.map(move=>{
    const proof=certifyCaptureRetentionAction(board,move,task,{maxReplies});
    const checked=checkCaptureRetentionAction(board,move,task,proof,{maxReplies});
    return {context,move,proof,status:checked.status,actor:board.turn(),
      learningAllowed:checked.learningAllowed,certificateSha256:checked.certificateSha256};
  });
  const counts=Object.fromEntries(['success','failure','unknown'].map(status=>[status,candidates.filter(c=>c.status===status).length]));
  const reasons=[];
  if(pieceCount>6)reasons.push('exceeds-stage-1-six-piece-limit');
  if(counts.unknown)reasons.push('incomplete-consequence-coverage');
  if(!counts.success||!counts.failure)reasons.push('missing-success-failure-contrast');
  assert.equal(board.pgn(),context.pgn,'Lesson preparation changed source history');
  return {schema:'lichess-capture-lesson-v1',puzzleId:binding.puzzleId,gameId:binding.gameId,
    context,pieceCount,candidates,counts,stage1DomainEligible:reasons.length===0,reasons,
    neuralEventsDelivered:0,scope:'All-legal one-reply capture-retention proof candidates, not overall move quality; requires G0, family registration and fresh assessment before neural delivery'};
}
