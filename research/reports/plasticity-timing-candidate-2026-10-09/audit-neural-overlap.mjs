// Independent receipt arithmetic only; no graph or neural model is imported.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {join} from 'node:path';
const run='research/reports/gamma2-neural-overlap-v1-2026-10-09';
const hash=b=>createHash('sha256').update(b).digest('hex');
const result=JSON.parse(readFileSync(join(run,'result.json')));
assert.equal(result.parameterHashBefore,result.parameterHashAfter);
assert.equal(result.receipts.length,52);assert.equal(result.identity.jobCount,52);
for(const [path,sha] of Object.entries(result.identity.hashes)){
  const source=path.startsWith('.cache/')?path:join(run,'sources',path);
  assert.equal(hash(readFileSync(source)),sha,path);
}
const final=JSON.parse(readFileSync(join(run,'checkpoint-52.json')));
assert.deepEqual(final.identity,result.identity);assert.deepEqual(final.receipts,result.receipts);
const rows=[];let reference;
for(let i=0;i<result.receipts.length;i++){
  const ref=result.receipts[i],bytes=readFileSync(join(run,ref.path));assert.equal(hash(bytes),ref.sha256);
  const receipt=JSON.parse(bytes);assert.equal(receipt.cue.identity,result.identity.encoderIdentities[receipt.variant]);
  const cells=receipt.trajectory.groups.flatMap(g=>g.kenyonCells).sort((a,b)=>a.index-b.index);
  assert.equal(cells.length,120);assert.equal(new Set(cells.map(c=>c.index)).size,120);
  const baseline=cells.map(c=>[c.index,c.rest]);if(reference)assert.deepEqual(baseline,reference);else reference=baseline;
  const credit=[],integrated=[];
  for(const cell of cells){
    assert.equal(cell.rates.length,9);assert(cell.rates.every(v=>Number.isFinite(v)&&v>=0&&v<=10));
    let e=0,sum=0;
    for(const rate of cell.rates.slice(1)){
      const k=Math.min(1,Math.max(0,rate-cell.rest)/1.5);
      e=k+(e-k)*Math.exp(-0.1/0.4);sum+=k*0.1;
    }
    credit.push(e);integrated.push(sum);
  }
  rows.push({variant:receipt.variant,action:receipt.action,credit,integrated,
    activeCells:credit.filter(v=>v>0).length,totalCredit:credit.reduce((a,b)=>a+b,0),
    score:receipt.readout.MBON12-receipt.readout.MBON01});
}
const cosine=(a,b)=>{const denominator=Math.hypot(...a)*Math.hypot(...b);
  return denominator===0?null:a.reduce((n,x,i)=>n+x*b[i],0)/denominator;};
const summaries={};
for(const variant of ['existing','gamma2']){
  const selected=rows.filter(r=>r.variant===variant);assert.equal(selected.length,26);
  assert.equal(new Set(selected.map(r=>r.action)).size,26);
  let max=-Infinity,worstPair=null;
  for(let i=0;i<selected.length;i++)for(let j=0;j<i;j++){
    const similarity=cosine(selected[i].credit,selected[j].credit);
    if(similarity!==null&&similarity>max){max=similarity;worstPair=[selected[i].action,selected[j].action];}
  }
  const a=selected.find(r=>r.action==='f7e6'),b=selected.find(r=>r.action==='f7h7');
  summaries[variant]={qPairCreditCosine:cosine(a.credit,b.credit),qPairIntegratedCosine:cosine(a.integrated,b.integrated),
    qPairTotalCredit:[a.totalCredit,b.totalCredit],maxCreditCosine:max,worstPair,
    creditRange:[Math.min(...selected.map(r=>r.totalCredit)),Math.max(...selected.map(r=>r.totalCredit))],
    untrainedTop:[...selected].sort((a,b)=>b.score-a.score)[0].action};
}
const audit={scope:'Hashes and independent raw-trajectory overlap arithmetic. Parameter invariance is recorded by the runner, not independently rerun. Credit is a diagnostic filter with empty initial trace, not learned state or retention evidence.',
  receiptCount:rows.length,summaries,rows,resultSha256:hash(readFileSync(join(run,'result.json')))};
writeFileSync(new URL('./neural-overlap-audit.json',import.meta.url),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(summaries,null,2));
