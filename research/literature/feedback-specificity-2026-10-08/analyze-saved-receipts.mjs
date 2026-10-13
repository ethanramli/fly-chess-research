// Read-only arithmetic over existing JSON. No graph/model imports or updates.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const sha = x => createHash('sha256').update(x).digest('hex');
const inputs = {};
const read = path => { const bytes = readFileSync(path); inputs[path] = sha(bytes); return JSON.parse(bytes); };
const dir = 'research/reports/mate-conjoined-input-v1-2026-10-08';
const protocolPath = 'research/data/mate-conjoined-input-v1/protocol.json';
const p = read(protocolPath), result = read(`${dir}/result.json`);
assert.equal(inputs[protocolPath], result.identity.protocolSha256);
const digest = x => sha(JSON.stringify(x));
const median = a => { a = [...a].sort((a,b)=>a-b); const m = Math.floor(a.length/2); return a.length%2 ? a[m] : (a[m-1]+a[m])/2; };
const score = (rows,move) => { const row=rows.find(x=>x.move===move); assert.ok(row); return row.score; };
const arms=[];
for(let arm=0;arm<p.conditions.length;arm++) {
  const receipts=p.moves.map((_,event)=>read(`${dir}/receipt-${arm}-${event}.json`));
  for(let event=0;event<receipts.length;event++) {
    const path=`receipt-${arm}-${event}.json`;
    assert.equal(inputs[`${dir}/${path}`],result.receipts.find(x=>x.path===path).sha256);
  }
  assert.equal(digest(receipts[0].before), result.baseline[arm].memoryHash);
  const events=receipts.map((r,event)=>{
    assert.equal(r.assessment.memoryFingerprint,digest(r.before));
    assert.equal(r.evidence.move,p.moves[event]);
    const after=event+1<receipts.length ? receipts[event+1].assessment.rows : result.after[arm].rows;
    if(event+1<receipts.length) assert.deepEqual(r.after,receipts[event+1].before);
    else assert.equal(digest(r.after),result.after[arm].memoryHash);
    const before=r.assessment.rows;
    assert.deepEqual(before.map(x=>x.move),after.map(x=>x.move));
    const deltas=before.map(x=>({move:x.move,delta:score(after,x.move)-x.score}));
    const d=move=>deltas.find(x=>x.move===move).delta;
    const others=deltas.filter(x=>!['f7e6','f7h7'].includes(x.move)).map(x=>x.delta);
    return {event,move:r.evidence.move,status:r.evidence.status,channel:r.presentation.channel,
      mateDelta:d('f7h7'),errorDelta:d('f7e6'),pairMarginDelta:d('f7h7')-d('f7e6'),
      mateRelativeToOtherMedian:d('f7h7')-median(others),changedEdges:r.update.changedEdges,
      recoveredEdges:r.update.recoveredEdges,rates:r.update.rates};
  });
  const first=receipts[0].eligibility,second=receipts[1].eligibility;
  assert.equal(first.length,second.length);
  const aa=first.reduce((s,x)=>s+x*x,0),bb=second.reduce((s,x)=>s+x*x,0);
  const dot=first.reduce((s,x,i)=>s+x*second[i],0);
  arms.push({arm,encoder:p.variants[arm],condition:p.conditions[arm],
    baselineChoice:result.baseline[arm].choice,finalChoice:result.after[arm].choice,
    finalCorrect:result.after[arm].correct,finalMargin:result.after[arm].margin,
    firstPairEligibilityCosine:aa&&bb?dot/Math.sqrt(aa*bb):null,
    firstPairSharedPositiveEntries:first.filter((x,i)=>x>0&&second[i]>0).length,
    events});
}
const contrasts=arms.filter(x=>x.condition==='informative').map(x=>{
  const control=arms.find(c=>c.encoder===x.encoder&&c.condition==='no-channel');
  return {encoder:x.encoder,events:x.events.map((e,i)=>({event:i,move:e.move,
    pairMarginDeltaBeyondNoChannel:e.pairMarginDelta-control.events[i].pairMarginDelta,
    mateRelativeLiftBeyondNoChannel:e.mateRelativeToOtherMedian-control.events[i].mateRelativeToOtherMedian}))};
});
const oldDir='research/reports/adaptive-mate-error-v1-2026-10-08';
const old=read(`${oldDir}/result.json`),oldProtocol=read('research/data/adaptive-mate-error-v1/protocol.json');
const shuffledArm=oldProtocol.conditions.indexOf('shuffled');
const controlRows=old.schedule.map((move,event)=>{
  const path=`receipt-${shuffledArm}-${event}.json`,r=read(`${oldDir}/${path}`);
  assert.equal(inputs[`${oldDir}/${path}`],old.receipts.find(x=>x.path===path).sha256);
  assert.equal(r.evidence.move,move);
  return {move,expected:old.shuffle.channels[event],delivered:r.presentation.channel,
    aligned:old.shuffle.channels[event]===r.presentation.channel};
});
const historicalControl={rows:controlRows,aligned:controlRows.filter(x=>x.aligned).length,total:controlRows.length,
  correction:'6/8 aligned, not the 4/8 stated in historical narrative'};
console.log(JSON.stringify({scope:'Saved-receipt arithmetic, not independent neural/certificate replay; no training',
  caveat:'After event zero, informative and control start from different memories; differences are trajectory contrasts, not isolated pulse interventions. Eligibility includes repeated KC entries for different edges.',
  inputs,arms,contrasts,historicalControl},null,2));
