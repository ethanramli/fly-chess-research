// Independent score arithmetic from raw responses; regenerate only naive calibration, not trained graph frames.
import assert from 'node:assert/strict';
import {createReadStream,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createInterface} from 'node:readline';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {loadGraph} from '../../../.codebase/src/runtime/graph.mjs';
import {SparseTrainer} from '../../../.codebase/src/supervised-baselines/trainer.mjs';
const base='runs/overnight-eyes-reader-2026-11-01',out=base+'/raw-score-audit-v1.json';assert(!existsSync(out));
const started=performance.now(),wait=new Int32Array(new SharedArrayBuffer(4)),sha=x=>createHash('sha256').update(x).digest('hex');
const guard=()=>assert(process.memoryUsage().rss<2048*2**20&&os.freemem()>=256*2**20&&performance.now()-started<120000);
const result=[];
for(const variant of ['released','curated']) {
 const run=base+'/mbon05-'+variant+'-v1',manifest=JSON.parse(readFileSync(run+'/manifest.json'));assert.equal(manifest.status,'complete');
 for(const [p,h] of Object.entries(manifest.pins))assert.equal(sha(readFileSync(p)),h);
 let first;for await(const line of createInterface({input:createReadStream(run+'/frames-4101-informative.jsonl'),crlfDelay:Infinity})){first=JSON.parse(line);break;}
 const graph=loadGraph('.cache/full.npz');
 if(variant==='curated')for(const e of JSON.parse(readFileSync('research/reports/mbon05-sign-provenance-2026-11-01/proposed-variant.json')).edgeSignOverrides)graph.sign[e.edgeIndex]=e.proposed;
 const model=new SparseTrainer(graph,{steps:8,inputDim:1,outputs:1,seed:47});
 const tonic=first.mapping.groups.flatMap(g=>g.dan.map(({index})=>({index,current:.75})));
 const forward=stim=>{guard();const t=performance.now();model.forward([0],stim);Atomics.wait(wait,0,0,performance.now()-t);return Float32Array.from(model.h[8]);};
 const rest=forward(tonic),roster=JSON.parse(readFileSync('.codebase/src/neural-learning/neuron-reader-cells.json')).cells;
 const indices=['MBON05','MBON07'].map(t=>roster.filter(c=>c.type===t).map(c=>c.index));
 const response=h=>indices.reduce((total,group)=>total+group.reduce((s,i)=>s+h(i)-rest[i],0)/group.length,0);
 const naive=new Map();for(const item of first.items)for(const cue of item.images){const stim=[...tonic,...cue],h=forward(stim);naive.set(JSON.stringify(stim),{sum:response(i=>h[i]),cells:roster.map(c=>h[c.index])});}
 let trials=0,tests=0,disabledRaw=0;
 for(const arm of ['informative','absent','shuffled','disabled','informative-restored']) {
  const queue=[];let start;
  const score=r=>{const n=naive.get(JSON.stringify(r.stimulation));assert(n);const rates=new Map(r.cells.map(c=>[c.index,c.activity]));return .8*(1-response(i=>rates.get(i))/n.sum)-.32;};
  const close=(x,y)=>assert(Math.abs(x-y)<1e-10,`Score mismatch ${variant}/${arm}: ${x} ${y}`);
  for await(const line of createInterface({input:createReadStream(run+'/frames-4101-'+arm+'.jsonl'),crlfDelay:Infinity})) {
   const r=JSON.parse(line);
   if(r.kind==='start')start=r;
   if(r.kind==='raw-response') {
    assert.deepEqual(r.cells.map(c=>[c.rootId,c.index]),roster.map(c=>[c.rootId,c.index]));
    queue.push(r);if(queue.length>4)queue.shift();
    const n=naive.get(JSON.stringify(r.stimulation));if(arm==='disabled'&&n){assert.deepEqual(r.cells.map(c=>c.activity),n.cells);disabledRaw++;}
   }
   if(r.kind==='trial') {const q=queue.slice(-3);assert.equal(q.length,3);close(score(q[0]),r.scores[0]);close(score(q[1]),r.scores[1]);close(score(q[2]),r.now);trials++;}
   if(r.kind==='test') {assert.equal(queue.length,4);for(let j=0;j<2;j++)close((score(queue[2*j])-score(queue[2*j+1]))/1.6,r.results[j].mNorm);tests+=2;}
  }
 }
 assert.equal(trials,360);assert.equal(tests,40);assert(disabledRaw>0);
 result.push({variant,trials,itemTests:tests,disabledRaw,graphSignIdentity:sha(Buffer.from(graph.sign.buffer)),scope:'Naive calibration graph regenerated; trained-frame score arithmetic checked against copied raw cells; trained graph activities not regenerated'});
}
guard();writeFileSync(out,JSON.stringify({pass:true,result,wallSeconds:(performance.now()-started)/1000,maxRssMiB:process.resourceUsage().maxRSS/1024,source:sha(readFileSync(new URL(import.meta.url)))},null,2),{flag:'wx'});console.log(JSON.stringify({pass:true,result}));
