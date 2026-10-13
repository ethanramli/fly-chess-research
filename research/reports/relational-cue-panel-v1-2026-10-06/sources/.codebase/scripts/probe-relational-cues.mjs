import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import os from 'node:os';
import {Chess} from 'chess.js';
import {loadGraph,readNpz} from '../src/lowram/graph.mjs';
import {SparseTrainer} from '../src/lowram/trainer.mjs';
import {createChessCueEncoder} from '../src/lowram/chess-cue.mjs';
import {createRelationalChessCueEncoder} from '../src/lowram/relational-chess-cue.mjs';
import {readMBON} from '../src/lowram/mbon-readout.mjs';
import {brainIdentity} from '../src/lowram/puzzle-round.mjs';
import {digest} from '../src/lowram/mushroom-body.mjs';
import {copyBoard} from '../src/lowram/puzzle-search.mjs';
import {certifyMate} from '../src/lowram/mate-certificate.mjs';
import {sha256} from './fetch-graph.mjs';
const{values:args}=parseArgs({options:{out:{type:'string'},resume:{type:'string'},'cpu-duty':{type:'string',default:'0.5'},'max-jobs':{type:'string',default:'256'}}});
const duty=Number(args['cpu-duty']),limit=Number(args['max-jobs']);if(!args.out||existsSync(args.out)||!(duty>=.1&&duty<=1)||!Number.isSafeInteger(limit)||limit<1||limit>256)throw Error('Fresh output and bounded options required');
const start=performance.now(),cpuStart=process.cpuUsage();
function guard(){if(process.memoryUsage().rss>768*2**20||os.freemem()<256*2**20)throw Error('Resource guard: resume completed candidate');}
async function pace(t){let ms=(performance.now()-t)*(1/duty-1);do{const n=Math.min(250,Math.max(0,ms));await new Promise(r=>setTimeout(r,n));ms-=n;guard();}while(ms>0);}
guard();const protocolPath='research/data/relational-cue-panel-v1/protocol.json',read=p=>JSON.parse(readFileSync(p)),protocol=read(protocolPath),original=read(join(protocol.sourceRun,'report.json')),priorAudit=read(join(protocol.sourceRun,'audit-prefix.json'));
assert.equal(original.complete,true);assert.equal(priorAudit.passed,true);assert.equal(await sha256(join(protocol.sourceRun,'report.json')),priorAudit.reportSha256);
for(const[p,h]of Object.entries({...original.identity.inputs,...original.identity.sources}))assert.equal(await sha256(p),h);
const mappingPath='research/reports/reversal-candidate-2026-10-05/mapping.json',mapping=read(mappingPath).mapping,inputs={},sources={};
for(const p of [protocolPath,mappingPath,join(protocol.sourceRun,'report.json'),join(protocol.sourceRun,'audit-prefix.json')])inputs[p]=await sha256(p);
for(const p of ['.codebase/scripts/probe-relational-cues.mjs','.codebase/src/lowram/relational-chess-cue.mjs','.codebase/src/lowram/chess-cue.mjs','.codebase/src/lowram/graph.mjs','.codebase/src/lowram/trainer.mjs','.codebase/src/lowram/mbon-readout.mjs','.codebase/src/lowram/puzzle-round.mjs','.codebase/src/lowram/mushroom-body.mjs','.codebase/src/lowram/puzzle-search.mjs','.codebase/src/lowram/mate-certificate.mjs','.codebase/src/lowram/mate-certificate-check.mjs'])sources[p]=await sha256(p);
const tSetup=performance.now(),graph=loadGraph('.cache/full.npz'),ids=readNpz('.cache/full.npz',['root_ids']).root_ids,model=new SparseTrainer(graph,original.identity.model),invariant=brainIdentity(model);
for(const cells of Object.values(original.identity.readouts))for(const c of cells)assert.equal(ids[c.index].toString(),c.rootId);
await pace(tSetup);
const encoders={absolute:createChessCueEncoder(mapping,protocol.encoder),relational:createRelationalChessCueEncoder(mapping,protocol.encoder)},uci=m=>m.from+m.to+(m.promotion??'');
const jobs=protocol.positions.flatMap(p=>protocol.encoders.flatMap(encoder=>{const moves=new Chess(p.fen).moves({verbose:true}).map(uci);return [...moves.map(move=>({position:p.id,encoder,move,repeat:false})),{position:p.id,encoder,move:moves[0],repeat:true}];}));assert.ok(jobs.length<=protocol.maxEvaluations);
const identity={inputs,sources,originalIdentity:original.identity,invariant,jobs,duty,encoderIdentities:Object.fromEntries(Object.entries(encoders).map(([k,v])=>[k,v.identity]))};let state={identity,nextJob:0,results:[]};
if(args.resume){state=read(args.resume);assert.deepEqual(state.identity,identity);assert.equal(state.nextJob,state.results.length);assert.ok(state.nextJob>=0&&state.nextJob<=jobs.length);}
mkdirSync(dirname(args.out),{recursive:true});mkdirSync(args.out);
function save(name){const tmp=join(args.out,name+'.partial');mkdirSync(tmp);writeFileSync(join(tmp,'state.json'),JSON.stringify(state));renameSync(tmp,join(args.out,name));}
save('initial');let evaluations=0,stop=false;process.on('SIGINT',()=>stop=true);
while(state.nextJob<jobs.length&&evaluations<limit&&!stop){guard();const t=performance.now(),job=jobs[state.nextJob],p=protocol.positions.find(v=>v.id===job.position),board=new Chess(p.fen),history=board.pgn(),cue=encoders[job.encoder].encode(board,job.move,protocol.task);
  model.forward([0],cue.stimulation);evaluations++;const response=readMBON(Object.fromEntries(Object.entries(original.identity.readouts).map(([type,cells])=>[type,cells.map(c=>model.h[model.steps][c.index])])));
  assert.deepEqual(brainIdentity(model),invariant);assert.equal(board.pgn(),history);
  if(job.repeat){const first=state.results.find(v=>v.job.position===job.position&&v.job.encoder===job.encoder&&v.job.move===job.move);assert.deepEqual(first.cue,cue);assert.deepEqual(first.response,response);}
  state.results.push({job,cue,response,fixedStatePreserved:true});state.nextJob++;save('candidate-'+String(state.nextJob).padStart(3,'0'));await pace(t);
  if(state.nextJob%26===0)console.log(JSON.stringify({completed:state.nextJob,total:jobs.length}));
}
let summary=null,proofs=null;
if(state.nextJob===jobs.length){
  summary=protocol.positions.flatMap(p=>protocol.encoders.map(encoder=>{const rows=state.results.filter(v=>v.job.position===p.id&&v.job.encoder===encoder&&!v.job.repeat),overlaps=[];
    for(let i=0;i<rows.length;i++)for(let j=0;j<i;j++){const a=new Set(rows[i].cue.stimulation.map(v=>v.index)),b=new Set(rows[j].cue.stimulation.map(v=>v.index)),n=[...a].filter(v=>b.has(v)).length;overlaps.push(n/(a.size+b.size-n));}
    return{position:p.id,encoder,candidates:rows.length,distinctCues:new Set(rows.map(v=>digest(v.cue.stimulation))).size,distinctScores:new Set(rows.map(v=>v.response.score)).size,choice:[...rows].sort((a,b)=>b.response.score-a.response.score)[0].job.move,
      meanPairwiseCellJaccard:overlaps.reduce((a,b)=>a+b,0)/overlaps.length,cellsRange:[Math.min(...rows.map(v=>v.cue.accounting.stimulatedCells)),Math.max(...rows.map(v=>v.cue.accounting.stimulatedCells))],totalCurrentRange:[Math.min(...rows.map(v=>v.cue.accounting.totalCurrent)),Math.max(...rows.map(v=>v.cue.accounting.totalCurrent))]};}));
  proofs=protocol.positions.map(p=>{const board=new Chess(p.fen),after=copyBoard(board);after.move({from:p.checkedMove.slice(0,2),to:p.checkedMove.slice(2,4)});return{position:p.id,move:p.checkedMove,proof:certifyMate(after,board.turn(),{plies:0,maxNodes:4096,milliseconds:2000})};});
}
const cpu=process.cpuUsage(cpuStart),report={complete:state.nextJob===jobs.length,identity,protocol,results:state.results,summary,proofs,learningApplied:false,evaluationsThisInvocation:evaluations,command:{argv:process.argv,execArgv:process.execArgv,node:process.version},resources:{peakRssMiB:process.resourceUsage().maxRSS/1024,elapsedSeconds:(performance.now()-start)/1000,cpuSeconds:(cpu.user+cpu.system)/1e6,cpuDuty:duty},scope:protocol.scope};
writeFileSync(join(args.out,'report.json.partial'),JSON.stringify(report,null,2));renameSync(join(args.out,'report.json.partial'),join(args.out,'report.json'));console.log(JSON.stringify({complete:report.complete,summary,resources:report.resources}));
