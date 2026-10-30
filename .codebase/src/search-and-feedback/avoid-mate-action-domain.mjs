// Construct a Stage 2 three-ply avoid-mate lesson for one legal root action.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {certifyMate} from './mate-certificate.mjs';
import {checkAvoidMateActionCertificate} from './avoid-mate-action-certificate-check.mjs';

const uci=move=>move.from+move.to+(move.promotion??'');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function certifyAvoidMateAction(board,move,{maxNodes=4096,milliseconds=2000}={}){
  const task={objective:'avoid-mate',plies:3};
  const action=board.moves({verbose:true}).find(candidate=>uci(candidate)===move);
  assert(action,'Avoid-mate action must be legal');
  const actor=board.turn(),rootFen=board.fen(),rootPgn=board.pgn();
  const child=new Chess();child.loadPgn(rootPgn);child.move(action);
  const opponentMate=certifyMate(child,child.turn(),{plies:task.plies-1,maxNodes,milliseconds});
  const status=opponentMate.status==='unknown'?'unknown':opponentMate.status==='failure'?'success':'failure';
  const body={schema:'avoid-mate-action-certificate-v1',rootFen,rootPgn,actor,move,task,status,
    opponentMateCertificate:opponentMate.status==='unknown'?null:opponentMate.certificate};
  let proof={...body,certificateSha256:hash(body)};
  let checked=checkAvoidMateActionCertificate(board,move,task,proof,{maxNodes:100000,milliseconds:2000});
  if(checked.status==='unknown'&&status!=='unknown'){
    const unknownBody={...body,status:'unknown',opponentMateCertificate:null};
    proof={...unknownBody,certificateSha256:hash(unknownBody)};
    checked=checkAvoidMateActionCertificate(board,move,task,proof,{maxNodes:100000,milliseconds:2000});
  }
  assert(checked.status===status||checked.status==='unknown',
    'Constructed avoid-mate certificate did not replay');
  const verifiedStatus=checked.status;
  return {move,actor,status:verifiedStatus,task,proof,
    proofSha256:proof.certificateSha256,certificateSha256:checked.verified?checked.certificateSha256:null,
    learningAllowed:checked.verified,
    meaning:verifiedStatus==='success'
      ?'No opponent-forced mate was verified within two plies after the action'
      :verifiedStatus==='failure'
        ?'Opponent-forced mate was verified within two plies after the action'
        :'Verification was incomplete; no consequence label or teaching event is available'};
}
