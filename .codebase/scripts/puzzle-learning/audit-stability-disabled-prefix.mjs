import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const root='research/reports/multi-context-stability-v1-2026-10-07';
const out='research/reports/stability-disabled-prefix-v1-2026-10-07';
assert.ok(!fs.existsSync(out), 'Preserve published audits');
const inputs={};
for(let i=0;i<4;i++){
  const paths=[`${root}/event-disabled-${i}.json`,`${root}/event-informative-${i}.json`];
  const [d,a]=paths.map(p=>JSON.parse(fs.readFileSync(p)));
  assert.deepEqual(d.experience,a.experience);
  assert.equal(d.channel,a.channel);
  assert.deepEqual(d.before,d.after);
  assert.equal(d.receipt.plasticityEnabled,false);
  assert.equal(d.receipt.learningApplied,false);
  assert.deepEqual(d.receipt.fixedStateBefore,d.receipt.fixedStateAfter);
  for(const p of paths) inputs[p]=await sha256(p);
}
fs.mkdirSync(out);
const result={passed:true,events:4,inputs,auditorSha256:await sha256(import.meta.filename),scope:'Published disabled-plasticity receipts match informative experiences/channels and preserve memory and fixed-state identities. Final ranking, full certificates and terminal audit remain separate.'};
fs.writeFileSync(`${out}/report.json`,JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(`${out}/README.md`,'# Disabled-plasticity receipt prefix\n\nAll four published receipts match informative experiences and teaching channels, with unchanged memory and fixed-state identities. [Hash-bound audit](report.json). Final ranking, certificate checks and terminal comparison remain pending. This is a record audit, not independent neural replay or transferable reasoning.\n');
console.log(JSON.stringify(result));
