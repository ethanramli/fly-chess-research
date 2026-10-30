import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {certifyCaptureRetentionActions} from '../../src/search-and-feedback/capture-retention-action-domain.mjs';
import {certifyMate} from '../../src/search-and-feedback/mate-certificate.mjs';
import {verifiedExperience} from '../../src/search-and-feedback/verified-feedback.mjs';
import {observePostInterferenceRetention,evaluatePostInterferenceRetention} from '../../src/puzzle-learning/curriculum-retention-observations.mjs';

const uci=move=>move.from+move.to+(move.promotion??'');
function template(stage){
  const board=new Chess(stage===1?'7k/8/8/8/p7/8/8/R6K w - - 0 1':'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  const task=stage===1?{objective:'capture-retention',plies:1}:{objective:'forced-mate',plies:1};
  const context={fen:board.fen(),pgn:board.pgn(),task};
  const experiences=stage===1?certifyCaptureRetentionActions(board,task).map(row=>({context,move:row.move,
    proof:row.proof,status:row.proof.status,certificateSha256:row.proof.certificateSha256})):
    board.moves({verbose:true}).map(move=>{
      const child=new Chess();child.loadPgn(context.pgn);child.move(move);
      const proof=certifyMate(child,'w',{plies:0}),checked=verifiedExperience(board,uci(move),task,proof);
      return {context,move:uci(move),proof,...checked};
    });
  assert(experiences.some(row=>row.status==='success'));assert(experiences.some(row=>row.status==='failure'));
  return {context,experiences};
}
const templates={1:template(1),2:template(2)};
function fixture({forgetEarlier=false,forgetCurrent=false}={}){
  // Synthetic measurement fixture with real rule certificates and a deliberately
  // controlled mock ranking; not disjoint research data or evidence of learning.
  const panels=(stage,split,count)=>Array.from({length:count},(_,index)=>({
    ...structuredClone(templates[stage]),stage,split,panelId:`s${stage}-${split}-${index}`,
    familyId:`s${stage}-${split}-family-${index%4}`,stratum:`stratum-${index%4}`}));
  const data={currentValidation:panels(2,'validation',16),earlier:[{
    stage:1,validation:panels(1,'validation',16),sentinels:panels(1,'train',4)}]};
  let memory={phase:'baseline'};
  const brain={presentations:0,memory:{snapshot:()=>structuredClone(memory),restore:value=>{memory=structuredClone(value);}},
    memoryFingerprint:()=>digest(memory),async assess(_board,moves,task){
      this.presentations+=moves.length;
      const stage=task.objective==='capture-retention'?1:2;
      const failure=memory.phase==='post'&&(stage===1?forgetEarlier:forgetCurrent);
      const choice=templates[stage].experiences.find(row=>row.status===(failure?'failure':'success')).move;
      return {choice,rows:moves.map(move=>({move:uci(move),score:uci(move)===choice?1:0}))};
    }};
  const args={stage:2,replica:'r0',condition:'informative',brain,
    baselineMemory:{phase:'baseline'},selectedMemory:{phase:'selected'},postMemory:{phase:'post'},
    panels:data,guard:()=>{}};
  return {args,brain};
}

test('post-interference observations measure all required positions and retain the actual tested memory',async()=>{
  const {args,brain}=fixture(),report=await observePostInterferenceRetention(args);
  assert.equal(report.gate.retentionPassed,true);assert.equal(report.gate.metrics.currentAfter,16);
  assert.equal(report.gate.metrics.earlier[0].afterSentinels,4);
  assert.equal(brain.memoryFingerprint(),digest(args.postMemory));
  assert.notEqual(brain.memoryFingerprint(),digest(args.selectedMemory));
  assert.equal(report.current.post.length,16);assert.equal(report.earlier[0].baseline.validation.length,16);
});

test('forgotten earlier foundations and lost current validation fail the measured gate',async()=>{
  const forgotten=await observePostInterferenceRetention(fixture({forgetEarlier:true}).args);
  assert.equal(forgotten.gate.retentionPassed,false);
  assert(forgotten.gate.failed.includes('earlierValidationRetained'));
  assert(forgotten.gate.failed.includes('earlierSentinelsRetained'));
  const current=await observePostInterferenceRetention(fixture({forgetCurrent:true}).args);
  assert(current.gate.failed.includes('currentValidationRetained'));
});

test('changed certificates, stale memory bindings and missing sentinel coverage are unknown',async()=>{
  const valid=await observePostInterferenceRetention(fixture().args);
  const certificate=structuredClone(valid);certificate.current.post[0].certificateSha256='b'.repeat(64);
  assert.equal(evaluatePostInterferenceRetention(certificate).status,'unknown');
  const stale=structuredClone(valid);stale.current.post[0].memorySha256=valid.memoryHashes.selected;
  assert.equal(evaluatePostInterferenceRetention(stale).status,'unknown');
  const missing=structuredClone(valid);missing.earlier[0].after.sentinels.pop();
  assert.equal(evaluatePostInterferenceRetention(missing).status,'unknown');
});

test('unknown consequence evidence rejects observation and restores the original memory/counter',async()=>{
  const {args,brain}=fixture();
  args.panels.currentValidation[0].experiences[0].proof={status:'unknown',certificate:null};
  await assert.rejects(()=>observePostInterferenceRetention(args));
  assert.equal(brain.memoryFingerprint(),digest(args.baselineMemory));assert.equal(brain.presentations,0);
});

test('final-set positions cannot be used as retention validation or training sentinels',async()=>{
  const {args}=fixture();args.panels.currentValidation[0].split='final';
  await assert.rejects(()=>observePostInterferenceRetention(args),/registered validation/);
});
