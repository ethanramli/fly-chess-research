// Independent consistency audit of stored readouts; does not call the driver/brain.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const { values:args }=parseArgs({options:{run:{type:'string'},out:{type:'string'},compare:{type:'string'}}});
if(!args.run||!args.out)throw Error('Require --run RUN_DIRECTORY --out NEW_JSON_PATH');
const read=path=>JSON.parse(readFileSync(path)), hash=v=>createHash('sha256').update(v).digest('hex'), digest=v=>hash(JSON.stringify(v));
const report=read(join(args.run,'report.json')), checks=[];
assert.equal(report.complete,true);
for(const[path,expected]of Object.entries(report.identity.inputs))assert.equal(hash(readFileSync(path)),expected,`Changed input: ${path}`);
for(const[path,expected]of Object.entries(report.identity.sources))assert.equal(hash(readFileSync(path)),expected,`Changed source: ${path}`);
checks.push('Input and executable source hashes');
const original=read(join(report.protocol.sourceRun,'report.json'));
for(const[path,expected]of Object.entries(original.identity.inputs))assert.equal(hash(readFileSync(path)),expected,`Changed original input: ${path}`);
for(const[path,expected]of Object.entries(original.identity.sources))assert.equal(hash(readFileSync(path)),expected,`Changed original source: ${path}`);
assert.equal(read(join(report.protocol.sourceRun,'audit.json')).allChecksPassed,true);
assert.equal(report.results.length,original.results.length);
const calibration=report.identity.calibration;
assert.deepEqual(calibration.ranges,calibration.panel.gf.map((v,i)=>v-calibration.resting.gf[i]));
assert.equal(calibration.usable,calibration.ranges.every(v=>Number.isFinite(v)&&v>report.protocol.minimumCalibrationRange));
assert.equal(report.identity.gf.length,2);
checks.push('Pinned original audit, seed/condition coverage and calibration arithmetic');
const other=c=>c==='A'?'B':'A';
for(let index=0;index<report.results.length;index++){
  const r=report.results[index],o=original.results[index]; assert.deepEqual(r.job,o.job);assert.deepEqual(r.cues,o.cues);
  const checkpoint=read(r.acquisitionCheckpoint);
  assert.equal(hash(readFileSync(r.acquisitionCheckpoint)),r.acquisitionCheckpointSha256);
  assert.deepEqual(checkpoint.active.job,o.job);assert.equal(checkpoint.active.nextTrial,original.protocol.acquisitionTrials);
  const start=read(join(report.protocol.sourceRun,`checkpoint-${String(2+18*index).padStart(5,'0')}`,'state.json'));
  for(const phase of ['baseline','acquisition','reversal','reset','restored']){
    const p=r.probes[phase], memory=phase==='acquisition'?checkpoint.active.memory: ['reversal','restored'].includes(phase)?o.memory:start.active.memory;
    assert.equal(p.memoryHash,digest(memory),`Wrong memory: ${index}/${phase}`);
    for(const cue of ['A','B']){
      const v=p[cue]; assert.equal(v.gf.length,2);assert.ok(v.gf.every(Number.isFinite));
      if(calibration.usable){
        assert.deepEqual(v.normalized,v.gf.map((a,i)=>(a-calibration.resting.gf[i])/calibration.ranges[i]));
        assert.equal(v.danger,Math.max(...v.normalized));
      }else{assert.equal(v.normalized,null);assert.equal(v.danger,null);}
      const old=o.probes[phase][cue];assert.deepEqual(v.mbon,{MBON12:old.MBON12,MBON01:old.MBON01,score:old.score});
    }
    assert.equal(p.choice,calibration.usable?(p.A.danger<=p.B.danger?'A':'B'):null);
  }
  assert.deepEqual(r.probes.reset,r.probes.baseline);assert.deepEqual(r.probes.restored,r.probes.reversal);
  const margin=(p,s)=>p[other(s)].danger-p[s].danger, initialSafe=other(o.job.initialPunished), reversedSafe=other(o.job.reversedPunished);
  assert.equal(r.summary.acquisitionChoiceCorrect,r.probes.acquisition.choice===initialSafe);
  assert.equal(r.summary.reversalChoiceCorrect,r.probes.reversal.choice===reversedSafe);
  assert.equal(r.summary.acquisitionEffect,calibration.usable?margin(r.probes.acquisition,initialSafe)-margin(r.probes.baseline,initialSafe):null);
  assert.equal(r.summary.reversalEffect,calibration.usable?margin(r.probes.reversal,reversedSafe)-margin(r.probes.acquisition,reversedSafe):null);
  assert.equal(r.summary.resetExact,true);assert.equal(r.summary.restorationExact,true);assert.equal(r.summary.fixedStatePreserved,true);
  if(o.job.condition==='disabled')for(const phase of ['acquisition','reversal'])assert.deepEqual(r.probes[phase],r.probes.baseline);
}
checks.push('All GF normalization/choice/effect calculations, saved memory identities, original MBON consistency, reset/restoration and disabled responses');
for(const condition of original.protocol.conditions){
  const rows=report.results.filter(r=>r.job.condition===condition), s=report.summary[condition];
  assert.equal(rows.length,original.protocol.seeds.length);assert.equal(s.jobs,rows.length);
  assert.equal(s.acquisitionCorrect,rows.filter(r=>r.summary.acquisitionChoiceCorrect).length);
  assert.equal(s.reversalCorrect,rows.filter(r=>r.summary.reversalChoiceCorrect).length);
  assert.deepEqual(s.acquisitionEffects,rows.map(r=>r.summary.acquisitionEffect));assert.deepEqual(s.reversalEffects,rows.map(r=>r.summary.reversalEffect));
}
checks.push('Summary recomputed from raw records');
// Apply the originally proposed application clipping without changing its rule.
const applicationComparison=Object.fromEntries(original.protocol.conditions.map(condition=>{
  const rows=report.results.filter(r=>r.job.condition===condition), clipped=v=>Math.min(1,Math.max(0,v));
  const choice=p=>Math.max(...p.A.normalized.map(clipped))<=Math.max(...p.B.normalized.map(clipped))?'A':'B';
  return [condition,{acquisitionCorrect:calibration.usable?rows.filter(r=>choice(r.probes.acquisition)===other(r.job.initialPunished)).length:null,
    reversalCorrect:calibration.usable?rows.filter(r=>choice(r.probes.reversal)===other(r.job.reversedPunished)).length:null,
    tiedProbes:calibration.usable?rows.reduce((n,r)=>n+['baseline','acquisition','reversal'].filter(phase=>{
      const p=r.probes[phase];return Math.max(...p.A.normalized.map(clipped))===Math.max(...p.B.normalized.map(clipped));}).length,0):null}];
}));
const normalizedValues=report.results.flatMap(r=>['baseline','acquisition','reversal'].flatMap(phase=>['A','B'].flatMap(cue=>r.probes[phase][cue].normalized??[])));
const signalRange=normalizedValues.length?{min:Math.min(...normalizedValues),max:Math.max(...normalizedValues),allBelowRest:normalizedValues.every(v=>v<0)}:null;
if(args.compare){
  const replay=read(join(args.compare,'report.json'));assert.deepEqual(replay.identity,report.identity);
  for(const r of replay.results)assert.deepEqual(r,report.results.find(x=>digest(x.job)===digest(r.job)));
  checks.push('Resumed prefix scientific records match exactly');
}
const audit={allChecksPassed:true,run:args.run,reportSha256:hash(readFileSync(join(args.run,'report.json'))),checkedJobs:report.results.length,
  checks,applicationComparison,signalRange,sourceSha256:hash(readFileSync('.codebase/scripts/audit-gf-memory.mjs')),
  limitations:['Consistency audit does not independently re-simulate the full graph. Runtime probes separately check fixed-state hashes and original MBON numerical equality.',
    'Reused synthetic cues, experimental direct stimulation and diagnostic GF decoder do not validate biological learning, independent Gate B acceptance or chess transfer.']};
writeFileSync(args.out,JSON.stringify(audit,null,2),{flag:'wx'});console.log(JSON.stringify(audit));
