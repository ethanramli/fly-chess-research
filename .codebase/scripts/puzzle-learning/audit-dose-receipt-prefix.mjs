import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha256 } from '../runtime/fetch-graph.mjs';
const root='research/reports/stability-feedback-dose-v2-2026-10-07',pp='research/data/stability-feedback-dose-v2/protocol.json',read=f=>JSON.parse(fs.readFileSync(f)),p=read(pp),mapping=read(p.mappingPath).mapping;
const paths=fs.readdirSync(root).filter(f=>/^event-(informative|absent|shuffled|disabled)-\d+\.json$/.test(f)).map(f=>`${root}/${f}`);
assert.equal(paths.length,128);let recurrences=0,disabled=0;const inputs={};
for(const f of paths){const e=read(f),rc=e.receipt;assert.deepEqual(e.before,rc.before);assert.deepEqual(e.after,rc.after);assert.equal(rc.fixedStateBefore,p.shared.invariant);assert.equal(rc.fixedStateAfter,p.shared.invariant);
 if(e.condition==='disabled'){assert.deepEqual(e.before,e.after);disabled++;}
 else{let offset=0;for(let g=0;g<mapping.groups.length;g++){const D=-rc.local.dan[g].reduce((a,b)=>a+b,0)/rc.local.dan[g].length;assert.equal(D,rc.local.factors[g]);for(const edge of mapping.groups[g].edges){const v=e.before.gains[offset],k=rc.local.kc[offset];assert.ok(Number.isFinite(k));const expected=Math.max(p.shared.memory.minGain,Math.min(p.shared.memory.maxGain,v+p.shared.memory.eta*D*(k+v-1)));assert.equal(e.after.gains[offset],expected);offset++;}}assert.equal(offset,e.after.gains.length);recurrences++;}
 inputs[f]=await sha256(f);
}
const out='research/reports/stability-dose-receipt-prefix-v1-2026-10-07';assert.ok(!fs.existsSync(out));fs.mkdirSync(out);const result={passed:true,protocolSha256:await sha256(pp),auditorSha256:await sha256(import.meta.filename),inputs,receipts:128,recurrences,disabledUnchanged:disabled,scope:'Published local recurrence and fixed-state receipt prefix only; measurements, full certificates/control exposures and terminal audit pending.'};fs.writeFileSync(`${out}/report.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,receipts:128,recurrences,disabledUnchanged:disabled}));
