// Capacity of the r11 readout (no graph run; surrogate direct path). For each stimulated cue cell:
// its scratch score s0 and how far the registered channels can move it (reward: PAM02 + PAM11
// depression raises it; punishment: PPL103 + PPL106 depression lowers it; 60 saturating pulses at
// eta 0.5). Then an idealized learner that may set each cell's contribution anywhere inside that
// box (projected perceptron, error-driven, from scratch) shows whether ANY reachable gain state
// fits the training boards and how it transfers to held-out families. Engineering diagnostic.
// Usage (repo root): node --max-old-space-size=512 research/reports/stage1-attack-map-cue-2026-10-27/capacity.mjs
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {buildSurrogate,Chess,TASK}=await import(pathToFileURL(resolve('research/reports/stage1-memory-literature-and-surrogate-2026-10-27/scripts/surrogate.mjs')).href);
const {createPublicAttackMapEncoderV1}=await import(pathToFileURL(resolve('research/reports/stage1-attack-map-cue-2026-10-27/draft-attack-map-cue-v0.mjs')).href);
const S=buildSurrogate();
const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r11-registration.json','utf8'));
const {schema,...encoderConfig}=registration.learner.encoder;
const attack=createPublicAttackMapEncoderV1(S.memory.mapping,{...encoderConfig,seed:registration.learner.replicaSeeds.r1});
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const ids=rows.map(r=>r.lesson.lessonId),fam=id=>id.split('-').slice(0,3).join('-'),twin=id=>id.slice(0,-1);
const attackPanels=new Map(rows.map(row=>{const board=new Chess();board.loadPgn(row.lesson.context.pgn);
  const exp=row.lesson.candidates.map(c=>({move:c.move,status:c.proof.status}));
  return [row.lesson.lessonId,{exp,cues:new Map(exp.map(x=>[x.move,attack.encode(board,x.move,TASK).stimulation]))}];}));
const rg=S.rGroups.map(g=>g.danType),ag=S.aGroups.map(g=>g.danType);
const fresh=()=>({r:new Float64Array(S.state.r.length).fill(1),a:new Float64Array(S.state.a.length).fill(1)});
const box=new Map();
function cellBox(index,current){const key=index+':'+current;if(box.has(key)) return box.get(key);
  const stim=[{index,current}],s0=S.score(stim,fresh()),ends=['PAM02','PPL103'].map(ch=>{const st=fresh();
    for(let i=0;i<60;i++) S.update(stim,rg.map(t=>t===ch?-1.01:0),ag.map(t=>(ch==='PAM02'&&t==='PAM11')||(ch==='PPL103'&&t==='PPL106')?-0.99:0),0.5,st);
    return S.score(stim,st);});
  const b={s0,hi:Math.max(s0,...ends),lo:Math.min(s0,...ends)};box.set(key,b);return b;}
const rand=seed=>()=>((seed=Math.imul(seed^seed>>>15,2246822519)+0x9e3779b9>>>0)/2**32);
for(const [name,panels] of [['v4 (r11 cue)',S.panels],['attack map v1',attackPanels]]){
  const F=new Map(ids.map(id=>[id,panels.get(id).exp.map(x=>({ok:x.status==='success',cells:panels.get(id).cues.get(x.move).map(s=>({key:s.index+':'+s.current,...cellBox(s.index,s.current)}))}))]));
  const all=[...new Set([...F.values()].flat().flatMap(c=>c.cells.map(x=>x.key)))].map(k=>box.get(k));
  const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
  const range=all.map(b=>b.hi-b.lo),spread=Math.max(...all.map(b=>b.s0))-Math.min(...all.map(b=>b.s0));
  console.log(JSON.stringify({cue:name,cells:all.length,medianLearnableRange:+median(range).toExponential(2),
    medianScratchAbs:+median(all.map(b=>Math.abs(b.s0))).toExponential(2),scratchSpreadAcrossCells:+spread.toExponential(2),
    cellsWhoseRangeExceedsHalfTheScratchSpread:all.filter(b=>b.hi-b.lo>spread/2).length,
    upOnlyShare:+(all.filter(b=>b.lo===b.s0).length/all.length).toFixed(2),downOnlyShare:+(all.filter(b=>b.hi===b.s0).length/all.length).toFixed(2)}));
  function train(trIds,seed,epochs=300){const w=new Map(),r=rand(seed),step=0.05*median(range);
    const val=x=>w.get(x.key)??x.s0,sc=c=>c.cells.reduce((s,x)=>s+val(x),0);
    for(let e=0;e<epochs;e++){let err=0;for(const id of [...trIds].sort(()=>r()-0.5)){const C=F.get(id),s=C.map(sc),top=Math.max(...s),ok=C.findIndex(c=>c.ok);
      if(s[ok]===top&&s.filter(v=>v===top).length===1) continue;err++;
      let bad=-1;for(let i=0;i<C.length;i++) if(i!==ok&&(bad<0||s[i]>s[bad])) bad=i;
      for(const x of C[ok].cells) w.set(x.key,Math.min(x.hi,val(x)+step));for(const x of C[bad].cells) w.set(x.key,Math.max(x.lo,val(x)-step));}
      if(!err) break;}
    return id=>{const C=F.get(id),s=C.map(sc),top=Math.max(...s);return s.filter(v=>v===top).length===1&&C[s.indexOf(top)].ok;};}
  const fit=[1,2,3].map(s=>{const p=train(ids,s);return ids.filter(p).length;});
  const held=[1,2,3].map(s=>{const hit=new Set();for(const f of new Set(ids.map(fam))){const p=train(ids.filter(id=>fam(id)!==f),s);for(const id of ids.filter(id=>fam(id)===f)) if(p(id)) hit.add(id);}return hit;});
  const twins=[...new Set(ids.map(twin))];
  console.log(JSON.stringify({cue:name,idealBoxedLearner:{fit24:fit,heldOut24:held.map(h=>h.size),twinPairsBoth12:held.map(h=>twins.filter(t=>ids.filter(id=>twin(id)===t).every(id=>h.has(id))).length)}}));
}
