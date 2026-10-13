import {readFileSync,mkdirSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import os from 'node:os';
import {Chess} from 'chess.js';
import {loadGraph,readNpz} from '../../src/runtime/graph.mjs';
import {SparseTrainer} from '../../src/supervised-baselines/trainer.mjs';
import {createChessCueEncoder} from '../../src/chess-input/chess-cue.mjs';
import {calibrateGF,readGF} from '../../src/neural-learning/gf-readout.mjs';
import {mapReversalMemory} from '../../src/neural-learning/reversal-memory.mjs';
import {digest,annotationHash} from '../../src/neural-learning/mushroom-body.mjs';
import {brainIdentity} from '../../src/puzzle-learning/puzzle-round.mjs';
import {sha256,graphHash} from '../runtime/fetch-graph.mjs';

const {values:args}=parseArgs({options:{out:{type:'string'},resume:{type:'string'},'cpu-duty':{type:'string',default:'0.5'}}});
const duty=Number(args['cpu-duty']);if(!args.out||existsSync(args.out)||!(duty>=0.1&&duty<=1))throw Error('Require new --out and bounded duty');
const started=performance.now(),cpuStart=process.cpuUsage();
function guard(){if(process.memoryUsage().rss>768*2**20||os.freemem()<256*2**20)throw Error('Soft memory guard; resume last completed candidate checkpoint');}
async function pace(t){let remaining=(performance.now()-t)*(1/duty-1);do{const n=Math.min(250,Math.max(0,remaining));await new Promise(r=>setTimeout(r,n));remaining-=n;guard();}while(remaining>0);}
guard();
const protocolPath='research/data/chess-cue-panel-v1/protocol.json',mappingPath='research/reports/reversal-candidate-2026-10-05/mapping.json',anatomyPath='research/reports/instinct-design-2026-10-05/anatomy-with-relay.json';
const protocol=JSON.parse(readFileSync(protocolPath)),rawMapping=JSON.parse(readFileSync(mappingPath)),anatomy=JSON.parse(readFileSync(anatomyPath));
const inputs={},sources={};
for(const path of [protocolPath,mappingPath,anatomyPath,'.cache/full.npz','.cache/flywire-annotations-v2.1.0.tsv'])inputs[path]=await sha256(path);
assert.equal(inputs['.cache/full.npz'],graphHash);assert.equal(inputs['.cache/flywire-annotations-v2.1.0.tsv'],annotationHash);
for(const path of ['.codebase/scripts/chess-input/probe-chess-cues.mjs','.codebase/src/chess-input/chess-cue.mjs','.codebase/src/neural-learning/gf-readout.mjs','.codebase/src/supervised-baselines/trainer.mjs',
  '.codebase/src/runtime/graph.mjs','.codebase/src/neural-learning/reversal-memory.mjs','.codebase/src/neural-learning/mushroom-body.mjs','.codebase/src/puzzle-learning/puzzle-round.mjs'])sources[path]=await sha256(path);
const setup=performance.now(),graph=loadGraph('.cache/full.npz'),ids=readNpz('.cache/full.npz',['root_ids']).root_ids;
const mapping=await mapReversalMemory(graph,ids,'.cache/flywire-annotations-v2.1.0.tsv',async()=>{guard();});
assert.equal(digest(mapping),digest(rawMapping.mapping),'Mapped neuron identities no longer reproduce');
assert.equal(rawMapping.moduleSha256,sources['.codebase/src/neural-learning/reversal-memory.mjs']);
const encoder=createChessCueEncoder(mapping,protocol.encoder),gf=anatomy.giantFibers.map(c=>({index:c.index,rootId:c.rootId}));
assert.equal(gf.length,2);for(const c of gf)assert.equal(ids[c.index].toString(),c.rootId);
const model=new SparseTrainer(graph,protocol.model),invariant=brainIdentity(model);
model.forward([0]);const resting=gf.map(c=>model.h[model.steps][c.index]);await pace(setup);
const jobs=protocol.positions.flatMap(p=>{
  const b=new Chess(p.fen);for(const m of p.moves)b.move(m);const moves=b.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
  return [...moves.map(move=>({position:p.id,move,repeat:false})),{position:p.id,move:moves[0],repeat:true}];
});
const identity={schema:protocol.schema,inputs,sources,model:model.config,invariant,encoderIdentity:encoder.identity,gf,resting,jobs,duty};
let state={identity,nextJob:0,results:[]};
if(args.resume){const prior=JSON.parse(readFileSync(args.resume));assert.equal(digest(prior.identity),digest(identity),'Resume identity mismatch');assert.equal(prior.results.length,prior.nextJob);assert.ok(prior.nextJob>=0&&prior.nextJob<=jobs.length);state=prior;}
mkdirSync(dirname(args.out),{recursive:true});mkdirSync(args.out);
function save(name){const tmp=join(args.out,name+'.partial');mkdirSync(tmp);writeFileSync(join(tmp,'state.json'),JSON.stringify(state));renameSync(tmp,join(args.out,name));}
save('initial');let stop=false,evaluations=1;process.on('SIGINT',()=>{stop=true;});
while(state.nextJob<jobs.length&&!stop){
  guard();const t=performance.now(),job=jobs[state.nextJob],p=protocol.positions.find(p=>p.id===job.position),b=new Chess(p.fen);for(const m of p.moves)b.move(m);
  const cue=encoder.encode(b,job.move,protocol.taskContext);model.forward([0],cue.stimulation);evaluations++;
  const rawGF=gf.map(c=>model.h[model.steps][c.index]);assert.deepEqual(brainIdentity(model),invariant,'Read-only input probe changed graph or parameters');
  const row={job,cue,rawGF,excessGF:rawGF.map((v,i)=>v-resting[i])};
  if(job.repeat){const first=state.results.find(r=>r.job.position===job.position&&r.job.move===job.move);assert.deepEqual(first.cue,cue);assert.deepEqual(first.rawGF,rawGF);}
  state.results.push(row);state.nextJob++;save(`candidate-${String(state.nextJob).padStart(3,'0')}`);await pace(t);
  console.log(JSON.stringify({candidate:state.nextJob,total:jobs.length,...job,rawGF,cells:cue.accounting.stimulatedCells}));
}
let calibration=null,summary=null;
if(state.nextJob===jobs.length){
  const samples=state.results.filter(r=>!r.job.repeat).map(r=>r.rawGF);calibration=calibrateGF(samples,protocol.calibration);
  summary={calibrationUsable:calibration.usable,positions:protocol.positions.map(p=>{
    const rows=state.results.filter(r=>r.job.position===p.id&&!r.job.repeat),signals=rows.map(r=>calibration.usable?readGF(r.rawGF,calibration):null);
    return {position:p.id,candidates:rows.length,distinctCues:new Set(rows.map(r=>digest(r.cue.stimulation))).size,
      distinctGFResponses:new Set(rows.map(r=>digest(r.rawGF))).size,
      distinctClippedScores:calibration.usable?new Set(signals.map(s=>s.score)).size:null,
      scoreRange:calibration.usable?[Math.min(...signals.map(s=>s.score)),Math.max(...signals.map(s=>s.score))]:null,
      clippedRestReferenceTies:rows.every(r=>r.excessGF.every(v=>v<=0)),
      repeatedProbeExact:true};}),graphAndParametersUnchanged:true};
}
const cpu=process.cpuUsage(cpuStart),report={complete:state.nextJob===jobs.length,identity,protocol,calibration,summary,results:state.results,evaluationsThisInvocation:evaluations,
  command:{argv:process.argv,execArgv:process.execArgv,node:process.version},resources:{peakRssMiB:process.resourceUsage().maxRSS/1024,elapsedSeconds:(performance.now()-started)/1000,cpuSeconds:(cpu.user+cpu.system)/1e6,cpuDuty:duty},
  learningApplied:false,scope:'Naive input-domain engineering calibration; no choices, search, verification, feedback or plasticity. Does not pass learning/transfer or biological gates.'};
writeFileSync(join(args.out,'report.json.partial'),JSON.stringify(report,null,2));renameSync(join(args.out,'report.json.partial'),join(args.out,'report.json'));
console.log(JSON.stringify({complete:report.complete,summary,calibration,resources:report.resources}));
