import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync,renameSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const digest=x=>hash(JSON.stringify(x)),read=path=>JSON.parse(readFileSync(path));
const protocolPath='research/data/assessment-cache-v2/protocol.json',p=read(protocolPath),base=read(p.baseProtocol);
const reportPath=join(p.out,'report.json'),r=read(reportPath),reference=read(p.referenceReport);
assert.equal(r.complete,true);assert.equal(r.identity.protocolSha256,hash(readFileSync(protocolPath)));
assert.deepEqual(r.identity.pins,p.pins);
for(const [path,sha] of Object.entries(p.pins)) assert.equal(hash(readFileSync(path)),sha,path);
const eventRef=reference.results.find(v=>v.condition==='informative').eventRefs[0];
assert.equal(hash(readFileSync(eventRef.path)),eventRef.sha256);const event=read(eventRef.path);
const board=new Chess();board.loadPgn(event.experience.context.pgn);
const legal=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
const child=new Chess();child.loadPgn(board.pgn());child.move({from:event.experience.move.slice(0,2),to:event.experience.move.slice(2,4)});
const checked=checkMateCertificate(event.experience.proof.certificate,child,{attacker:board.turn(),plies:event.experience.context.task.plies-1});
assert.equal(checked.verified,true);assert.equal(checked.status,event.experience.status);
let recurrences=0;
const mapping=read(base.mappingPath).mapping;
for(const result of r.results) {
  assert.equal(result.acknowledged,true);assert.equal(result.fixedStateHash,base.shared.invariant);
  const pending=read(join(p.out,result.mode+'-pending.json'));
  assert.equal(pending.acknowledged,false);assert.deepEqual(pending.memory,result.memory);assert.deepEqual(pending.receipt,result.receipt);
  assert.deepEqual(result.receipt,event.receipt);assert.deepEqual(result.memory,event.after);
  assert.equal(result.panels.length,4);
  for(const panel of result.panels){
    assert.deepEqual(panel.assessment.rows.map(v=>v.move).sort(),legal.slice().sort());
    for(const row of panel.assessment.rows) assert.equal(row.score,row.MBON12-row.MBON01);
    assert.equal(panel.assessment.choice,[...panel.assessment.rows].sort((a,b)=>b.score-a.score)[0].move);
    const expected=panel.stage==='before'?event.before:event.after;
    assert.equal(panel.assessment.memoryFingerprint,digest(expected));
  }
  const local=result.receipt.local;let offset=0;
  for(let group=0;group<mapping.groups.length;group++){
    const rates=local.dan[group],D=-rates.reduce((a,b)=>a+b,0)/rates.length;
    assert.ok(Math.abs(D-local.factors[group])<1e-7);
    for(let k=0;k<mapping.groups[group].edges.length;k++,offset++){
      const before=event.before.gains[offset];
      const predicted=Math.max(base.shared.memory.minGain,Math.min(base.shared.memory.maxGain,before+base.shared.memory.eta*D*(local.kc[offset]+before-1)));
      assert.ok(Math.abs(predicted-event.after.gains[offset])<1e-12);recurrences++;
    }
  }
}
assert.deepEqual(r.results[0].panels,r.results[1].panels);
assert.equal(r.results[0].presentations,legal.length*4+1);assert.equal(r.results[1].presentations,legal.length*2+1);
assert.equal(r.results[1].cache.hits,2);assert.equal(r.results[1].cache.invalidations,1);
const result={passed:true,reportSha256:hash(readFileSync(reportPath)),auditorSha256:hash(readFileSync('.codebase/scripts/evaluation-and-performance/audit-assessment-cache.mjs')),
  panels:8,certificates:1,recurrences,exactRankings:true,exactReceipts:true,pendingBeforeAcknowledgment:true,
  limitedTo:'Repeated-summary workload on one inspected fixture; fresh neural repeatability/retention and transfer are not tested by cached hits'};
const path=join(p.out,'audit.json');writeFileSync(path+'.partial',JSON.stringify(result,null,2)+'\n');renameSync(path+'.partial',path);
const marker=join(p.out,'AUDITED.json');writeFileSync(marker+'.partial',JSON.stringify({reportSha256:result.reportSha256,auditSha256:hash(readFileSync(path))},null,2)+'\n');renameSync(marker+'.partial',marker);
console.log(JSON.stringify(result));
