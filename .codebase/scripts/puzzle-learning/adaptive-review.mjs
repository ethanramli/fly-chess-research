// Isolated candidate neural feedback experiment. Existing record-only/browser
// paths are unchanged. Teacher evidence and policy evaluations are separate.
import {readFileSync,mkdirSync,writeFileSync,renameSync,existsSync} from 'node:fs';
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
import {digest,annotationHash} from '../../src/neural-learning/mushroom-body.mjs';
import {fixedStateHash,shuffledFeedback} from '../../src/neural-learning/association-validation.mjs';
import {searchPuzzle} from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
import {copyBoard,uci} from '../../src/search-and-feedback/puzzle-search.mjs';
import {certifyMate} from '../../src/search-and-feedback/mate-certificate.mjs';
import {reviewPuzzleExperience} from '../../src/search-and-feedback/experience-feedback.mjs';
import {verifiedExperience} from '../../src/search-and-feedback/verified-feedback.mjs';
import {streamRows} from '../../src/runtime/storage.mjs';
import {sha256,graphHash} from '../runtime/fetch-graph.mjs';
const {values:args}=parseArgs({options:{out:{type:'string'},resume:{type:'string'},'cpu-duty':{type:'string',default:'0.5'},'max-events':{type:'string',default:'40'}}});
const duty=Number(args['cpu-duty']),limit=Number(args['max-events']);
if(!args.out||existsSync(args.out)||!(duty>=0.1&&duty<=1)||!Number.isSafeInteger(limit)||limit<1||limit>40)throw Error('Require new output and bounded options');
const started=performance.now(),cpuStart=process.cpuUsage();
function guard(){if(process.memoryUsage().rss>768*2**20||os.freemem()<256*2**20)throw Error('Soft guard: resume last completed state to new output');}
async function pace(t){let ms=(performance.now()-t)*(1/duty-1);do{await new Promise(r=>setTimeout(r,Math.min(250,Math.max(0,ms))));ms-=250;guard();}while(ms>0);}
guard();
const protocolPath='research/data/adaptive-review-v1/protocol.json',protocol=JSON.parse(readFileSync(protocolPath));
const prereq=JSON.parse(readFileSync(join(protocol.prerequisite,'report.json'))),prereqAudit=JSON.parse(readFileSync(join(protocol.prerequisite,'audit-prefix.json')));
assert.equal(prereq.complete,true);assert.equal(prereq.summary.allGatesPassed,true);assert.equal(prereqAudit.allChecksPassed,true);assert.equal(prereqAudit.prefixReplayExact,true);
const mappingPath='research/reports/reversal-candidate-2026-10-05/mapping.json',mapping=JSON.parse(readFileSync(mappingPath)).mapping;
const inputs={},sources={};
for(const p of [protocolPath,'.cache/full.npz','.cache/flywire-annotations-v2.1.0.tsv',mappingPath,protocol.puzzles,join(protocol.prerequisite,'report.json'),join(protocol.prerequisite,'audit-prefix.json'),join(protocol.fixedRun,'report.json'),join(protocol.fixedRun,'audit-prefix.json')])inputs[p]=await sha256(p);
assert.equal(inputs['.cache/full.npz'],graphHash);assert.equal(inputs['.cache/flywire-annotations-v2.1.0.tsv'],annotationHash);
assert.equal(await sha256(join(protocol.prerequisite,'report.json')),prereqAudit.reportSHA256);
for(const[p,h]of Object.entries(prereq.identity.inputs))assert.equal(await sha256(p),h);
for(const[p,h]of Object.entries(prereq.identity.sources))assert.equal(await sha256(p),h);
for(const p of ['.codebase/scripts/puzzle-learning/adaptive-review.mjs','.codebase/src/search-and-feedback/experimental-puzzle-search.mjs','.codebase/src/search-and-feedback/puzzle-search.mjs','.codebase/src/search-and-feedback/verified-feedback.mjs','.codebase/src/neural-learning/mbon-readout.mjs','.codebase/src/chess-input/chess-cue.mjs','.codebase/src/neural-learning/reversal-memory.mjs','.codebase/src/supervised-baselines/trainer.mjs','.codebase/src/runtime/graph.mjs','.codebase/src/neural-learning/mushroom-body.mjs','.codebase/src/neural-learning/association-validation.mjs','.codebase/src/search-and-feedback/experience-feedback.mjs','.codebase/src/search-and-feedback/mate-certificate.mjs','.codebase/src/search-and-feedback/mate-certificate-check.mjs','.codebase/src/runtime/storage.mjs'])sources[p]=await sha256(p);
let puzzle;
for await(const row of streamRows(protocol.puzzles)){assert.ok(['fixture','train'].includes(row.split));puzzle=row;break;}
if(!puzzle)throw Error('No puzzle fixture');
const board=new Chess(puzzle.fen),realHistory=board.pgn();
const setup=performance.now(),graph=loadGraph('.cache/full.npz'),ids=readNpz('.cache/full.npz',['root_ids']).root_ids;
const model=new SparseTrainer(graph,prereq.identity.model),memory=new ReversalMemory(model,mapping,protocol),naive=memory.snapshot();
const invariant=fixedStateHash(model,memory.edges);assert.equal(invariant,prereq.identity.invariant);
const readouts=prereq.identity.readouts;
for(const cells of Object.values(readouts))for(const c of cells)assert.equal(ids[c.index].toString(),c.rootId);
for(const g of mapping.groups)for(const c of g.dan)assert.equal(ids[c.index].toString(),c.rootId);
model.forward([0]);const rest=Float32Array.from(model.h[model.steps]);await pace(setup);
const encoder=createChessCueEncoder(mapping,{...protocol.encoder,seed:protocol.encoderSeed});
const identity={schema:protocol.schema,inputs,sources,model:model.config,memory:memory.config,mappingHash:digest(mapping),readouts,invariant,encoderIdentity:encoder.identity,duty,puzzle};
let state={identity,checkpoint:0,nextCondition:0,active:null,results:[]};
if(args.resume){const s=JSON.parse(readFileSync(args.resume));assert.equal(digest(s.identity),digest(identity));assert.equal(s.results.length,s.nextCondition);assert.ok(s.nextCondition>=0&&s.nextCondition<=protocol.conditions.length);state=s;if(s.active)memory.restore(s.active.memory);}
mkdirSync(dirname(args.out),{recursive:true});mkdirSync(args.out);
function save(){if(state.active)state.active.memory=memory.snapshot();state.checkpoint++;const name=`checkpoint-${String(state.checkpoint).padStart(5,'0')}`,tmp=join(args.out,name+'.partial');mkdirSync(tmp);writeFileSync(join(tmp,'state.json'),JSON.stringify(state));renameSync(tmp,join(args.out,name));}
save();let events=0,evaluations=0,stop=false;process.on('SIGINT',()=>{stop=true;});
async function evoke(stimulation){guard();if(state.active.calls>=protocol.maxBrainCalls)throw Error('Neural presentation bound: resume/inspect last checkpoint');const t=performance.now();model.forward([0],stimulation);state.active.calls++;evaluations++;
  const score=readMBON(Object.fromEntries(Object.entries(readouts).map(([type,cells])=>[type,cells.map(c=>model.h[model.steps][c.index])])));await pace(t);return score;}
async function probe(b){const moves=b.moves({verbose:true});if(!moves.length||moves.length>protocol.maxLegalMoves)throw Error('Legal candidate bound');const before=digest(memory.snapshot()),rows=[];
  for(const m of moves){const cue=encoder.encode(b,uci(m),protocol.taskContext??{objective:puzzle.objective,plies:puzzle.plies});const response=await evoke(cue.stimulation);rows.push({move:uci(m),score:response.score,MBON12:response.MBON12,MBON01:response.MBON01});}
  assert.equal(digest(memory.snapshot()),before);const ranked=[...rows].sort((a,b)=>b.score-a.score);return{rows,choice:ranked[0].move,memoryHash:before};}
function checkFixed(){assert.equal(fixedStateHash(model,memory.edges),invariant);assert.equal(board.pgn(),realHistory);}

const fixedReport=JSON.parse(readFileSync(join(protocol.fixedRun,'report.json'))),fixedAudit=JSON.parse(readFileSync(join(protocol.fixedRun,'audit-prefix.json')));
assert.equal(fixedReport.complete,true);assert.equal(fixedAudit.passed,true);assert.equal(inputs[join(protocol.fixedRun,'report.json')],fixedAudit.reportSha256);
const fixed=fixedReport.results.find(r=>r.condition==='informative');assert.equal(fixed.schedule.length,protocol.feedbackBudget);
function assess(move){const b=copyBoard(board);b.move({from:move.slice(0,2),to:move.slice(2,4),...(move.length===5?{promotion:move[4]}:{})});return certifyMate(b,board.turn(),{plies:puzzle.plies-1,maxNodes:4096,milliseconds:2000});}
function controlSequence(){const adaptive=state.results.find(r=>r.condition==='adaptive');assert.ok(adaptive);return adaptive.schedule;}
while(state.nextCondition<protocol.conditions.length&&!stop){
  const condition=protocol.conditions[state.nextCondition];
  if(!state.active){memory.restore(naive);state.active={condition,phase:'baseline',calls:0,receipts:[],probes:[],schedule:[],nextEvent:0,memory:memory.snapshot(),current:null};save();}
  const a=state.active;assert.equal(a.condition,condition);
  if(a.phase==='baseline'){a.before=await probe(board);a.initialProof=assess(a.before.choice);a.phase='teaching';checkFixed();save();}
  while(a.nextEvent<protocol.feedbackBudget&&!stop&&events<limit){
    if(a.phase==='teaching'){
      if(!a.current){let selected,proof;
        if(condition==='adaptive'){selected=(a.probes.at(-1)??a.before).choice;proof=assess(selected);}
        else if(condition==='fixed'){selected=fixed.schedule[a.nextEvent].move;proof=fixed.experience.evidence.find(e=>e.move===selected).proof;}
        else{const source=controlSequence()[a.nextEvent];selected=source.move;proof=source.proof;}
        const verified=verifiedExperience(board,selected,puzzle,proof);let delivered=verified.experimentalPulse;
        if(condition==='absent')delivered=false;
        if(condition==='shuffled'){const sequence=controlSequence(),known=sequence.filter(e=>e.learningAllowed),pulses=shuffledFeedback(known.map(e=>e.experimentalPulse),protocol.encoderSeed);const index=sequence.slice(0,a.nextEvent+1).filter(e=>e.learningAllowed).length-1;delivered=verified.learningAllowed?pulses[index]:null;}
        a.current={...verified,proof,delivered,attempt:a.nextEvent};save();
      }
      const event=a.current,before=memory.snapshot();
      if(event.learningAllowed){
        // Replay checks are repeated at the delivery boundary, including resume.
        assert.equal(verifiedExperience(board,event.move,puzzle,event.proof).certificateSha256,event.certificateSha256);
        const drive=encoder.encode(board,event.move,{objective:puzzle.objective,plies:puzzle.plies}).stimulation;
        if(event.delivered)for(const g of mapping.groups.filter(g=>g.danType==='PPL103'))for(const c of g.dan)drive.push({index:c.index,current:protocol.current});
        const response=await evoke(drive),h=model.h[model.steps],kc=mapping.groups.flatMap(g=>g.kc.map(i=>Math.max(0,h[i]-rest[i])/protocol.activityScale));
        const update=condition==='disabled'?{events:memory.events,changedEdges:0,factors:[]}:memory.observe(rest);
        a.pending={event,response,local:{kc,factors:update.factors},update,before,after:memory.snapshot(),appliedToNeurons:true,learningApplied:update.changedEdges>0};
      }else a.pending={event,before,after:memory.snapshot(),appliedToNeurons:false,learningApplied:false};
      a.phase='measure';checkFixed();save();
    }
    if(a.phase==='measure'){
      const measured=await probe(board),preferredProof=assess(measured.choice);
      a.pending.probeAfter=measured;a.pending.preferredProof=preferredProof;
      a.receipts.push(a.pending);a.probes.push(measured);a.schedule.push(a.current);a.pending=null;a.current=null;a.nextEvent++;events++;a.phase='teaching';checkFixed();save();
      console.log(JSON.stringify({condition,attempt:a.nextEvent,reviewed:a.schedule.at(-1).move,reviewStatus:a.schedule.at(-1).status,nextChoice:measured.choice,nextStatus:preferredProof.status}));
    }
  }
  if(a.nextEvent<protocol.feedbackBudget||stop)break;
  if(a.phase==='teaching'){a.phase='retention';save();}
  if(a.phase==='retention'){
    a.after=a.probes.at(-1);a.repeat=await probe(board);const learned=memory.snapshot();memory.restore(naive);a.reset=await probe(board);memory.restore(learned);a.restored=await probe(board);
    assert.deepEqual(a.after,a.repeat);assert.deepEqual(a.before,a.reset);assert.deepEqual(a.after,a.restored);checkFixed();
    a.finalProof=assess(a.after.choice);a.finalMemory=learned;a.fixedStatePreserved=true;a.phase='done';state.results.push({...a});state.active=null;state.nextCondition++;save();
  }
  if(events>=limit)break;
}
const complete=state.nextCondition===protocol.conditions.length;let summary=null;
if(complete){const adaptive=state.results.find(r=>r.condition==='adaptive'),flags=adaptive.schedule.filter(e=>e.learningAllowed).map(e=>e.experimentalPulse),shuffleIdentifiable=flags.includes(true)&&flags.includes(false);
  const gates={fixtureRepair:adaptive.finalProof.status==='success'&&adaptive.initialProof.status==='failure'&&digest(adaptive.after)===digest(adaptive.repeat)&&digest(adaptive.after)===digest(adaptive.restored)&&digest(adaptive.reset)===digest(adaptive.before),
    informativeSpecificity:shuffleIdentifiable&&adaptive.finalProof.status==='success'&&['absent','shuffled','disabled'].every(c=>state.results.find(r=>r.condition===c).finalProof.status==='failure')};
  summary={gates,shuffleIdentifiable,conditions:state.results.map(a=>({condition:a.condition,choice:a.after.choice,status:a.finalProof.status,knownEvents:a.schedule.filter(e=>e.learningAllowed).length,pulses:a.schedule.filter(e=>e.delivered===true&&e.learningAllowed).length,fullRootChoices:a.probes.map(v=>v.choice)}))};
}
const cpu=process.cpuUsage(cpuStart),report={complete,identity,protocol,summary,results:state.results,active:state.active,evaluationsThisInvocation:evaluations,
  command:{argv:process.argv,execArgv:process.execArgv,node:process.version},resources:{peakRssMiB:process.resourceUsage().maxRSS/1024,elapsedSeconds:(performance.now()-started)/1000,cpuSeconds:(cpu.user+cpu.system)/1e6,cpuDuty:duty},
  scope:'Predetermined-budget all-legal adaptive fixture repair, fixed sampling comparison and sequence-matched controls; not transfer or biological validation.'};
writeFileSync(join(args.out,'report.json.partial'),JSON.stringify(report,null,2));renameSync(join(args.out,'report.json.partial'),join(args.out,'report.json'));console.log(JSON.stringify({complete,summary,resources:report.resources}));

