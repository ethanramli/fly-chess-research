// Known software examples only. Never inspect curriculum splits or load a neural graph.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {certifyCaptureRetentionAction,checkCaptureRetentionAction} from '../../../.codebase/src/search-and-feedback/capture-retention-action-domain.mjs';
const task={objective:'capture-retention',plies:1};
const fixtures=[
  {id:'blocked-ray',fen:'6k1/8/8/8/p2p3r/8/8/3QK3 w - - 0 1',probes:{d1a4:'success',d1d4:'failure'}},
  {id:'opened-ray',fen:'6k1/8/8/3p4/p6r/8/8/3QK3 w - - 0 1',probes:{d1a4:'failure',d1d5:'success'}},
  {id:'pinned-defender',fen:'8/8/8/4k3/p3r3/8/8/R3R2K w - - 0 1',probes:{a1a4:'success',e1e4:'failure'}},
  {id:'unpinned-defender',fen:'8/8/8/k7/p3r3/8/8/R3R2K w - - 0 1',probes:{a1a4:'failure',e1e4:'success'}},
];
const rows=[];
for(const f of fixtures){
  const board=new Chess(f.fen),before=board.pgn();assert.equal(board.board().flat().filter(Boolean).length,6);
  const actions=board.moves({verbose:true}),labels=[];
  for(const action of actions){
    const move=action.from+action.to+(action.promotion??''),proof=certifyCaptureRetentionAction(board,move,task),checked=checkCaptureRetentionAction(board,move,task,proof);
    assert(checked.verified&&checked.learningAllowed);assert.equal(board.pgn(),before);
    if(f.probes[move])assert.equal(checked.status,f.probes[move]);
    labels.push({move,capture:Boolean(action.captured),proof,checked});
  }
  assert(Object.keys(f.probes).every(move=>labels.some(r=>r.move===move)));
  assert(labels.some(r=>r.checked.status==='success')&&labels.some(r=>r.checked.status==='failure'));
  const unknown=certifyCaptureRetentionAction(board,Object.keys(f.probes)[0],task,{maxReplies:1});
  assert.equal(unknown.status,'unknown');assert(!checkCaptureRetentionAction(board,Object.keys(f.probes)[0],task,unknown).learningAllowed);
  const quiet=labels.find(r=>!r.capture),forged=structuredClone(quiet.proof);forged.status='success';
  assert.throws(()=>checkCaptureRetentionAction(board,quiet.move,task,forged));
  rows.push({...f,pgn:before,task,labels,allLegalActionsVerified:labels.length===actions.length,
    excludedFromTrainValidationFinal:true,neuralDelivery:false});
}
const paths=['.codebase/src/search-and-feedback/capture-retention-action-domain.mjs',
  '.codebase/src/search-and-feedback/capture-retention-certificate.mjs','.codebase/src/search-and-feedback/capture-retention-certificate-check.mjs',
  '.codebase/tests/search-and-feedback/capture-retention-action-domain.test.mjs','research/data/c01-task-domain-preflight-v1/verify.mjs',
  'node_modules/chess.js/dist/esm/chess.js'];
const sources=Object.fromEntries(paths.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
const audit={passed:true,fixtures:rows.length,legalActions:rows.reduce((n,r)=>n+r.labels.length,0),allLegalCoverage:true,
  unknownProducesNoEvent:true,rejectedForgedQuietSuccess:true,sources,
  scope:'C01 teacher-domain software only. Known examples excluded from all splits; no graph, neural update, curriculum advancement or transfer.'};
for(const [file,value] of [['examples.json',rows],['audit.json',audit]])
  writeFileSync(new URL(file,import.meta.url),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,fixtures:audit.fixtures,legalActions:audit.legalActions}));
