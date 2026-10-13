// Hash-checked read-only synthesis of the frozen development comparison.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const protocolPath='research/data/bound-ray-feedback-development-v1/protocol.json';
const protocolHash=sha(protocolPath),p=read(protocolPath);
const roots=['research/reports/bound-ray-feedback-development-v1-2026-10-08',
  'research/reports/bound-ray-feedback-development-completion-2026-10-08'];
const output='research/reports/bound-ray-feedback-development-completion-2026-10-08';
const mean=rows=>rows.reduce((s,x)=>s+x,0)/rows.length;
const arms=[];
for(const encoder of ['relational-v3','bound-ray']) for(const condition of p.conditions) {
  const dir=roots.map(root=>`${root}/${encoder}-${condition}`).find(path=>existsSync(`${path}/report.json`));
  if(!dir) {arms.push({encoder,condition,complete:false,reason:'No completed report'});continue;}
  const reportPath=`${dir}/report.json`,r=read(reportPath),complete=read(`${dir}/COMPLETE`);
  assert.equal(sha(reportPath),complete.reportSha256);assert.equal(r.identity.protocolSha256,protocolHash);
  const auditPath=[`${dir}/audit-json-zero.json`,`${dir}/audit.json`].find(path=>existsSync(path)&&existsSync(`${path}.COMPLETE`));
  if(!auditPath) {arms.push({encoder,condition,complete:false,reason:'Fresh audit missing',reportPath});continue;}
  const audit=read(auditPath),auditComplete=read(`${auditPath}.COMPLETE`);
  assert.equal(sha(auditPath),auditComplete.auditSha256);assert.equal(sha(reportPath),audit.reportSha256);
  assert.equal(audit.protocolSha256,protocolHash);assert.equal(audit.exactFreshNeuralReplays,true);
  assert.equal(audit.fixedStatePreserved,true);assert.equal(audit.resetRestoration,true);
  assert.equal(audit.replayPresentations,120);assert.equal(r.receipts.length,16);
  const train={before:r.baseline.train.filter(row=>row.correct).length,after:r.afterTraining.train.filter(row=>row.correct).length,
    meanMarginChange:mean(r.afterTraining.train.map((row,i)=>row.margin-r.baseline.train[i].margin))};
  const validation={before:r.baseline.validation.filter(row=>row.correct).length,after:r.afterTraining.validation.filter(row=>row.correct).length,
    meanMarginChange:mean(r.afterTraining.validation.map((row,i)=>row.margin-r.baseline.validation[i].margin)),
    regressions:r.afterTraining.validation.filter((row,i)=>r.baseline.validation[i].correct&&!row.correct).map(row=>row.panelId),
    repairs:r.afterTraining.validation.filter((row,i)=>!r.baseline.validation[i].correct&&row.correct).map(row=>row.panelId)};
  const receipts=r.receipts.map(ref=>{const path=`${dir}/${ref.path}`;assert.equal(sha(path),ref.sha256);return read(path);});
  const isolatedEvents=[];
  const dataset=readFileSync(p.data.trainPath,'utf8').trim().split(/\r?\n/).map(JSON.parse);
  for(let i=0;i<receipts.length-1;i++) {
    const event=receipts[i],next=receipts[i+1];
    if(event.panelId!==next.panelId) continue;
    assert.equal(next.feedback.assessment.memoryHash,createHash('sha256').update(JSON.stringify(event.receipt.after)).digest('hex'));
    const panel=dataset.find(row=>row.id===event.panelId);
    const success=panel.candidates.find(c=>c.proof.status==='success').move;
    const failure=panel.candidates.find(c=>c.proof.status==='failure').move;
    const score=(rows,move)=>rows.find(row=>row.move===move).score;
    const goodDelta=score(next.feedback.assessment.rows,success)-score(event.feedback.assessment.rows,success);
    const badDelta=score(next.feedback.assessment.rows,failure)-score(event.feedback.assessment.rows,failure);
    isolatedEvents.push({panelId:panel.id,eventIndex:i,status:event.status,channel:event.channel,goodDelta,badDelta,marginChange:goodDelta-badDelta,
      scope:'Isolated immediate effect of the first scheduled replay in this panel, measured before the following event; channel follows the declared condition.'});
  }
  arms.push({encoder,condition,complete:true,reportPath,reportSha256:sha(reportPath),auditPath,auditSha256:sha(auditPath),
    train,validation,isolatedEvents,positiveEvents:isolatedEvents.filter(event=>event.status==='success'),metrics:r.metrics,teachingEvents:16,presentations:120});
}
const comparisons=['relational-v3','bound-ray'].map(encoder=>{
  const conditions=arms.filter(arm=>arm.encoder===encoder),informative=conditions.find(arm=>arm.condition==='informative');
  if(!conditions.every(arm=>arm.complete))return{encoder,complete:false};
  const controls=conditions.filter(arm=>arm.condition!=='informative').map(control=>({condition:control.condition,
    trainMarginDifference:informative.train.meanMarginChange-control.train.meanMarginChange,
    validationMarginDifference:informative.validation.meanMarginChange-control.validation.meanMarginChange,
    validationCorrectDifference:informative.validation.after-control.validation.after,
    positiveEvents:informative.positiveEvents.map((event,i)=>({panelId:event.panelId,
      marginChangeDifference:event.marginChange-control.positiveEvents[i].marginChange}))}));
  return {encoder,complete:true,controls,informativeValidationRegressed:informative.validation.regressions.length>0,
    informativeValidationRepairs:informative.validation.repairs.length,
    exceedsAllControlsOnValidationMargin:controls.every(control=>control.validationMarginDifference>0),
    scope:'Descriptive development comparison only; not a new acceptance gate, final test or independent neural replication.'};
});
const result={schema:'bound-ray-feedback-development-synthesis-v1',protocolPath,protocolSha256:protocolHash,
  complete:arms.every(arm=>arm.complete),arms,comparisons,
  finalFamiliesRead:false,allLegalChoiceEvaluated:false,transferEstablished:false,
  scope:'Complete frozen development feedback comparison when all eight report/audit pairs exist. Training runtime sums exclude auditing and setup outside reported intervals; no time-to-quality improvement claim.'};
mkdirSync(output,{recursive:true});writeFileSync(`${output}/summary.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({complete:result.complete,arms:arms.map(({encoder,condition,complete,train,validation})=>({encoder,condition,complete,train,validation})),comparisons}));
