import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import os from 'node:os';
import {Chess} from 'chess.js';
import {loadGraph,readNpz} from '../src/lowram/graph.mjs';
import {SparseTrainer} from '../src/lowram/trainer.mjs';
import {ReversalMemory} from '../src/lowram/reversal-memory.mjs';
import {createChessCueEncoder} from '../src/lowram/chess-cue.mjs';
import {createRelationalChessCueEncoder} from '../src/lowram/relational-chess-cue-v2.mjs';
import {readMBON} from '../src/lowram/mbon-readout.mjs';
import {digest} from '../src/lowram/mushroom-body.mjs';
import {fixedStateHash,shuffledFeedback} from '../src/lowram/association-validation.mjs';
import {verifiedExperience} from '../src/lowram/verified-feedback.mjs';
import {copyBoard} from '../src/lowram/puzzle-search.mjs';
import {certifyMate} from '../src/lowram/mate-certificate.mjs';
import {sha256} from './fetch-graph.mjs';
const{values:args}=parseArgs({options:{out:{type:'string'},resume:{type:'string'},'cpu-duty':{type:'string',default:'0.5'},'max-events':{type:'string',default:'32'}}});
const duty=Number(args['cpu-duty']),limit=Number(args['max-events']);if(!args.out||existsSync(args.out)||!(duty>=.1&&duty<=1)||!Number.isSafeInteger(limit)||limit<1||limit>32)throw Error('Require fresh output and bounded options');
const start=performance.now(),cpuStart=process.cpuUsage();
function guard(){const rss=process.memoryUsage().rss,free=os.freemem();if(rss>768*2**20||free<256*2**20)throw Error(`Resource guard rssMiB=${rss/2**20} freeMiB=${free/2**20}: resume last checkpoint`);}
async function pace(t){let ms=(performance.now()-t)*(1/duty-1);do{const n=Math.min(250,Math.max(0,ms));await new Promise(r=>setTimeout(r,n));ms-=n;guard();}while(ms>0);}
guard();const read=p=>JSON.parse(readFileSync(p)),protocolPath='research/data/representation-learning-v1/protocol.json',p=read(protocolPath),source=read(join(p.sourceRun,'report.json')),prereq=read(join(p.prerequisite,'report.json')),sourceAudit=read(join(p.sourceRun,'audit-prefix.json'));
assert.equal(source.complete,true);assert.equal(sourceAudit.passed,true);assert.equal(await sha256(join(p.sourceRun,'report.json')),sourceAudit.reportSha256);assert.equal(prereq.summary.allGatesPassed,true);
for(const[path,h]of Object.entries({...source.identity.inputs,...source.identity.sources}))assert.equal(await sha256(path),h);
const mappingPath='research/reports/reversal-candidate-2026-10-05/mapping.json',mapping=read(mappingPath).mapping,inputs={},sources={};
for(const path of [protocolPath,mappingPath,join(p.sourceRun,'report.json'),join(p.sourceRun,'audit-prefix.json'),join(p.prerequisite,'report.json')])inputs[path]=await sha256(path);
for(const path of ['.codebase/scripts/compare-representation-learning.mjs','.codebase/src/lowram/relational-chess-cue-v2.mjs',...Object.keys(source.identity.sources).filter(v=>v.startsWith('.codebase/src/'))])sources[path]=await sha256(path);
const setup=performance.now(),graph=loadGraph('.cache/full.npz'),ids=readNpz('.cache/full.npz',['root_ids']).root_ids,model=new SparseTrainer(graph,source.identity.model),memory=new ReversalMemory(model,mapping,p),naive=memory.snapshot(),invariant=fixedStateHash(model,memory.edges),readouts=source.identity.readouts;
assert.equal(invariant,source.identity.invariant);for(const cells of Object.values(readouts))for(const c of cells)assert.equal(ids[c.index].toString(),c.rootId);
for(const group of mapping.groups)for(const c of group.dan)assert.equal(ids[c.index].toString(),c.rootId);
model.forward([0]);const rest=Float32Array.from(model.h[model.steps]);await pace(setup);
const puzzle=source.identity.puzzle,board=new Chess(puzzle.fen),history=board.pgn(),encoders={absolute:createChessCueEncoder(mapping,p.encoder),'relational-v2':createRelationalChessCueEncoder(mapping,p.encoder)},task={objective:puzzle.objective,plies:puzzle.plies},uci=m=>m.from+m.to+(m.promotion??'');
const doses=p.encoders.flatMap(encoder=>board.moves({verbose:true}).map(m=>{const cue=encoders[encoder].encode(board,m,task);assert.equal(cue.stimulation.length,14);assert.ok(cue.stimulation.every(v=>v.current===1.5));assert.equal(cue.accounting.totalCurrent,21);return{encoder,move:uci(m),cue};}));
const sourceCondition=source.results.find(v=>v.condition==='informative');
const experiences=p.schedule.map(move=>{const proof=sourceCondition.experience.evidence.find(v=>v.move===move).proof;return{...verifiedExperience(board,move,puzzle,proof),proof};});
const flags=experiences.filter(v=>v.learningAllowed).map(v=>v.experimentalPulse),shuffled=shuffledFeedback(flags,p.encoder.seed),jobs=p.encoders.flatMap(encoder=>p.conditions.map(condition=>({encoder,condition})));
const identity={inputs,sources,originalIdentity:source.identity,model:model.config,memory:memory.config,mappingHash:digest(mapping),readouts,invariant,encoderIdentities:Object.fromEntries(Object.entries(encoders).map(([k,v])=>[k,v.identity])),doses,jobs,duty,puzzle};
let state={identity,checkpoint:0,nextJob:0,results:[],active:null};if(args.resume){state=read(args.resume);assert.deepEqual(state.identity,identity);assert.equal(state.nextJob,state.results.length);assert.ok(state.nextJob>=0&&state.nextJob<=jobs.length);if(state.active)memory.restore(state.active.memory);}
mkdirSync(dirname(args.out),{recursive:true});mkdirSync(args.out);
function save(){if(state.active)state.active.memory=memory.snapshot();state.checkpoint++;const name='checkpoint-'+String(state.checkpoint).padStart(5,'0'),tmp=join(args.out,name+'.partial');mkdirSync(tmp);writeFileSync(join(tmp,'state.json'),JSON.stringify(state));renameSync(tmp,join(args.out,name));}
save();let evaluations=0,events=0,stop=false;process.on('SIGINT',()=>stop=true);
async function evoke(drive){guard();assert.ok(state.active.calls<p.maxBrainCalls);const t=performance.now();model.forward([0],drive);state.active.calls++;evaluations++;const result=readMBON(Object.fromEntries(Object.entries(readouts).map(([type,cells])=>[type,cells.map(c=>model.h[model.steps][c.index])])));await pace(t);return result;}
async function probe(){const snapshot=digest(memory.snapshot()),rows=[];for(const m of board.moves({verbose:true})){const response=await evoke(encoders[state.active.job.encoder].encode(board,m,task).stimulation);rows.push({move:uci(m),score:response.score,MBON12:response.MBON12,MBON01:response.MBON01});}assert.equal(digest(memory.snapshot()),snapshot);return{rows,choice:[...rows].sort((a,b)=>b.score-a.score)[0].move,memoryHash:snapshot};}
function check(){assert.equal(fixedStateHash(model,memory.edges),invariant);assert.equal(board.pgn(),history);}
function assess(move){const after=copyBoard(board);after.move({from:move.slice(0,2),to:move.slice(2,4),...(move.length===5?{promotion:move[4]}:{})});return certifyMate(after,board.turn(),{plies:puzzle.plies-1,maxNodes:4096,milliseconds:2000});}
while(state.nextJob<jobs.length&&!stop){
  const job=jobs[state.nextJob];if(!state.active){memory.restore(naive);state.active={job,calls:0,nextEvent:0,phase:'baseline',receipts:[],probes:[]};save();}
  const a=state.active;assert.deepEqual(a.job,job);
  if(a.phase==='baseline'){a.before=await probe();a.initialProof=assess(a.before.choice);a.phase='teaching';check();save();}
  while(a.nextEvent<experiences.length&&events<limit&&!stop){
    if(a.phase==='teaching'){
      const event={...experiences[a.nextEvent],attempt:a.nextEvent},knownIndex=experiences.slice(0,a.nextEvent+1).filter(v=>v.learningAllowed).length-1;
      event.delivered=job.condition==='absent'?false:job.condition==='shuffled'?(event.learningAllowed?shuffled[knownIndex]:null):event.experimentalPulse;
      assert.equal(verifiedExperience(board,event.move,puzzle,event.proof).certificateSha256,event.certificateSha256);
      const before=memory.snapshot();
      if(event.learningAllowed){const drive=encoders[job.encoder].encode(board,event.move,task).stimulation;if(event.delivered)for(const g of mapping.groups.filter(v=>v.danType==='PPL103'))for(const c of g.dan)drive.push({index:c.index,current:p.current});
        const response=await evoke(drive),h=model.h[model.steps],kc=mapping.groups.flatMap(g=>g.kc.map(i=>Math.max(0,h[i]-rest[i])/p.activityScale)),update=job.condition==='disabled'?{changedEdges:0,events:memory.events,factors:[]}:memory.observe(rest);
        a.pending={event,before,after:memory.snapshot(),response,local:{kc,factors:update.factors},update,appliedToNeurons:true,learningApplied:update.changedEdges>0};
      }else a.pending={event,before,after:memory.snapshot(),appliedToNeurons:false,learningApplied:false};
      a.phase='measure';check();save();
    }
    if(a.phase==='measure'){a.pending.probeAfter=await probe();a.pending.preferredProof=assess(a.pending.probeAfter.choice);a.receipts.push(a.pending);a.probes.push(a.pending.probeAfter);a.pending=null;a.nextEvent++;events++;a.phase='teaching';check();save();console.log(JSON.stringify({job,event:a.nextEvent,choice:a.probes.at(-1).choice,status:a.receipts.at(-1).preferredProof.status}));}
  }
  if(a.nextEvent<experiences.length||stop)break;
  if(a.phase==='teaching'){a.phase='retention';save();}
  if(a.phase==='retention'){a.after=a.probes.at(-1);a.repeat=await probe();const learned=memory.snapshot();memory.restore(naive);a.reset=await probe();memory.restore(learned);a.restored=await probe();assert.deepEqual(a.repeat,a.after);assert.deepEqual(a.reset,a.before);assert.deepEqual(a.restored,a.after);a.finalMemory=learned;a.finalProof=assess(a.after.choice);a.fixedStatePreserved=true;check();state.results.push(a);state.active=null;state.nextJob++;save();}
  if(events>=limit)break;
}
const margin=probe=>{const safe=experiences.filter(v=>v.status==='success').map(v=>probe.rows.find(r=>r.move===v.move).score),bad=experiences.filter(v=>v.status==='failure').map(v=>probe.rows.find(r=>r.move===v.move).score);return safe.reduce((a,b)=>a+b,0)/safe.length-bad.reduce((a,b)=>a+b,0)/bad.length;};
let summary=null;const complete=state.nextJob===jobs.length;
if(complete){summary={shuffleDifferent:digest(flags)!==digest(shuffled),encoders:p.encoders.map(encoder=>{const rows=state.results.filter(v=>v.job.encoder===encoder),informative=rows.find(v=>v.job.condition==='informative'),absent=rows.find(v=>v.job.condition==='absent');return{encoder,gates:{fixtureRepair:informative.initialProof.status==='failure'&&informative.finalProof.status==='success',feedbackSpecificity:digest(flags)!==digest(shuffled)&&informative.finalProof.status==='success'&&rows.filter(v=>v.job.condition!=='informative').every(v=>v.finalProof.status==='failure')},informativeAboveAbsentMarginChange:(margin(informative.after)-margin(informative.before))-(margin(absent.after)-margin(absent.before)),conditions:rows.map(v=>({condition:v.job.condition,choice:v.after.choice,status:v.finalProof.status,marginBefore:margin(v.before),marginAfter:margin(v.after),pulses:v.receipts.filter(t=>t.event.delivered===true&&t.event.learningAllowed).length}))};})};summary.pairedRepresentationEffect=summary.encoders[1].informativeAboveAbsentMarginChange-summary.encoders[0].informativeAboveAbsentMarginChange;}
const cpu=process.cpuUsage(cpuStart),report={complete,identity,protocol:p,experiences,flags,shuffled,results:state.results,active:state.active,summary,evaluationsThisInvocation:evaluations,command:{argv:process.argv,execArgv:process.execArgv,node:process.version},resources:{peakRssMiB:process.resourceUsage().maxRSS/1024,elapsedSeconds:(performance.now()-start)/1000,cpuSeconds:(cpu.user+cpu.system)/1e6,cpuDuty:duty},scope:p.limitations};
writeFileSync(join(args.out,'report.json.partial'),JSON.stringify(report,null,2));renameSync(join(args.out,'report.json.partial'),join(args.out,'report.json'));console.log(JSON.stringify({complete,summary,resources:report.resources}));
