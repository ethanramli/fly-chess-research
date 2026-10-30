// Frozen full-graph integration screen, NOT a passed learning prerequisite.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, readdirSync, cpSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { DelayedReversalMemory } from '../../src/neural-learning/delayed-reversal-memory.mjs';
import { DelayedLessonBrain } from '../../src/puzzle-learning/delayed-lesson-brain.mjs';
import { createPublicLessonFrameEncoder } from '../../src/chess-input/public-lesson-frame-cue.mjs';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';

const invocationStarted=performance.now(),cpuStarted=process.cpuUsage();
const {values:args}=parseArgs({options:{freeze:{type:'boolean'},out:{type:'string'},resume:{type:'string'},
  'cpu-duty':{type:'string',default:'0.5'},'stop-after-pending':{type:'boolean'}}});
const protocolPath='research/data/delayed-lesson-integration-v1/protocol.json';
const fileHash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const runner='.codebase/scripts/puzzle-learning/run-delayed-lesson-integration.mjs';
const oldPath='research/data/correction-preservation-v2/protocol.json';
if(args.freeze){
  assert.ok(!existsSync(protocolPath),'Protocol already frozen');
  const old=JSON.parse(readFileSync(oldPath));
  const paths=[runner,oldPath,'package.json','package-lock.json',old.mappingPath,
    ...readdirSync('.codebase/src',{recursive:true}).filter(p=>p.endsWith('.mjs')).map(p=>join('.codebase/src',p))];
  const protocol={schema:'delayed-lesson-integration-v1',scope:'Full-graph receiver/receipt integration only; association/coexistence/reversal and chess transfer remain unpassed',
    question:'Does the certified continuous lesson produce a finite measured local update on the released sparse graph and exact pending-receipt resume without changing fixed wiring?',
    graphPath:old.graphPath,graphSha256:old.graphSha256,annotationPath:old.annotationPath,annotationSha256:old.annotationSha256,
    mappingPath:old.mappingPath,model:old.model,readouts:old.readouts,memory:{...old.memory,tau:4},task:old.task,
    conditions:['informative','no-channel','shuffled','disabled'],permutation:[0,2,1,3],
    contexts:['6k1/8/8/8/p6r/1P6/8/RK6 w - - 0 1','6k1/8/8/8/pP5r/8/8/RK6 w - - 0 1'],
    schedule:[0,1,0,1],move:'a1a4',maxPresentations:512,maxLegalMoves:256,
    runtime:{node:process.version,heapMiB:256,cpuDuty:0.5,maxRss:768*2**20,minFree:256*2**20},
    sources:Object.fromEntries(paths.map(path=>[path,fileHash(path)])),
    gates:{integration:'finite local updates and fixed wiring; NOT useful learning',learning:'unmet; no acceptance reinterpretation'},
    limitations:['one seed','historically inspected training contexts','no biological retention or calibrated prediction','no final families','outcome channel, not prediction error']};
  const archive='research/source-archives/delayed-lesson-integration-v1';mkdirSync(archive,{recursive:true});
  for(const path of paths){const dest=join(archive,path);mkdirSync(dirname(dest),{recursive:true});cpSync(path,dest,{errorOnExist:true});}
  mkdirSync(dirname(protocolPath),{recursive:true});writeFileSync(protocolPath,JSON.stringify(protocol,null,2),{flag:'wx'});
  cpSync(protocolPath,join(archive,'protocol.json'));console.log(JSON.stringify({frozen:true,protocolSha256:fileHash(protocolPath)}));process.exit(0);
}
const p=JSON.parse(readFileSync(protocolPath));
assert.equal(process.version,p.runtime.node);assert.ok(process.execArgv.includes('--max-old-space-size=256'));
assert.equal(Number(args['cpu-duty']),0.5);assert.ok(args.out&&!existsSync(args.out));
for(const [path,hash]of Object.entries(p.sources))assert.equal(fileHash(path),hash,`Pinned source differs: ${path}`);
assert.equal(fileHash(p.graphPath),p.graphSha256);assert.equal(fileHash(p.annotationPath),p.annotationSha256);
const mapping=JSON.parse(readFileSync(p.mappingPath)).mapping;
let peakRss=0;
const guard=()=>{peakRss=Math.max(peakRss,process.memoryUsage().rss);if(peakRss>p.runtime.maxRss||os.freemem()<p.runtime.minFree)throw Error('Resource guard');};
const pace=async ms=>{let remaining=ms;while(remaining>0){const dt=Math.min(250,remaining);await new Promise(r=>setTimeout(r,dt));remaining-=dt;guard();}};
guard();const ids=readNpz(p.graphPath,['root_ids']).root_ids;
for(const c of [...Object.values(p.readouts).flat(),...mapping.groups.flatMap(g=>g.dan)])assert.equal(ids[c.index].toString(),c.rootId);
const graph=loadGraph(p.graphPath);guard();const model=new SparseTrainer(graph,p.model);guard();
const memory=new DelayedReversalMemory(model,mapping,p.memory),initial=memory.snapshot(),fixed=fixedStateHash(model,memory.edges);
const frameEncoder=createPublicLessonFrameEncoder(mapping);
const restStarted=performance.now();model.forward([0]);const rest=Float32Array.from(model.h[model.steps]);await pace(performance.now()-restStarted);
const identity={protocolSha256:fileHash(protocolPath),memoryIdentity:memory.identity,encoderIdentity:frameEncoder.identity,fixed};
const brain=new DelayedLessonBrain({model,memory,mapping,rest,frameEncoder,episodeIdentity:digest(identity),readouts:p.readouts,
  maxPresentations:p.maxPresentations,maxLegalMoves:p.maxLegalMoves,guard,pace});
const proofs=p.contexts.map(fen=>certifyCaptureRetention(new Chess(fen),p.move));
const channels=p.schedule.map(i=>proofs[i].status==='success'?'PAM02':'PPL103'),shuffled=p.permutation.map(i=>channels[i]);
assert.deepEqual([...channels].sort(),[...shuffled].sort());assert.notDeepEqual(channels,shuffled);
const out=resolve(args.out);mkdirSync(out,{recursive:true});
let state={arm:0,event:0,memory:initial,presentations:0,pending:null,receipts:[]};let sequence=0;
const atomic=(path,value)=>{const body=JSON.stringify(value,null,2)+'\n';if(existsSync(path)){assert.equal(readFileSync(path,'utf8'),body);return;}
  writeFileSync(path+'.partial',body,{flag:'wx'});renameSync(path+'.partial',path);};
const checkpoint=()=>{guard();const name=`checkpoint-${String(++sequence).padStart(5,'0')}`,partial=join(out,name+'.partial');mkdirSync(partial);
  atomic(join(partial,'state.json'),{identity,sequence,state});atomic(join(partial,'manifest.json'),{sha256:fileHash(join(partial,'state.json'))});renameSync(partial,join(out,name));};
if(args.resume){
  const path=resolve(args.resume);assert.match(dirname(path).split(/[\\/]/).at(-1),/^checkpoint-\d+$/);
  const origin=dirname(dirname(path)),names=readdirSync(origin).filter(n=>/^checkpoint-\d+$/.test(n)).sort();
  assert.equal(dirname(path).split(/[\\/]/).at(-1),names.at(-1));
  assert.equal(fileHash(path),JSON.parse(readFileSync(join(dirname(path),'manifest.json'))).sha256);
  const saved=JSON.parse(readFileSync(path));assert.deepEqual(saved.identity,identity);state=saved.state;sequence=saved.sequence;
  for(const ref of state.receipts){assert.equal(fileHash(join(origin,ref.path)),ref.sha256);cpSync(join(origin,ref.path),join(out,ref.path));}
  memory.restore(state.memory);brain.presentations=state.presentations;
}
checkpoint();
const acknowledge=()=>{const pending=state.pending;assert.ok(pending);atomic(join(out,pending.path),pending.receipt);
  const ref={path:pending.path,sha256:fileHash(join(out,pending.path))};state.receipts.push(ref);state.pending=null;state.event++;checkpoint();};
if(state.pending)acknowledge();
while(state.arm<p.conditions.length){
  while(state.event<p.schedule.length){
    const i=p.schedule[state.event],condition=p.conditions[state.arm],board=new Chess(p.contexts[i]);
    const receipt=await brain.teach(board,p.move,p.task,proofs[i],{condition,shuffledChannel:condition==='shuffled'?shuffled[state.event]:null});
    assert.equal(fixedStateHash(model,memory.edges),fixed);assert.ok(receipt.after.gains.every(Number.isFinite));
    state.memory=memory.snapshot();state.presentations=brain.presentations;
    state.pending={path:`receipt-${state.arm}-${state.event}.json`,receipt};checkpoint();
    if(args['stop-after-pending']){console.log(JSON.stringify({stoppedAfterPending:true,sequence,out}));process.exit(0);}
    acknowledge();
  }
  state.arm++;state.event=0;memory.restore(initial);brain.presentations=0;state.memory=memory.snapshot();state.presentations=0;checkpoint();
}
const result={identity,scope:p.scope,receipts:state.receipts,peakRssMiB:peakRss/2**20,
  invocationElapsedSeconds:(performance.now()-invocationStarted)/1000,invocationCpu:process.cpuUsage(cpuStarted),
  resumed:Boolean(args.resume),timingScope:args.resume?'resume segment only':'whole invocation',
  next:'independent receipt replay and prerequisite association/coexistence/reversal; no learning promotion'};
atomic(join(out,'result.json'),result);console.log(JSON.stringify(result));
