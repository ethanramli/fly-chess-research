// No-graph surrogate screen of the r11 learner with the attack-map cue (researcher option A,
// 2026-10-27) against cue v4. Outcome-only teaching (task pulses only; no Stockfish), training
// rows only. Engineering diagnostic, not evidence: the surrogate is the direct-path linear model
// of research/reports/stage1-memory-literature-and-surrogate-2026-10-27 (validated on v7 pulses
// with cue v4 only; its fit for the new cue is unverified).
// Usage (repo root): node --max-old-space-size=512 research/reports/stage1-attack-map-cue-2026-10-27/screen.mjs
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {buildSurrogate,Chess,TASK}=await import(pathToFileURL(resolve('research/reports/stage1-memory-literature-and-surrogate-2026-10-27/scripts/surrogate.mjs')).href);
const {createPublicAttackMapEncoderV1}=await import(pathToFileURL(resolve('research/reports/stage1-attack-map-cue-2026-10-27/draft-attack-map-cue-v0.mjs')).href);
const S=buildSurrogate();
const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r11-registration.json','utf8'));
const {schema,...encoderConfig}=registration.learner.encoder;
const attack=createPublicAttackMapEncoderV1(S.memory.mapping,{...encoderConfig,seed:registration.learner.replicaSeeds.r1});
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const attackPanels=new Map(rows.map(row=>{const board=new Chess();board.loadPgn(row.lesson.context.pgn);
  const exp=row.lesson.candidates.map(c=>({move:c.move,status:c.proof.status}));
  return [row.lesson.lessonId,{id:row.lesson.lessonId,exp,cues:new Map(exp.map(x=>[x.move,attack.encode(board,x.move,TASK).stimulation]))}];}));
const cues={'v4 (r11 cue)':S.panels,'attack map v1':attackPanels};

const rg=S.rGroups.map(g=>g.danType),ag=S.aGroups.map(g=>g.danType);
const factorsFor=(ch,D)=>rg.map(t=>t===ch?D:0);
const alphaFor=(ch,D)=>ag.map(t=>(ch==='PAM02'&&t==='PAM11')||(ch==='PPL103'&&t==='PPL106')?D:0);
// One lesson as in the probe runner: punish the highest-scored failure, then reward the certified move.
function lesson(P,eta,st){
  if(gated&&S.assess(P,st).correct) return;
  const score=new Map(S.assess(P,st).rows.map(r=>[r.move,r.score]));
  const order=(x,y)=>score.get(y.move)-score.get(x.move)||x.move.localeCompare(y.move);
  for(const ev of [P.exp.filter(x=>x.status==='failure').sort(order)[0],P.exp.filter(x=>x.status==='success').sort(order)[0]]){
    const ch=ev.status==='success'?'PAM02':'PPL103';
    S.update(P.cues.get(ev.move),factorsFor(ch,-1.01),alphaFor(ch,-0.99),eta,st);}
}
const fresh=()=>({r:new Float64Array(S.state.r.length).fill(1),a:new Float64Array(S.state.a.length).fill(1)});
const ids=rows.map(r=>r.lesson.lessonId),fam=id=>id.split('-').slice(0,3).join('-'),twin=id=>id.slice(0,-1);
const rand=seed=>()=>((seed=Math.imul(seed^seed>>>15,2246822519)+0x9e3779b9>>>0)/2**32);
const v7='runs/stage1-retention-probe-v7-spaced-alpha-three';
const probes=readdirSync(v7).filter(f=>f.startsWith('probe-eta0.5-')).map(f=>JSON.parse(readFileSync(v7+'/'+f,'utf8')));
// v7 spaced protocol (A, 5 others, A, 5 others, A, 10 others); ownLessons=false drops A's lessons (control).
function probe(panels,eta,ownLessons=true){let kept=0;for(const j of probes){const st=fresh(),o=j.interferingPanels;
  const seq=[j.aPanelId,...o.slice(0,5),j.aPanelId,...o.slice(5,10),j.aPanelId,...o.slice(10,20)].filter(id=>ownLessons||id!==j.aPanelId);
  for(const id of seq) lesson(panels.get(id),eta,st); if(S.assess(panels.get(j.aPanelId),st).correct) kept++;} return kept;}
function rotation(panels,eta,R=gated?20:8,seed=7){const st=fresh(),r=rand(seed),curve=[];
  for(let k=0;k<R;k++){for(const id of [...ids].sort(()=>r()-0.5)) lesson(panels.get(id),eta,st);
    curve.push(ids.filter(id=>S.assess(panels.get(id),st).correct).length);} return curve;}
function lofo(panels,eta,R=gated?20:6){const hit=new Set();
  for(const F of [...new Set(ids.map(fam))]){const st=fresh(),r=rand(11),tr=ids.filter(id=>fam(id)!==F);
    for(let k=0;k<R;k++) for(const id of [...tr].sort(()=>r()-0.5)) lesson(panels.get(id),eta,st);
    for(const id of ids.filter(id=>fam(id)===F)) if(S.assess(panels.get(id),st).correct) hit.add(id);}
  const twins=[...new Set(ids.map(twin))];
  return {boards:hit.size,twinPairsBoth:twins.filter(t=>ids.filter(id=>twin(id)===t).every(id=>hit.has(id))).length,
    byStratum:Object.fromEntries(['pin','blocked','absent'].map(s=>[s,`${ids.filter(id=>id.split('-')[3]===s&&hit.has(id)).length}/${ids.filter(id=>id.split('-')[3]===s).length}`]))};}
// gated: teach only when the board is currently wrong (stand-in for prediction-error suppression; unregistered).
let gated=false;
for(const g of [false,true]) for(const [name,panels] of Object.entries(cues)){gated=g;
  const cells=[...panels.values()].flatMap(P=>[...P.cues.values()].map(c=>c.length));
  console.log(JSON.stringify({cue:name,scratchCorrect:ids.filter(id=>S.assess(panels.get(id),fresh()).correct).length,
    cellsPerMove:+(cells.reduce((a,b)=>a+b,0)/cells.length).toFixed(1)}));
  for(const eta of [0.5,0.2,0.1,0.05])
    console.log(JSON.stringify({cue:name,rule:gated?"error-gated [unregistered]":"every lesson (r11)",eta,v7ProbeRetained:probe(panels,eta)+'/4',noOwnLessonControl:probe(panels,eta,false)+'/4',
      rotation24:rotation(panels,eta).join(','),lofo:lofo(panels,eta)}));
}
