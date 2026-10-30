// All-legal taught-board mechanism screen; NOT retention/reversal/transfer acceptance.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, readdirSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph, readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { DelayedReversalMemory } from '../../src/neural-learning/delayed-reversal-memory.mjs';
import { DelayedMateLessonBrain } from '../../src/puzzle-learning/delayed-mate-lesson-brain.mjs';
import { createConjoinedPublicMateFrameEncoder } from '../../src/chess-input/conjoined-public-mate-frame-cue.mjs';
import { createPublicMateFrameEncoder } from '../../src/chess-input/public-lesson-frame-cue.mjs';
import { certifyMate } from '../../src/search-and-feedback/mate-certificate.mjs';
import { verifiedExperience } from '../../src/search-and-feedback/verified-feedback.mjs';
import { copyBoard,uci } from '../../src/search-and-feedback/puzzle-search.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
const start=performance.now(),cpuStart=process.cpuUsage();
const {values:a}=parseArgs({options:{freeze:{type:'boolean'},out:{type:'string'},resume:{type:'string'},'cpu-duty':{type:'string',default:'0.5'}}});
const protocolPath='research/data/mate-conjoined-input-v1/protocol.json',runner='.codebase/scripts/puzzle-learning/run-mate-conjoined-input.mjs';
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex'),json=path=>JSON.parse(readFileSync(path));
if(a.freeze){
  assert.ok(!existsSync(protocolPath));const oldPath='research/data/correction-preservation-v2/protocol.json',old=json(oldPath);
  const prior='research/reports/adaptive-mate-error-v1-2026-10-08';
  assert.equal(json(`${prior}/audit.json`).passed,true,'Prior graph audit must finish before freezing new run');
  const previous=json(`${prior}/result.json`);
  assert.equal(previous.baseline[0].choice,'f7e6');assert.equal(previous.baseline[0].correct,false);
  const paths=[runner,'.codebase/scripts/puzzle-learning/audit-mate-conjoined-input.mjs',oldPath,old.mappingPath,`${prior}/result.json`,`${prior}/audit.json`,
    'research/reports/mate-conjoined-input-preflight-2026-10-08/result.json','package.json','package-lock.json',
    ...readdirSync('.codebase/src',{recursive:true}).filter(p=>p.endsWith('.mjs')).map(p=>join('.codebase/src',p))];
  const p={schema:'mate-conjoined-input-v1',scope:'Public action-context conjunction factor at matched dose; no retention/reversal/transfer acceptance',
    graphPath:old.graphPath,graphSha256:old.graphSha256,annotationPath:old.annotationPath,annotationSha256:old.annotationSha256,
    mappingPath:old.mappingPath,model:old.model,readouts:old.readouts,memory:{...old.memory,tau:4},
    fen:'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',task:{objective:'forced-mate',plies:1},
    encoderConfig:{maxCells:8,totalCurrent:12},
    moves:['f7e6','f7h7','f7e6','f7h7'],permutation:[1,0,3,2],
    conditions:['informative','no-channel','shuffled','disabled','informative','no-channel','shuffled','disabled'],
    variants:['baseline','baseline','baseline','baseline','conjoined','conjoined','conjoined','conjoined'],
    selection:{source:`${prior}/result.json`,criterion:'First initial unaided top choice is verified failure',firstAttempt:'f7e6',
      laterReviews:'Fixed historical Qe6/Qh7 schedule, not guaranteed currently chosen under new encoder/dose',
      shuffle:'Zero label agreement, explicitly anticorrelated event permutation'},
    maxPresentations:256,proofBounds:{maxNodes:4096,milliseconds:2000},
    runtime:{node:process.version,heapMiB:256,cpuDuty:0.5,maxRss:768*2**20,minFree:256*2**20},
    sources:Object.fromEntries(paths.map(path=>[path,hash(path)])),
    measures:['all-legal selected action meets checked mate criterion before/after','best-success minus best-failure margin'],
    limitations:['historically inspected training fixture','teacher-scheduled experiences, not necessarily chosen error','no final-family/retention/reversal gate','outcome signal, not prediction error']};
  const archive='research/source-archives/mate-conjoined-input-v1';mkdirSync(archive,{recursive:true});
  for(const path of paths){const dst=join(archive,path);mkdirSync(dirname(dst),{recursive:true});cpSync(path,dst,{errorOnExist:true});}
  mkdirSync(dirname(protocolPath),{recursive:true});writeFileSync(protocolPath,JSON.stringify(p,null,2),{flag:'wx'});cpSync(protocolPath,join(archive,'protocol.json'));
  console.log(JSON.stringify({frozen:true,protocolSha256:hash(protocolPath)}));process.exit(0);
}
const p=json(protocolPath);assert.ok(a.out&&!existsSync(a.out));assert.equal(process.version,p.runtime.node);
assert.ok(process.execArgv.includes('--max-old-space-size=256'));assert.equal(Number(a['cpu-duty']),0.5);
for(const [path,h]of Object.entries(p.sources))assert.equal(hash(path),h,`Frozen source differs: ${path}`);
assert.equal(hash(p.graphPath),p.graphSha256);assert.equal(hash(p.annotationPath),p.annotationSha256);
let peak=0;const guard=()=>{peak=Math.max(peak,process.memoryUsage().rss);if(peak>p.runtime.maxRss||os.freemem()<p.runtime.minFree)throw Error('Resource guard');};
const pace=async ms=>{let r=ms;while(r>0){let d=Math.min(250,r);await new Promise(f=>setTimeout(f,d));r-=d;guard();}};
guard();const mapping=json(p.mappingPath).mapping,ids=readNpz(p.graphPath,['root_ids']).root_ids;
for(const c of [...Object.values(p.readouts).flat(),...mapping.groups.flatMap(g=>g.dan)])assert.equal(ids[c.index].toString(),c.rootId);
const graph=loadGraph(p.graphPath);guard();const model=new SparseTrainer(graph,p.model);guard();
const memory=new DelayedReversalMemory(model,mapping,p.memory),initial=memory.snapshot(),fixed=fixedStateHash(model,memory.edges);
const encoders={baseline:createPublicMateFrameEncoder(mapping,p.encoderConfig),conjoined:createConjoinedPublicMateFrameEncoder(mapping,p.encoderConfig)},encoder=encoders.baseline;
const t=performance.now();model.forward([0]);const rest=Float32Array.from(model.h[model.steps]);await pace(performance.now()-t);
const identity={protocolSha256:hash(protocolPath),memoryIdentity:memory.identity,encoderIdentities:Object.fromEntries(Object.entries(encoders).map(([k,e])=>[k,e.identity])),fixed};
let brain=new DelayedMateLessonBrain({model,memory,mapping,rest,frameEncoder:encoder,episodeIdentity:digest(identity),readouts:p.readouts,
  maxPresentations:p.maxPresentations,maxLegalMoves:256,guard,pace});
const board=new Chess(p.fen),legal=board.moves({verbose:true}),proofs=new Map();
for(const move of legal){const child=copyBoard(board);child.move(move);const proof=certifyMate(child,board.turn(),{plies:0,...p.proofBounds});
  assert.ok(verifiedExperience(board,uci(move),p.task,proof).learningAllowed);proofs.set(uci(move),proof);}
const channels=p.moves.map(move=>proofs.get(move).status==='success'?'PAM02':'PPL103'),shuffled=p.permutation.map(i=>channels[i]);
assert.ok(channels.every((channel,i)=>channel!==shuffled[i]),'Require zero label agreement');
assert.deepEqual([...channels].sort(),[...shuffled].sort());assert.notDeepEqual(channels,shuffled);
const out=a.out;mkdirSync(out,{recursive:true});
const atomic=(path,value)=>{const body=JSON.stringify(value,null,2)+'\n';if(existsSync(path)){assert.equal(readFileSync(path,'utf8'),body);return;}
  writeFileSync(path+'.partial',body,{flag:'wx'});renameSync(path+'.partial',path);};
let state={arm:0,event:0,memory:initial,presentations:0,pending:null,receipts:[],baseline:[],after:[]},sequence=0;
const checkpoint=()=>{guard();const name=`checkpoint-${String(++sequence).padStart(5,'0')}`,partial=join(out,name+'.partial');mkdirSync(partial);
  atomic(join(partial,'state.json'),{identity,sequence,state});atomic(join(partial,'manifest.json'),{sha256:hash(join(partial,'state.json'))});renameSync(partial,join(out,name));};
if(a.resume){
  const origin=dirname(dirname(a.resume)),names=readdirSync(origin).filter(n=>/^checkpoint-\d+$/.test(n)).sort();
  assert.equal(dirname(a.resume).split(/[\\/]/).at(-1),names.at(-1));assert.equal(hash(a.resume),json(join(dirname(a.resume),'manifest.json')).sha256);
  const saved=json(a.resume);assert.deepEqual(saved.identity,identity);state=saved.state;sequence=saved.sequence;
  for(const ref of state.receipts){assert.equal(hash(join(origin,ref.path)),ref.sha256);cpSync(join(origin,ref.path),join(out,ref.path));}
  memory.restore(state.memory);brain.presentations=state.presentations;
}
checkpoint();
const ack=()=>{const pending=state.pending;atomic(join(out,pending.path),pending.receipt);state.receipts.push({path:pending.path,sha256:hash(join(out,pending.path))});
  state.pending=null;state.event++;checkpoint();};
if(state.pending)ack();
const summarize=assessment=>{
  const rows=assessment.rows.map(r=>({...r,status:proofs.get(r.move).status})),best=Math.max(...rows.map(r=>r.score));
  const top=rows.filter(r=>r.score===best),choice=top.length===1?top[0].move:null;
  return{rows,choice,correct:choice!==null&&proofs.get(choice).status==='success',
    margin:Math.max(...rows.filter(r=>r.status==='success').map(r=>r.score))-Math.max(...rows.filter(r=>r.status==='failure').map(r=>r.score)),
    memoryHash:digest(memory.snapshot()),presentations:brain.presentations};
};
while(state.arm<p.conditions.length){
  brain=new DelayedMateLessonBrain({model,memory,mapping,rest,frameEncoder:encoders[p.variants[state.arm]],
    episodeIdentity:digest({...identity,variant:p.variants[state.arm]}),readouts:p.readouts,
    maxPresentations:p.maxPresentations,maxLegalMoves:256,guard,pace});brain.presentations=state.presentations;
  if(!state.baseline[state.arm]){state.baseline[state.arm]=summarize(await brain.assess(board,legal,p.task));state.presentations=brain.presentations;checkpoint();}
  while(state.event<p.moves.length){const condition=p.conditions[state.arm],move=p.moves[state.event];
    const receipt=await brain.teach(board,move,p.task,proofs.get(move),{condition,shuffledChannel:condition==='shuffled'?shuffled[state.event]:null});
    // Scheduled historical target; changing encoder/dose may change initial choice.
    assert.equal(fixedStateHash(model,memory.edges),fixed);state.memory=memory.snapshot();state.presentations=brain.presentations;
    state.pending={path:`receipt-${state.arm}-${state.event}.json`,receipt};checkpoint();ack();}
  if(!state.after[state.arm]){state.after[state.arm]=summarize(await brain.assess(board,legal,p.task));state.presentations=brain.presentations;checkpoint();}
  state.arm++;state.event=0;memory.restore(initial);brain.presentations=0;state.memory=memory.snapshot();state.presentations=0;checkpoint();
}
const report={identity,scope:p.scope,baseline:state.baseline,after:state.after,receipts:state.receipts,
  peakRssMiB:peak/2**20,invocationSeconds:(performance.now()-start)/1000,cpu:process.cpuUsage(cpuStart),resumed:Boolean(a.resume),
  verdict:'Interpret choice/margin measurements separately; no retention/reversal/transfer acceptance',next:'Independent receipt and choice replay audit'};
atomic(join(out,'result.json'),report);console.log(JSON.stringify({baseline:report.baseline.map(x=>({choice:x.choice,correct:x.correct,margin:x.margin})),
  after:report.after.map(x=>({choice:x.choice,correct:x.correct,margin:x.margin,presentations:x.presentations})),peakRssMiB:report.peakRssMiB,seconds:report.invocationSeconds}));

