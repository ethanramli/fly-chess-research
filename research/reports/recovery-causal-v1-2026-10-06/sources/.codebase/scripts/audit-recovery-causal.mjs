// Independent reconstruction; no neural kernel, encoder or plasticity imports.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {checkMateCertificate} from '../src/lowram/mate-certificate-check.mjs';
const {values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'},compare:{type:'string'}}});
if(!args.run||!args.out||existsSync(args.out))throw Error('Require completed run and new audit');
const read=p=>JSON.parse(readFileSync(p)),hash=v=>createHash('sha256').update(v).digest('hex'),digest=v=>hash(JSON.stringify(v));
const r=read(join(args.run,'report.json'));assert.equal(r.complete,true);
for(const[p,h]of Object.entries({...r.identity.inputs,...r.identity.sources}))assert.equal(hash(readFileSync(p)),h);
const original=read(join(r.protocol.sourceRun,'report.json')),adaptive=original.results.find(r=>r.condition==='adaptive'),mapping=read('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping;
assert.deepEqual(r.identity.originalIdentity,original.identity);assert.deepEqual(r.originalGates,original.summary.gates);assert.equal(read(join(r.protocol.sourceRun,'audit-prefix.json')).passed,true);
const jobs=r.protocol.attempts.flatMap(attempt=>r.protocol.interventions.map(intervention=>({attempt,intervention})));
assert.deepEqual(r.identity.jobs,jobs);assert.equal(r.results.length,jobs.length);
const puzzle=original.identity.puzzle,board=new Chess(puzzle.fen),legal=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
for(let n=0;n<jobs.length;n++){
  const row=r.results[n],job=jobs[n],event=adaptive.receipts[job.attempt-1];assert.deepEqual(row.job,job);
  let gains=event.after.gains.slice();
  if(job.intervention==='suppress-positive')gains=gains.map((v,i)=>Math.min(v,event.before.gains[i]));
  if(job.intervention==='remove-recovery-term'){
    let i=0;gains=[];
    for(let group=0;group<mapping.groups.length;group++)for(let j=0;j<mapping.groups[group].edges.length;j++,i++){
      const value=event.before.gains[i]+original.protocol.eta*event.local.factors[group]*event.local.kc[i];
      gains.push(Math.max(original.protocol.minGain,Math.min(original.protocol.maxGain,value)));
    }
  }
  assert.deepEqual(row.memory,{...event.after,gains});assert.equal(row.probe.memoryHash,digest(row.memory));
  assert.equal(row.changedEdges,gains.filter((v,i)=>v!==event.after.gains[i]).length);
  assert.deepEqual(row.probe.rows.map(v=>v.move),legal);assert.equal(new Set(legal).size,legal.length);
  for(const v of row.probe.rows){assert.ok([v.score,v.MBON12,v.MBON01].every(Number.isFinite));assert.equal(v.score,v.MBON12-v.MBON01);}
  assert.equal(row.probe.choice,[...row.probe.rows].sort((a,b)=>b.score-a.score)[0].move);
  if(job.intervention==='recorded'){assert.deepEqual(row.probe,event.probeAfter);assert.equal(row.changedEdges,0);}
  assert.equal(row.revivedMove,event.probeAfter.choice);assert.equal(row.revivalPrevented,row.probe.choice!==row.revivedMove);assert.equal(row.fixedStatePreserved,true);
  const after=new Chess();after.loadPgn(board.pgn());after.move({from:row.probe.choice.slice(0,2),to:row.probe.choice.slice(2,4),...(row.probe.choice.length===5?{promotion:row.probe.choice[4]}:{})});
  const checked=row.proof.status==='unknown'?{status:'unknown'}:checkMateCertificate(row.proof.certificate,after,{attacker:board.turn(),plies:puzzle.plies-1,maxNodes:4096});
  if(row.proof.status!=='unknown')assert.equal(checked.verified,true,checked.reason);
  assert.equal(checked.status,row.status);
}
const summary=Object.fromEntries(r.protocol.interventions.map(intervention=>{const rows=r.results.filter(v=>v.job.intervention===intervention);return[intervention,{jobs:rows.length,revivalsPrevented:rows.filter(v=>v.revivalPrevented).length,verifiedSuccesses:rows.filter(v=>v.status==='success').length}];}));assert.deepEqual(r.summary,summary);
let prefixExact=null;
if(args.compare){const other=read(join(args.compare,'report.json'));assert.deepEqual(other.identity,r.identity);
  const strip=v=>Array.isArray(v)?v.map(strip):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='elapsedMs').map(([k,x])=>[k,strip(x)])):v;
  assert.ok(other.results.length>0);for(const row of other.results)assert.deepEqual(strip(row),strip(r.results.find(v=>digest(v.job)===digest(row.job))));prefixExact=true;
}
const audit={passed:true,jobs:jobs.length,allLegalCandidates:legal.length,summary,prefixExact,reportSha256:hash(readFileSync(join(args.run,'report.json'))),auditSha256:hash(readFileSync('.codebase/scripts/audit-recovery-causal.mjs')),peakRssMiB:process.resourceUsage().maxRSS/1024,
  scope:'Intervention arithmetic, recorded-response reproduction, exact legal coverage/rankings, independent consequence certificates and frozen identities. Artificial single-event causal comparison; no biological or transfer acceptance.'};
writeFileSync(args.out,JSON.stringify(audit,null,2),{flag:'wx'});console.log(JSON.stringify({passed:true,summary,prefixExact}));
