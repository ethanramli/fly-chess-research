// Converts a replay-checked bounded consequence into an experimental stimulus
// decision. Never computes a neural parameter update or treats unknown as bad.
import { createHash } from 'node:crypto';
import { copyBoard, uci } from './puzzle-search.mjs';
import { checkMateCertificate } from './mate-certificate-check.mjs';
export function verifiedExperience(board, move, task, proof) {
  if(task?.objective!=='forced-mate'||![1,3,5,7].includes(task.plies)||!['success','failure','unknown'].includes(proof?.status))throw Error('Invalid bounded consequence');
  const legal=board.moves({verbose:true}).find(m=>uci(m)===move);
  if(!legal)throw Error('Feedback action is not legal in the supplied context');
  const actor=board.turn(),before=board.pgn(),successor=copyBoard(board);successor.move(legal);
  if(proof.status==='unknown')return{move,actor,status:'unknown',experimentalPulse:null,certificateSha256:null,learningAllowed:false};
  const checked=checkMateCertificate(proof.certificate,successor,{attacker:actor,plies:task.plies-1,maxNodes:100000,milliseconds:2000});
  if(!checked.verified||checked.status!==proof.status)throw Error('Consequence certificate failed independent binding/replay');
  if(board.pgn()!==before)throw Error('Feedback changed real history');
  return{move,actor,status:checked.status,experimentalPulse:checked.status==='failure',learningAllowed:true,
    certificateSha256:createHash('sha256').update(JSON.stringify(proof.certificate)).digest('hex'),
    meaning:'Experimental PPL103 stimulus for failure of this bounded mate objective; not full-game loss or natural reward reconstruction'};
}
