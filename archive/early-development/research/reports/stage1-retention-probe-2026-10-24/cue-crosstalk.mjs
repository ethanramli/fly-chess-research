// Read-only, no-graph diagnostic for runs/stage1-retention-probe-v1.
// For every interfering lesson, count the cue cells its taught moves share with
// board A's punished move (F) and certified move (S), signed by the channel the
// lesson used: a success pulse (PAM02, depresses MBON01) raises the score of
// moves sharing its cells, a failure pulse (PPL103, depresses MBON12) lowers it.
// net = push(F) - push(S); positive favours F over S. Compares net with the
// change in A's certified-move rank. Encoder only; ignores graph dynamics.
// Usage: node research/reports/stage1-retention-probe-2026-10-24/cue-crosstalk.mjs [RUN_DIR]
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {Chess} from 'chess.js';
import {createPublicActionRelativeEncoder} from '../../../.codebase/src/chess-input/public-action-relative-cue.mjs';

const run=process.argv[2]??'runs/stage1-retention-probe-v1';
const mapping=JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json','utf8')).mapping;
const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r6-registration.json','utf8'));
const encoder=createPublicActionRelativeEncoder(mapping,{taskFamily:'capture-retention',seed:registration.learner.replicaSeeds.r1});
const task={objective:'capture-retention',plies:1};
const rows=new Map(readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/)
  .filter(Boolean).map(line=>JSON.parse(line)).map(row=>[row.lesson.lessonId??row.lesson.puzzleId,row]));
const board=id=>{const b=new Chess();b.loadPgn(rows.get(id).lesson.context.pgn);return b;};
const cells=(id,move)=>{
  const cue=encoder.encode(board(id),move,task),kept=new Set(cue.stimulation.map(c=>c.index));
  // Drop the task token: it is shared by every cue and cancels within a board.
  return new Set(cue.assignments.filter(a=>!a.token.startsWith('task:')&&kept.has(a.index)).map(a=>`${a.compartment}:${a.index}`));
};
const overlap=(a,b,compartment)=>[...a].filter(c=>c.startsWith(compartment)&&b.has(c)).length;

const probes=readdirSync(run).filter(f=>f.startsWith('probe-')).map(f=>JSON.parse(readFileSync(join(run,f),'utf8')))
  .sort((a,b)=>a.aPanelId.localeCompare(b.aPanelId)||b.eta-a.eta);
const pairs=[];
for(const probe of probes){
  const own=probe.lessons[0].events,F=cells(probe.aPanelId,own.find(e=>e.status==='failure').move),
    S=cells(probe.aPanelId,own.find(e=>e.status==='success').move);
  let shared=0,sharedAny=new Set();const nets=[];
  for(let i=1;i<probe.lessons.length;i++){
    const lesson=probe.lessons[i];let net=0;
    for(const event of lesson.events){
      const C=cells(lesson.panelId,event.move);
      for(const c of [...F,...S])if(C.has(c))sharedAny.add(c);
      const compartment=event.status==='success'?'MBON01':'MBON12',sign=event.status==='success'?1:-1;
      net+=sign*(overlap(F,C,compartment)-overlap(S,C,compartment));
    }
    const deltaRank=lesson.a.rank-probe.lessons[i-1].a.rank;
    nets.push(net);pairs.push({net,deltaRank});
  }
  shared=sharedAny.size;
  console.log(`${probe.aPanelId.padEnd(27)} eta ${String(probe.eta).padEnd(4)} cells F/S ${F.size}/${S.size} (shared F&S ${[...F].filter(c=>S.has(c)).length}); A cells hit by interference ${shared}/${new Set([...F,...S]).size}; net per lesson ${nets.join(' ')}; final rank ${probe.aAfterInterference.rank}`);
}
const n=pairs.length,mx=pairs.reduce((s,p)=>s+p.net,0)/n,my=pairs.reduce((s,p)=>s+p.deltaRank,0)/n;
const cov=pairs.reduce((s,p)=>s+(p.net-mx)*(p.deltaRank-my),0),vx=pairs.reduce((s,p)=>s+(p.net-mx)**2,0),vy=pairs.reduce((s,p)=>s+(p.deltaRank-my)**2,0);
const worse=pairs.filter(p=>p.deltaRank>0),better=pairs.filter(p=>p.deltaRank<0);
console.log(JSON.stringify({lessons:n,pearsonNetVsRankChange:+(cov/Math.sqrt(vx*vy)).toFixed(3),
  meanNetWhenRankWorsened:+(worse.reduce((s,p)=>s+p.net,0)/Math.max(1,worse.length)).toFixed(2),
  meanNetWhenRankImproved:+(better.reduce((s,p)=>s+p.net,0)/Math.max(1,better.length)).toFixed(2),
  lessonsWithZeroOverlapButRankChange:pairs.filter(p=>p.net===0&&p.deltaRank!==0).length}));

// Which token kinds carry A's cells that interfering lessons also drive.
const kinds={};
for(const probe of probes.filter(p=>p.eta===probes[0].eta)){
  const own=probe.lessons[0].events,aCells=new Map();
  for(const event of own){
    const cue=encoder.encode(board(probe.aPanelId),event.move,task),kept=new Set(cue.stimulation.map(c=>c.index));
    for(const a of cue.assignments)if(!a.token.startsWith('task:')&&kept.has(a.index))
      aCells.set(`${a.compartment}:${a.index}`,a.token.split(':').slice(0,2).join(':'));
  }
  const hit=new Set();
  for(const lesson of probe.lessons.slice(1))for(const event of lesson.events)
    for(const c of cells(lesson.panelId,event.move))if(aCells.has(c))hit.add(c);
  for(const [c,kind] of aCells){kinds[kind]??={cells:0,hit:0};kinds[kind].cells++;if(hit.has(c))kinds[kind].hit++;}
}
console.log(JSON.stringify({tokenKindsOfACells:kinds}));
