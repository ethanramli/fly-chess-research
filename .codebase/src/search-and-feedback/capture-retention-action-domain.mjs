// C01 task domain: a quiet action does not perform this capture objective.
// Existing capture evidence stays unchanged; these labels are not overall move quality.
import {createHash} from 'node:crypto';
import {uci} from './puzzle-search.mjs';
import {certifyCaptureRetention} from './capture-retention-certificate.mjs';
import {checkCaptureRetentionCertificate} from './capture-retention-certificate-check.mjs';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const schema='capture-retention-noncapture-certificate-v1';
function taskOptions(task,options){
  if(task?.objective!=='capture-retention'||task.plies!==1
    ||Object.keys(task).sort().join(',')!=='objective,plies')throw Error('Require exact one-reply capture-retention task');
  if(Object.keys(options).some(k=>k!=='maxReplies')||!Number.isSafeInteger(options.maxReplies??256)
    ||(options.maxReplies??256)<1||(options.maxReplies??256)>256)throw Error('Invalid reply bound');
}
function boundedRoot(board){
  const rootPgn=board.pgn();
  if(rootPgn.length>65536||board.history().length>512)throw Error('Unbounded task history');
  return {rootFen:board.fen(),rootPgn,actor:board.turn()};
}
function legalAction(board,move,task,options){
  taskOptions(task,options);boundedRoot(board);
  const action=board.moves({verbose:true}).find(candidate=>uci(candidate)===move);
  if(!action)throw Error('Task action is not legal in the supplied board/history');
  return action;
}

export function certifyCaptureRetentionAction(board,move,task,options={}){
  const action=legalAction(board,move,task,options);
  if(action.captured)return certifyCaptureRetention(board,move,options);
  return noncaptureProof({rootFen:board.fen(),rootPgn:board.pgn(),actor:board.turn()},move,task);
}
function noncaptureProof(root,move,task){
  const certificate={schema,...root,move,
    task:{...task},consequence:'does-not-perform-capture-task'};
  return {status:'failure',certificate,certificateSha256:digest(certificate)};
}

export function checkCaptureRetentionAction(board,move,task,proof,options={}){
  const action=legalAction(board,move,task,options);
  if(action.captured)return checkCaptureRetentionCertificate(board,move,proof,options);
  return checkNoncapture({rootFen:board.fen(),rootPgn:board.pgn(),actor:board.turn()},move,task,proof);
}
function checkNoncapture(root,move,task,proof){
  if(proof?.status==='unknown'){
    if(proof.certificate!=null||proof.certificateSha256!=null)throw Error('Unknown consequence cannot carry a certificate');
    return {verified:false,status:'unknown',learningAllowed:false,experimentalPulse:null,certificateSha256:null};
  }
  const c=proof?.certificate;
  if(proof?.status!=='failure'||c?.schema!==schema||c.rootFen!==root.rootFen||c.rootPgn!==root.rootPgn
    ||c.actor!==root.actor||c.move!==move||c.task?.objective!==task.objective||c.task?.plies!==task.plies
    ||Object.keys(c.task).sort().join(',')!=='objective,plies'
    ||c.consequence!=='does-not-perform-capture-task'||proof.certificateSha256!==digest(c))
    throw Error('Noncapture proof does not bind to this action/history/task');
  return {verified:true,status:'failure',actor:root.actor,move,learningAllowed:true,
    experimentalPulse:true,certificateSha256:proof.certificateSha256,
    meaning:'This legal action does not perform the declared capture-retention task; no overall move-quality claim'};
}

// One bounded, synchronous root: full history remains on the real board. Capture
// proofs still use the independent reply enumerator; quiet actions reuse only
// the validated immutable root fields instead of replaying its PGN per action.
export function certifyCaptureRetentionActions(board,task,options={}){
  taskOptions(task,options);const root=boundedRoot(board);
  const legal=board.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)));
  if(!legal.length||legal.length>256)throw Error('Invalid all-legal action bound');
  return legal.map(action=>{const move=uci(action);
    return {move,proof:action.captured?certifyCaptureRetention(board,move,options):noncaptureProof(root,move,task)};});
}

export function checkCaptureRetentionActions(board,task,candidates,options={}){
  taskOptions(task,options);const root=boundedRoot(board);
  const legal=board.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)));
  if(!Array.isArray(candidates)||!legal.length||legal.length>256||candidates.length!==legal.length
    ||candidates.some((candidate,i)=>candidate.move!==uci(legal[i])))
    throw Error('Require exact sorted all-legal action coverage');
  return candidates.map((candidate,i)=>legal[i].captured
    ?checkCaptureRetentionCertificate(board,candidate.move,candidate.proof,options)
    :checkNoncapture(root,candidate.move,task,candidate.proof));
}
