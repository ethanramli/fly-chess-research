// Simulated interruption fixture from a preserved published pending checkpoint.
// This does not claim the historical invocation was interrupted at this prefix.
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const origin='research/reports/bound-ray-feedback-development-v1-2026-10-08/bound-ray-informative';
const out='research/reports/bound-ray-feedback-development-completion-2026-10-08/recovery-input';
assert.ok(!existsSync(out),'Never overwrite a recovery fixture');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report=read(`${origin}/report.json`), audit=read(`${origin}/audit.json`);
assert.equal(audit.reportSha256,sha(`${origin}/report.json`));assert.equal(audit.exactFreshNeuralReplays,true);
assert.equal(read(`${origin}/audit.json.COMPLETE`).auditSha256,sha(`${origin}/audit.json`));
const names=readdirSync(origin).filter(name=>/^checkpoint-\d{5}$/.test(name)).sort();
const selected=names.find(name=>read(`${origin}/${name}/state.json`).state.pending);
assert.ok(selected);const saved=read(`${origin}/${selected}/state.json`);
assert.equal(saved.state.eventIndex,0);assert.equal(saved.state.pending.receipt.eventIndex,0);
mkdirSync(out,{recursive:true});
const lineage=[];
for(const name of names.filter(name=>name<=selected)) {
  const statePath=`${origin}/${name}/state.json`,manifest=read(`${origin}/${name}/checkpoint.json`);
  assert.equal(sha(statePath),manifest.stateSha256);
  cpSync(`${origin}/${name}`,`${out}/${name}`,{recursive:true,errorOnExist:true});
  lineage.push({name,stateSha256:sha(statePath)});
}
for(const ref of saved.state.receiptRefs) {
  assert.equal(sha(`${origin}/${ref.path}`),ref.sha256);
  mkdirSync(`${out}/receipts`,{recursive:true});cpSync(`${origin}/${ref.path}`,`${out}/${ref.path}`,{errorOnExist:true});
}
const fixture={schema:'bound-ray-pending-recovery-fixture-v1',origin,originReportSha256:sha(`${origin}/report.json`),
  selectedCheckpoint:selected,statePath:`${out}/${selected}/state.json`,stateSha256:sha(`${out}/${selected}/state.json`),
  pendingEventIndex:saved.state.eventIndex,presentationsAtInterruption:saved.state.presentations,lineage,
  protocolSha256:saved.identity.protocolSha256,
  scope:'Simulated interruption at a published updated-memory/pending-receipt prefix; the copied prefix has this as its latest publication. Original complete lineage is preserved unchanged.'};
writeFileSync(`${out}/fixture.json`,JSON.stringify(fixture,null,2)+'\n');console.log(JSON.stringify(fixture));
