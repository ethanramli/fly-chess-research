// Artificial single-event interventions. No learning rule or old run is changed.
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import os from 'node:os';
import {Chess} from 'chess.js';
import {loadGraph,readNpz} from '../../src/runtime/graph.mjs';
import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';
import {ReversalMemory} from '../../src/neural-learning/reversal-memory.mjs';
import {readMBON} from '../../src/neural-learning/mbon-readout.mjs';
import {createChessCueEncoder} from '../../src/chess-input/chess-cue.mjs';
import {digest} from '../../src/neural-learning/mushroom-body.mjs';
import {fixedStateHash} from '../../src/neural-learning/association-validation.mjs';
import {certifyMate} from '../../src/search-and-feedback/mate-certificate.mjs';
import {verifiedExperience} from '../../src/search-and-feedback/verified-feedback.mjs';
import {copyBoard} from '../../src/search-and-feedback/puzzle-search.mjs';
import {sha256} from '../runtime/fetch-graph.mjs';
const {values:args}=parseArgs({options:{out:{type:'string'},resume:{type:'string'},'cpu-duty':{type:'string',default:'0.5'},'max-jobs':{type:'string',default:'15'}}});
const duty=Number(args['cpu-duty']),limit=Number(args['max-jobs']);
if(!args.out||existsSync(args.out)||!(duty>=.1&&duty<=1)||!Number.isSafeInteger(limit)||limit<1||limit>15)throw Error('Require bounded options and fresh output');
const start=performance.now(),cpuStart=process.cpuUsage();
function guard(){if(process.memoryUsage().rss>768*2**20||os.freemem()<256*2**20)throw Error('Resource guard: resume last completed intervention');}
async function pace(t){let remaining=(performance.now()-t)*(1/duty-1);do{const n=Math.min(250,Math.max(0,remaining));await new Promise(r=>setTimeout(r,n));remaining-=n;guard();}while(remaining>0);}
guard();
const protocolPath='research/data/recovery-causal-v1/protocol.json',protocol=JSON.parse(readFileSync(protocolPath)),read=p=>JSON.parse(readFileSync(p));
const original=read(join(protocol.sourceRun,'report.json')),audit=read(join(protocol.sourceRun,'audit-prefix.json'));
assert.equal(original.complete,true);assert.equal(audit.passed,true);assert.equal(audit.prefixReplayExact,true);assert.equal(await sha256(join(protocol.sourceRun,'report.json')),audit.reportSha256);
for(const[p,h]of Object.entries({...original.identity.inputs,...original.identity.sources}))assert.equal(await sha256(p),h);
const mappingPath='research/reports/reversal-candidate-2026-10-05/mapping.json',mapping=read(mappingPath).mapping,inputs={},sources={};
for(const p of [protocolPath,join(protocol.sourceRun,'report.json'),join(protocol.sourceRun,'audit-prefix.json'),mappingPath])inputs[p]=await sha256(p);
for(const p of ['.codebase/scripts/diagnostics/probe-recovery-causal.mjs',...Object.keys(original.identity.sources).filter(p=>p.startsWith('.codebase/src/'))])sources[p]=await sha256(p);
const setup=performance.now(),graph=loadGraph('.cache/full.npz'),ids=readNpz('.cache/full.npz',['root_ids']).root_ids,model=new SparseTrainer(graph,original.identity.model),memory=new ReversalMemory(model,mapping,original.protocol);
assert.equal(fixedStateHash(model,memory.edges),original.identity.invariant);
for(const cells of Object.values(original.identity.readouts))for(const c of cells)assert.equal(ids[c.index].toString(),c.rootId);
await pace(setup);
const board=new Chess(original.identity.puzzle.fen),history=board.pgn(),puzzle=original.identity.puzzle,encoder=createChessCueEncoder(mapping,{...original.protocol.encoder,seed:original.protocol.encoderSeed}),adaptive=original.results.find(r=>r.condition==='adaptive');
assert.equal(encoder.identity,original.identity.encoderIdentity);
const jobs=protocol.attempts.flatMap(attempt=>protocol.interventions.map(intervention=>({attempt,intervention})));
const identity={inputs,sources,originalIdentity:original.identity,jobs,duty};let state={identity,nextJob:0,results:[]};
if(args.resume){state=read(args.resume);assert.deepEqual(state.identity,identity);assert.equal(state.nextJob,state.results.length);assert.ok(state.nextJob>=0&&state.nextJob<=jobs.length);}
mkdirSync(dirname(args.out),{recursive:true});mkdirSync(args.out);
function save(name){const tmp=join(args.out,name+'.partial');mkdirSync(tmp);writeFileSync(join(tmp,'state.json'),JSON.stringify(state));renameSync(tmp,join(args.out,name));}
save('initial');let evaluations=0,completed=0,stop=false;process.on('SIGINT',()=>stop=true);
while(state.nextJob<jobs.length&&completed<limit&&!stop){
  const job=jobs[state.nextJob],event=adaptive.receipts[job.attempt-1];let gains=[...event.after.gains];
  if(job.intervention==='suppress-positive')gains=gains.map((v,i)=>Math.min(v,event.before.gains[i]));
  if(job.intervention==='remove-recovery-term'){gains=[];let i=0;for(let g=0;g<mapping.groups.length;g++)for(const e of mapping.groups[g].edges){const before=event.before.gains[i];gains.push(Math.max(original.protocol.minGain,Math.min(original.protocol.maxGain,before+original.protocol.eta*event.local.factors[g]*event.local.kc[i])));i++;}}
  const snapshot={...event.after,gains};memory.restore(snapshot);const beforeHash=digest(memory.snapshot()),rows=[];
  const moves=board.moves({verbose:true});assert.ok(moves.length<=protocol.maxLegalMoves);
  for(const m of moves){guard();if(evaluations>=protocol.maxEvaluations)throw Error('Presentation budget');const t=performance.now(),move=m.from+m.to+(m.promotion??'');
    model.forward([0],encoder.encode(board,move,{objective:puzzle.objective,plies:puzzle.plies}).stimulation);evaluations++;
    const response=readMBON(Object.fromEntries(Object.entries(original.identity.readouts).map(([type,cells])=>[type,cells.map(c=>model.h[model.steps][c.index])])));rows.push({move,score:response.score,MBON12:response.MBON12,MBON01:response.MBON01});await pace(t);
  }
  const probe={rows,choice:[...rows].sort((a,b)=>b.score-a.score)[0].move,memoryHash:beforeHash};
  assert.equal(digest(memory.snapshot()),beforeHash);assert.equal(fixedStateHash(model,memory.edges),original.identity.invariant);assert.equal(board.pgn(),history);
  if(job.intervention==='recorded')assert.deepEqual(probe,event.probeAfter);
  const afterBoard=copyBoard(board);afterBoard.move({from:probe.choice.slice(0,2),to:probe.choice.slice(2,4),...(probe.choice.length===5?{promotion:probe.choice[4]}:{})});
  const proof=certifyMate(afterBoard,board.turn(),{plies:puzzle.plies-1,maxNodes:4096,milliseconds:2000}),experience=verifiedExperience(board,probe.choice,puzzle,proof);
  const row={job,memory:snapshot,probe,proof,status:experience.status,revivedMove:event.probeAfter.choice,revivalPrevented:probe.choice!==event.probeAfter.choice,
    changedEdges:gains.filter((v,i)=>v!==event.after.gains[i]).length,fixedStatePreserved:true};
  state.results.push(row);state.nextJob++;completed++;save('intervention-'+String(state.nextJob).padStart(3,'0'));console.log(JSON.stringify({job,choice:probe.choice,status:row.status,revivalPrevented:row.revivalPrevented}));
}
const summary=Object.fromEntries(protocol.interventions.map(intervention=>{const rows=state.results.filter(r=>r.job.intervention===intervention);return[intervention,{jobs:rows.length,revivalsPrevented:rows.filter(r=>r.revivalPrevented).length,verifiedSuccesses:rows.filter(r=>r.status==='success').length}];}));
const cpu=process.cpuUsage(cpuStart),report={complete:state.nextJob===jobs.length,identity,protocol,results:state.results,summary,originalGates:original.summary.gates,evaluationsThisInvocation:evaluations,
  command:{argv:process.argv,execArgv:process.execArgv,node:process.version},resources:{peakRssMiB:process.resourceUsage().maxRSS/1024,elapsedSeconds:(performance.now()-start)/1000,cpuSeconds:(cpu.user+cpu.system)/1e6,cpuDuty:duty},scope:protocol.interpretation};
writeFileSync(join(args.out,'report.json.partial'),JSON.stringify(report,null,2));renameSync(join(args.out,'report.json.partial'),join(args.out,'report.json'));console.log(JSON.stringify({complete:report.complete,summary,resources:report.resources}));
