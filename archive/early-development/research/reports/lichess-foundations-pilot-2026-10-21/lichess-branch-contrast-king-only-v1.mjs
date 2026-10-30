// Teacher-side legal continuation construction, not inference inside the learner.
import assert from 'node:assert/strict';
import {certifyCaptureRetentionActions,checkCaptureRetentionActions} from '../search-and-feedback/capture-retention-action-domain.mjs';

const uci=m=>m.from+m.to+(m.promotion??'');
const ordered=moves=>moves.sort((a,b)=>uci(a).localeCompare(uci(b)));
const task={objective:'capture-retention',plies:1};
const quietKing=m=>m.piece==='k'&&m.flags==='n';

export async function findKingGuardContrast(board,{maxBranches=64,onBranch=async()=>{}}={}){
  assert(Number.isSafeInteger(maxBranches)&&maxBranches>=1&&maxBranches<=512);
  const rootFen=board.fen(),rootPgn=board.pgn();let branches=0,unknown=0;
  const empty=reason=>({pair:null,branches,unknown,reason});
  if(board.isGameOver())return empty('terminal-source');
  const actor=board.turn();
  if(board.board().flat().filter(p=>p&&p.color!==actor&&p.type!=='k').length<2)
    return empty('fewer-than-two-capture-targets');
  try{
    for(const common of ordered(board.moves({verbose:true}).filter(quietKing))){
      board.move(common);
      try{
        if(board.isGameOver())continue;
        const seen=[];
        for(const defender of ordered(board.moves({verbose:true}).filter(quietKing))){
          if(branches>=maxBranches)return empty('branch-bound');
          board.move(defender);
          try{
            branches++;await onBranch();
            if(board.isGameOver())continue;
            const legal=board.moves({verbose:true});
            if(legal.filter(m=>m.captured).length<2)continue;
            const context={fen:board.fen(),pgn:board.pgn(),task:{...task}};
            const proofs=certifyCaptureRetentionActions(board,task);
            const checked=checkCaptureRetentionActions(board,task,proofs);
            if(checked.some(c=>c.status==='unknown')){unknown++;continue;}
            const winners=proofs.filter((_,i)=>checked[i].status==='success');
            if(winners.length!==1)continue;
            const candidateMoves=proofs.map(p=>p.move);
            const variant={branch:[uci(common),uci(defender)],context,winner:winners[0].move,
              candidates:proofs.map((p,i)=>({...p,context,actor,status:checked[i].status,
                learningAllowed:checked[i].learningAllowed,certificateSha256:checked[i].certificateSha256}))};
            for(const previous of seen){
              if(previous.winner===variant.winner)continue;
              if(JSON.stringify(previous.candidates.map(p=>p.move))!==JSON.stringify(candidateMoves))continue;
              assert.equal(previous.context.fen.split(' ').slice(1).join(' '),context.fen.split(' ').slice(1).join(' '));
              return {pair:{variants:[previous,variant],captureChoices:[previous.winner,variant.winner].sort(),
                changedRole:'opponent-king-guard',commonMove:uci(common)},branches,unknown,reason:'pair-found'};
            }
            seen.push(variant);
          }finally{board.undo();}
        }
      }finally{board.undo();}
    }
    return empty('king-branches-exhausted');
  }finally{
    assert.equal(board.fen(),rootFen,'Branch construction changed source position');
    assert.equal(board.pgn(),rootPgn,'Branch construction changed source history');
  }
}
