// Offline arithmetic diagnostic; no neural simulation or memory mutation.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const root = 'research/reports/adaptive-near-transfer-repair-v2-2026-10-07/run';
const out = 'research/reports/warmstart-gain-interference-v1-2026-10-07';
const inputs = [0, 1].map(i => `${root}/event-informative-${i}.json`);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const events = inputs.map(p => JSON.parse(fs.readFileSync(p)));
const [a,b] = events;
if (JSON.stringify(a.after) !== JSON.stringify(b.before)) throw Error('Discontinuous event memory');
const initial=a.before.gains, middle=a.after.gains, final=b.after.gains;
if (initial.length !== middle.length || initial.length !== final.length) throw Error('Shape mismatch');
let l1First=0,l1Second=0,opposedL1=0,opposedEdges=0,recoveredEdges=0,recoveryL1=0,netL1=0;
for(let i=0;i<initial.length;i++) {
  if (![initial[i],middle[i],final[i]].every(Number.isFinite)) throw Error('Nonfinite gain');
  const d0=middle[i]-initial[i],d1=final[i]-middle[i];
  l1First+=Math.abs(d0);l1Second+=Math.abs(d1);netL1+=Math.abs(final[i]-initial[i]);
  if(d0*d1<0){opposedEdges++;opposedL1+=Math.min(Math.abs(d0),Math.abs(d1));}
  if(middle[i]<1 && d1>0){recoveredEdges++;recoveryL1+=d1;}
}
const report={schema:'warmstart-gain-interference-v1',inputs:inputs.map(p=>({path:p,sha256:hash(fs.readFileSync(p))})),
  sources:[{path:'.codebase/scripts/puzzle-learning/diagnose-warmstart-gain-interference.mjs',sha256:hash(fs.readFileSync(import.meta.filename))}],
  channels:events.map(e=>e.channel),edgeEntries:initial.length,l1First,l1Second,opposedEdges,opposedL1,
  recoveredEdges,recoveryL1,netL1,opposedFractionOfFirst:l1First?opposedL1/l1First:0,
  scope:'Descriptive edge-associated gain arithmetic. Opposed movement is not proof of causal score interference. Recovery counts refer to below-unit gains rising during event 1. No graph work or feedback.'};
fs.mkdirSync(out,{recursive:true});
const dest=path.join(out,'report.json');
if(fs.existsSync(dest)) throw Error('Refusing to overwrite diagnostic');
fs.writeFileSync(dest+'.partial',JSON.stringify(report,null,2)+'\n');fs.renameSync(dest+'.partial',dest);
console.log(JSON.stringify(report,null,2));
