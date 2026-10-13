import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha256 } from '../runtime/fetch-graph.mjs';
const read=f=>JSON.parse(fs.readFileSync(f)),root='research/reports/stability-feedback-dose-v2-2026-10-07',pp='research/data/stability-feedback-dose-v2/protocol.json',p=read(pp),initial=read(p.initialMemoryPath).memory,mapping=read(p.mappingPath).mapping;
const prefix='research/reports/stability-dose-receipt-prefix-v1-2026-10-07/report.json',a=read(prefix);assert.ok(a.passed);assert.equal(a.protocolSha256,await sha256(pp));
const inputs={};for(const [f,h] of Object.entries(a.inputs)){assert.equal(await sha256(f),h);inputs[f]=h;}
const panels=[];
for(const condition of ['informative','absent','shuffled','disabled'])for(const dose of [8,32]){
 const file=`${root}/dose-${condition}-${dose}.json`,m=read(file).memory;inputs[file]=await sha256(file);assert.equal(m.identity,initial.identity);
 let offset=0;const groups=mapping.groups.map(g=>{const deltas=g.edges.map(()=>m.gains[offset]-initial.gains[offset++]);return {danType:g.danType,entries:deltas.length,l1:deltas.reduce((s,x)=>s+Math.abs(x),0),decreases:deltas.filter(x=>x<0).length,increases:deltas.filter(x=>x>0).length};});
 panels.push({condition,dose,eventDelta:m.events-initial.events,groups,totalL1:groups.reduce((s,g)=>s+g.l1,0)});
}
const out='research/reports/stability-dose-memory-drift-v1-2026-10-07';assert.ok(!fs.existsSync(out));fs.mkdirSync(out);
const report={protocolSha256:await sha256(pp),prefixAuditSha256:await sha256(prefix),auditorSha256:await sha256(import.meta.filename),inputs,panels,scope:'Offline physiological-state differences from recurrence-checked receipts. No causal pathway isolation, choice improvement, independent neural replay or transfer claim.'};fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(panels.map(({condition,dose,eventDelta,totalL1})=>({condition,dose,eventDelta,totalL1})),null,2));
