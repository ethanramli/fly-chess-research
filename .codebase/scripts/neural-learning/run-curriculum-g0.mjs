// Serial prerequisite assay. Teacher waveform timing never calculates gain updates.
import assert from 'node:assert/strict';
import {readFileSync,createReadStream,mkdirSync,copyFileSync,writeFileSync,renameSync,existsSync,openSync,closeSync,fsyncSync,writeSync,readSync,statSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {gzipSync,gunzipSync} from 'node:zlib';
import os from 'node:os';
import {loadGraph,readNpz,validateGraph} from '../../src/runtime/graph.mjs';
import {streamRows} from '../../src/runtime/storage.mjs';
import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';
import {fixedStateHash} from '../../src/neural-learning/association-validation.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {RateTimingMemory} from '../../src/neural-learning/rate-timing-memory.mjs';
import {readConsequenceValue} from '../../src/neural-learning/consequence-value-readout.mjs';
import {createG0Table,verifyG0,createG0Encoder,planG0Schedule,G0FeedbackSession} from '../../src/neural-learning/curriculum-g0.mjs';
import {publishAtomicJson} from '../../src/puzzle-learning/plasticity-mechanism-assay.mjs';

const {values:a}=parseArgs({options:{out:{type:'string'},protocol:{type:'string'},resume:{type:'string'},'cpu-duty':{type:'string'},'interrupt-after-pending':{type:'string'}}});
assert(a.out&&a.protocol&&Number(a['cpu-duty'])===.5&&process.execArgv.includes('--max-old-space-size=256'));
const json=path=>{const bytes=readFileSync(path);return JSON.parse((path.endsWith('.gz')?gunzipSync(bytes,{maxOutputLength:16*2**20}):bytes).toString('utf8').replace(/^\uFEFF/,''));};
const processes=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',
  "@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true,timeout:15000}));
assert(!(Array.isArray(processes)?processes:[processes]).some(x=>x.ProcessId!==process.pid&&
  /(?:\.codebase[\\/]scripts[\\/]|research[\\/]reports.*[\\/](?:run[^\\/]*|benchmark|audit[^\\/]*)\.mjs)/i.test(x.CommandLine??'')),'Another experiment is live');
const p=json(a.protocol),mapping=json(p.mappingPath),table=createG0Table(),schedule=planG0Schedule(table,{shuffleSeed:p.shuffleSeed});
assert.equal(p.schema,'curriculum-g0-assay-v1');assert.deepEqual(p.phases,['acquisition','interference','reversal']);
assert.deepEqual(p.conditions,['informative','absent','shuffled','disabled']);assert.equal(p.scheduleHash,digest(schedule));
assert.equal(p.earlyStop,'after-complete-matched-phase-on-any-required-gate-failure');
const started=performance.now(),cpuStart=process.cpuUsage();let peakRss=0,presentations=0;
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<=768*2**20&&os.freemem()>=256*2**20,'Resource guard');assert(presentations<=p.maxPresentations);}
async function pace(fn){guard();const t=performance.now(),v=fn();presentations++;await new Promise(r=>setTimeout(r,Math.max(1,performance.now()-t)));guard();return v;}
async function hash(path){const h=createHash('sha256');for await(const b of createReadStream(path)){h.update(b);guard();}return h.digest('hex');}
for(const [path,expected] of Object.entries(p.sources))assert.equal(await hash(path),expected,path);
for(const [path,expected] of Object.entries(p.dependencies))assert.equal(await hash(path),expected,path);
if(!p.fixture){assert.equal(await hash(p.graphPath),mapping.inputs.graph);assert.equal(await hash(p.annotationPath),mapping.inputs.annotations);}
const identity={protocolHash:await hash(a.protocol),sources:p.sources,dependencies:p.dependencies,node:process.version,algorithm:p.schema};
mkdirSync(a.out,{recursive:false});copyFileSync(a.protocol,join(a.out,'protocol.json'));
for(const path of Object.keys(p.sources)){const target=join(a.out,'sources',path);mkdirSync(dirname(target),{recursive:true});copyFileSync(path,target);}
let state=a.resume?json(a.resume):{identity,replica:0,phase:0,arm:0,lesson:0,sequence:0,receiptCount:0,logBytes:0,chainHash:digest(identity),pendingReceipt:null,session:null,arms:{},baselines:{},results:[],stopped:false,replicaResponses:{}};
assert.deepEqual(state.identity,identity);
if(a.resume){
  assert(!a.resume.endsWith('.partial'));assert(statSync(a.resume).size<=16*2**20,'Checkpoint exceeds bound');
  const source=join(dirname(a.resume),'receipts.jsonl');
  if(existsSync(source))copyFileSync(source,join(a.out,'receipts.jsonl'));
  let sequence=0,chainHash=digest(identity);
  if(existsSync(source))for await(const r of streamRows(source)){
    assert.equal(r.sequence,sequence);assert.equal(r.previousChainHash,chainHash);
    if(sequence===state.receiptCount){assert.deepEqual(r,state.pendingReceipt);}
    else assert(sequence<state.receiptCount,'Unexpected future receipt');
    chainHash=digest(r);sequence++;
    if(sequence===state.receiptCount)assert.equal(chainHash,state.chainHash);
  }
  assert(sequence===state.receiptCount||sequence===state.receiptCount+1,'Missing acknowledged receipt');
}
let lastCheckpoint=null;
// Immutable compressed publications avoid replacing a checkpoint held by a Windows reader.
function save(){
  state.sequence++;const bytes=JSON.stringify(state)+'\n';assert(Buffer.byteLength(bytes)<=16*2**20);
  const target=join(a.out,`checkpoint-${String(state.sequence).padStart(6,'0')}.json.gz`),partial=`${target}.partial`,fd=openSync(partial,'wx');
  try{writeFileSync(fd,gzipSync(bytes));fsyncSync(fd);}finally{closeSync(fd);}renameSync(partial,target);lastCheckpoint=target;
}
function acknowledge(){
  const r=state.pendingReceipt;if(!r)return;
  const line=JSON.stringify(r)+'\n';assert(Buffer.byteLength(line)<=65536,'Receipt exceeds stream bound');
  const path=join(a.out,'receipts.jsonl'),size=existsSync(path)?statSync(path).size:0;
  if(size===state.logBytes){const fd=openSync(path,'a');try{assert.equal(writeSync(fd,line),Buffer.byteLength(line));fsyncSync(fd);}finally{closeSync(fd);}}
  else{assert.equal(size,state.logBytes+Buffer.byteLength(line),'Partial or extra receipt log; refuse recovery');
    const bytes=Buffer.alloc(Buffer.byteLength(line)),fd=openSync(path,'r');
    try{assert.equal(readSync(fd,bytes,0,bytes.length,state.logBytes),bytes.length);}finally{closeSync(fd);}
    assert.equal(bytes.toString('utf8'),line,'Conflicting pending receipt');}
  state.logBytes+=Buffer.byteLength(line);state.receiptCount++;state.chainHash=digest(r);state.pendingReceipt=null;save();
}
function publish(kind,value){
  assert.equal(state.pendingReceipt,null);state.pendingReceipt={sequence:state.receiptCount,previousChainHash:state.chainHash,kind,...value};save();
  if(a['interrupt-after-pending']&&kind==='frame'&&state.receiptCount===Number(a['interrupt-after-pending'])){
    publishAtomicJson(join(a.out,'interruption.json'),{publishedPendingReceipt:state.receiptCount,presentations,peakRssMiB:peakRss/2**20,
      elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),command:{argv:process.argv,execArgv:process.execArgv},exitCode:75});
    console.log(JSON.stringify({status:'Injected interruption after published pending frame',resume:lastCheckpoint,receiptCount:state.receiptCount}));process.exit(75);
  }
  acknowledge();
}
acknowledge();save();guard();
const graph=p.fixture?validateGraph(Object.fromEntries(Object.entries(p.fixtureGraph).map(([k,v])=>[k,k==='initial'?Float32Array.from(v):k==='sign'?Int8Array.from(v):Int32Array.from(v)]))):loadGraph(p.graphPath);guard();
if(!p.fixture){
  const roots=readNpz(p.graphPath,['root_ids']).root_ids;
  for(const c of [...Object.values(p.readout.cells).flat(),...mapping.groups.flatMap(g=>g.dan)])assert.equal(roots[c.index].toString(),c.rootId);
}
for(const g of mapping.groups)for(let i=0;i<g.edges.length;i++){
  const edge=g.edges[i],post=g.mbon[i].index;
  assert.equal(graph.col[edge],g.kc[i]);assert.equal(graph.sign[edge],1);
  assert(edge>=graph.row[post]&&edge<graph.row[post+1],'Wrong mapped postsynaptic endpoint');
}
const model=new SparseTrainer(graph,p.model);await pace(()=>model.forward([0]));
const reference=Float32Array.from(model.h[model.steps]),memory=new RateTimingMemory(model,mapping,reference,p.memory);
const initial=memory.snapshot(),fixed=fixedStateHash(model,memory.edges);
const rates=()=>Object.fromEntries(Object.entries(p.readout.cells).map(([type,cells])=>[type,cells.map(c=>model.h[model.steps][c.index])]));
const targetCues=Array.from({length:8},(_,i)=>[0,...[2,1,0].map(bit=>(i>>bit)&1)]);
// Measurements do not consume local plasticity or persist transient assessment activity.
async function assess(cue,encoder,baseline=null){
  const before=digest(memory.snapshot()),rows=[];
  for(const action of ['A','B']){
    const encoded=encoder.encode({cue,action});await pace(()=>model.forward([0],encoded.stimulation));
    const response=rates(),prior=baseline?.rows.find(r=>r.action===action)?.rates??response;
    rows.push({action,cueHash:digest(encoded),rates:response,...readConsequenceValue(response,prior,p.readout.scale)});
    rows.at(-1).score=rows.at(-1).value;
  }
  assert.equal(digest(memory.snapshot()),before);const [aa,bb]=rows;
  return {cue,encoderIdentity:encoder.identity,memoryHash:before,rows,choice:aa.score===bb.score?null:aa.score>bb.score?'A':'B'};
}
// Effective replica checks accompany this feedback-enabled assay, never a standalone graph probe.
if(!Object.keys(state.replicaResponses).length){
  for(const seed of p.projectionSeeds){
    const encoder=createG0Encoder(mapping,{...p.encoder,seed});state.baselines[seed]={};
    for(const cue of [...targetCues,...Array.from({length:4},(_,i)=>[1,...[2,1,0].map(bit=>(i>>bit)&1)])])
      state.baselines[seed][cue.join('')]=await assess(cue,encoder);
    state.replicaResponses[seed]=digest(Object.values(state.baselines[seed]).map(a=>a.rows.map(r=>r.rates)));
  }
  assert.equal(new Set(Object.values(state.replicaResponses)).size,p.projectionSeeds.length,'Ineffective replicas');
  publish('baselines',{baselines:state.baselines,replicaResponses:state.replicaResponses,fixed,memory:initial});
}
while(state.replica<p.projectionSeeds.length&&!state.stopped){
  const seed=p.projectionSeeds[state.replica],phase=p.phases[state.phase],encoder=createG0Encoder(mapping,{...p.encoder,seed});
  const slots=schedule.filter(s=>s.experience.phase===phase),baseline=cue=>state.baselines[seed][cue.join('')];
  while(state.arm<p.conditions.length){
    const condition=p.conditions[state.arm],key=`${seed}:${condition}`;
    const arm=state.arms[key]??={initialMemory:initial,memory:initial,phases:{}};
    memory.restore(arm.memory);
    const session=new G0FeedbackSession({model,memory,mapping,table,encoder,timing:p.timing,
      identity:digest({identity,seed,condition,memory:memory.identity,encoder:encoder.identity,readout:p.readout})});
    if(state.session)session.restore(state.session);
    for(;state.lesson<slots.length;){
      const slot=slots[state.lesson],options=condition==='shuffled'?{condition,shuffledStatus:slot.shuffledStatus}:{condition};
      if(!session.pending){
        const assessment=await assess(slot.experience.publicInput.cue,encoder,baseline(slot.experience.publicInput.cue));
        assert(verifyG0(table,slot.experience).learningAllowed);session.start(slot.experience,assessment,options);
        state.session=session.snapshot();publish('lesson-start',{seed,phase,condition,lesson:state.lesson,experience:slot.experience,options,binding:session.pending.binding,plan:session.pending.plan});
      }
      while(session.pending.cursor<session.pending.plan.frames.length){
        const frame=await pace(()=>session.step());state.session=session.snapshot();
        const localHash=digest(model.h.slice(1).map(h=>memory.kc.map((index,i)=>[h[index],h[memory.dan[i]]])));
        publish('frame',{seed,phase,condition,lesson:state.lesson,frame,localHash});
      }
      const receipt=session.finish();state.lesson++;state.session=session.snapshot();publish('lesson',{seed,phase,condition,lesson:state.lesson-1,receipt});
    }
    const assessments=[];for(const cue of targetCues)assessments.push(await assess(cue,encoder,baseline(cue)));
    const phaseTarget=phase==='reversal'?'reversal':'acquisition';
    const contextRows=assessments.map(assessment=>{
      const row=table.rows.find(r=>r.phase===phaseTarget&&digest(r.cue)===digest(assessment.cue)&&r.status==='success');
      const [aa,bb]=assessment.rows,rawMargin=(aa.score-bb.score)*(row.action==='A'?1:-1),margin=rawMargin===0?0:rawMargin;
      return {cue:assessment.cue,expected:row.action,choice:assessment.choice,correct:assessment.choice===row.action,margin,assessment};
    });
    const finalMemory=memory.snapshot();assert.equal(fixedStateHash(model,memory.edges),fixed);
    memory.restore(initial);for(const cue of targetCues)assert((await assess(cue,encoder,baseline(cue))).rows.every(r=>r.value===0));
    memory.restore(finalMemory);for(let i=0;i<targetCues.length;i++)assert.deepEqual(await assess(targetCues[i],encoder,baseline(targetCues[i])),assessments[i]);
    if(condition==='disabled')assert.deepEqual(finalMemory,initial);
    arm.memory=finalMemory;arm.phases[phase]={contextRows,correct:contextRows.filter(r=>r.correct).length,
      meanMargin:contextRows.reduce((n,r)=>n+r.margin,0)/8,causalResetRestore:true,fixedAfter:fixed};
    state.arm++;state.lesson=0;state.session=null;publish('arm-phase',{seed,phase,condition,result:arm.phases[phase],memory:finalMemory});
    memory.restore(initial);
  }
  const info=state.arms[`${seed}:informative`].phases[phase],controls=p.conditions.slice(1).map(c=>({condition:c,...state.arms[`${seed}:${c}`].phases[phase]}));
  const gates={acquisitionOrRetentionOrReversal:info.correct>=p.gates.minCorrectContexts,
    informativeContextAdvantage:controls.every(c=>info.correct>=c.correct+p.gates.minControlAdvantageContexts),
    directionAndSpecificity:info.meanMargin>p.gates.epsilon&&controls.every(c=>info.meanMargin>c.meanMargin+p.gates.epsilon),
    causalStateAndFixedWiring:p.conditions.every(c=>state.arms[`${seed}:${c}`].phases[phase].causalResetRestore)};
  const result={seed,phase,informativeCorrect:info.correct,controls:controls.map(c=>({condition:c.condition,correct:c.correct,meanMargin:c.meanMargin})),gates,passed:Object.values(gates).every(Boolean)};
  state.results.push(result);state.stopped=!result.passed;state.phase++;
  if(state.phase===p.phases.length){state.phase=0;state.replica++;}state.arm=0;state.lesson=0;publish('phase',{result});
  console.log(JSON.stringify(result));
}
guard();const result={identity,phaseResults:state.results,arms:state.arms,baselines:state.baselines,replicaResponses:state.replicaResponses,
  G0Passed:!state.stopped&&state.replica===p.projectionSeeds.length,stoppedAtRequiredGate:state.stopped,
  receiptCount:state.receiptCount,chainHash:state.chainHash,invocation:{presentations,peakRssMiB:peakRss/2**20,
    elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),command:{argv:process.argv,execArgv:process.execArgv},resumedFrom:a.resume?resolve(a.resume):null},
  scope:p.scope,status:'Terminal phase result; full archived-source replay audit required. Unrun phases/replicas are not passed.'};
publishAtomicJson(join(a.out,'result.json'),result);console.log(JSON.stringify({G0Passed:result.G0Passed,stopped:state.stopped,receipts:state.receiptCount,invocation:result.invocation}));
