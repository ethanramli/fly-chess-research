// Independently check the bounded claim that a learner action does or does
// not permit an opponent-forced mate within the task horizon.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {checkMateCertificate} from './mate-certificate-check.mjs';

const uci=move=>move.from+move.to+(move.promotion??'');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function checkAvoidMateActionCertificate(board,move,task,proof,
  {maxNodes=100000,milliseconds=2000}={}){
  assert.equal(task?.objective,'avoid-mate');
  assert.equal(task.plies,3,'This bounded Stage 2 subtask is fixed at three plies');
  assert.deepEqual(Object.keys(task).sort(),['objective','plies']);
  const action=board.moves({verbose:true}).find(candidate=>uci(candidate)===move);
  assert(action,'Avoid-mate action is not legal in the bound root position');
  const actor=board.turn(),rootFen=board.fen(),rootPgn=board.pgn();
  assert.equal(proof?.schema,'avoid-mate-action-certificate-v1');
  assert.equal(proof.rootFen,rootFen);assert.equal(proof.rootPgn,rootPgn);
  assert.equal(proof.actor,actor);assert.equal(proof.move,move);assert.deepEqual(proof.task,task);
  assert.deepEqual(Object.keys(proof).sort(),['actor','certificateSha256','move','opponentMateCertificate',
    'rootFen','rootPgn','schema','status','task'].sort());
  const {certificateSha256,...body}=proof;
  assert.match(certificateSha256,/^[a-f0-9]{64}$/);
  assert.equal(certificateSha256,hash(body),'Avoid-mate certificate identity changed');
  if(proof.status==='unknown'){
    assert.equal(proof.opponentMateCertificate,null);
    return {verified:false,status:'unknown',actor,move,opponentMateStatus:'unknown',
      meaning:'No teaching event: bounded mate verification was unknown'};
  }
  assert(['success','failure'].includes(proof.status));
  const child=new Chess();child.loadPgn(rootPgn);child.move(action);
  const attacker=child.turn();
  const checked=checkMateCertificate(proof.opponentMateCertificate,child,
    {attacker,plies:task.plies-1,maxNodes,milliseconds});
  if(!checked.verified)return {verified:false,status:'unknown',actor,move,
    opponentMateStatus:'unknown',opponentMate:checked};
  const expected=checked.status==='failure'?'success':'failure';
  assert.equal(proof.status,expected,'Avoid-mate label reverses opponent-mate proof incorrectly');
  return {verified:true,status:expected,actor,move,attacker,
    opponentMateStatus:checked.status,certificate:proof.opponentMateCertificate,
    certificateSha256:proof.certificateSha256,
    meaning:expected==='success'
      ?'No opponent-forced mate is certified within the remaining two plies'
      :'Opponent-forced mate is certified within the remaining two plies'};
}
