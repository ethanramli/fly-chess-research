import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph,readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { DelayedReversalMemory } from '../../src/neural-learning/delayed-reversal-memory.mjs';
import { DelayedMateLessonBrain } from '../../src/puzzle-learning/delayed-mate-lesson-brain.mjs';
import { createPublicMateFrameEncoder } from '../../src/chess-input/public-lesson-frame-cue.mjs';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { copyBoard,uci } from '../../src/search-and-feedback/puzzle-search.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
const {values:a}=parseArgs({options:{run:{type:'string'},out:{type:'string'},'cpu-duty':{type:'string',default:'0.5'}}});
assert.ok(a.run&&a.out);assert.equal(Number(a['cpu-duty']),0.5);assert.ok(process.execArgv.includes('--max-old-space-size=256'));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex'),json=path=>JSON.parse(readFileSync(path));
const path='research/data/delayed-mate-chosen-error-v1/protocol.json',p=json(path),result=json(join(a.run,'result.json'));
assert.equal(hash(path),result.identity.protocolSha256);assert.equal(process.version,p.runtime.node);
for(const [file,h]of Object.entries(p.sources))assert.equal(hash(file),h);
assert.equal(hash(p.graphPath),p.graphSha256);assert.equal(hash(p.annotationPath),p.annotationSha256);
const started=performance.now(),cpu=process.cpuUsage();let peak=0;
const guard=()=>{peak=Math.max(peak,process.memoryUsage().rss);if(peak>p.runtime.maxRss||os.freemem()<p.runtime.minFree)throw Error('Audit guard');};
const pace=async ms=>{let r=ms;while(r>0){const dt=Math.min(250,r);await new Promise(f=>setTimeout(f,dt));r-=dt;guard();}};
guard();const mapping=json(p.mappingPath).mapping,ids=readNpz(p.graphPath,['root_ids']).root_ids;
for(const c of [...Object.values(p.readouts).flat(),...mapping.groups.flatMap(g=>g.dan)])assert.equal(ids[c.index].toString(),c.rootId);
const graph=loadGraph(p.graphPath);guard();const model=new SparseTrainer(graph,p.model);guard();
const memory=new DelayedReversalMemory(model,mapping,p.memory),initial=memory.snapshot(),fixed=fixedStateHash(model,memory.edges),encoder=createPublicMateFrameEncoder(mapping);
const t=performance.now();model.forward([0]);const rest=Float32Array.from(model.h[model.steps]);await pace(performance.now()-t);
const identity={protocolSha256:hash(path),memoryIdentity:memory.identity,encoderIdentity:encoder.identity,fixed};assert.deepEqual(identity,result.identity);
const brain=new DelayedMateLessonBrain({model,memory,mapping,rest,frameEncoder:encoder,episodeIdentity:digest(identity),readouts:p.readouts,
  maxPresentations:p.maxPresentations,maxLegalMoves:256,guard,pace});
const board=new Chess(p.fen),legal=board.moves({verbose:true}),proofs=new Map();
for(const move of legal){const child=copyBoard(board);child.move(move);const proof=certifyMate(child,board.turn(),{plies:0,...p.proofBounds});
  assert.ok(verifiedExperience(board,uci(move),p.task,proof).learningAllowed);proofs.set(uci(move),proof);}
const channels=p.moves.map(move=>proofs.get(move).status==='success'?'PAM02':'PPL103'),shuffled=p.permutation.map(i=>channels[i]);
const summarize=assessment=>{
  const rows=assessment.rows.map(r=>({...r,status:proofs.get(r.move).status})),best=Math.max(...rows.map(r=>r.score));
  const top=rows.filter(r=>r.score===best),choice=top.length===1?top[0].move:null;
  return{rows,choice,correct:choice!==null&&proofs.get(choice).status==='success',
    margin:Math.max(...rows.filter(r=>r.status==='success').map(r=>r.score))-Math.max(...rows.filter(r=>r.status==='failure').map(r=>r.score)),
    memoryHash:digest(memory.snapshot()),presentations:brain.presentations};
};
let verified=0;const arms=[];
for(let arm=0;arm<p.conditions.length;arm++){
  memory.restore(initial);brain.presentations=0;
  assert.deepEqual(summarize(await brain.assess(board,legal,p.task)),result.baseline[arm]);
  for(let e=0;e<p.moves.length;e++){
    const ref=result.receipts.find(r=>r.path===`receipt-${arm}-${e}.json`);assert.ok(ref);const file=join(a.run,ref.path);assert.equal(hash(file),ref.sha256);
    const condition=p.conditions[arm],move=p.moves[e];
    const receipt=await brain.teach(board,move,p.task,proofs.get(move),{condition,shuffledChannel:condition==='shuffled'?shuffled[e]:null});
    assert.deepEqual(receipt,json(file));assert.equal(fixedStateHash(model,memory.edges),fixed);verified++;
  }
  assert.deepEqual(summarize(await brain.assess(board,legal,p.task)),result.after[arm]);
  assert.equal(fixedStateHash(model,memory.edges),fixed);arms.push({condition:p.conditions[arm],presentations:brain.presentations});
}
assert.equal(verified,16);assert.ok(arms.every(r=>r.presentations===arms[0].presentations));
const report={passed:true,protocolSha256:hash(path),auditorSha256:hash(new URL(import.meta.url)),verifiedReceipts:verified,
  exactBaselineAndFinalRankings:8,arms,peakRssMiB:peak/2**20,auditRuntimeSeconds:(performance.now()-started)/1000,cpu:process.cpuUsage(cpu),
  scope:'Independent graph execution/ranking equivalence; not biological retention/reversal/transfer acceptance'};
writeFileSync(a.out,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));

