// Read-only analysis of existing receipts. No graph inference or neural updates.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root='research/reports/one-feedback-round-timing-v2-2026-10-08';
const out='research/reports/feedback-quality-review-2026-10-08';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report=read(`${root}/report.json`);
const rows=report.results.map(arm=>{
  const receiptPath=`${root}/${arm.condition}-receipt.json`, {receipt}=read(receiptPath);
  const score=(phase,move)=>arm[phase].rows.find(row=>row.move===move).score;
  const good='a1a4',bad='e1e5';
  const beforeMargin=score('before',good)-score('before',bad);
  const afterMargin=score('after',good)-score('after',bad);
  const goodDelta=score('after',good)-score('before',good);
  const badDelta=score('after',bad)-score('before',bad);
  assert.equal(receipt.event.move,good);
  assert.equal(receipt.event.status,'success');
  assert.equal(arm.before.choice,good);
  return {condition:arm.condition,receiptPath,receiptSha256:sha(receiptPath),beforeMargin,afterMargin,
    marginDelta:afterMargin-beforeMargin,goodDelta,badDelta,
    commonOffset:(goodDelta+badDelta)/2,changedEdges:arm.changedEdges,
    choiceBefore:arm.before.choice,choiceAfter:arm.after.choice,
    feedbackSeconds:arm.feedbackSeconds};
});
const informative=rows.find(r=>r.condition==='informative'), absent=rows.find(r=>r.condition==='no-channel');
const result={schema:'retrospective-feedback-quality-audit-v1',date:'2026-10-08',
  reportPath:`${root}/report.json`,reportSha256:sha(`${root}/report.json`),rows,
  informativeMinusAbsentMarginChange:informative.marginDelta-absent.marginDelta,
  findings:{positiveReplayImprovesPairMargin:informative.marginDelta>0,
    positiveReplayExceedsAbsentMarginChange:informative.marginDelta>absent.marginDelta,
    rewardedMoveWasAlreadyPreferred:true,
    informativeChoiceChanged:informative.choiceBefore!==informative.choiceAfter,
    fullLegalCoverage:false,independentGraphReplay:false},
  scope:'Single inspected development fixture; descriptive common-offset decomposition, not causal edge attribution, biological validation, general incapacity or transfer.'};
mkdirSync(out,{recursive:true});writeFileSync(`${out}/timing-margin-audit.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
