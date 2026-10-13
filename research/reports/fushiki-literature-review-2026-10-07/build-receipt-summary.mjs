// Read-only arithmetic on six failed reviews and one published positive receipt; no graph import or inference.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const sources = {};
function read(p) { const b=readFileSync(p); sources[p]=createHash('sha256').update(b).digest('hex'); return JSON.parse(b); }
const run='research/reports/smothered-acquisition-v1-2026-10-07';
const mapping=read('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping;
const config=read('research/data/smothered-acquisition-v1/protocol.json').memory;
const rows=[];let maxResidual=0;
for(let index=0;index<7;index++){
 const condition=index===6?'fixed':'adaptive',attempt=index===6?0:index;
 const e=read(`${run}/event-${condition}-${attempt}.json`),r=e.receipt;
 assert.equal(r.local.kc.length,mapping.groups.reduce((n,g)=>n+g.edges.length,0));
 assert.equal(r.before.gains.length,r.local.kc.length);
 assert.deepEqual(e.before,r.before);assert.deepEqual(e.after,r.after);
 let offset=0,totalL1=0,otherChannelL1=0;
 const groups=mapping.groups.map((g,gi)=>{
  const D=-r.local.dan[gi].reduce((a,b)=>a+b,0)/r.local.dan[gi].length;
  assert(Math.abs(D-r.local.factors[gi])<1e-12);
  let recovered=0,depressed=0,recoveryL1=0,depressionL1=0,activeKCEntries=0;
  for(let i=0;i<g.edges.length;i++,offset++){
   const before=r.before.gains[offset],actual=r.after.gains[offset];
   if(r.local.kc[offset]>0)activeKCEntries++;
   const predicted=Math.max(config.minGain,Math.min(config.maxGain,before+config.eta*D*(r.local.kc[offset]+before-1)));
   const residual=Math.abs(actual-predicted);maxResidual=Math.max(maxResidual,residual);assert(residual<1e-12);
   const delta=actual-before;totalL1+=Math.abs(delta);if(g.danType!==e.channel)otherChannelL1+=Math.abs(delta);
   if(delta>0){recovered++;recoveryL1+=delta;}if(delta<0){depressed++;depressionL1-=delta;}
  }
  return {side:g.side,danType:g.danType,edges:g.edges.length,factor:D,individualExcessDANRates:r.local.dan[gi],activeKCEntries,recovered,depressed,recoveryL1,depressionL1};
 });
 rows.push({condition,attempt,move:e.experience.move,status:e.experience.status,deliveredChannel:e.channel,totalGainChangeL1:totalL1,otherChannelGainChangeL1:otherChannelL1,otherChannelFraction:totalL1?otherChannelL1/totalL1:null,groups});
}
const ranking=read(`${run}/ranking-prefix-diagnostic.json`);
const self='research/reports/fushiki-literature-review-2026-10-07/build-receipt-summary.mjs';sources[self]=createHash('sha256').update(readFileSync(self)).digest('hex');
const projectionPreflight=read(`${run}/positive-projection-preflight.json`);
const report={date:'2026-10-07',partial:true,scope:'Six failed adaptive reviews and first fixed positive published development receipt. Independent equation reconstruction and descriptive group accounting only. No neural inference, intervention, teacher feedback, parameter update, final outcome or causal diagnosis.',maxEquationResidual:maxResidual,sources,rows,projectionPreflight,rankingPrefix:ranking.rows,limitations:['Actual gain changes in a population other than the directly stimulated population are not proof of erroneous reward routing. Graph propagation may legitimately activate it.','Saved endpoint excess rates omit below-rest firing and time courses; this report cannot test omission dynamics or timing-dependent eligibility.','Recovery/depression labels classify net gain changes, not separately measured receptor processes.','Correlated score rebound and recovered gains do not establish causation. Earlier causal interventions prevented only one of five revivals, without a correct choice.','Fixed schedule does not have its own matched experience controls in this invocation; a reward-eligible projection bottleneck is not a controlled acquisition result.','Projection preflight is an existing input-only diagnostic, not a new neural inference.']};
writeFileSync('research/reports/fushiki-literature-review-2026-10-07/receipt-summary.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({receipts:rows.length,maxEquationResidual:maxResidual,rows:rows.map(r=>({attempt:r.attempt,move:r.move,channel:r.deliveredChannel,otherChannelFraction:r.otherChannelFraction,recovered:r.groups.reduce((n,g)=>n+g.recovered,0)}))}));
