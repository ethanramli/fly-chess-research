// Exact comparison of published continuation artifacts; no neural inference.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const base='research/reports/bound-ray-feedback-development-completion-2026-10-08';
const recovered=`${base}/recovery-informative`,fixture=JSON.parse(readFileSync(`${base}/recovery-input/fixture.json`,'utf8'));
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
assert.equal(sha(fixture.statePath),fixture.stateSha256);
assert.equal(sha(`${fixture.origin}/report.json`),fixture.originReportSha256);
const original=read(`${fixture.origin}/report.json`),actual=read(`${recovered}/report.json`);
const auditPath=`${recovered}/audit-json-zero.json`;assert.ok(existsSync(`${auditPath}.COMPLETE`));
assert.equal(sha(auditPath),read(`${auditPath}.COMPLETE`).auditSha256);
const audit=read(auditPath);assert.equal(audit.reportSha256,sha(`${recovered}/report.json`));
assert.equal(audit.exactFreshNeuralReplays,true);
for(const key of ['identity','baseline','afterTraining','repeat','reset','restored','initialMemoryHash','finalMemoryHash','receipts','presentations'])
  assert.deepEqual(actual[key],original[key],`Recovery mismatch: ${key}`);
for(const ref of actual.receipts)assert.equal(sha(`${recovered}/${ref.path}`),ref.sha256);
const before=read(fixture.statePath);
const firstNew=readdirSync(recovered).filter(name=>/^checkpoint-\d{5}$/.test(name)).sort()
  .find(name=>Number(name.slice(11))>before.sequence);
assert.ok(firstNew);const resumed=read(`${recovered}/${firstNew}/state.json`).state;
assert.equal(resumed.eventIndex,before.state.eventIndex+1);
assert.equal(resumed.pending,null);assert.equal(resumed.presentations,before.state.presentations);
assert.deepEqual(resumed.memory,before.state.memory);
assert.equal(resumed.receiptRefs.length,before.state.receiptRefs.length+1);
assert.equal(resumed.receiptRefs.at(-1).sha256,before.state.pending.receiptRef.sha256);
const result={schema:'bound-ray-pending-recovery-audit-v1',passed:true,fixture,
  originalReportSha256:sha(`${fixture.origin}/report.json`),recoveredReportSha256:sha(`${recovered}/report.json`),
  freshReplayAuditSha256:sha(auditPath),pendingUpdateDuplicated:false,newPresentationsBeforePendingAcknowledgment:0,
  finalMemoryExact:true,allRankingsExact:true,all16ReceiptHashesExact:true,
  scope:'Simulated interruption at first published pending receipt; exact continuation and independent full neural replay. Not a historical crash, learning success or whole-run speed comparison.'};
writeFileSync(`${base}/recovery-audit.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
