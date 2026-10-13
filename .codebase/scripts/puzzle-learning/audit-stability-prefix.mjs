// Offline prefix recurrence check; does not modify the active experiment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const dir='research/reports/multi-context-stability-v1-2026-10-07';
const pp='research/data/multi-context-stability-v1/protocol.json';
const p=JSON.parse(fs.readFileSync(pp)),mapping=JSON.parse(fs.readFileSync(p.mappingPath)).mapping;
const files=fs.readdirSync(dir).filter(n=>/^event-informative-\d+\.json$/.test(n)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]));
assert.ok(files.length>0);const receipts=[];
for(const file of files){
 const f=`${dir}/${file}`,e=JSON.parse(fs.readFileSync(f));
 assert.equal(e.receipt.plasticityEnabled,true);assert.deepEqual(e.before,e.receipt.before);assert.deepEqual(e.after,e.receipt.after);
 const local=e.receipt.local,{eta,minGain,maxGain}=p.shared.memory;
 assert.equal(local.factors.length,mapping.groups.length);let offset=0,maxResidual=0;
 for(let g=0;g<mapping.groups.length;g++){
  const D=-local.dan[g].reduce((s,v)=>s+v,0)/local.dan[g].length;assert.equal(D,local.factors[g]);
  for(let i=0;i<mapping.groups[g].edges.length;i++,offset++){
   const prior=e.before.gains[offset],expected=Math.max(minGain,Math.min(maxGain,prior+eta*D*(local.kc[offset]+prior-1)));
   const residual=Math.abs(expected-e.after.gains[offset]);maxResidual=Math.max(maxResidual,residual);assert.equal(residual,0);
  }
 }
 assert.equal(offset,e.after.gains.length);assert.equal(e.after.events,e.before.events+1);
 receipts.push({path:f,sha256:await sha256(f),channel:e.channel,entries:offset,maxResidual});
}
const out=`research/reports/stability-prefix-audit-${String(files.length).padStart(2,'0')}-2026-10-07`;assert.ok(!fs.existsSync(out));fs.mkdirSync(out);
const report={passed:true,protocolSha256:await sha256(pp),mappingSha256:await sha256(p.mappingPath),auditorSha256:await sha256(import.meta.filename),receipts,scope:'Offline saved-receipt gain recurrence only. Not terminal acceptance, proof/channel audit, neural replay or transfer evidence.'};
fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
