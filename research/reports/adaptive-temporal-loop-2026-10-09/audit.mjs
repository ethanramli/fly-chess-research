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
assert.deepEqual(p.conditions,['informative','fixed-target','swapped','absent','disabled']);
assert.equal(result.results.length,p.conditions.length);
assert(result.scheduleClosed&&result.schedule.length>0&&result.schedule.length%2===0&&result.schedule.length<=2*p.maxPairs);
assert.deepEqual(result.results.map(r=>r.condition),p.conditions);
function* receiptStream(){for(const ref of result.receipts){
  guard();const path=join(out,ref.path);assert.equal(hash(path),ref.sha256);yield json(path);
}}
const receipts=receiptStream();
const directions=[];let current=null,chain=null,frameIndex=0,replayedFrames=0;
const lastMemory=new Map(),lessonCounts=new Map();
const board=new Chess(p.fen),legal=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??'')).sort();
const proofByMove=new Map();
function checkAssessment(a){
  assert.equal(a.fen,board.fen());assert.equal(a.pgn,board.pgn());assert.deepEqual(a.task,p.task);
  assert.deepEqual(a.rows.map(r=>r.move).sort(),legal);
  for(const row of a.rows)assert.equal(readMBON(row.rates).score,row.score);
  const best=Math.max(...a.rows.map(r=>r.score)),top=a.rows.filter(r=>r.score===best);
  assert.equal(a.choice,top.length===1?top[0].move:null);
}
for(const arm of result.results){
  assert.deepEqual(arm.reference,reference);assert.deepEqual(arm.initialMemory,memory.snapshot());
  checkAssessment(arm.initial);checkAssessment(arm.final);
}
for(const r of receipts){
  if(r.kind==='lesson-start'){
    assert.equal(current,null);const e=r.experience;assert(e,'Missing consequence proof');
    const arm=result.results[r.arm];assert(arm);assert.equal(r.lesson,lessonCounts.get(r.arm)??0);
    assert.deepEqual(r.memory,lastMemory.get(r.arm)??arm.initialMemory);
    checkAssessment(r.binding.assessment);
    const board=new Chess();board.loadPgn(e.context.pgn);assert.equal(board.fen(),e.context.fen);
    const checked=verifiedExperience(board,e.move,e.context.task,e.proof);
    for(const key of ['status','actor','learningAllowed','certificateSha256'])assert.equal(e[key],checked[key]);
    assert.equal(r.plan.certificateSha256,checked.certificateSha256);assert.equal(r.plan.verifiedStatus,checked.status);
    const expectedMove=p.conditions[r.arm]==='fixed-target'
      ?(r.lesson%2===0?result.results[r.arm].selectedMistake:p.successMove):result.schedule[r.lesson];
    const planCondition=p.conditions[r.arm]==='fixed-target'?'informative':p.conditions[r.arm];
    assert.equal(r.plan.condition,planCondition);assert.equal(r.plan.move,expectedMove);
    assert.equal(checked.status,r.lesson%2===0?'failure':'success');
    if(p.conditions[r.arm]==='informative'&&r.lesson%2===0){
      assert.equal(r.binding.assessment.choice,expectedMove);
      const selection=arm.selections[r.lesson/2];assert.equal(selection.lesson,r.lesson);
      assert.deepEqual(selection.assessment,r.binding.assessment);
      assert.deepEqual(selection.selection.moves,result.schedule.slice(r.lesson,r.lesson+2));
    }
    proofByMove.set(e.move,e);
    assert.deepEqual(r.plan,temporalFeedbackPlan(e,encoder,mapping,p.timing,{condition:planCondition}));
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
    assert.equal(r.arm,current.arm);assert.equal(r.lesson,current.lesson);
    assert.deepEqual(r.receipt.plan,current.plan);assert.deepEqual(r.receipt.binding,current.binding);
    assert.equal(r.receipt.afterMemoryHash,digest(current.memory));
    directions.push({condition:p.conditions[current.arm],lesson:current.lesson,status:current.plan.verifiedStatus,delta});
    lastMemory.set(current.arm,current.memory);lessonCounts.set(current.arm,current.lesson+1);current=null;
  }
}
assert.equal(current,null);assert.equal(replayedFrames,p.conditions.length*result.schedule.length*(p.timing.cueFrame+p.timing.tailFrames+1));
for(let i=0;i<result.results.length;i++){
  assert.equal(lessonCounts.get(i),result.schedule.length);
  assert.deepEqual(lastMemory.get(i),result.results[i].finalMemory);
}
assert.equal(result.results[0].selections.length,result.schedule.length/2);
const expectedSign=d=>d.status==='success'?1:-1,epsilon=p.gates.epsilon;
const directionPass=directions.filter(d=>['informative','swapped'].includes(d.condition))
  .every(d=>d.delta*expectedSign(d)*(d.condition==='swapped'?-1:1)>epsilon);
for(const arm of result.results){
  assert.equal(arm.fixedBefore,arm.fixedAfter);
  assert.deepEqual(arm.repeat,arm.final);
  assert.equal(arm.initial.memoryHash,digest(arm.initialMemory));
  assert.equal(arm.final.memoryHash,digest(arm.finalMemory));
  const score=(assessment,move)=>assessment.rows.find(r=>r.move===move).score;
  const change=score(arm.final,p.successMove)-score(arm.final,arm.selectedMistake)
    -score(arm.initial,p.successMove)+score(arm.initial,arm.selectedMistake);
  assert(Math.abs(change-arm.marginChange)<1e-12);
  if(arm.condition==='disabled')assert.deepEqual(arm.initialMemory,arm.finalMemory);
}
// Replay final graph readouts from the receipt-verified persistent state.
// Assessments reset only transient neurons; no optimizer or teacher is invoked.
const [{certifyMate}]=await Promise.all([module('search-and-feedback/mate-certificate.mjs')]);
let graphRows=0;
async function replayAssessment(arm,snapshot,assessment){
  memory.restore(snapshot);
  for(const row of assessment.rows){
    guard();const t=performance.now();
    const cue=encoder.encode(board,row.move,p.task);model.forward([0],cue.stimulation);
    const rates=Object.fromEntries(Object.entries(p.readout.cells).map(([type,cells])=>[type,cells.map(c=>model.h[model.steps][c.index])]));
    assert.deepEqual(rates,row.rates);assert.equal(readMBON(rates).score,row.score);graphRows++;
    await new Promise(r=>setTimeout(r,performance.now()-t));guard();
  }
}
for(const arm of result.results){
  await replayAssessment(arm,arm.finalMemory,arm.final);
  const move=arm.final.choice;
  let status='tie';
  if(move){
    const successor=new Chess(board.fen());successor.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
    const proof=certifyMate(successor,board.turn(),{plies:0,maxNodes:4096,milliseconds:2000});
    status=verifiedExperience(board,move,p.task,proof).status;
  }
  assert.equal(arm.finalChoiceStatus,status);
}
const informative=result.results.find(r=>r.condition==='informative');
const specificityPass=informative.marginChange>epsilon&&result.results.filter(r=>r!==informative)
  .every(r=>informative.marginChange-r.marginChange>epsilon);
const margin=a=>a.rows.find(r=>r.move===p.successMove).score-Math.max(...a.rows.filter(r=>r.move!==p.successMove).map(r=>r.score));
const usefulChoice=informative.final.choice===p.successMove;
const causalChoice=usefulChoice&&result.results.filter(r=>['swapped','absent','disabled'].includes(r.condition)).every(r=>r.finalChoiceStatus==='failure');
const fixed=result.results.find(r=>r.condition==='fixed-target');
const adaptiveAdvantage=margin(informative.final)>margin(fixed.final)+epsilon;
const audit={passed:true,graphRows,schedule:result.schedule,usefulChoice,causalChoice,adaptiveAdvantage,
  strongestCompetitorMargins:result.results.map(r=>({condition:r.condition,before:margin(r.initial),after:margin(r.final)})),scope:'Receipt/certificate audit plus pinned read-only reference reconstruction; numerical replay shares the declared integrator. Final graph scores reconstructed. Same-state repeat is computational persistence only; no biological retention, reversal or transfer evidence.',
  protocolHash:result.identity.protocolHash,auditorSha256:hash(process.argv[1]),replayedFrames,directions,directionPass,specificityPass,
  resources:{peakRssMiB:process.resourceUsage().maxRSS/1024},choices:result.results.map(r=>({condition:r.condition,choice:r.final.choice,status:r.finalChoiceStatus,marginChange:r.marginChange}))};
writeFileSync(join(out,'audit.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(audit));


