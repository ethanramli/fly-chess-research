// Surrogate screens on TRAINING boards only (engineering diagnostic, not evidence).
// Conditions toggle: Stockfish pulses, restrained recovery, alpha stores, margin gating.
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {buildSurrogate,Chess}=await import(pathToFileURL(resolve(process.argv[2])).href);
const {stockfishTarget}=await import(pathToFileURL(resolve('.codebase/src/search-and-feedback/stockfish-target.mjs')).href);
const S=buildSurrogate();
const rg=S.rGroups.map(g=>g.danType), ag=S.aGroups.map(g=>g.danType);
// Stockfish utilities per (board fen, move) from the pinned review cache.
const cache='runs/lichess-stage1-synthetic-v1-smoke-r6-stockfish-cache', util=new Map();
for(const f of readdirSync(cache).filter(f=>f.endsWith('.review.json'))){const r=JSON.parse(readFileSync(cache+'/'+f,'utf8'));
  for(const a of r.analyses){const side=a.fen.split(' ')[1];const t=stockfishTarget(a.transcript,{actor:r.actor,sideToMove:side,completed:a.completed});
    if(t.available) util.set(r.context.fen+'|'+a.move,t.utility);}}
const fenOf=new Map(readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).map(r=>[r.lesson.lessonId,r.lesson.context.fen]));
let sfMissing=0;
const sfPulse=(id,move)=>{const u=util.get(fenOf.get(id)+'|'+move); if(u===undefined){sfMissing++;return null;}
  if(u===0) return null; const ch=u>0?'PAM02':'PPL103', cur=0.75*Math.abs(u); return {ch,cur};};
const factorsFor=(ch,D)=>rg.map(t=>t===ch?D:0);
const alphaFor=(ch,D)=>ag.map(t=>(ch==='PAM02'&&t==='PAM11')||(ch==='PPL103'&&t==='PPL106')?D:0);
function lesson(P,cond,st){
  const a=S.assess(P,st), score=new Map(a.rows.map(r=>[r.move,r.score]));
  const order=(x,y)=>score.get(y.move)-score.get(x.move)||x.move.localeCompare(y.move);
  const fail=P.exp.filter(x=>x.status==='failure').sort(order)[0], succ=P.exp.filter(x=>x.status==='success').sort(order)[0];
  for(const ev of [fail,succ]){
    const now=S.assess(P,st), sc=new Map(now.rows.map(r=>[r.move,r.score]));
    const sCert=sc.get(succ.move), bestOther=Math.max(...now.rows.filter(r=>r.move!==succ.move).map(r=>r.score));
    let gain=1;
    if(cond.gate){ // engineering stand-in for MBON->DAN prediction-error suppression
      const m=cond.gate;
      gain=ev.status==='success'?Math.min(1,Math.max(cond.bi?-1:0,(bestOther-sCert+m)/(2*m))):Math.min(1,Math.max(cond.bi?-1:0,(sc.get(ev.move)-sCert+m)/(2*m)));
    }
    if(gain!==0){const ch=ev.status==='success'?'PAM02':'PPL103';
      S.update(P.cues.get(ev.move),cond.restrainedOff?[0,0,0,0]:factorsFor(ch,-1.01*gain),cond.alpha?alphaFor(ch,-0.99*gain):[0,0,0,0],cond.eta,st,{recovery:cond.recovery,minGain:cond.minGain??0.2,maxGain:cond.maxGain??1.8});}
    if(cond.sf){const p=sfPulse(P.id,ev.move); if(p) S.update(P.child.get(ev.move),factorsFor(p.ch,-0.673*p.cur),[0,0,0,0],cond.eta,st,{recovery:cond.recovery,minGain:cond.minGain??0.2,maxGain:cond.maxGain??1.8});}
  }
}
const fresh=()=>({r:new Float64Array(S.state.r.length).fill(1),a:new Float64Array(S.state.a.length).fill(1)});
const ids=[...S.panels.keys()];
// 1) v7 spaced probe protocol with the recorded A boards and interference order
const v7='runs/stage1-retention-probe-v7-spaced-alpha-three';
const probes=readdirSync(v7).filter(f=>f.startsWith('probe-eta0.5-')).map(f=>JSON.parse(readFileSync(v7+'/'+f,'utf8')));
function probe(cond){let kept=0;for(const j of probes){const st=fresh(),A=S.panels.get(j.aPanelId),o=j.interferingPanels;
  const seq=[j.aPanelId,...o.slice(0,5),j.aPanelId,...o.slice(5,10),j.aPanelId,...o.slice(10,20)];
  for(const id of seq) lesson(S.panels.get(id),cond,st); if(S.assess(A,st).correct) kept++;} return kept;}
// 2) rotation over all 24 training boards, R rounds, seeded order
const rand=seed=>()=>((seed=Math.imul(seed^seed>>>15,2246822519)+0x9e3779b9>>>0)/2**32);
function rotation(cond,R=8,seed=7){const st=fresh(),r=rand(seed),curve=[];
  for(let k=0;k<R;k++){const order=[...ids].sort(()=>r()-0.5);for(const id of order) lesson(S.panels.get(id),cond,st);
    curve.push(ids.filter(id=>S.assess(S.panels.get(id),st).correct).length);} return curve;}
// 3) leave-one-family-out within training data
const fam=id=>id.split('-').slice(0,3).join('-');
function lofo(cond,R=6){let correct=0,scratch=0;for(const F of [...new Set(ids.map(fam))]){const st=fresh(),r=rand(11),tr=ids.filter(id=>fam(id)!==F),te=ids.filter(id=>fam(id)===F);
  for(const id of te) if(S.assess(S.panels.get(id),fresh()).correct) scratch++;
  for(let k=0;k<R;k++) for(const id of [...tr].sort(()=>r()-0.5)) lesson(S.panels.get(id),cond,st);
  for(const id of te) if(S.assess(S.panels.get(id),st).correct) correct++;} return {heldOut:correct,scratch};}
const base={sf:true,recovery:true,alpha:true,gate:0,eta:0.5};
const conditions={
  'r11 as run':base,
  'r11, gains 0..3 [attribution]':{...base,minGain:0,maxGain:3},
  'r11, no restrained recovery [attribution]':{...base,recovery:false},
  'r11, no recovery + gains 0..3 [attribution]':{...base,recovery:false,minGain:0,maxGain:3},
  'bidirectional PE, no recovery, gains 0..3 [attribution]':{...base,gate:0.002,bi:true,sf:false,recovery:false,minGain:0,maxGain:3},
};
const scratchCorrect=ids.filter(id=>S.assess(S.panels.get(id),fresh()).correct).length;
console.log('surrogate scratch correct',scratchCorrect,'/24');
for(const eta of [0.5]) for(const [name,c] of Object.entries(conditions)){
  const cond={...c,eta};
  console.log(JSON.stringify({eta,condition:name,v7ProbeRetained:probe(cond)+'/4',rotation24:rotation(cond).join(','),lofo:lofo(cond)}));
}
console.log('Stockfish pairs missing from cache (skipped):',sfMissing);
