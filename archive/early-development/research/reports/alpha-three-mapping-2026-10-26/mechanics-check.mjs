// Read-only real-graph mechanics check for registration r11 (alpha1 + alpha3 stores).
// No run directory and no files written; one training board, a handful of presentations.
// The registration is rebuilt in memory by the registration builder (revision 11) and,
// when the saved r11 file exists, checked equal to it.
// Checks: cue v4 reaches alpha3 KCs; a task-phase PPL103 pulse adds PPL106 and
// depresses alpha3 edges only; a task-phase PAM02 pulse adds PAM11 and depresses alpha1
// edges only; the same pulses outside the task phase add nothing (network leak only).
// Usage: node --max-old-space-size=256 research/reports/alpha-three-mapping-2026-10-26/mechanics-check.mjs
import {readFileSync,existsSync} from 'node:fs';
import {Chess} from 'chess.js';
import {buildRegistration} from '../../../.codebase/scripts/puzzle-learning/build-lichess-stage1-registration-v1.mjs';
import {createLichessStage1BrainV5} from '../../../.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v5.mjs';
import {createDualValenceInterface} from '../../../.codebase/src/neural-learning/dual-valence-interface.mjs';

const saved='research/data/lichess-stage1-synthetic-v1/stage1-smoke-r11-registration.json';
const registration=buildRegistration({mode:'smoke',id:'smoke-r11',revision:11});
const out={savedRegistrationEqual:existsSync(saved)?JSON.stringify(registration,null,1)+'\n'===readFileSync(saved,'utf8'):'not written'};
const built=createLichessStage1BrainV5({registration,replica:'r1',repositoryRoot:process.cwd()});
const {brain,memory,model,rest,mapping}=built;
const row=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/)[0]);
const board=new Chess();board.loadPgn(row.lesson.context.pgn);
const task={objective:'capture-retention',plies:1},move=board.moves({verbose:true})[0],action=move.from+move.to+(move.promotion??'');
const cue=brain.encoder.encode(board,action,task);
const excess=i=>Math.max(0,model.h[model.steps][i]-rest[i]);
const groupsOf=type=>mapping.groups.filter(g=>g.danType===type);
const kcOf=type=>new Set(groupsOf(type).flatMap(g=>g.kc));
const nAlphaOne=groupsOf('PAM11').reduce((n,g)=>n+g.edges.length,0);
const split=gains=>({alphaOne:gains.slice(0,nAlphaOne),alphaThree:gains.slice(nAlphaOne)});
const changed=(a,b)=>a.filter((v,i)=>v!==b[i]).length;
const interface_=createDualValenceInterface(mapping,1.5);
out.cueCells=cue.stimulation.length;
out.cueAssignmentsPerCompartment=Object.fromEntries(Object.entries(Object.groupBy(cue.assignments,a=>a.compartment)).map(([k,v])=>[k,v.length]));
let response=await brain.evoke(cue.stimulation);
out.cueOnly={MBON12:response.MBON12,MBON01:response.MBON01,MBON07:response.MBON07,MBON14:response.MBON14,score:response.score,
  activeAlphaOneKC:[...kcOf('PAM11')].filter(i=>excess(i)>0).length,activeAlphaThreeKC:[...kcOf('PPL106')].filter(i=>excess(i)>0).length};
const pulse=async(channel,phase)=>{
  const before=split([...memory.alphaGains]);
  brain.rewardPhase=phase;response=await brain.evoke(interface_.present(cue.stimulation,channel).stimulation);
  const delivery=brain.alphaLobeDelivery;brain.rewardPhase=null;brain.alphaLobeDelivery=null;
  const update=memory.observe(rest),after=split([...memory.alphaGains]);
  return {channel,phase,delivery:delivery&&{channels:delivery.channels,cells:delivery.cells.length,current:delivery.current},
    alphaFactors:Object.fromEntries(update.alphaDanTypes.map((t,i)=>[`${t}:${i}`,update.alphaFactors[i]])),
    alphaOneChanged:changed(before.alphaOne,after.alphaOne),alphaThreeChanged:changed(before.alphaThree,after.alphaThree),
    minAlphaOne:Math.min(...after.alphaOne),minAlphaThree:Math.min(...after.alphaThree)};
};
out.taskPunishment=await pulse('PPL103','task');
out.taskReward=await pulse('PAM02','task');
out.nonTaskPunishment=await pulse('PPL103','stockfish');
out.nonTaskReward=await pulse('PAM02','stockfish');
console.log(JSON.stringify(out,null,1));
