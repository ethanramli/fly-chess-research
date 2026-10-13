// Independent fresh-process sparse replay; does not establish biological validity.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { join } from 'node:path';
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
const {values:a}=parseArgs({options:{run:{type:'string'},prefix:{type:'string'},out:{type:'string'},'cpu-duty':{type:'string',default:'0.5'}}});
assert.ok(a.run&&a.prefix&&a.out);assert.equal(Number(a['cpu-duty']),0.5);assert.ok(process.execArgv.includes('--max-old-space-size=256'));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const json=path=>JSON.parse(readFileSync(path));
const protocolPath='research/data/delayed-lesson-integration-v1/protocol.json',p=json(protocolPath),result=json(join(a.run,'result.json'));
assert.equal(hash(protocolPath),result.identity.protocolSha256);
assert.equal(process.version,p.runtime.node);
for(const [path,h]of Object.entries(p.sources))assert.equal(hash(path),h);
assert.equal(hash(p.graphPath),p.graphSha256);assert.equal(hash(p.annotationPath),p.annotationSha256);
const pendingPath=join(a.prefix,'checkpoint-00002/state.json'),pending=json(pendingPath);
assert.equal(hash(pendingPath),json(join(a.prefix,'checkpoint-00002/manifest.json')).sha256);
assert.ok(pending.state.pending);
const ackPath=join(a.run,'checkpoint-00004/state.json'),ack=json(ackPath);
assert.equal(hash(ackPath),json(join(a.run,'checkpoint-00004/manifest.json')).sha256);
assert.equal(ack.state.event,1);assert.equal(ack.state.pending,null);
assert.deepEqual(ack.state.memory,pending.state.memory);assert.equal(ack.state.presentations,pending.state.presentations);
assert.deepEqual(json(join(a.run,'receipt-0-0.json')),pending.state.pending.receipt);
let peakRss=0;const started=performance.now(),cpu=process.cpuUsage();
const guard=()=>{peakRss=Math.max(peakRss,process.memoryUsage().rss);if(peakRss>p.runtime.maxRss||os.freemem()<p.runtime.minFree)throw Error('Audit resource guard');};
const pace=async ms=>{let remaining=ms;while(remaining>0){let dt=Math.min(250,remaining);await new Promise(r=>setTimeout(r,dt));remaining-=dt;guard();}};
guard();const ids=readNpz(p.graphPath,['root_ids']).root_ids,mapping=json(p.mappingPath).mapping;
for(const c of [...Object.values(p.readouts).flat(),...mapping.groups.flatMap(g=>g.dan)])assert.equal(ids[c.index].toString(),c.rootId);
const graph=loadGraph(p.graphPath);guard();const model=new SparseTrainer(graph,p.model);guard();
const memory=new DelayedReversalMemory(model,mapping,p.memory),initial=memory.snapshot(),fixed=fixedStateHash(model,memory.edges);
const frameEncoder=createPublicLessonFrameEncoder(mapping);const t=performance.now();model.forward([0]);const rest=Float32Array.from(model.h[model.steps]);await pace(performance.now()-t);
const identity={protocolSha256:hash(protocolPath),memoryIdentity:memory.identity,encoderIdentity:frameEncoder.identity,fixed};
assert.deepEqual(identity,result.identity);
const brain=new DelayedLessonBrain({model,memory,mapping,rest,frameEncoder,episodeIdentity:digest(identity),readouts:p.readouts,
  maxPresentations:p.maxPresentations,maxLegalMoves:p.maxLegalMoves,guard,pace});
const proofs=p.contexts.map(fen=>certifyCaptureRetention(new Chess(fen),p.move));
const channels=p.schedule.map(i=>proofs[i].status==='success'?'PAM02':'PPL103'),shuffled=p.permutation.map(i=>channels[i]);
const arms=[];let verified=0;
for(let arm=0;arm<p.conditions.length;arm++){
  memory.restore(initial);brain.presentations=0;let changed=0,recovered=0;
  for(let event=0;event<p.schedule.length;event++){
    const ref=result.receipts.find(r=>r.path===`receipt-${arm}-${event}.json`);assert.ok(ref);
    const path=join(a.run,ref.path);assert.equal(hash(path),ref.sha256);const recorded=json(path);
    const i=p.schedule[event],condition=p.conditions[arm];
    const replay=await brain.teach(new Chess(p.contexts[i]),p.move,p.task,proofs[i],{condition,shuffledChannel:condition==='shuffled'?shuffled[event]:null});
    assert.deepEqual(replay,recorded,`Fresh graph receipt differs: ${ref.path}`);
    assert.equal(fixedStateHash(model,memory.edges),fixed);changed+=replay.update.changedEdges;recovered+=replay.update.recoveredEdges;verified++;
  }
  arms.push({condition:p.conditions[arm],presentations:brain.presentations,changedEdgeEvents:changed,recoveredEdgeEvents:recovered,finalMemoryHash:digest(memory.snapshot())});
}
assert.equal(verified,16);assert.ok(arms.every(r=>r.presentations===arms[0].presentations));
const report={passed:true,protocolSha256:hash(protocolPath),auditorSha256:hash(new URL(import.meta.url)),verifiedReceipts:verified,
  exactPendingRecovery:true,duplicatedPresentations:0,arms,peakRssMiB:peakRss/2**20,
  auditRuntimeSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpu),
  scope:'Fresh sparse graph receipt equivalence and recovery only; no association/retention/reversal/transfer acceptance'};
writeFileSync(a.out,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
