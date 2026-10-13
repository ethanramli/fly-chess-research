// Read-only graph diagnostic. No learning memory, feedback pulse or updates.
import {readFileSync,writeFileSync,createReadStream,mkdirSync,copyFileSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import os from 'node:os';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {loadGraph} from '../../../.codebase/src/runtime/graph.mjs';
import {SparseTrainer} from '../../../.codebase/src/supervised-baselines/trainer.mjs';
import {fixedStateHash} from '../../../.codebase/src/neural-learning/association-validation.mjs';
import {mappedActivityTrace} from '../../../.codebase/src/neural-learning/mapped-activity-trace.mjs';
import {createConjoinedPublicMateFrameEncoder} from '../../../.codebase/src/chess-input/conjoined-public-mate-frame-cue.mjs';
import {publishAtomicJson} from '../../../.codebase/src/puzzle-learning/plasticity-mechanism-assay.mjs';
const {values:a}=parseArgs({options:{out:{type:'string'},resume:{type:'string'},'cpu-duty':{type:'string'}}});
assert(a.out&&Number(a['cpu-duty'])===0.5&&process.execArgv.includes('--max-old-space-size=256'));
const start=performance.now(),cpuStart=process.cpuUsage();let peakRss=0;
function guard(){peakRss=Math.max(peakRss,process.memoryUsage().rss);assert(peakRss<768*2**20&&os.freemem()>256*2**20,'Resource guard');}
const pace=async ms=>{await new Promise(r=>setTimeout(r,ms));guard();};
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const protocolPath='research/data/mate-conjoined-input-v1/protocol.json',p=json(protocolPath);
const candidatePath='research/reports/plasticity-timing-candidate-2026-10-09/rate-timing-map.json',candidate=json(candidatePath);
const old=json(p.mappingPath).mapping;
const sources=[protocolPath,p.mappingPath,candidatePath,'package.json','package-lock.json',
  'research/reports/plasticity-timing-candidate-2026-10-09/measure-neural-overlap.mjs',
  ...['runtime/graph','supervised-baselines/trainer','neural-learning/association-validation',
    'neural-learning/mushroom-body','neural-learning/mapped-activity-trace',
    'chess-input/conjoined-public-mate-frame-cue','chess-input/public-lesson-frame-cue',
    'puzzle-learning/plasticity-mechanism-assay'].map(s=>`.codebase/src/${s}.mjs`)];
const hashes={};for(const path of [...sources,p.graphPath,p.annotationPath]){
  const hash=createHash('sha256');for await(const b of createReadStream(path))hash.update(b);hashes[path]=hash.digest('hex');
}
assert.equal(hashes[p.graphPath],candidate.inputs.graph);assert.equal(hashes[p.annotationPath],candidate.inputs.annotations);
assert.equal(hashes[p.mappingPath],candidate.inputs.mapping);
guard();const graph=loadGraph(p.graphPath);guard();const model=new SparseTrainer(graph,p.model);guard();
const fixed=fixedStateHash(model,[]);
let tick=performance.now();model.forward([0]);const rest=Float32Array.from(model.h[model.steps]);await pace(performance.now()-tick);
const encoders={existing:createConjoinedPublicMateFrameEncoder(old,p.encoderConfig),gamma2:createConjoinedPublicMateFrameEncoder(candidate,p.encoderConfig)};
const board=new Chess(p.fen),moves=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
const jobs=Object.keys(encoders).flatMap(variant=>moves.map(action=>({variant,action})));
const identity={hashes,model:p.model,encoderIdentities:Object.fromEntries(Object.entries(encoders).map(([k,e])=>[k,e.identity])),fixed,
  node:process.version,cpuDuty:0.5,jobCount:jobs.length};
mkdirSync(a.out,{recursive:false});
for(const path of sources){const dst=join(a.out,'sources',path);mkdirSync(dirname(dst),{recursive:true});copyFileSync(path,dst);}
let receipts=[];
if(a.resume){const previous=json(a.resume);assert.deepEqual(previous.identity,identity);receipts=previous.receipts;
  for(const ref of receipts){const src=join(dirname(a.resume),ref.path),bytes=readFileSync(src);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),ref.sha256);copyFileSync(src,join(a.out,ref.path));}}
publishAtomicJson(join(a.out,`checkpoint-${receipts.length}.json`),{identity,receipts});
for(let i=receipts.length;i<jobs.length;i++){
  guard();const job=jobs[i],cue=encoders[job.variant].encode({schema:'public-lesson-frame-v1',fen:board.fen(),pgn:board.pgn(),task:p.task,action:job.action});
  tick=performance.now();model.forward([0],cue.stimulation);await pace(performance.now()-tick);
  const trajectory=mappedActivityTrace(model,rest,candidate);
  const readout=Object.fromEntries(Object.entries(p.readouts).map(([type,cells])=>[type,cells.reduce((n,c)=>n+model.h[model.steps][c.index],0)/cells.length]));
  const path=`receipt-${i}.json`,sha256=publishAtomicJson(join(a.out,path),{...job,cue,trajectory,readout});
  receipts.push({path,sha256});publishAtomicJson(join(a.out,`checkpoint-${receipts.length}.json`),{identity,receipts});
}
const after=fixedStateHash(model,[]);assert.equal(after,fixed);guard();
const result={identity,receipts,parameterHashBefore:fixed,parameterHashAfter:after,peakRssMiB:peakRss/2**20,
  elapsedSeconds:(performance.now()-start)/1000,cpu:process.cpuUsage(cpuStart),resumedFrom:a.resume?resolve(a.resume):null,
  scope:'Read-only untrained neural overlap diagnostic; no feedback, plasticity, training, retention or transfer result.'};
publishAtomicJson(join(a.out,'result.json'),result);console.log(JSON.stringify({presentations:jobs.length+1,peakRssMiB:result.peakRssMiB,elapsedSeconds:result.elapsedSeconds,parametersUnchanged:after===fixed}));
