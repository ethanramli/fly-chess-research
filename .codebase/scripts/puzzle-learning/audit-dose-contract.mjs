import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha256 } from '../runtime/fetch-graph.mjs';
const read=f=>JSON.parse(fs.readFileSync(f)),root='research/reports/stability-feedback-dose-v2-2026-10-07',pp='research/data/stability-feedback-dose-v2/protocol.json',p=read(pp),r=read(`${root}/report.json`),a=read(`${root}/audit.json`);
assert.ok(r.complete&&a.passed);assert.equal(a.reportSha256,await sha256(`${root}/report.json`));assert.equal(r.schema,p.schema);
assert.deepEqual(r.state.initial,read(p.initialMemoryPath).memory);assert.equal(r.state.totalEvents,128);assert.equal(r.state.conditionIndex,4);assert.equal(r.state.active,null);
assert.ok(r.resources.peakRssMiB<=768);assert.equal(r.resources.cpuDuty,p.runtime.cpuDuty);
const schedule=read(p.schedulePath);
function shuffle(values,seed){let state=seed>>>0;const copy=[...values];for(let i=copy.length-1;i>0;i--){state=(Math.imul(1664525,state)+1013904223)>>>0;const j=Math.floor(state/2**32*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
assert.deepEqual(schedule.shuffledChannels,[...shuffle(schedule.informativeChannels.slice(0,8),schedule.shuffleSeed),...shuffle(schedule.informativeChannels.slice(8),schedule.shuffleSeed+1)]);
const base=r.evaluations[0].reset.map(x=>x.assessment);const seen=new Set();
for(const ev of r.evaluations){const key=`${ev.condition}-${ev.dose}`;assert.ok(!seen.has(key));seen.add(key);assert.deepEqual(ev.reset.map(x=>x.assessment),base);for(const panels of [ev.panels,ev.repeat,ev.reset,ev.restored])assert.deepEqual(panels.map(x=>x.rowId),p.positions.map(x=>x.id));}
assert.equal(seen.size,8);
for(const ref of r.state.evaluationRefs)assert.equal(await sha256(ref.path),ref.sha256);
for(const result of r.results)for(const ref of result.eventRefs){assert.equal(await sha256(ref.path),ref.sha256);const e=read(ref.path);const metadata=x=>{const {gains,events,...rest}=x;return rest;};assert.deepEqual(metadata(e.before),metadata(e.after));assert.equal(e.after.events,e.before.events+(e.condition==='disabled'?0:1));}
const out=`${root}/audit-contract.json`;assert.ok(!fs.existsSync(out));const result={passed:true,reportSha256:await sha256(`${root}/report.json`),primaryAuditSha256:await sha256(`${root}/audit.json`),auditorSha256:await sha256(import.meta.filename),scope:'Supplemental dose schedule, reset baseline, memory metadata, publication identity and resource contract checks.'};fs.writeFileSync(out+'.partial',JSON.stringify(result,null,2)+'\n');fs.renameSync(out+'.partial',out);console.log(JSON.stringify(result));
