// Read-only real-graph mechanics check for registration r10 (alpha1 store). No run
// directory and no files written; one training board, a handful of presentations.
// Checks: cue v4 drives alpha/beta KCs; a task-phase PAM02 pulse adds PAM11 and
// depresses alpha1 edges; the same pulse outside the task phase leaves alpha1 alone.
// Usage: node --max-old-space-size=256 research/reports/alpha-one-mapping-2026-10-25/mechanics-check.mjs
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {createLichessStage1BrainV4} from '../../../.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v4.mjs';
import {createDualValenceInterface} from '../../../.codebase/src/neural-learning/dual-valence-interface.mjs';

const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r10-registration.json','utf8'));
const built=createLichessStage1BrainV4({registration,replica:'r1',repositoryRoot:process.cwd()});
const {brain,memory,model,rest,mapping}=built;
const row=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/)[0]);
const board=new Chess();board.loadPgn(row.lesson.context.pgn);
const task={objective:'capture-retention',plies:1},move=board.moves({verbose:true})[0],action=move.from+move.to+(move.promotion??'');
const cue=brain.encoder.encode(board,action,task);
const byCompartment=Object.groupBy(cue.assignments,a=>a.compartment);
const alphaKC=new Set(mapping.groups.filter(g=>g.danType==='PAM11').flatMap(g=>g.kc));
const excess=i=>Math.max(0,model.h[model.steps][i]-rest[i]);
const interface_=createDualValenceInterface(mapping,1.5),stim=interface_.present(cue.stimulation,'PAM02').stimulation;
const out={cueCells:cue.stimulation.length,assignmentsPerCompartment:Object.fromEntries(Object.entries(byCompartment).map(([k,v])=>[k,v.length]))};

let response=await brain.evoke(cue.stimulation);
out.cueOnly={response:{MBON12:response.MBON12,MBON01:response.MBON01,MBON07:response.MBON07,score:response.score},
  activeAlphaKC:[...alphaKC].filter(i=>excess(i)>0).length};
const before=[...memory.alphaGains];
brain.rewardPhase='task';response=await brain.evoke(stim);brain.rewardPhase=null;
out.taskReward={delivery:brain.alphaOneDelivery&&{cells:brain.alphaOneDelivery.cells.length,current:brain.alphaOneDelivery.current}};
let update=memory.observe(rest);
out.taskReward.alphaFactors=update.alphaFactors;out.taskReward.alphaChangedEdges=update.alphaChangedEdges;
out.taskReward.minAlphaGain=Math.min(...memory.alphaGains);
const afterTask=[...memory.alphaGains];
response=await brain.evoke(stim);update=memory.observe(rest);
out.nonTaskReward={alphaFactors:update.alphaFactors,alphaChangedEdges:update.alphaChangedEdges,
  alphaUnchanged:afterTask.every((v,i)=>v===memory.alphaGains[i])};
out.alphaEdgesChangedByTask=before.filter((v,i)=>v!==afterTask[i]).length;
console.log(JSON.stringify(out,null,1));
