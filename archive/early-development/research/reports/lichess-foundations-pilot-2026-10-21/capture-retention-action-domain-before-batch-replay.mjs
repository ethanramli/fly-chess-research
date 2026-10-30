// C01 task domain: a quiet action does not perform this capture objective.
// Existing capture evidence stays unchanged; these labels are not overall move quality.
import {createHash} from 'node:crypto';
import {uci} from './puzzle-search.mjs';
import {certifyCaptureRetention} from './capture-retention-certificate.mjs';
import {checkCaptureRetentionCertificate} from './capture-retention-certificate-check.mjs';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const schema='capture-retention-noncapture-certificate-v1';
function legalAction(board,move,task,options){
  if(task?.objective!=='capture-retention'||task.plies!==1
    ||Object.keys(task).sort().join(',')!=='objective,plies')throw Error('Require exact one-reply capture-retention task');
  if(Object.keys(options).some(k=>k!=='maxReplies')||!Number.isSafeInteger(options.maxReplies??256)
    ||(options.maxReplies??256)<1||(options.maxReplies??256)>256)throw Error('Invalid reply bound');
  if(board.pgn().length>65536||board.history().length>512)throw Error('Unbounded task history');
  const action=board.moves({verbose:true}).find(candidate=>uci(candidate)===move);
  if(!action)throw Error('Task action is not legal in the supplied board/history');
  return action;
}

export function certifyCaptureRetentionAction(board,move,task,options={}){
  const action=legalAction(board,move,task,options);
  if(action.captured)return certifyCaptureRetention(board,move,options);
  const certificate={schema,rootFen:board.fen(),rootPgn:board.pgn(),actor:board.turn(),move,
    task:{...task},consequence:'does-not-perform-capture-task'};
  return {status:'failure',certificate,certificateSha256:digest(certificate)};
}

export function checkCaptureRetentionAction(board,move,task,proof,options={}){
  const action=legalAction(board,move,task,options);
  if(action.captured)return checkCaptureRetentionCertificate(board,move,proof,options);
  if(proof?.status==='unknown'){
    if(proof.certificate!=null||proof.certificateSha256!=null)throw Error('Unknown consequence cannot carry a certificate');
    return {verified:false,status:'unknown',learningAllowed:false,experimentalPulse:null,certificateSha256:null};
  }
  const c=proof?.certificate;
  if(proof?.status!=='failure'||c?.schema!==schema||c.rootFen!==board.fen()||c.rootPgn!==board.pgn()
    ||c.actor!==board.turn()||c.move!==move||c.task?.objective!==task.objective||c.task?.plies!==task.plies
    ||Object.keys(c.task).sort().join(',')!=='objective,plies'
    ||c.consequence!=='does-not-perform-capture-task'||proof.certificateSha256!==digest(c))
    throw Error('Noncapture proof does not bind to this action/history/task');
  return {verified:true,status:'failure',actor:board.turn(),move,learningAllowed:true,
    experimentalPulse:true,certificateSha256:proof.certificateSha256,
    meaning:'This legal action does not perform the declared capture-retention task; no overall move-quality claim'};
}
