// Independent mask/readout arithmetic audit; never imports the probe or model.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const {values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'},compare:{type:'string'}}});
if(!args.run||!args.out)throw Error('Require --run RUN_DIRECTORY --out NEW_JSON');
const read=p=>JSON.parse(readFileSync(p)),hash=v=>createHash('sha256').update(v).digest('hex'),digest=v=>hash(JSON.stringify(v));
const report=read(join(args.run,'report.json'));assert.equal(report.complete,true);
for(const[p,h]of Object.entries(report.identity.inputs))assert.equal(hash(readFileSync(p)),h,`Changed input: ${p}`);
for(const[p,h]of Object.entries(report.identity.sources))assert.equal(hash(readFileSync(p)),h,`Changed source: ${p}`);
const original=read(join(report.protocol.sourceRun,'report.json'));assert.deepEqual(report.identity.originalIdentity,original.identity);
assert.deepEqual(report.originalGates,original.summary.gates);assert.equal(report.originalAllGatesPassed,false);
assert.equal(read(join(report.protocol.sourceRun,'audit.json')).allChecksPassed,true);
const mapping=read('research/reports/reversal-candidate-2026-10-05/mapping.json').mapping;
const jobs=original.results.flatMap((r,index)=>r.job.condition!=='informative'?[]:report.protocol.phases.flatMap(phase=>report.protocol.interventions.map(intervention=>({index,seed:r.job.seed,phase,intervention}))));
assert.deepEqual(report.identity.jobs,jobs);assert.equal(report.results.length,jobs.length);
for(let n=0;n<report.results.length;n++){
  const row=report.results[n],job=jobs[n],r=original.results[job.index];assert.deepEqual(row.job,job);
  const A=new Set(r.cues.A.map(s=>s.index)),B=new Set(r.cues.B.map(s=>s.index));
  const classes=mapping.groups.flatMap(g=>g.kc.map(i=>A.has(i)&&B.has(i)?'shared':A.has(i)||B.has(i)?'unique':'neither'));
  const saved=job.phase==='acquisition'?read(row.sourceCheckpoint).active.memory:r.memory;
  if(row.sourceCheckpoint)assert.equal(hash(readFileSync(row.sourceCheckpoint)),row.sourceCheckpointSha256);
  const category=job.intervention.endsWith('-only')?job.intervention.slice(0,-5):null;
  const gains=saved.gains.map((v,i)=>job.intervention==='all'||classes[i]===category?v:1);
  const snapshot={version:saved.version,identity:saved.identity,events:job.intervention==='naive'?0:saved.events,gains};
  assert.deepEqual(row.memory,{...snapshot,hash:digest(snapshot)});
  assert.deepEqual(row.categoryCounts,Object.fromEntries(['shared','unique','neither'].map(c=>[c,classes.filter(v=>v===c).length])));
  for(const cue of ['A','B']){
    const v=row.responses[cue],c=original.identity.calibration,normalized=v.raw.map((x,i)=>(x-c.min[i])/c.range[i]),clipped=normalized.map(x=>Math.max(0,Math.min(1,x)));
    assert.equal(v.raw.length,2);assert.ok(v.raw.every(Number.isFinite));assert.deepEqual(v.normalized,normalized);assert.deepEqual(v.clipped,clipped);
    assert.equal(v.score,Math.max(...clipped));assert.equal(v.signedScore,Math.max(...normalized));assert.deepEqual(v.outsidePanel,normalized.map(x=>x<0||x>1));
    assert.equal(v.MBONscore,v.MBON12-v.MBON01);
    if(job.intervention==='all'||job.intervention==='naive')assert.deepEqual(v,r.probes[job.intervention==='all'?job.phase:'baseline'][cue]);
  }
  const expectedSafe=(job.phase==='acquisition'?r.job.initialPunished:r.job.reversedPunished)==='A'?'B':'A',other=expectedSafe==='A'?'B':'A';
  assert.equal(row.safe,expectedSafe);assert.equal(row.choice,row.responses.A.score<=row.responses.B.score?'A':'B');assert.equal(row.correct,row.choice===expectedSafe);
  assert.equal(row.margin,row.responses[other].score-row.responses[expectedSafe].score);assert.equal(row.fixedStatePreserved,true);
}
for(const phase of report.protocol.phases)for(const intervention of report.protocol.interventions){
  const rows=report.results.filter(r=>r.job.phase===phase&&r.job.intervention===intervention);
  assert.deepEqual(report.summary[phase][intervention],{jobs:rows.length,correct:rows.filter(r=>r.correct).length,
    changedFromAll:rows.filter(r=>r.choice!==original.results[r.job.index].probes[phase].choice).length});
}
if(args.compare){const other=read(join(args.compare,'report.json'));assert.deepEqual(other.identity,report.identity);
  for(const row of other.results)assert.deepEqual(row,report.results.find(r=>digest(r.job)===digest(row.job)));}
const audit={allChecksPassed:true,interventions:report.results.length,reportSha256:hash(readFileSync(join(args.run,'report.json'))),sourceSha256:hash(readFileSync('.codebase/scripts/diagnostics/audit-chess-memory-ablation.mjs')),
  checks:['Input/source identity and original failed gates preserved','Complete informative seed/phase/intervention coverage','Every gain-reset mask, category count, event count and memory hash reconstructed',
    'Fixed GF arithmetic, original all/naive responses and summary counts recomputed'],
  replayCompared:Boolean(args.compare),limitations:['Does not independently re-simulate neurons or establish natural biological forgetting.',
    'Intervention choices cannot replace failed original acceptance, implement a new learning rule or establish verified chess learning/transfer.']};
writeFileSync(args.out,JSON.stringify(audit,null,2),{flag:'wx'});console.log(JSON.stringify(audit));
