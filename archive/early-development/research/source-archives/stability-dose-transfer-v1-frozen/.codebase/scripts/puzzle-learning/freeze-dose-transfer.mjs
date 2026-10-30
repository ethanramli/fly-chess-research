import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha256 } from '../runtime/fetch-graph.mjs';
const read=f=>JSON.parse(fs.readFileSync(f));
const root='research/reports/stability-feedback-dose-v2-2026-10-07';
const r=read(`${root}/report.json`),a=read(`${root}/audit.json`),done=read(`${root}/COMPLETE`);
assert.ok(r.complete&&a.passed&&done.passed);assert.equal(a.reportSha256,await sha256(`${root}/report.json`));assert.equal(done.reportSha256,a.reportSha256);
const contract=`${root}/audit-contract.json`;assert.equal(read(contract).passed,true);assert.equal(read(contract).reportSha256,a.reportSha256);
const recovery='research/reports/stability-dose-recovery-v1-2026-10-07/audit-recovery.json';assert.equal(read(recovery).passed,true);
const p=read('research/data/multi-context-stability-transfer-v1/protocol.json'),dose=read('research/data/stability-feedback-dose-v2/protocol.json');
p.schema='stability-dose-transfer-v1';p.purpose='No-feedback assessment of every predefined dose and condition, including trained-choice failures.';
p.scope='Previously inspected development siblings only; no selection, feedback or disjoint-family reasoning claim.';
p.output='research/reports/stability-dose-transfer-v1-2026-10-07/run';
p.conditions={};for(const c of ['informative','absent','shuffled','disabled'])for(const n of [8,32])p.conditions[`${c}-${n}`]=`${root}/dose-${c}-${n}.json`;
p.restMemoryPath=dose.restMemoryPath;p.restMemoryHash=dose.restMemoryHash;
p.warmStartContinuation={reportSha256:await sha256(`${root}/report.json`),auditSha256:await sha256(`${root}/audit.json`),completeSha256:await sha256(`${root}/COMPLETE`),initialMemoryHash:r.identity.initialMemoryHash};
for(const f of [...Object.values(p.conditions),p.restMemoryPath,`${root}/report.json`,`${root}/audit.json`,`${root}/COMPLETE`,contract,recovery])p.inputs[f]=await sha256(f);
for(const f of ['evaluate-dose-transfer.mjs','audit-dose-transfer.mjs','freeze-dose-transfer.mjs']){const key='.codebase/scripts/puzzle-learning/'+f;p.sources[key]=await sha256(key);}
for(const [f,h] of Object.entries({...p.inputs,...p.sources}))assert.equal(await sha256(f),h);
const dir='research/data/stability-dose-transfer-v1',archive='research/source-archives/stability-dose-transfer-v1-frozen';assert.ok(!fs.existsSync(dir)&&!fs.existsSync(archive));fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(archive,{recursive:true});
for(const f of Object.keys(p.sources)){const dest=path.join(archive,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest);}
const pp=`${dir}/protocol.json`;fs.writeFileSync(pp,JSON.stringify(p,null,2)+'\n');fs.copyFileSync(pp,`${archive}/protocol.json`);
const auditor='.codebase/scripts/puzzle-learning/audit-dose-transfer.mjs';
fs.writeFileSync(`${dir}/audit-protocol.json`,JSON.stringify({originalProtocolSha256:await sha256(pp),originalAuditorPath:auditor,originalAuditorArchive:path.join(archive,auditor),inputs:{[pp]:await sha256(pp)},sources:{[auditor]:await sha256(auditor)}},null,2)+'\n');
console.log(JSON.stringify({protocolSha256:await sha256(pp),cases:Object.keys(p.conditions).length*p.positions.length}));
