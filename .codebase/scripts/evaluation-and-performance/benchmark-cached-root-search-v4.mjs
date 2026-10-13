import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,renameSync,mkdirSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { Chess } from 'chess.js';
import { loadGraph,readNpz } from '../../src/runtime/graph.mjs';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { fixedStateHash } from '../../src/neural-learning/association-validation.mjs';
import { digest } from '../../src/neural-learning/mushroom-body.mjs';
import { createCompartmentChessCueEncoder } from '../../src/chess-input/compartment-chess-cue.mjs';
import { DualValencePuzzleBrain } from '../../src/puzzle-learning/dual-valence-puzzle-brain.mjs';
import { createAssessmentCache } from '../../src/puzzle-learning/assessment-cache.mjs';
import { searchMonteCarlo } from '../../src/search-and-feedback/monte-carlo-puzzle-search.mjs';
import { uci } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
import { reviewCommittedChoice } from '../../src/search-and-feedback/adaptive-choice-review.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';

const read=p=>JSON.parse(readFileSync(p,'utf8')),protocolPath='research/data/cached-root-search-v4/protocol.json';
const p=read(protocolPath);assert.equal(p.schema,'cached-root-search-v4');const base=read(p.baseProtocol),neural=read(p.neuralReport),audit=read(p.neuralAudit);
assert.ok(process.execArgv.includes('--max-old-space-size=256'));assert.equal(process.version,base.runtime.nodeVersion);assert.equal(p.cpuDuty,.5);
for(const [path,expected] of Object.entries(p.pins))assert.equal(await sha256(path),expected,path);
assert.equal(neural.complete,true);assert.equal(audit.passed,true);assert.equal(audit.reportSha256,await sha256(p.neuralReport));
const row=readFileSync(p.puzzlePath,'utf8').trim().split(/\r?\n/).map(JSON.parse).find(x=>x.id===p.puzzleId);
assert.equal(row.split,'train');const referenceEvent=neural.results.find(x=>x.condition==='informative').eventRefs[0];
assert.equal(await sha256(referenceEvent.path),referenceEvent.sha256);const event=read(referenceEvent.path);
const identity={protocolSha256:await sha256(protocolPath),pins:p.pins};mkdirSync(p.out,{recursive:true});
const atomic=(path,value)=>{writeFileSync(path+'.partial',JSON.stringify(value,null,2)+'\n');renameSync(path+'.partial',path);};
const guard=()=>{if(process.memoryUsage().rss>768*2**20||os.freemem()<256*2**20)throw Error('Resource guard');};
guard();const setupStarted=performance.now(),graph=loadGraph('.cache/full.npz');guard();
const ids=readNpz('.cache/full.npz',['root_ids']).root_ids,model=new SparseTrainer(graph,base.shared.model);guard();
const mapping=read(base.mappingPath).mapping,memory=new ReversalMemory(model,mapping,base.shared.memory);guard();
assert.equal(fixedStateHash(model,memory.edges),base.shared.invariant);
for(const cell of [...Object.values(base.shared.readouts).flat(),...mapping.groups.flatMap(g=>g.dan)])assert.equal(ids[cell.index].toString(),cell.rootId);
const encoder=createCompartmentChessCueEncoder(mapping,{...base.encoder,...base.variant});model.forward([0]);
const rest=Float32Array.from(model.h[model.steps]);guard();const setupSeconds=(performance.now()-setupStarted)/1000;
const board=new Chess(row.fen),task={objective:row.objective,plies:row.plies};assert.equal(event.experience.context.fen,row.fen);
const outcomes=[];
for(const mode of ['uncached','cached']) {
 const path=join(p.out,mode+'.json');
 if(existsSync(path)){const saved=read(path);assert.deepEqual(saved.identity,identity);outcomes.push(saved);continue;}
 memory.restore(event.after);assert.equal(fixedStateHash(model,memory.edges),base.shared.invariant);
 const phase={assessmentMs:0,searchMs:0,neuralPresentationMs:0},cpu=process.cpuUsage();let presentations=0;
 let pace=async ms=>{let remaining=ms;while(remaining>0){const wait=Math.min(250,remaining);await new Promise(resolve=>setTimeout(resolve,wait));remaining-=wait;guard();}};
 const brain=new DualValencePuzzleBrain({model,memory,mapping,encoder,readouts:base.shared.readouts,rest,current:base.current,
  priorScale:base.priorScale,maxPresentations:256,guard,pace});
 const originalEvoke=brain.evoke.bind(brain);
 brain.evoke=async(...args)=>{const start=performance.now();try{return await originalEvoke(...args);}finally{presentations++;phase.neuralPresentationMs+=performance.now()-start;}};
 const originalAssess=brain.assess.bind(brain);
 const cache=createAssessmentCache({assess:originalAssess,guard,capacity:2,
  identity:()=>digest({fixed:fixedStateHash(model,memory.edges),config:model.config,memory:memory.snapshot(),readouts:brain.readouts,encoder:encoder.identity})});
 const freshAssess=mode==='cached'?cache.assess:originalAssess;
 if(mode==='cached') brain.assess=(...args)=>cache.assess(...args);
 const start=performance.now(),before=memory.snapshot();
 let timer=performance.now(),assessment=await freshAssess(board,board.moves({verbose:true}),task,{fresh:true});phase.assessmentMs+=performance.now()-timer;
 const freshRepeat=await freshAssess(board,board.moves({verbose:true}),task,{fresh:true});
 assert.deepEqual(assessment,freshRepeat);assert.deepEqual(memory.snapshot(),before);assert.equal(board.fen(),row.fen);
 timer=performance.now();
 const search=await searchMonteCarlo(brain,board,{seed:base.evaluationSearch.seed,simulations:1,maxEvaluations:2,maxDepth:3,maxNodes:1024,
   milliseconds:120000,exploration:1.5,randomFraction:0.25,uniformMix:0.15,candidateMode:'all-legal',maxCandidates:64,quietReserve:0,
   forcingPriorMix:0,task,guard});phase.searchMs=performance.now()-timer;
 assert.equal(memory.snapshot().events,before.events);assert.deepEqual(memory.snapshot(),before);assert.equal(fixedStateHash(model,memory.edges),base.shared.invariant);
 assert.equal(board.fen(),row.fen);assert.equal(search.evaluations,2);assert.equal(search.candidateCoverage.rootSelected.length,board.moves().length);
 const review=reviewCommittedChoice(board,uci(search.move),task,base.verification);
 const used=process.cpuUsage(cpu),result={identity,mode,fen:board.fen(),task,assessment,freshRepeat,
   assessmentChoiceReview:reviewCommittedChoice(board,assessment.choice,task,base.verification),search,searchReview:review,
   memory:memory.snapshot(),fixedStateHash:fixedStateHash(model,memory.edges),presentations,cache:cache.stats,phase,
   resources:{elapsedSeconds:(performance.now()-start)/1000,cpuSeconds:(used.user+used.system)/1e6,peakRssMiB:process.resourceUsage().maxRSS/1024},
   stages:{candidateAssessment:true,monteCarloSearch:true,verifiedChoiceReview:true,feedback:false,persistentLearning:false,transfer:false}};
 atomic(path,result);outcomes.push(result);guard();
}
assert.deepEqual(outcomes[0].assessment,outcomes[1].assessment);assert.deepEqual(outcomes[0].freshRepeat,outcomes[1].freshRepeat);
const policySignature=x=>{const {elapsedMs,phaseTiming,...policy}=x;return policy;};
const reviewSignature=x=>({status:x.status,learningAllowed:x.learningAllowed,actor:x.actor,move:x.move,certificateSha256:x.certificateSha256});
assert.deepEqual(policySignature(outcomes[0].search),policySignature(outcomes[1].search));assert.deepEqual(reviewSignature(outcomes[0].searchReview),reviewSignature(outcomes[1].searchReview));
assert.deepEqual(outcomes[0].memory,outcomes[1].memory);assert.equal(outcomes[1].cache.hits,1);assert.equal(outcomes[1].cache.avoidedCandidatePresentations,board.moves().length);
const final={complete:true,identity,setupSeconds,rootLegalMoves:board.moves().length,outcomes,
 scope:'One training fixture and one two-evaluation all-legal Monte Carlo search after a fresh assessment/repeat. This does not test full puzzle learning, scale or transfer.'};
atomic(join(p.out,'report.json'),final);atomic(join(p.out,'COMPLETE.json'),{reportSha256:await sha256(join(p.out,'report.json'))});
console.log(JSON.stringify({setupSeconds,results:outcomes.map(x=>({mode:x.mode,presentations:x.presentations,search:x.search.elapsedMs,selected:x.searchReview.status,cache:x.cache,resources:x.resources}))},null,2));
