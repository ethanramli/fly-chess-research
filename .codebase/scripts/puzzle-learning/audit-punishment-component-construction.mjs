import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const dir='research/data/punishment-component-probe-v1';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const p=read(`${dir}/protocol.json`), ep='research/reports/adaptive-near-transfer-repair-v2-2026-10-07/run/event-informative-0.json';
assert.equal(await sha256(ep),p.inputs[ep]);
const e=read(ep),before=read(p.conditions.before).learned,full=read(p.conditions.fullPunishment).learned;
assert.deepEqual(before,e.before);assert.deepEqual(full,e.after);
let decreases=0,increases=0;
for(const mode of ['decreasesOnly','increasesOnly']){
 const file=p.conditions[mode];assert.equal(await sha256(file),p.inputs[file]);
 const wrapper=read(file),s=wrapper.learned;
 assert.equal(wrapper.diagnosticOnly,true);assert.equal(wrapper.origin.sha256,p.inputs[ep]);
 assert.equal(s.identity,before.identity);assert.equal(s.events,before.events);assert.equal(s.version,before.version);
 assert.equal(s.gains.length,before.gains.length);
 for(let i=0;i<s.gains.length;i++){
  const a=before.gains[i],b=full.gains[i];
  assert.equal(s.gains[i],mode==='decreasesOnly'?Math.min(a,b):Math.max(a,b));
  if(mode==='decreasesOnly'&&b<a)decreases++;
  if(mode==='increasesOnly'&&b>a)increases++;
 }
}
const report={passed:true,protocolSha256:await sha256(`${dir}/protocol.json`),auditorSha256:await sha256(import.meta.filename),decreases,increases,entries:before.gains.length,scope:'Independent exact component-construction check; not a neural evaluation or learned checkpoint.'};
const dest=`${dir}/construction-audit.json`;assert.ok(!fs.existsSync(dest));
fs.writeFileSync(dest+'.partial',JSON.stringify(report,null,2)+'\n');fs.renameSync(dest+'.partial',dest);console.log(JSON.stringify(report));
