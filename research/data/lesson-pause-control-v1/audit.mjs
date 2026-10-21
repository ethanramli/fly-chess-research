// Separate full recurrence/evidence replay from archived bytes. Shared biology is not independently validated.
import assert from 'node:assert/strict';
import {verifyPauseLineage,pauseAudit} from '../../../.codebase/scripts/runtime/lesson-pause-control.mjs';
import {readFileSync,createReadStream} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import os from 'node:os';

const out=process.argv[2];assert(out&&process.argv[3]==='--cpu-duty'&&process.argv[4]==='0.5'&&process.execArgv.includes('--max-old-space-size=256'));
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const p=json(join(out,'protocol.json')),result=json(join(out,'result.json')),started=performance.now(),cpuStart=process.cpuUsage();
const processes=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',
  "@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true,timeout:15000}));
assert(!(Array.isArray(processes)?processes:[processes]).some(x=>x.ProcessId!==process.pid&&
  /(?:\.codebase[\\/]scripts[\\/]|research[\\/]reports.*[\\/](?:run[^\\/]*|benchmark|audit[^\\/]*)\.mjs)/i.test(x.CommandLine??'')),'Another experiment is live');
verifyPauseLineage(out);
let peakRss=0,presentations=0,frames=0,lessons=0;
const MIN_FREE_BYTES=256*2**20;
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<=768*2**20);assert(presentations<=p.maxPresentations);}
async function waitForResources(){let began=0,free=os.freemem();while(free<MIN_FREE_BYTES){if(!began){began=Date.now();console.log(JSON.stringify({resourceWait:true,requiredFreeMiB:256,freeMiB:free/2**20}));}await new Promise(r=>setTimeout(r,1000));free=os.freemem();}if(began)console.log(JSON.stringify({resourceWait:false,waitedMs:Date.now()-began,freeMiB:free/2**20}));guard();}
async function pace(fn){await waitForResources();const before=process.cpuUsage(),v=fn(),cpu=process.cpuUsage(before);presentations++;await new Promise(r=>setTimeout(r,Math.max(1,(cpu.user+cpu.system)/1000)));await waitForResources();return v;}
async function hash(path){const h=createHash('sha256');for await(const b of createReadStream(path)){await waitForResources();h.update(b);guard();}return h.digest('hex');}
for(const [path,expected] of Object.entries(p.sources))assert.equal(await hash(join(out,'sources',path)),expected,path);
for(const [path,expected] of Object.entries(p.dependencies))assert.equal(await hash(path),expected,path);
assert.equal(await hash(join(out,'protocol.json')),result.identity.protocolHash);
assert.deepEqual(result.identity.sources,p.sources);assert.deepEqual(result.identity.dependencies,p.dependencies);assert.equal(result.identity.node,process.version);
const load=path=>import(pathToFileURL(resolve(out,'sources','.codebase/src',path)).href);
const {loadGraph,readNpz,validateGraph}=await load('runtime/graph.mjs'),{streamRows}=await load('runtime/storage.mjs');
const {SparseTrainer}=await load('supervised-baselines/trainer.mjs'),{RateTimingMemory}=await load('neural-learning/rate-timing-memory.mjs');
const {digest}=await load('neural-learning/mushroom-body.mjs'),{fixedStateHash}=await load('neural-learning/association-validation.mjs');
const {readConsequenceValue}=await load('neural-learning/consequence-value-readout.mjs');
const {createG0Table,verifyG0,createG0Encoder,planG0Schedule,G0FeedbackSession}=await load('neural-learning/curriculum-g0.mjs');
const {publishAtomicJson}=await load('puzzle-learning/plasticity-mechanism-assay.mjs');
const {planG0HistoryReplication}=await load('neural-learning/g0-reversal-history-replication.mjs');
const mapping=json(join(out,'sources',p.mappingPath)),table=createG0Table(),plan=planG0HistoryReplication(p.projectionSeeds[0]);
assert.equal(p.schema,'g0-reversal-history-replication-v1');assert.equal(digest(plan),p.planHash);assert.deepEqual(p.projectionSeeds,[plan.projectionSeed]);assert.deepEqual(p.gates,{minCorrectContexts:6,minControlAdvantageContexts:2,epsilon:1e-8});
if(!p.fixture){assert.equal(await hash(p.graphPath),mapping.inputs.graph);assert.equal(await hash(p.annotationPath),mapping.inputs.annotations);}
await waitForResources();const graph=p.fixture?validateGraph(Object.fromEntries(Object.entries(p.fixtureGraph).map(([k,v])=>[k,k==='initial'?Float32Array.from(v):k==='sign'?Int8Array.from(v):Int32Array.from(v)]))):loadGraph(p.graphPath);await waitForResources();
if(!p.fixture){const roots=readNpz(p.graphPath,['root_ids']).root_ids;
  for(const c of [...Object.values(p.readout.cells).flat(),...mapping.groups.flatMap(g=>g.dan)])assert.equal(roots[c.index].toString(),c.rootId);}
for(const g of mapping.groups)for(let i=0;i<g.edges.length;i++){
  const edge=g.edges[i],post=g.mbon[i].index;assert.equal(graph.col[edge],g.kc[i]);assert.equal(graph.sign[edge],1);
  assert(edge>=graph.row[post]&&edge<graph.row[post+1]);
}
const model=new SparseTrainer(graph,p.model);await pace(()=>model.forward([0]));
const memory=new RateTimingMemory(model,mapping,Float32Array.from(model.h[model.steps]),p.memory),initial=memory.snapshot(),fixed=fixedStateHash(model,memory.edges);
const rates=()=>Object.fromEntries(Object.entries(p.readout.cells).map(([type,cells])=>[type,cells.map(c=>model.h[model.steps][c.index])]));
async function assess(cue,encoder,baseline=null){
  const before=digest(memory.snapshot()),rows=[];
  for(const action of ['A','B']){
    const encoded=encoder.encode({cue,action});await pace(()=>model.forward([0],encoded.stimulation));
    const response=rates();rows.push({action,cueHash:digest(encoded),rates:response,
      ...readConsequenceValue(response,baseline?.rows.find(r=>r.action===action)?.rates??response,p.readout.scale)});
    rows.at(-1).score=rows.at(-1).value;
  }
  assert.equal(digest(memory.snapshot()),before);
  return {cue,encoderIdentity:encoder.identity,memoryHash:before,rows,choice:rows[0].score===rows[1].score?null:rows[0].score>rows[1].score?'A':'B'};
}

let sequence=0,chainHash=digest(result.identity),stageIndex=0,lessonIndex=0,session=null,stage=null;
const memories={},results=[];
const seed=plan.projectionSeed,encoder=createG0Encoder(mapping,{...p.encoder,seed});
const baseline=cue=>result.baselines[seed][cue.join('')];
for await(const r of streamRows(join(out,'receipts.jsonl'))){
  assert.equal(r.sequence,sequence++);assert.equal(r.previousChainHash,chainHash);chainHash=digest(r);
  if(r.kind==='baselines'){
    assert.equal(sequence,1);assert.deepEqual(r.memory,initial);assert.equal(r.fixed,fixed);
    assert.deepEqual(r.baselines,result.baselines);assert.deepEqual(r.replicaResponses,result.replicaResponses);
    for(const row of Object.values(r.baselines[seed]))assert.deepEqual(await assess(row.cue,encoder),row);
    assert.equal(digest(Object.values(r.baselines[seed]).map(a=>a.rows.map(row=>row.rates))),r.replicaResponses[seed]);
  }else if(r.kind==='stage-start'){
    assert.equal(session,null);stage=plan.stages[stageIndex];assert(stage);assert.equal(r.stageId,stage.id);
    assert.equal(r.condition,stage.condition.id);assert.equal(r.phase,stage.phase);assert.equal(r.branch,stage.branch);
    assert.equal(r.memoryStart,stage.memoryStart);
    const prior=memories['prefix:'+stage.condition.id];
    if(stage.phase!=='acquisition')assert(prior,'Missing complete prefix state');
    assert.equal(r.parentMemoryHash,digest(prior??initial));
    const entry=stage.memoryStart==='initial'||stage.phase==='acquisition'?initial:prior;
    assert.deepEqual(r.entryMemory,entry);memory.restore(entry);
    const beforeRows=[];
    if(stage.phase==='reversal')for(const cue of Array.from({length:8},(_,i)=>[0,...[2,1,0].map(bit=>(i>>bit)&1)]))
      beforeRows.push(await assess(cue,encoder,baseline(cue)));
    assert.deepEqual(r.beforeRows,beforeRows);
    session=new G0FeedbackSession({model,memory,mapping,table,encoder,timing:p.timing,
      identity:digest({identity:result.identity,stage:stage.id,memory:memory.identity,encoder:encoder.identity,readout:p.readout})});
    lessonIndex=0;
  }else if(r.kind==='lesson-start'){
    assert(session&&!session.pending);assert.equal(r.stageId,stage.id);assert.equal(r.lesson,lessonIndex);
    const slot=stage.slots[lessonIndex];assert(slot);assert.deepEqual(r.experience,slot.experience);assert.deepEqual(r.options,slot.options);
    assert(verifyG0(table,r.experience).learningAllowed);
    const assessment=await assess(r.experience.publicInput.cue,encoder,baseline(r.experience.publicInput.cue));
    assert.deepEqual(r.binding.assessment,assessment);session.start(r.experience,assessment,r.options);
    assert.deepEqual(r.plan,session.pending.plan);assert.deepEqual(r.binding,session.pending.binding);
  }else if(r.kind==='frame'){
    assert(session?.pending);assert.equal(r.stageId,stage.id);assert.equal(r.lesson,lessonIndex);
    assert.deepEqual(await pace(()=>session.step()),r.frame);
    assert.equal(digest(model.h.slice(1).map(h=>memory.kc.map((index,i)=>[h[index],h[memory.dan[i]]]))),r.localHash);frames++;
  }else if(r.kind==='lesson'){
    assert(session?.pending);assert.equal(r.stageId,stage.id);assert.equal(r.lesson,lessonIndex);
    assert.deepEqual(session.finish(),r.receipt);lessonIndex++;lessons++;
    pauseAudit(out,join(out,'protocol.json'),lessons);
  }else if(r.kind==='stage-end'){
    assert(session&&!session.pending);assert.equal(lessonIndex,stage.slots.length);
    const rr=r.result;assert.equal(rr.stageId,stage.id);assert.equal(rr.phase,stage.phase);
    assert.equal(rr.branch,stage.branch);assert.equal(rr.condition,stage.condition.id);
    assert.deepEqual(memory.snapshot(),r.memory);assert.equal(fixedStateHash(model,memory.edges),fixed);
    assert.equal(rr.fixedAfter,fixed);assert.equal(rr.contextRows.length,8);
    let correct=0,total=0;
    for(let i=0;i<8;i++){
      const row=rr.contextRows[i],cue=[0,...[2,1,0].map(bit=>(i>>bit)&1)];assert.deepEqual(row.cue,cue);
      const expected=table.rows.find(x=>x.phase===(stage.phase==='reversal'?'reversal':'acquisition')&&digest(x.cue)===digest(cue)&&x.status==='success').action;
      const assessment=await assess(cue,encoder,baseline(cue));assert.deepEqual(row.assessment,assessment);
      assert.equal(row.expected,expected);assert.equal(row.choice,assessment.choice);assert.equal(row.correct,row.choice===expected);
      const margin=(assessment.rows[0].score-assessment.rows[1].score)*(expected==='A'?1:-1);
      assert(row.margin===margin);correct+=Number(row.correct);total+=margin;
    }
    assert.equal(rr.correct,correct);assert.equal(rr.meanMargin,total/8);
    memory.restore(initial);for(const row of rr.contextRows)assert((await assess(row.cue,encoder,baseline(row.cue))).rows.every(x=>x.value===0));
    memory.restore(r.memory);for(const row of rr.contextRows)assert.deepEqual(await assess(row.cue,encoder,baseline(row.cue)),row.assessment);
    if(stage.condition.kind==='disabled')assert.deepEqual(r.memory,initial);
    assert.equal(rr.causalResetRestore,true);memories[stage.branch+':'+stage.condition.id]=memory.snapshot();
    results.push(rr);assert.deepEqual(result.stageResults[stageIndex],rr);stageIndex++;session=null;stage=null;
  }else throw Error('Unexpected diagnostic receipt kind '+r.kind);
  if(sequence%500===0)console.log(JSON.stringify({auditProgress:true,receipts:sequence,totalReceipts:result.receiptCount,frames,lessons}));
}
assert.equal(session,null);assert.equal(stageIndex,24);assert.equal(lessons,672);assert.equal(frames,12768);
assert.equal(sequence,14161);assert.equal(sequence,result.receiptCount);assert.equal(chainHash,result.chainHash);
assert.deepEqual(memories,result.memories);assert.deepEqual(results,result.stageResults);
const branchResults=['retained','reset'].map(branch=>{
  const rows=results.filter(r=>r.branch===branch),info=rows.find(r=>r.condition==='informative'),controls=rows.filter(r=>r.condition!=='informative');
  assert.equal(rows.length,6);
  const gates={minCorrect:info.correct>=6,contextAdvantage:controls.every(c=>info.correct>=c.correct+2),
    marginAdvantage:info.meanMargin>1e-8&&controls.every(c=>info.meanMargin>c.meanMargin+1e-8),
    stateAndWiring:rows.every(r=>r.causalResetRestore&&r.fixedAfter===fixed)};
  return {branch,gates,passed:Object.values(gates).every(Boolean)};
});
assert.deepEqual(branchResults,result.branchResults);assert.equal(result.G0Passed,false);assert.equal(result.diagnosticComplete,true);
assert.equal(presentations,15481);await waitForResources();
const audit={passed:true,fullNeuralReplay:true,stageCount:stageIndex,frames,lessons,receipts:sequence,presentations,
  branchResults,G0Passed:false,auditorSha256:await hash(resolve(process.argv[1])),peakRssMiB:peakRss/2**20,
  elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),
  scope:'Archived computational branch/reset, certificate, ranking and recurrence replay; shared dynamics, not biological validation or G0 advancement.'};
publishAtomicJson(join(out,'audit.json'),audit);console.log(JSON.stringify(audit));
