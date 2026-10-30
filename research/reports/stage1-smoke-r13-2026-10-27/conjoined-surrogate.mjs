// Plan P6 diagnosis (no graph; training rows only). On the r11 surrogate, compares the registered
// attack-map cue v1 with a candidate encoding that keeps the same facts but conjoins every attack
// token with capture/quiet (act:quiet|att:none no longer shares cells with act:capture|att:none).
// Lessons as in the registered planner and probes: punish the highest-scored failure, reward the
// certified move. Reports the training count after every rotation round (stability) and
// leave-one-family-out held-out counts. Candidate only: any cue change needs a researcher decision.
// Usage (repo root): node --max-old-space-size=512 research/reports/stage1-smoke-r13-2026-10-27/conjoined-surrogate.mjs
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {buildSurrogate,Chess,TASK}=await import(pathToFileURL(resolve('research/reports/stage1-memory-literature-and-surrogate-2026-10-27/scripts/surrogate.mjs')).href);
const {createPublicAttackMapEncoderV1}=await import(pathToFileURL(resolve('.codebase/src/chess-input/public-attack-map-cue-v1.mjs')).href);
const S=buildSurrogate(),registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r13-registration.json','utf8'));
const seed=registration.learner.replicaSeeds.r1,{schema,...config}=registration.learner.encoder;
const v1=createPublicAttackMapEncoderV1(S.memory.mapping,{...config,seed});
const pools=['MBON01','MBON12','MBON07'].map(t=>[...new Set(S.memory.mapping.groups.filter(g=>g.mbonType===t).flatMap(g=>g.kc))].sort((a,b)=>a-b));
const bucket=(token,size)=>createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0)%size;
function stimulation(tokens){const k=v1.config.cellsPerToken,cells=[...new Set(tokens.flatMap(t=>pools.flatMap((pool,p)=>Array.from({length:k},(_,r)=>pool[bucket(`${p}\0${t}\0${r}`,pool.length)]))))];
  cells.sort((a,b)=>bucket(`budget:${a}`,0x100000000)-bucket(`budget:${b}`,0x100000000)||a-b);
  const chosen=cells.slice(0,v1.config.maxCells).sort((a,b)=>a-b),current=Math.min(1.5,v1.config.totalCurrent/chosen.length);
  return chosen.map(index=>({index,current}));}
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const ids=rows.map(r=>r.lesson.lessonId),fam=id=>id.split('-').slice(0,3).join('-'),twin=id=>id.slice(0,-1),twins=[...new Set(ids.map(twin))];
const variants={
  'attack map v1 (registered)':t=>t,
  'conjoined with capture/quiet (candidate)':t=>{const act=t.find(x=>x.startsWith('act:'));return [act,...t.filter(x=>x!==act).map(x=>`${act}|${x}`)];}};
const rg=S.rGroups.map(g=>g.danType),ag=S.aGroups.map(g=>g.danType);
const fresh=()=>({r:new Float64Array(S.state.r.length).fill(1),a:new Float64Array(S.state.a.length).fill(1)});
const rand=s=>()=>((s=Math.imul(s^s>>>15,2246822519)+0x9e3779b9>>>0)/2**32);
function lesson(P,eta,st){const score=new Map(S.assess(P,st).rows.map(r=>[r.move,r.score]));
  const order=(x,y)=>score.get(y.move)-score.get(x.move)||x.move.localeCompare(y.move);
  for(const ev of [P.exp.filter(x=>x.status==='failure').sort(order)[0],P.exp.filter(x=>x.status==='success').sort(order)[0]]){
    const ch=ev.status==='success'?'PAM02':'PPL103';
    S.update(P.cues.get(ev.move),rg.map(t=>t===ch?-1.01:0),ag.map(t=>(ch==='PAM02'&&t==='PAM11')||(ch==='PPL103'&&t==='PPL106')?-0.99:0),eta,st);}}
for(const [name,map] of Object.entries(variants)){
  const panels=new Map(rows.map(row=>{const board=new Chess();board.loadPgn(row.lesson.context.pgn);
    const exp=row.lesson.candidates.map(c=>({move:c.move,status:c.proof.status}));
    return [row.lesson.lessonId,{id:row.lesson.lessonId,exp,cues:new Map(exp.map(x=>[x.move,stimulation(map(v1.encode(board,x.move,TASK).tokens))]))}];}));
  for(const eta of [0.2,0.1]){
    const st=fresh(),r=rand(7),curve=[];
    for(let i=0;i<12;i++){for(const id of [...ids].sort(()=>r()-0.5)) lesson(panels.get(id),eta,st);curve.push(ids.filter(id=>S.assess(panels.get(id),st).correct).length);}
    const hit=new Set();for(const F of new Set(ids.map(fam))){const s=fresh(),rr=rand(11),tr=ids.filter(id=>fam(id)!==F);
      for(let i=0;i<6;i++) for(const id of [...tr].sort(()=>rr()-0.5)) lesson(panels.get(id),eta,s);
      for(const id of ids.filter(id=>fam(id)===F)) if(S.assess(panels.get(id),s).correct) hit.add(id);}
    console.log(JSON.stringify({cue:name,eta,trainingCorrectPerRound:curve.join(','),min:Math.min(...curve.slice(2)),max:Math.max(...curve),
      heldOut:`${hit.size}/24`,twinPairsBoth:`${twins.filter(t=>ids.filter(id=>twin(id)===t).every(id=>hit.has(id))).length}/12`}));
  }
}
