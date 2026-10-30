// Read-only receipt audit; numerical rule replay shares the declared integrator.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import os from 'node:os';
const out=process.argv[2];assert(out);
const json=path=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const result=json(join(out,'result.json')),p=json(join(out,'protocol.json'));
assert.equal(hash(join(out,'protocol.json')),result.identity.protocolHash);
for(const [path,h] of Object.entries(p.sources))assert.equal(hash(join(out,'sources',path)),h);
assert.equal(hash(join(out,'auditor.mjs')),p.auditorSha256);
assert.equal(hash(join(out,'sources',p.runnerPath)),p.runnerSha256);
const module=path=>import(pathToFileURL(resolve(out,'sources','.codebase/src',path)).href);
const [{stepRateTimingPlasticity},{digest},{verifiedExperience},{Chess},{bindFeedbackToAssessment},{readMBON}]=await Promise.all([
  module('neural-learning/rate-timing-plasticity-candidate.mjs'),module('neural-learning/mushroom-body.mjs'),
  module('search-and-feedback/verified-feedback.mjs'),import('chess.js'),module('puzzle-learning/feedback-quality.mjs'),
  module('neural-learning/mbon-readout.mjs')]);
const mapping=json(join(out,'sources',p.mappingPath)),kc=mapping.groups.flatMap(g=>g.kc);
const [{createConjoinedPublicMateFrameEncoder},{temporalFeedbackPlan}]=await Promise.all([
  module('chess-input/conjoined-public-mate-frame-cue.mjs'),module('puzzle-learning/temporal-feedback-plan.mjs')]);
const baseEncoder=createConjoinedPublicMateFrameEncoder(mapping,p.encoder);
const encoder={encode:(board,action,task)=>baseEncoder.encode({schema:'public-lesson-frame-v1',fen:board.fen(),pgn:board.pgn(),task,action})};
// v2 omitted reference arrays from receipts. Reconstruct the pinned, from-scratch
// unstimulated reference once after training has stopped; never replay learning.
assert(process.execArgv.includes('--max-old-space-size=256'));
const guard=()=>assert(process.memoryUsage().rss<768*2**20&&os.freemem()>256*2**20);
const [{loadGraph},{SparseTrainer},{RateTimingMemory}]=await Promise.all([
  module('runtime/graph.mjs'),module('supervised-baselines/trainer.mjs'),module('neural-learning/rate-timing-memory.mjs')]);
guard();assert.equal(hash(p.graphPath),mapping.inputs.graph);
const graph=loadGraph(p.graphPath);guard();const model=new SparseTrainer(graph,p.model);guard();
const t=performance.now();model.forward([0]);await new Promise(r=>setTimeout(r,performance.now()-t));guard();
const memory=new RateTimingMemory(model,mapping,model.h[model.steps],p.memory);
const reference={kc:[...memory.referenceKC],dan:[...memory.referenceDAN]};
for(const arm of result.results)assert.equal(arm.memoryIdentity,memory.identity);
const receipts=result.receipts.map(ref=>{const path=join(out,ref.path);assert.equal(hash(path),ref.sha256);return json(path);});
const proofs=new Map();
for(const name of readdirSync(out).filter(n=>/^checkpoint-\d+\.json$/.test(n))){
  const s=json(join(out,name));assert.deepEqual(s.identity,result.identity);
  guard();
  if(s.session?.pending){const e=s.session.pending.experience,key=`${s.arm}:${s.lesson}`;
    if(!proofs.has(key))proofs.set(key,e);}
}
const directions=[];let current=null,chain=null,frameIndex=0,replayedFrames=0;
for(const r of receipts){
  if(r.kind==='lesson-start'){
    assert.equal(current,null);const e=proofs.get(`${r.arm}:${r.lesson}`);assert(e,'Missing stored consequence proof');
    const board=new Chess();board.loadPgn(e.context.pgn);assert.equal(board.fen(),e.context.fen);
    const checked=verifiedExperience(board,e.move,e.context.task,e.proof);
    for(const key of ['status','actor','learningAllowed','certificateSha256'])assert.equal(e[key],checked[key]);
    assert.equal(r.plan.certificateSha256,checked.certificateSha256);assert.equal(r.plan.verifiedStatus,checked.status);
    const expectedMove=r.lesson===0?result.results[r.arm].selectedMistake:p.successMove;
    assert.equal(r.plan.condition,p.conditions[r.arm]);assert.equal(r.plan.move,expectedMove);
    if(r.lesson===0){assert.equal(r.binding.assessment.choice,expectedMove);
      assert.equal(verifiedExperience(board,expectedMove,p.task,proofs.get(`${r.arm}:${r.lesson}`).proof).status,'failure');}
    else assert.equal(checked.status,'success');
    assert.deepEqual(r.plan,temporalFeedbackPlan(e,encoder,mapping,p.timing,{condition:p.conditions[r.arm]}));
    assert.equal(r.binding.assessment.memoryHash,digest(r.memory));
    assert.deepEqual(bindFeedbackToAssessment(board,p.task,r.binding.assessment,e,digest(r.memory)),r.binding);
    assert.equal(r.binding.coverage,'all-legal');
    const {identity,skipped,learningAllowed,...planBody}=r.plan;
    assert.equal(identity,digest(planBody));assert.equal(skipped,false);assert.equal(learningAllowed,true);
    const cueSet=new Set(r.plan.cue.stimulation.map(c=>c.index)),indices=kc.map((k,i)=>cueSet.has(k)?i:-1).filter(i=>i>=0);
    assert(indices.length);current={...r,before:r.memory,indices,reference};frameIndex=0;
    chain=digest({plan:r.plan.identity,binding:r.binding,before:digest(r.memory)});
  }else if(r.kind==='frame'){
    assert(current);assert.equal(r.arm,current.arm);assert.equal(r.lesson,current.lesson);
    const f=r.frame;assert.equal(f.index,frameIndex++);assert.equal(f.previousChainHash,chain);
    const {chainHash,...body}=f;assert.equal(chainHash,digest(body));chain=chainHash;
    assert.equal(f.beforeMemoryHash,digest(current.memory));
    assert.deepEqual(f.stimulation,current.plan.frames[f.index].stimulation);
    const next=structuredClone(current.memory);
    if(current.plan.plasticityEnabled){
      assert.equal(r.local.length,p.model.steps);
      for(const interval of r.local){assert.equal(interval.length,kc.length);
        for(let i=0;i<kc.length;i++){
          // The reference is needed to normalize exact stored rates. It enters
          // memory identity, but must also be available to independent replay.
          assert(current.reference,'Missing fixed local reference in raw receipts');
          const x=stepRateTimingPlasticity({gain:next.gains[i],kcTrace:next.kcTrace[i],short:next.short[i],long:next.long[i]},
            {kcRate:Math.min(1,Math.max(0,interval[i].kc-current.reference.kc[i])/p.memory.activityScale),
              danRate:Math.max(0,interval[i].dan-current.reference.dan[i])/p.memory.activityScale,
              dt:p.memory.stepDuration},p.memory).state;
          next.gains[i]=x.gain;next.kcTrace[i]=x.kcTrace;next.short[i]=x.short;next.long[i]=x.long;
        }}next.events++;
    }
    assert.deepEqual(next,r.memory);assert.equal(f.afterMemoryHash,digest(r.memory));current.memory=r.memory;replayedFrames++;
  }else if(r.kind==='lesson'){
    assert(current);assert.equal(frameIndex,current.plan.frames.length);assert.equal(r.receipt.chainHash,chain);
    const delta=current.indices.reduce((v,i)=>v+current.memory.gains[i]-current.before.gains[i],0)/current.indices.length;
    directions.push({condition:current.plan.condition,status:current.plan.verifiedStatus,delta});current=null;
  }
}
assert.equal(current,null);assert.equal(replayedFrames,152);
const expectedSign=d=>d.status==='success'?1:-1,epsilon=p.gates.epsilon;
const directionPass=directions.filter(d=>['informative','swapped'].includes(d.condition))
  .every(d=>d.delta*expectedSign(d)*(d.condition==='swapped'?-1:1)>epsilon);
for(const arm of result.results){
  assert.equal(arm.fixedBefore,arm.fixedAfter);
  for(const assessment of [arm.initial,arm.final])for(const row of assessment.rows)
    assert.equal(readMBON(row.rates).score,row.score);
  const score=(assessment,move)=>assessment.rows.find(r=>r.move===move).score;
  const change=score(arm.final,p.successMove)-score(arm.final,arm.selectedMistake)
    -score(arm.initial,p.successMove)+score(arm.initial,arm.selectedMistake);
  assert(Math.abs(change-arm.marginChange)<1e-12);
  if(arm.condition==='disabled')assert.deepEqual(arm.initialMemory,arm.finalMemory);
}
const informative=result.results.find(r=>r.condition==='informative');
const specificityPass=informative.marginChange>epsilon&&result.results.filter(r=>r!==informative)
  .every(r=>informative.marginChange-r.marginChange>epsilon);
const audit={scope:'Receipt/certificate audit plus pinned read-only reference reconstruction; numerical replay shares the declared integrator. No biological validation, retention, reversal or transfer evidence.',
  protocolHash:result.identity.protocolHash,auditorSha256:hash(process.argv[1]),replayedFrames,directions,directionPass,specificityPass,
  choices:result.results.map(r=>({condition:r.condition,choice:r.final.choice,status:r.finalChoiceStatus,marginChange:r.marginChange}))};
writeFileSync(join(out,'audit.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(audit));
