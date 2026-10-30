// Build legal, source-bound Stage 1 pairs where two identical capture choices
// exchange certified outcomes after one opponent piece changes square.
import assert from 'node:assert/strict';
import {certifyCaptureRetentionActions,checkCaptureRetentionActions} from '../search-and-feedback/capture-retention-action-domain.mjs';

const uci=move=>move.from+move.to+(move.promotion??'');
const ordered=moves=>moves.sort((a,b)=>uci(a).localeCompare(uci(b)));
const quiet=move=>['n','b'].includes(move.flags);
const task={objective:'capture-retention',plies:1};

function consequencePair(first,second){
  const a=new Map(first.candidates.map(row=>[row.move,row.status]));
  const b=new Map(second.candidates.map(row=>[row.move,row.status]));
  const captures=[...a.keys()].filter(move=>b.has(move)
    &&first.candidates.find(row=>row.move===move).proof.certificate?.schema==='capture-retention-certificate-v1')
    .sort();
  for(let i=0;i<captures.length;i++)for(let j=i+1;j<captures.length;j++){
    const x=captures[i],y=captures[j];
    if(a.get(x)==='success'&&a.get(y)==='failure'&&b.get(x)==='failure'&&b.get(y)==='success')return [x,y];
    if(a.get(x)==='failure'&&a.get(y)==='success'&&b.get(x)==='success'&&b.get(y)==='failure')return [x,y];
  }
  return null;
}

/** Enumerate source-bound legal continuations; no learner score or engine is used. */
export async function findLichessCounterfactualActionPair(board,{
  maxBranches=64,commonMoveKind='any-quiet',responseMoveKind='any-quiet',onBranch=async()=>{},
}={}){
  assert(Number.isSafeInteger(maxBranches)&&maxBranches>=1&&maxBranches<=4096);
  assert(['king','any-quiet'].includes(commonMoveKind));assert(['king','any-quiet'].includes(responseMoveKind));
  const rootFen=board.fen(),rootPgn=board.pgn(),actor=board.turn();let branches=0,unknown=0;
  const empty=reason=>({pair:null,branches,unknown,reason});
  const commonFilter=commonMoveKind==='king'?move=>move.piece==='k'&&move.flags==='n':quiet;
  const responseFilter=responseMoveKind==='king'?move=>move.piece==='k'&&move.flags==='n':quiet;
  if(board.isGameOver())return empty('terminal-source');
  try{
    for(const common of ordered(board.moves({verbose:true}).filter(commonFilter))){
      board.move(common);try{
        const seen=[],responses=ordered(board.moves({verbose:true}).filter(responseFilter));
        for(const response of responses){
          if(branches>=maxBranches)return empty('branch-bound');
          board.move(response);try{
            branches++;await onBranch();
            if(board.isGameOver())continue;
            const context={fen:board.fen(),pgn:board.pgn(),task:{...task}};
            const proofs=certifyCaptureRetentionActions(board,task),checked=checkCaptureRetentionActions(board,task,proofs);
            if(checked.some(row=>row.status==='unknown')){unknown++;continue;}
            const variant={branch:[uci(common),uci(response)],responsePiece:response.piece,responseFlags:response.flags,
              context,candidates:proofs.map((proof,index)=>({...proof,context,actor,
                status:checked[index].status,learningAllowed:checked[index].learningAllowed,
                certificateSha256:checked[index].certificateSha256}))};
            for(const previous of seen){
              if(previous.branch[1].slice(0,2)!==variant.branch[1].slice(0,2)
                ||previous.responsePiece!==variant.responsePiece||previous.responseFlags!==variant.responseFlags)continue;
              const probeMoves=consequencePair(previous,variant);if(!probeMoves)continue;
              assert.equal(previous.context.fen.split(' ').slice(1).join(' '),context.fen.split(' ').slice(1).join(' '));
              return {pair:{variants:[previous,variant],probeMoves,
                changedRole:responseMoveKind==='king'?'opponent-king-guard':'opponent-quiet-move',commonMove:uci(common)},
                branches,unknown,reason:'pair-found'};
            }
            seen.push(variant);
          }finally{board.undo();}
        }
      }finally{board.undo();}
    }
    return empty('roots-exhausted');
  }finally{
    assert.equal(board.fen(),rootFen,'Counterfactual construction changed source position');
    assert.equal(board.pgn(),rootPgn,'Counterfactual construction changed source history');
    assert.equal(board.turn(),actor);
  }
}
