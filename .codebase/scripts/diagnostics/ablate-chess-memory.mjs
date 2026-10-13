import {readFileSync,mkdirSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import os from 'node:os';
import {loadGraph,readNpz} from '../../src/runtime/graph.mjs';
import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';
import {ReversalMemory} from '../../src/neural-learning/reversal-memory.mjs';
import {readGF} from '../../src/neural-learning/gf-readout.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {fixedStateHash} from '../../src/neural-learning/association-validation.mjs';
import {sha256,graphHash} from '../runtime/fetch-graph.mjs';

const {values:args}=parseArgs({options:{out:{type:'string'},resume:{type:'string'},'cpu-duty':{type:'string',default:'0.5'},'max-jobs':{type:'string',default:'60'}}});
const duty=Number(args['cpu-duty']),limit=Number(args['max-jobs']);
if(!args.out||existsSync(args.out)||!(duty>=0.1&&duty<=1)||!Number.isSafeInteger(limit)||limit<1||limit>60)throw Error('Require new output and bounded options');
const started=performance.now(),cpuStart=process.cpuUsage();
function guard(){if(process.memoryUsage().rss>768*2**20||os.freemem()<256*2**20)throw Error('Soft memory guard; resume last completed intervention');}
async function pace(t){let remaining=(performance.now()-t)*(1/duty-1);do{const n=Math.min(250,Math.max(0,remaining));await new Promise(r=>setTimeout(r,n));remaining-=n;guard();}while(remaining>0);}
guard();
const protocolPath='research/data/chess-memory-ablation-v1/protocol.json',protocol=JSON.parse(readFileSync(protocolPath));
const reportPath=join(protocol.sourceRun,'report.json'),original=JSON.parse(readFileSync(reportPath)),auditPath=join(protocol.sourceRun,'audit.json');
assert.equal(original.complete,true);assert.equal(original.summary.allGatesPassed,false);assert.equal(JSON.parse(readFileSync(auditPath)).allChecksPassed,true);
const mappingPath='research/reports/reversal-candidate-2026-10-05/mapping.json',mapping=JSON.parse(readFileSync(mappingPath)).mapping;
const inputs={},sources={};
for(const path of [protocolPath,reportPath,auditPath,mappingPath])inputs[path]=await sha256(path);
for(const[path,hash]of Object.entries(original.identity.inputs))assert.equal(await sha256(path),hash,`Original input changed: ${path}`);
for(const[path,hash]of Object.entries(original.identity.sources))assert.equal(await sha256(path),hash,`Original source changed: ${path}`);
for(const path of ['.codebase/scripts/diagnostics/ablate-chess-memory.mjs','.codebase/src/runtime/graph.mjs','.codebase/src/supervised-baselines/trainer.mjs',
  '.codebase/src/neural-learning/reversal-memory.mjs','.codebase/src/neural-learning/gf-readout.mjs','.codebase/src/neural-learning/mushroom-body.mjs','.codebase/src/neural-learning/association-validation.mjs'])sources[path]=await sha256(path);
assert.equal(await sha256('.cache/full.npz'),graphHash);
const setup=performance.now(),graph=loadGraph('.cache/full.npz'),ids=readNpz('.cache/full.npz',['root_ids']).root_ids;
const model=new SparseTrainer(graph,original.identity.model),memory=new ReversalMemory(model,mapping,original.protocol),naive=memory.snapshot();
assert.equal(fixedStateHash(model,memory.edges),original.identity.invariant);
for(const c of original.identity.gf)assert.equal(ids[c.index].toString(),c.rootId);
await pace(setup);
const jobs=original.results.flatMap((r,index)=>r.job.condition!=='informative'?[]:protocol.phases.flatMap(phase=>protocol.interventions.map(intervention=>({index,seed:r.job.seed,phase,intervention}))));
const identity={schema:protocol.schema,inputs,sources,originalIdentity:original.identity,model:model.config,memory:memory.config,jobs,duty};
let state={identity,nextJob:0,results:[]};
if(args.resume){const prior=JSON.parse(readFileSync(args.resume));assert.equal(digest(prior.identity),digest(identity));assert.equal(prior.results.length,prior.nextJob);assert.ok(prior.nextJob>=0&&prior.nextJob<=jobs.length);state=prior;}
mkdirSync(dirname(args.out),{recursive:true});mkdirSync(args.out);
function save(name){const tmp=join(args.out,name+'.partial');mkdirSync(tmp);writeFileSync(join(tmp,'state.json'),JSON.stringify(state));renameSync(tmp,join(args.out,name));}
save('initial');let evaluations=0,completed=0,stop=false;process.on('SIGINT',()=>{stop=true;});
function response(){const h=model.h[model.steps],means=Object.fromEntries(Object.entries(original.identity.readouts).map(([type,cells])=>[type,cells.reduce((s,c)=>s+h[c.index],0)/cells.length]));
  return {...means,MBONscore:means.MBON12-means.MBON01,...readGF(original.identity.gf.map(c=>h[c.index]),original.identity.calibration)};}
const categories=r=>{const A=new Set(r.cues.A.map(s=>s.index)),B=new Set(r.cues.B.map(s=>s.index));return mapping.groups.flatMap(g=>g.kc.map(i=>A.has(i)&&B.has(i)?'shared':A.has(i)||B.has(i)?'unique':'neither'));};
while(state.nextJob<jobs.length&&completed<limit&&!stop){
  guard();const job=jobs[state.nextJob],r=original.results[job.index];
  const checkpoint=job.phase==='acquisition'?join(protocol.sourceRun,`checkpoint-${String(6+18*job.index).padStart(5,'0')}`,'state.json'):null;
  const prior=checkpoint?JSON.parse(readFileSync(checkpoint)):null;
  if(prior){assert.deepEqual(prior.active.job,r.job);assert.equal(prior.active.nextTrial,original.protocol.acquisitionTrials);assert.deepEqual(prior.identity,original.identity);}
  const saved=prior?prior.active.memory:r.memory,classes=categories(r),keep=job.intervention.endsWith('-only')?job.intervention.slice(0,-5):null;
  const modified=job.intervention==='naive'?naive:{...saved,gains:saved.gains.map((v,i)=>job.intervention==='all'||classes[i]===keep?v:1)};
  memory.restore(modified);const memoryHash=digest(memory.snapshot()),responses={};
  for(const cue of ['A','B']){const t=performance.now();model.forward([0],r.cues[cue]);evaluations++;responses[cue]=response();await pace(t);}
  assert.equal(digest(memory.snapshot()),memoryHash,'Probe changed persistent memory');assert.equal(fixedStateHash(model,memory.edges),original.identity.invariant);
  const choice=responses.A.score<=responses.B.score?'A':'B';
  if(job.intervention==='all'||job.intervention==='naive'){
    const expected=r.probes[job.intervention==='all'?job.phase:'baseline'];for(const cue of ['A','B'])assert.deepEqual(responses[cue],expected[cue]);assert.equal(choice,expected.choice);
  }
  const safe=(job.phase==='acquisition'?r.job.initialPunished:r.job.reversedPunished)==='A'?'B':'A',other=safe==='A'?'B':'A';
  const categoryCounts=Object.fromEntries(['shared','unique','neither'].map(c=>[c,classes.filter(v=>v===c).length]));
  state.results.push({job,safe,responses,choice,correct:choice===safe,margin:responses[other].score-responses[safe].score,
    signedChoice:responses.A.signedScore<=responses.B.signedScore?'A':'B',
    memory:{version:modified.version,identity:modified.identity,events:modified.events,gains:modified.gains,hash:memoryHash},categoryCounts,
    sourceCheckpoint:checkpoint,sourceCheckpointSha256:checkpoint?await sha256(checkpoint):null,fixedStatePreserved:true});
  state.nextJob++;completed++;save(`intervention-${String(state.nextJob).padStart(3,'0')}`);console.log(JSON.stringify({completed:state.nextJob,...job,choice,correct:choice===safe}));
}
const summary=Object.fromEntries(protocol.phases.map(phase=>[phase,Object.fromEntries(protocol.interventions.map(intervention=>{
  const rows=state.results.filter(r=>r.job.phase===phase&&r.job.intervention===intervention);return[intervention,{jobs:rows.length,correct:rows.filter(r=>r.correct).length,
    changedFromAll:rows.filter(r=>r.choice!==original.results[r.job.index].probes[phase].choice).length}];}))]));
const cpu=process.cpuUsage(cpuStart),report={complete:state.nextJob===jobs.length,identity,protocol,results:state.results,summary,evaluationsThisInvocation:evaluations,
  originalGates:original.summary.gates,originalAllGatesPassed:original.summary.allGatesPassed,
  command:{argv:process.argv,execArgv:process.execArgv,node:process.version},resources:{peakRssMiB:process.resourceUsage().maxRSS/1024,elapsedSeconds:(performance.now()-started)/1000,cpuSeconds:(cpu.user+cpu.system)/1e6,cpuDuty:duty},
  scope:'Causal replay of artificial memory-subset interventions, not learning, biological forgetting, new acceptance or chess consequences.'};
writeFileSync(join(args.out,'report.json.partial'),JSON.stringify(report,null,2));renameSync(join(args.out,'report.json.partial'),join(args.out,'report.json'));
console.log(JSON.stringify({complete:report.complete,summary,resources:report.resources}));
