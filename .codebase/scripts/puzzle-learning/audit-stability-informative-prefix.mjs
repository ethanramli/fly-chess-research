import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const root='research/reports/multi-context-stability-v1-2026-10-07',file=`${root}/condition-informative.json`;
const c=JSON.parse(fs.readFileSync(file)),baseline=JSON.parse(fs.readFileSync(`${root}/baseline.json`));
assert.equal(c.condition,'informative');assert.equal(c.stoppedBy,'pair-budget');assert.equal(c.after.length,2);
let panels=0,candidates=0,proofs=0;
for(let i=0;i<c.after.length;i++){
 assert.deepEqual(c.after[i].assessment,c.repeat[i].assessment);assert.deepEqual(c.after[i].assessment,c.restored[i].assessment);
 assert.deepEqual(c.reset[i].assessment,baseline[i].assessment);
 assert.equal(c.after[i].memoryFingerprint,digest(c.learned));assert.equal(c.after[i].review.status,'success');
 for(const panel of [c.after[i],c.repeat[i],c.reset[i],c.restored[i]]){
  const review=panel.review,b=new Chess();b.loadPgn(review.context.pgn);
  const legal=b.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')).sort();
  assert.deepEqual(panel.assessment.rows.map(r=>r.move).sort(),legal);candidates+=legal.length;
  assert.ok(panel.assessment.rows.every(r=>[r.score,r.MBON12,r.MBON01].every(Number.isFinite)&&r.score===r.MBON12-r.MBON01));
  assert.equal(panel.assessment.choice,[...panel.assessment.rows].sort((a,b)=>b.score-a.score)[0].move);
  assert.equal(panel.assessment.choice,review.move);
  b.move({from:review.move.slice(0,2),to:review.move.slice(2,4),...(review.move.length===5?{promotion:review.move[4]}:{})});
  const check=checkMateCertificate(review.proof.certificate,b,{attacker:review.actor,plies:review.context.task.plies-1,maxNodes:100000,milliseconds:60000});
  assert.ok(check.verified&&check.status===review.status);panels++;proofs++;
 }
}
const out='research/reports/stability-informative-prefix-v1-2026-10-07';assert.ok(!fs.existsSync(out));fs.mkdirSync(out);
const result={passed:true,conditionSha256:await sha256(file),baselineSha256:await sha256(`${root}/baseline.json`),auditorSha256:await sha256(import.meta.filename),panels,candidates,proofs,events:c.eventRefs.length,choices:c.after.map(p=>p.review.move),resetOutcomes:c.reset.map(p=>p.review.status),scope:'Completed informative-condition record/proof/repeat/reset/restoration audit only. Matched controls, full terminal audit and independent neural recovery replay remain pending; no unfamiliar reasoning claim.'};
fs.writeFileSync(`${out}/report.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
