import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,renameSync,mkdirSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph,readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { createAssessmentCache } from '../../src/puzzle-learning/assessment-cache.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const protocolPath='research/data/assessment-cache-v1/protocol.json', p=read(protocolPath), base=read(p.baseProtocol);
assert.equal(process.version,base.runtime.nodeVersion);assert.ok(process.execArgv.includes('--max-old-space-size=256'));
assert.equal(p.cpuDuty,.5);
for(const [path,hash] of Object.entries(p.pins)) assert.equal(await sha256(path),hash,path);
const report=read(p.referenceReport),audit=read(p.referenceAudit);
assert.equal(report.complete,true);assert.equal(audit.passed,true);assert.equal(audit.reportSha256,await sha256(p.referenceReport));
const identity={protocolSha256:await sha256(protocolPath),pins:p.pins};
mkdirSync(p.out,{recursive:true});
const atomic=(path,value)=>{writeFileSync(path+'.partial',JSON.stringify(value,null,2)+'\n');renameSync(path+'.partial',path);};
const guard=()=>{if(process.memoryUsage().rss>768*2**20||os.freemem()<256*2**20)throw Error('Resource guard');};
const setupStarted=performance.now();guard();
const graph=loadGraph('.cache/full.npz');guard();
const ids=readNpz('.cache/full.npz',['root_ids']).root_ids;guard();
const model=new SparseTrainer(graph,base.shared.model);guard();
const mapping=read(base.mappingPath).mapping;
const memory=new ReversalMemory(model,mapping,base.shared.memory);guard();
assert.equal(fixedStateHash(model,memory.edges),base.shared.invariant);
for(const cell of [...Object.values(base.shared.readouts).flat(),...mapping.groups.flatMap(g=>g.dan)])assert.equal(ids[cell.index].toString(),cell.rootId);
const encoder=createCompartmentChessCueEncoder(mapping,{...base.encoder,...base.variant});
const restStarted=performance.now();model.forward([0]);const rest=Float32Array.from(model.h[model.steps]);
await new Promise(resolve=>setTimeout(resolve,performance.now()-restStarted));guard();
const setupSeconds=(performance.now()-setupStarted)/1000;
const eventRef=report.results.find(v=>v.condition==='informative').eventRefs[0];
assert.equal(await sha256(eventRef.path),eventRef.sha256);const event=read(eventRef.path);
const rows=base.positions.map(ref=>readFileSync(ref.path,'utf8').trim().split(/\r?\n/).map(JSON.parse).find(v=>v.id===ref.id));
assert.equal(event.experience.context.fen,rows[0].fen);
const results=[];
for(const mode of ['uncached','cached']) {
  const path=join(p.out,mode+'.json');
  if(existsSync(path)){const saved=read(path);assert.deepEqual(saved.identity,identity);results.push(saved);continue;}
  memory.restore(event.before);assert.equal(fixedStateHash(model,memory.edges),base.shared.invariant);
  const phases={forwardMs:0,paceMs:0,encodeMs:0,replayMs:0,assessMs:0};
  const originalForward=model.forward.bind(model),originalEncode=encoder.encode.bind(encoder);
  model.forward=(...args)=>{const t=performance.now();try{return originalForward(...args);}finally{phases.forwardMs+=performance.now()-t;}};
  encoder.encode=(...args)=>{const t=performance.now();try{return originalEncode(...args);}finally{phases.encodeMs+=performance.now()-t;}};
  const pace=async ms=>{const t=performance.now();let left=ms;while(left>0){const wait=Math.min(left,250);await new Promise(r=>setTimeout(r,wait));left-=wait;guard();}phases.paceMs+=performance.now()-t;};
  const brain=new DualValencePuzzleBrain({model,memory,mapping,encoder,readouts:base.shared.readouts,rest,current:base.current,
    priorScale:base.priorScale,maxPresentations:256,guard,pace});
  const cache=createAssessmentCache({assess:brain.assess.bind(brain),guard,capacity:4,
    identity:()=>digest({fixed:fixedStateHash(model,memory.edges),config:model.config,memory:memory.snapshot(),readouts:brain.readouts,encoder:encoder.identity})});
  const assess=mode==='cached'?cache.assess:brain.assess.bind(brain);
  const start=performance.now(),cpu=process.cpuUsage(),panels=[];
  atomic(join(p.out,mode+'-before.json'),{identity,memory:memory.snapshot()});
  for(const stage of ['before','after']) {
    for(let repeat=0;repeat<2;repeat++) {
      const board=new Chess(rows[0].fen),task={objective:rows[0].objective,plies:rows[0].plies},t=performance.now();
      const assessment=await assess(board,board.moves({verbose:true}),task);phases.assessMs+=performance.now()-t;
      panels.push({stage,repeat,assessment});assert.equal(board.fen(),rows[0].fen);
    }
    if(stage==='before') {
      const fixedBefore=fixedStateHash(model,memory.edges),t=performance.now();const receipt=await brain.replay(event.experience);phases.replayMs+=performance.now()-t;
      receipt.fixedStateBefore=fixedBefore;receipt.fixedStateAfter=fixedStateHash(model,memory.edges);
      assert.equal(digest(receipt),digest(event.receipt));assert.deepEqual(memory.snapshot(),event.after);
      // Pending receipt + memory are atomically published before acknowledgment.
      atomic(join(p.out,mode+'-pending.json'),{identity,receipt,memory:memory.snapshot(),acknowledged:false});
    }
  }
  const cpuUsed=process.cpuUsage(cpu);
  const result={identity,mode,panels,receipt:read(join(p.out,mode+'-pending.json')).receipt,memory:memory.snapshot(),
    acknowledged:true,cache:cache.stats,presentations:brain.presentations,phases,
    resources:{elapsedSeconds:(performance.now()-start)/1000,cpuSeconds:(cpuUsed.user+cpuUsed.system)/1e6,peakRssMiB:process.resourceUsage().maxRSS/1024},
    fixedStateHash:fixedStateHash(model,memory.edges)};
  assert.equal(result.fixedStateHash,base.shared.invariant);atomic(path,result);results.push(result);
  model.forward=originalForward;encoder.encode=originalEncode;guard();
}
assert.deepEqual(results[0].panels,results[1].panels);assert.deepEqual(results[0].receipt,results[1].receipt);assert.deepEqual(results[0].memory,results[1].memory);
assert.equal(results[1].cache.invalidations,1);assert.equal(results[1].cache.hits,2);
const final={complete:true,identity,setupSeconds,results,scope:'Exact same single-fixture before/after/repeated assessments and one existing verified teaching replay; no transfer or faster time-to-learning claim'};
atomic(join(p.out,'report.json'),final);atomic(join(p.out,'COMPLETE.json'),{reportSha256:await sha256(join(p.out,'report.json'))});
console.log(JSON.stringify({setupSeconds,results:results.map(v=>({mode:v.mode,presentations:v.presentations,cache:v.cache,resources:v.resources,phases:v.phases}))},null,2));
