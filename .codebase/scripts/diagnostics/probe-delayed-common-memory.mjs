import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { DelayedReversalMemory } from '../../src/neural-learning/delayed-reversal-memory.mjs';
import { DelayedLessonBrain } from '../../src/puzzle-learning/delayed-lesson-brain.mjs';
import { createPublicLessonFrameEncoder } from '../../src/chess-input/public-lesson-frame-cue.mjs';
import { certifyCaptureRetention } from '../../src/search-and-feedback/capture-retention-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
const json=p=>JSON.parse(readFileSync(p));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const base='research/reports/delayed-lesson-integration-resumed-2026-10-08';
const out='research/reports/delayed-common-memory-diagnostic-2026-10-08';
const protocolPath='research/data/delayed-lesson-integration-v1/protocol.json',p=json(protocolPath);
assert.ok(json(`${base}/audit.json`).passed);assert.ok(process.execArgv.includes('--max-old-space-size=256'));
assert.equal(process.version,p.runtime.node);assert.equal(hash(p.graphPath),p.graphSha256);
for(const [path,h]of Object.entries(p.sources))assert.equal(hash(path),h);
const paths=p.conditions.map((_,i)=>`${base}/receipt-${i}-3.json`);
const protocol={scope:'Post-hoc diagnostic; no learning gate',sourceSha256:hash(new URL(import.meta.url)),
  originalProtocolSha256:hash(protocolPath),auditSha256:hash(`${base}/audit.json`),
  receipts:paths.map(path=>({path,sha256:hash(path)})),presentations:10,conditions:['initial',...p.conditions]};
mkdirSync(out);writeFileSync(`${out}/protocol.json`,JSON.stringify(protocol,null,2),{flag:'wx'});
const started=performance.now(),cpu=process.cpuUsage();let peak=0;
const guard=()=>{peak=Math.max(peak,process.memoryUsage().rss);if(peak>p.runtime.maxRss||os.freemem()<p.runtime.minFree)throw Error('Diagnostic guard');};
const pace=async ms=>{let r=ms;while(r>0){const dt=Math.min(250,r);await new Promise(f=>setTimeout(f,dt));r-=dt;guard();}};
guard();const graph=loadGraph(p.graphPath);guard();const mapping=json(p.mappingPath).mapping;
const model=new SparseTrainer(graph,p.model);guard();const memory=new DelayedReversalMemory(model,mapping,p.memory);
const initial=memory.snapshot(),fixed=fixedStateHash(model,memory.edges),encoder=createPublicLessonFrameEncoder(mapping);
const t=performance.now();model.forward([0]);const rest=Float32Array.from(model.h[model.steps]);await pace(performance.now()-t);
const brain=new DelayedLessonBrain({model,memory,mapping,rest,frameEncoder:encoder,episodeIdentity:digest(protocol),readouts:p.readouts,guard,pace,maxPresentations:10,maxLegalMoves:256});
const snapshots=[initial,...paths.map(path=>json(path).after)],rows=[];
for(let s=0;s<snapshots.length;s++){
  memory.restore(snapshots[s]);const frozen=digest(memory.snapshot()),responses=[];
  for(const fen of p.contexts){
    const board=new Chess(fen),proof=certifyCaptureRetention(board,p.move),checked=verifiedExperience(board,p.move,p.task,proof);
    const cue=encoder.encode({schema:'public-lesson-frame-v1',fen:board.fen(),pgn:board.pgn(),task:p.task,action:p.move});
    const response=await brain.evoke(cue.stimulation);responses.push({status:checked.status,...response});
  }
  assert.equal(digest(memory.snapshot()),frozen);assert.equal(fixedStateHash(model,memory.edges),fixed);
  rows.push({condition:protocol.conditions[s],memoryHash:frozen,responses,
    contrast:responses.find(r=>r.status==='success').score-responses.find(r=>r.status==='failure').score});
}
const report={scope:protocol.scope,rows,presentations:brain.presentations,peakRssMiB:peak/2**20,
  diagnosticRuntimeSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpu),
  limits:'Training contexts, one action each, no criterion calibration or all-legal success assessment'};
writeFileSync(`${out}/result.json`,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
