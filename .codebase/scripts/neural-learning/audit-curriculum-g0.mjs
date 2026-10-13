// Separate full recurrence/evidence replay from archived bytes. Shared biology is not independently validated.
import assert from 'node:assert/strict';
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
let peakRss=0,presentations=0,frames=0,lessons=0;
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<=768*2**20&&os.freemem()>=256*2**20);assert(presentations<=p.maxPresentations);}
async function pace(fn){guard();const before=process.cpuUsage(),v=fn(),cpu=process.cpuUsage(before);presentations++;await new Promise(r=>setTimeout(r,Math.max(1,(cpu.user+cpu.system)/1000)));guard();return v;}
async function hash(path){const h=createHash('sha256');for await(const b of createReadStream(path)){h.update(b);guard();}return h.digest('hex');}
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
const mapping=json(join(out,'sources',p.mappingPath)),table=createG0Table(),schedule=planG0Schedule(table,{shuffleSeed:p.shuffleSeed});
assert.equal(digest(schedule),p.scheduleHash);
if(!p.fixture){assert.equal(await hash(p.graphPath),mapping.inputs.graph);assert.equal(await hash(p.annotationPath),mapping.inputs.annotations);}
guard();const graph=p.fixture?validateGraph(Object.fromEntries(Object.entries(p.fixtureGraph).map(([k,v])=>[k,k==='initial'?Float32Array.from(v):k==='sign'?Int8Array.from(v):Int32Array.from(v)]))):loadGraph(p.graphPath);guard();
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
let sequence=0,chainHash=digest(result.identity),session=null,currentKey=null,currentLesson=null,completedPhases=0;
const armMemories={},phaseRows={};
const lessonCounts={};let matchedArms=0;
for await(const r of streamRows(join(out,'receipts.jsonl'))){
  assert.equal(r.sequence,sequence++);assert.equal(r.previousChainHash,chainHash);chainHash=digest(r);
  if(r.kind==='baselines'){
    assert.equal(sequence,1);assert.deepEqual(r.memory,initial);assert.equal(r.fixed,fixed);assert.deepEqual(r.baselines,result.baselines);
    const responseHashes=[];
    for(const seed of p.projectionSeeds){
      const encoder=createG0Encoder(mapping,{...p.encoder,seed});
      for(const baseline of Object.values(r.baselines[seed]))assert.deepEqual(await assess(baseline.cue,encoder),baseline);
      const h=digest(Object.values(r.baselines[seed]).map(a=>a.rows.map(row=>row.rates)));
      assert.equal(r.replicaResponses[seed],h);responseHashes.push(h);
    }
    assert.equal(new Set(responseHashes).size,p.projectionSeeds.length);assert.deepEqual(r.replicaResponses,result.replicaResponses);
  }else if(r.kind==='lesson-start'){
    const armPhase=`${r.seed}:${r.condition}:${r.phase}`;
    assert.equal(r.lesson,lessonCounts[armPhase]??0,'Missing, reordered or duplicated lesson');
    assert.equal(r.seed,p.projectionSeeds[Math.floor(completedPhases/p.phases.length)]);
    assert.equal(r.phase,p.phases[completedPhases%p.phases.length]);
    assert.equal(r.condition,p.conditions[matchedArms%p.conditions.length]);
    const key=`${r.seed}:${r.condition}`;
    if(key!==currentKey){
      assert(!session?.pending);memory.restore(armMemories[key]??initial);currentKey=key;
      const encoder=createG0Encoder(mapping,{...p.encoder,seed:r.seed});
      session=new G0FeedbackSession({model,memory,mapping,table,encoder,timing:p.timing,
        identity:digest({identity:result.identity,seed:r.seed,condition:r.condition,memory:memory.identity,encoder:encoder.identity,readout:p.readout})});
    }
    const slot=schedule.filter(s=>s.experience.phase===r.phase)[r.lesson];assert.deepEqual(r.experience,slot.experience);
    const options=r.condition==='shuffled'?{condition:r.condition,shuffledStatus:slot.shuffledStatus}:{condition:r.condition};assert.deepEqual(r.options,options);
    assert(verifyG0(table,r.experience).learningAllowed);
    assert.deepEqual(await assess(r.experience.publicInput.cue,session.encoder,result.baselines[r.seed][r.experience.publicInput.cue.join('')]),r.binding.assessment);
    session.start(r.experience,r.binding.assessment,r.options);assert.deepEqual(session.pending.plan,r.plan);assert.deepEqual(session.pending.binding,r.binding);
    currentLesson={seed:r.seed,phase:r.phase,condition:r.condition,lesson:r.lesson};
  }else if(r.kind==='frame'){
    for(const key of ['seed','phase','condition','lesson'])assert.equal(r[key],currentLesson[key]);
    assert.deepEqual(await pace(()=>session.step()),r.frame);
    assert.equal(digest(model.h.slice(1).map(h=>memory.kc.map((index,i)=>[h[index],h[memory.dan[i]]]))),r.localHash);frames++;
  }else if(r.kind==='lesson'){
    for(const key of ['seed','phase','condition','lesson'])assert.equal(r[key],currentLesson[key]);
    assert.deepEqual(session.finish(),r.receipt);lessons++;
    const armPhase=`${r.seed}:${r.condition}:${r.phase}`;lessonCounts[armPhase]=(lessonCounts[armPhase]??0)+1;
  }else if(r.kind==='arm-phase'){
    assert.equal(lessonCounts[`${r.seed}:${r.condition}:${r.phase}`],schedule.filter(s=>s.experience.phase===r.phase).length,'Incomplete matched-arm exposure');matchedArms++;
    assert.equal(currentKey,`${r.seed}:${r.condition}`);assert(!session.pending);assert.deepEqual(memory.snapshot(),r.memory);
    assert.equal(fixedStateHash(model,memory.edges),fixed);assert.equal(r.result.fixedAfter,fixed);
    assert.equal(r.result.contextRows.length,8);
    const target=r.phase==='reversal'?'reversal':'acquisition';let count=0,total=0;
    for(const row of r.result.contextRows){
      const expected=table.rows.find(x=>x.phase===target&&digest(x.cue)===digest(row.cue)&&x.status==='success').action;
      const assessment=await assess(row.cue,session.encoder,result.baselines[r.seed][row.cue.join('')]);assert.deepEqual(assessment,row.assessment);
      assert.equal(row.expected,expected);assert.equal(row.choice,assessment.choice);assert.equal(row.correct,row.choice===expected);
      const margin=(assessment.rows[0].score-assessment.rows[1].score)*(expected==='A'?1:-1);assert(row.margin===margin,'Exact numerical margin mismatch');
      count+=Number(row.correct);total+=margin;
    }
    assert.equal(r.result.correct,count);assert.equal(r.result.meanMargin,total/8);
    memory.restore(initial);for(const row of r.result.contextRows)assert((await assess(row.cue,session.encoder,result.baselines[r.seed][row.cue.join('')])).rows.every(x=>x.value===0));
    memory.restore(r.memory);for(const row of r.result.contextRows)assert.deepEqual(await assess(row.cue,session.encoder,result.baselines[r.seed][row.cue.join('')]),row.assessment);
    if(r.condition==='disabled')assert.deepEqual(r.memory,initial);
    assert.equal(r.result.causalResetRestore,true);armMemories[currentKey]=r.memory;
    assert.deepEqual(result.arms[currentKey].phases[r.phase],r.result);phaseRows[`${currentKey}:${r.phase}`]=r.result;
  }else if(r.kind==='phase'){
    const expected=result.phaseResults[completedPhases++];assert.deepEqual(r.result,expected);
    const {seed,phase}=expected,info=phaseRows[`${seed}:informative:${phase}`],controls=p.conditions.slice(1).map(c=>phaseRows[`${seed}:${c}:${phase}`]);
    const gates={acquisitionOrRetentionOrReversal:info.correct>=p.gates.minCorrectContexts,
      informativeContextAdvantage:controls.every(c=>info.correct>=c.correct+p.gates.minControlAdvantageContexts),
      directionAndSpecificity:info.meanMargin>p.gates.epsilon&&controls.every(c=>info.meanMargin>c.meanMargin+p.gates.epsilon),causalStateAndFixedWiring:true};
    assert.deepEqual(gates,expected.gates);assert.equal(expected.informativeCorrect,info.correct);
    assert.equal(expected.passed,Object.values(gates).every(Boolean));
  }else throw Error(`Unexpected receipt kind ${r.kind}`);
  if(sequence%500===0){
    const cpu=process.cpuUsage(cpuStart);
    console.log(JSON.stringify({auditProgress:true,receipts:sequence,totalReceipts:result.receiptCount,
      frames,lessons,presentations,elapsedSeconds:(performance.now()-started)/1000,
      cpuSeconds:(cpu.user+cpu.system)/1e6,peakRssMiB:peakRss/2**20}));
  }
}
assert.equal(sequence,result.receiptCount);assert.equal(chainHash,result.chainHash);assert.equal(completedPhases,result.phaseResults.length);
assert.equal(matchedArms,completedPhases*p.conditions.length);
assert.equal(lessons,result.phaseResults.reduce((n,r)=>n+schedule.filter(s=>s.experience.phase===r.phase).length*p.conditions.length,0));
assert.equal(frames,lessons*(p.timing.cueFrame+p.timing.tailFrames+1));
assert.equal(result.G0Passed,completedPhases===p.projectionSeeds.length*p.phases.length&&result.phaseResults.every(r=>r.passed));
assert.equal(result.stoppedAtRequiredGate,!result.phaseResults.at(-1).passed);
guard();const audit={passed:true,fullNeuralReplay:true,frames,lessons,receipts:sequence,G0Passed:result.G0Passed,
  phaseResults:result.phaseResults,presentations,peakRssMiB:peakRss/2**20,elapsedSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpuStart),
  scope:'Archived-source certificate, unaided ranking, complete local-neural recurrence and reset/restoration replay. Shared dynamics/integrator; not independent biological validation or chess transfer.'};
publishAtomicJson(join(out,'audit.json'),audit);console.log(JSON.stringify(audit));
