// Frozen-receipt arithmetic only; no graph inference or causal edge attribution.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const dir='research/reports/delayed-lesson-integration-resumed-2026-10-08';
const read=(a,e)=>JSON.parse(readFileSync(`${dir}/receipt-${a}-${e}.json`));
const info=read(0,0),absent=read(1,0),other=read(0,1);
assert.deepEqual(info.before,absent.before);
assert.deepEqual(info.eligibility,absent.eligibility);
const gainDelta=r=>r.after.gains.map((g,i)=>g-r.before.gains[i]);
const a=gainDelta(info),b=gainDelta(absent),l1=v=>v.reduce((s,x)=>s+Math.abs(x),0);
const indices=r=>new Set(r.frames[0].cue.stimulation.map(c=>c.index));
const x=indices(info),y=indices(other),shared=[...x].filter(i=>y.has(i)).length;
const active=r=>new Set(r.eligibility.map((e,i)=>e>0?i:null).filter(i=>i!==null));
const p=active(info),q=active(other),sharedEligible=[...p].filter(i=>q.has(i)).length;
const output={scope:'Receipt arithmetic only; overlap does not prove causal interference',
  sources:['receipt-0-0.json','receipt-1-0.json','receipt-0-1.json'].map(path=>({path,sha256:createHash('sha256').update(readFileSync(`${dir}/${path}`)).digest('hex')})),
  firstFailure:{informativeGainL1:l1(a),noChannelGainL1:l1(b),differenceL1:l1(a.map((v,i)=>v-b[i])),
    informativeRates:info.update.rates,noChannelRates:absent.update.rates},
  changedContextOverlap:{direct:[x.size,y.size],sharedDirect:shared,jaccard:shared/(x.size+y.size-shared),
    eligible:[p.size,q.size],sharedEligible},
  unresolved:['No unique causal edge attribution','No final post-training choice assessment','No calibrated neural consequence error pathway']};
writeFileSync(`${dir}/localization.json`,JSON.stringify(output,null,2),{flag:'wx'});console.log(JSON.stringify(output));
