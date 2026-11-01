// Read-only diagnosis from audited development snapshots. No learner updates or held-out fixtures.
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import assert from 'node:assert/strict';
import os from 'node:os';
import { buildFixture } from '../../src/neural-learning/memory-assay-fixture.mjs';

const root='runs/memory-retention-2026-10-31', report='research/reports/memory-retention-continuation-2026-10-31/phase-diagnosis-v1.json';
assert.ok(!existsSync(report),'Refusing existing analysis');
const started=performance.now(), data={}, hashes={};let maxScoreError=0,checked=0;
for(const name of ['metaplastic','reservoir']) {
  const audit=JSON.parse(readFileSync(`${root}/${name}-v1-audit/result.json`,'utf8'));
  assert.equal(audit.status,'passed');assert.equal(audit.checkedTrials,6912);
  const file=`${root}/${name}-v1-dev/events.jsonl`, digest=createHash('sha256');
  for await(const chunk of createReadStream(file))digest.update(chunk);
  hashes[file]=digest.digest('hex');
  let config,fixture,groups;
  const phases={};
  for await(const line of createInterface({input:createReadStream(file),crlfDelay:Infinity})) {
    assert.ok(line.length<=1048576,'Oversized row');
    assert.ok(process.memoryUsage().rss<2048*2**20&&os.freemem()>=256*2**20&&performance.now()-started<300000,'Analysis resource guard');
    const row=JSON.parse(line);
    if(row.kind==='start') {
      config=row.config;fixture=buildFixture(config);assert.equal(fixture.id,row.fixtureId);
      const shared=new Set([...fixture.images['B+'].focal,...fixture.images['B-'].focal]);
      groups={};for(const id of ['A+','A-'])for(const common of [false,true])groups[`${id}/${common?'shared':'unique'}`]=[...fixture.images[id].focal].filter(i=>shared.has(i)===common);
    }
    if(row.kind!=='test'||config.arm!=='informative')continue;
    const snapshot=row.snapshot,{gains,states}=snapshot,n=fixture.nKC,good=row.outcomes.A.good,bad=row.outcomes.A.bad;
    const mag=(channel,i)=>Math.fround(Math.fround(fixture[channel==='P'?'baseP':'baseR'][i])*gains[i+(channel==='P'?0:n)]);
    const value=id=>fixture.images[id].h.reduce((sum,h,i)=>sum+h/1.5*(mag('P',i)-mag('R',i)),0)/fixture.s;
    const computed=(value(good)-value(bad))/(1.6*(1-fixture.w));
    maxScoreError=Math.max(maxScoreError,Math.abs(computed-row.outcomes.A.mNorm));assert.ok(maxScoreError<1e-12,'Readout reconstruction differs');checked++;
    const means={};
    for(const [label,indices]of Object.entries(groups)) {
      const part=indices.reduce((sum,i)=>sum+(fixture.images[good].h[i]-fixture.images[bad].h[i])/1.5*(mag('P',i)-mag('R',i)),0)/fixture.s/(1.6*(1-fixture.w));
      means[label]={marginContribution:part};
      for(const channel of ['P','R']) {
        const edges=indices.map(i=>i+(channel==='P'?0:n));
        means[label][channel]={gain:edges.reduce((s,i)=>s+gains[i],0)/edges.length,
          protectedMass:edges.reduce((s,i)=>s+states[4*i+1]+states[4*i+3],0)/edges.length};
      }
    }
    assert.ok(Math.abs(Object.values(means).reduce((s,g)=>s+g.marginContribution,0)-computed)<1e-12);
    (phases[row.test]??=[]).push({seed:config.seed,groups:means});
  }
  assert.deepEqual(Object.keys(phases).sort(),['T1','T2','T3','T4','T5']);
  assert.ok(Object.values(phases).every(rows=>rows.length===12));data[name]=phases;
}
const result={status:'complete',scope:'Two audited development conditions only; group membership is analysis metadata and never supplied to the learner',
  checkedPhaseReadouts:checked,maxScoreReconstructionError:maxScoreError,inputHashes:hashes,perSeed:data};
writeFileSync(report,`${JSON.stringify(result,null,2)}\n`,{flag:'wx'});
console.log(JSON.stringify({status:'complete',checkedPhaseReadouts:checked,maxScoreError,out:report}));
