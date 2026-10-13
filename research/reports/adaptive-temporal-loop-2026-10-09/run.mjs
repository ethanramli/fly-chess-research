// Bounded hypothesis test, not a selected chess learner or reversal assay.
import assert from 'node:assert/strict';
import {readFileSync,createReadStream,mkdirSync,copyFileSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import os from 'node:os';
import {Chess} from 'chess.js';
import {loadGraph,readNpz} from '../../../.codebase/src/runtime/graph.mjs';
import {SparseTrainer} from '../../../.codebase/src/supervised-baselines/trainer.mjs';
import {fixedStateHash} from '../../../.codebase/src/neural-learning/association-validation.mjs';
import {digest} from '../../../.codebase/src/neural-learning/mushroom-body.mjs';
import {RateTimingMemory} from '../../../.codebase/src/neural-learning/rate-timing-memory.mjs';
import {selectTemporalPair} from '../../../.codebase/src/puzzle-learning/adaptive-temporal-pair.mjs';
import {readMBON} from '../../../.codebase/src/neural-learning/mbon-readout.mjs';
import {TemporalFeedbackSession} from '../../../.codebase/src/puzzle-learning/temporal-feedback-session.mjs';
import {createConjoinedPublicMateFrameEncoder} from '../../../.codebase/src/chess-input/conjoined-public-mate-frame-cue.mjs';
import {certifyMate} from '../../../.codebase/src/search-and-feedback/mate-certificate.mjs';
import {verifiedExperience} from '../../../.codebase/src/search-and-feedback/verified-feedback.mjs';
import {publishAtomicJson} from '../../../.codebase/src/puzzle-learning/plasticity-mechanism-assay.mjs';
const {values:a}=parseArgs({options:{out:{type:'string'},protocol:{type:'string'},resume:{type:'string'},'cpu-duty':{type:'string'},'stop-after-frames':{type:'string'}}});
assert(a.out&&a.protocol&&Number(a['cpu-duty'])===0.5&&process.execArgv.includes('--max-old-space-size=256'));
const json=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,'')),p=json(a.protocol),mapping=json(p.mappingPath);
assert(Number.isSafeInteger(p.maxPairs)&&p.maxPairs>=1&&p.maxPairs<=32);
assert.deepEqual(p.conditions,['informative','fixed-target','swapped','absent','disabled']);
assert.equal(p.task.objective,'forced-mate');assert.equal(p.task.plies,1);
let framesThisInvocation=0;const frameLimit=a['stop-after-frames']===undefined?Infinity:Number(a['stop-after-frames']);
assert(frameLimit===Infinity||(Number.isSafeInteger(frameLimit)&&frameLimit>0));
const started=performance.now(),cpuStart=process.cpuUsage();let peakRss=0;
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<768*2**20&&os.freemem()>256*2**20,'Resource guard');}
async function paced(operation){guard();const t=performance.now(),result=operation();await new Promise(r=>setTimeout(r,performance.now()-t));guard();return result;}
async function fileHash(path){const h=createHash('sha256');for await(const b of createReadStream(path))h.update(b);return h.digest('hex');}
for(const [path,hash] of Object.entries(p.sources))assert.equal(await fileHash(path),hash,`Source changed: ${path}`);
assert.equal(await fileHash(p.graphPath),mapping.inputs.graph);assert.equal(await fileHash(p.annotationPath),mapping.inputs.annotations);
const identity={protocolHash:await fileHash(a.protocol),sources:p.sources,node:process.version,algorithm:'adaptive-temporal-loop-v1'};
mkdirSync(a.out,{recursive:false});copyFileSync(a.protocol,join(a.out,'protocol.json'));
for(const path of Object.keys(p.sources)){const target=join(a.out,'sources',path);mkdirSync(dirname(target),{recursive:true});copyFileSync(path,target);}
assert.equal(await fileHash(p.runnerPath),p.runnerSha256);assert.equal(await fileHash(p.auditorPath),p.auditorSha256);
copyFileSync(p.auditorPath,join(a.out,'auditor.mjs'));
const board=new Chess(p.fen),context={fen:board.fen(),pgn:board.pgn(),task:p.task};
const moves=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
const experiences=new Map(moves.map(move=>{
  const next=new Chess(board.fen());next.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
  const proof=certifyMate(next,board.turn(),{plies:0,maxNodes:4096,milliseconds:2000});
  return [move,{...verifiedExperience(board,move,p.task,proof),proof,context}];
}));
assert([...experiences.values()].every(e=>e.status!=='unknown'),'Unknown certificate');
let state=a.resume?json(a.resume):{identity,sequence:0,arm:0,lesson:0,session:null,results:[],receipts:[],schedule:[],scheduleClosed:false};
assert.deepEqual(state.identity,identity);
if(a.resume)for(const r of state.receipts){const path=join(dirname(a.resume),r.path);assert.equal(await fileHash(path),r.sha256);copyFileSync(path,join(a.out,r.path));}
function publish(kind,value){const path=`receipt-${state.receipts.length}.json`,sha256=publishAtomicJson(join(a.out,path),{kind,...value});state.receipts.push({path,sha256});}
function checkpoint(){state.sequence++;publishAtomicJson(join(a.out,`checkpoint-${state.sequence}.json`),state);}
checkpoint();guard();const graph=loadGraph(p.graphPath);guard();
const roots=readNpz(p.graphPath,['root_ids']).root_ids;
for(const cell of [...Object.values(p.readout.cells).flat(),...mapping.groups.flatMap(g=>g.dan)])
  assert.equal(roots[cell.index].toString(),cell.rootId,'Released readout/DAN identity mismatch');
for(;state.arm<p.conditions.length;){
  const condition=p.conditions[state.arm],planCondition=condition==='fixed-target'?'informative':condition,model=new SparseTrainer(graph,p.model);
  guard();
  await paced(()=>model.forward([0]));const reference=Float32Array.from(model.h[model.steps]);
  const memory=new RateTimingMemory(model,mapping,reference,p.memory),fixed=fixedStateHash(model,memory.edges);
  const base=createConjoinedPublicMateFrameEncoder(mapping,p.encoder);
  const encoder={encode:(b,action,task)=>base.encode({schema:'public-lesson-frame-v1',fen:b.fen(),pgn:b.pgn(),task,action})};
  const session=new TemporalFeedbackSession({model,memory,mapping,encoder,timing:p.timing,
    identity:digest({identity,condition,memory:memory.identity,encoder:base.identity,readout:p.readout})});
  if(state.session)session.restore(state.session);
  async function assess(){
    const before=digest(memory.snapshot()),rows=[];
    for(const move of moves){const cue=encoder.encode(board,move,p.task);await paced(()=>model.forward([0],cue.stimulation));
      const rates=Object.fromEntries(Object.entries(p.readout.cells).map(([type,cells])=>[type,cells.map(c=>model.h[model.steps][c.index])]));
      rows.push({move,score:readMBON(rates).score,rates});}
    assert.equal(digest(memory.snapshot()),before,'Assessment changed memory');
    const best=Math.max(...rows.map(r=>r.score)),top=rows.filter(r=>r.score===best);
    return {...context,rows,choice:top.length===1?top[0].move:null,memoryHash:before};
  }
  let result=state.results[state.arm];
  if(!result){result={condition,fixedBefore:fixed,memoryIdentity:memory.identity,encoderIdentity:base.identity,
    initial:await assess(),initialMemory:memory.snapshot(),lessons:[],selections:[],
    reference:{kc:[...memory.referenceKC],dan:[...memory.referenceDAN]}};
    assert(result.initial.choice,'Adaptive target requires a unique initial all-legal choice');
    assert.equal(experiences.get(result.initial.choice)?.status,'failure','Initial unaided choice is not a verified error');
    assert.equal(experiences.get(p.successMove)?.status,'success','Contrast move lacks independent success proof');
    result.selectedMistake=result.initial.choice;state.results.push(result);state.session=session.snapshot();checkpoint();}
  while(true){
    if(condition==='informative'&&state.lesson===state.schedule.length&&!session.pending){
      const assessment=result.latest??result.initial;
      assert.equal(assessment.memoryHash,digest(memory.snapshot()));
      const pair=selectTemporalPair(board,p.task,assessment,experiences,p.successMove);
      if(state.lesson>=p.maxPairs*2||!pair.moves.length){
        state.scheduleClosed=true;result.stoppedBy=state.lesson>=p.maxPairs*2?'pair-budget':pair.reason;
        checkpoint();break;
      }
      result.selections.push({lesson:state.lesson,assessment,selection:pair});
      state.schedule.push(...pair.moves);checkpoint();
    }
    if(state.lesson>=state.schedule.length){assert(state.scheduleClosed);break;}
    const move=condition==='fixed-target'?(state.lesson%2===0?result.selectedMistake:p.successMove):state.schedule[state.lesson];
    if(!session.pending){
      const assessment=result.latest??result.initial;
      assert.equal(assessment.memoryHash,digest(memory.snapshot()));
      session.start(experiences.get(move),assessment,{condition:planCondition});
      publish('lesson-start',{arm:state.arm,lesson:state.lesson,plan:session.pending.plan,
        binding:session.pending.binding,experience:experiences.get(move),memory:memory.snapshot()});
      state.session=session.snapshot();checkpoint();}
    while(session.pending.cursor<session.pending.plan.frames.length){
      // Publish updated state and receipt together before acknowledging a frame.
      guard();const t=performance.now(),frame=session.step();
      const local=model.h.slice(1).map(h=>memory.kc.map((index,i)=>({kc:h[index],dan:h[memory.dan[i]]})));
      publish('frame',{arm:state.arm,lesson:state.lesson,frame,local,memory:memory.snapshot()});
      state.session=session.snapshot();checkpoint();
      await new Promise(r=>setTimeout(r,performance.now()-t));guard();
      framesThisInvocation++;
      if(framesThisInvocation>=frameLimit){
        console.log(JSON.stringify({stoppedBy:'requested-frame-bound',checkpoint:join(a.out,`checkpoint-${state.sequence}.json`)}));
        process.exit(0);
      }
    }
    const lesson=session.finish();result.lessons.push(lesson);publish('lesson',{arm:state.arm,lesson:state.lesson,receipt:lesson});
    result.latest=await assess();
    state.session=session.snapshot();state.lesson++;checkpoint();
    console.log(JSON.stringify({condition,lesson:state.lesson,reviewed:move,nextChoice:result.latest.choice}));
  }
  result.final=result.latest??result.initial;result.repeat=await assess();assert.deepEqual(result.repeat,result.final);
  result.finalMemory=memory.snapshot();result.fixedAfter=fixedStateHash(model,memory.edges);
  assert.equal(result.fixedAfter,result.fixedBefore,'Changed fixed topology/signs/parameters');
  state.arm++;state.lesson=0;state.session=null;publish('arm',{result});checkpoint();
}
const score=(assessment,move)=>assessment.rows.find(r=>r.move===move).score;
for(const result of state.results){result.marginBefore=score(result.initial,p.successMove)-score(result.initial,result.selectedMistake);
  result.marginAfter=score(result.final,p.successMove)-score(result.final,result.selectedMistake);result.marginChange=result.marginAfter-result.marginBefore;
  result.finalChoiceStatus=result.final.choice?experiences.get(result.final.choice).status:'tie';}
const result={identity,schedule:state.schedule,scheduleClosed:state.scheduleClosed,results:state.results,receipts:state.receipts,peakRssMiB:peakRss/2**20,
  elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),resumedFrom:a.resume?resolve(a.resume):null,command:{argv:process.argv,execArgv:process.execArgv},
  scope:p.scope,status:'Completed; independent audit required; no retention/reversal/transfer conclusion'};
publishAtomicJson(join(a.out,'result.json'),result);
console.log(JSON.stringify({conditions:result.results.map(r=>({condition:r.condition,marginChange:r.marginChange,choice:r.final.choice})),peakRssMiB:result.peakRssMiB,elapsedSeconds:result.elapsedSeconds}));


