// Attack-map cue variants on the r11 surrogate (no graph run; training rows only; outcome-only).
// tag 'move' = v1 (piece x captured); tag 'capture' = capture|quiet only. k = cells per token per
// compartment pool (v1 has k = 1); currents follow the v1 budget rule min(1.5, totalCurrent/cells).
// Tokens come from the preserved draft encoder (draft-attack-map-cue-v0.mjs: task token, move tag);
// tag "capture" with "notask" reproduces the registered cue v1 tokens.
// Reports the idealized boxed learner (capacity.mjs) and the r11 rule with every-lesson teaching.
// Usage (repo root): node --max-old-space-size=512 research/reports/stage1-attack-map-cue-2026-10-27/variants.mjs
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {buildSurrogate,Chess,TASK}=await import(pathToFileURL(resolve('research/reports/stage1-memory-literature-and-surrogate-2026-10-27/scripts/surrogate.mjs')).href);
const {createPublicAttackMapEncoderV1}=await import(pathToFileURL(resolve('research/reports/stage1-attack-map-cue-2026-10-27/draft-attack-map-cue-v0.mjs')).href);
const S=buildSurrogate();
const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r11-registration.json','utf8'));
// Optional args: SEEDS (comma list; default the r11 r1 seed), CONFIGS (e.g. capture:3,capture:6), ETAS (e.g. 0.1,0.2).
const {schema,...encoderConfig}=registration.learner.encoder,[argSeeds,argConfigs,argEtas]=process.argv.slice(2);
let seed=registration.learner.replicaSeeds.r1;
const v1=createPublicAttackMapEncoderV1(S.memory.mapping,{...encoderConfig,seed});
const pools=['MBON01','MBON12','MBON07'].map(t=>[...new Set(S.memory.mapping.groups.filter(g=>g.mbonType===t).flatMap(g=>g.kc))].sort((a,b)=>a-b));
const bucket=(token,size)=>createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0)%size;
// Optional 5th arg BUDGET "maxCells,totalCurrent" (default the v1 budget 32,48).
const [maxCells,totalCurrent]=process.argv[5]?process.argv[5].split(",").map(Number):[encoderConfig.maxCells??32,encoderConfig.totalCurrent??48],maxCellCurrent=1.5;
function stimulation(tokens,k){const cells=[...new Set(tokens.flatMap(t=>pools.flatMap((pool,p)=>Array.from({length:k},(_,r)=>pool[bucket(`${p}\0${t}\0${r}`,pool.length)]))))];
  cells.sort((a,b)=>bucket(`budget:${a}`,0x100000000)-bucket(`budget:${b}`,0x100000000)||a-b);
  const chosen=cells.slice(0,maxCells).sort((a,b)=>a-b),current=Math.min(maxCellCurrent,totalCurrent/chosen.length);
  return chosen.map(index=>({index,current}));}
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const ids=rows.map(r=>r.lesson.lessonId),fam=id=>id.split('-').slice(0,3).join('-'),twin=id=>id.slice(0,-1),twins=[...new Set(ids.map(twin))];
function panelsFor(tagMode,k,extra){return new Map(rows.map(row=>{const board=new Chess();board.loadPgn(row.lesson.context.pgn);
  const exp=row.lesson.candidates.map(c=>({move:c.move,status:c.proof.status}));
  return [row.lesson.lessonId,{id:row.lesson.lessonId,exp,cues:new Map(exp.map(x=>{let t=v1.encode(board,x.move,TASK).tokens;
    if(tagMode==='capture') t=t.map(s=>s.startsWith('act:tag:')?(s.endsWith('xnone')?'act:quiet':'act:capture'):s);
    if(extra==="notask") t=t.filter(s=>!s.startsWith("task:"));
    return [x.move,stimulation(t,k)];}))}];}));}
const rg=S.rGroups.map(g=>g.danType),ag=S.aGroups.map(g=>g.danType);
const factorsFor=(ch,D)=>rg.map(t=>t===ch?D:0),alphaFor=(ch,D)=>ag.map(t=>(ch==='PAM02'&&t==='PAM11')||(ch==='PPL103'&&t==='PPL106')?D:0);
const fresh=()=>({r:new Float64Array(S.state.r.length).fill(1),a:new Float64Array(S.state.a.length).fill(1)});
const rand=s=>()=>((s=Math.imul(s^s>>>15,2246822519)+0x9e3779b9>>>0)/2**32);
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
function lesson(P,eta,st){const score=new Map(S.assess(P,st).rows.map(r=>[r.move,r.score]));
  const order=(x,y)=>score.get(y.move)-score.get(x.move)||x.move.localeCompare(y.move);
  for(const ev of [P.exp.filter(x=>x.status==='failure').sort(order)[0],P.exp.filter(x=>x.status==='success').sort(order)[0]]){
    const ch=ev.status==='success'?'PAM02':'PPL103';S.update(P.cues.get(ev.move),factorsFor(ch,-1.01),alphaFor(ch,-0.99),eta,st);}}
const v7='runs/stage1-retention-probe-v7-spaced-alpha-three';
const probes=readdirSync(v7).filter(f=>f.startsWith('probe-eta0.5-')).map(f=>JSON.parse(readFileSync(v7+'/'+f,'utf8')));
function probe(panels,eta,own=true){let kept=0;for(const j of probes){const st=fresh(),o=j.interferingPanels;
  for(const id of [j.aPanelId,...o.slice(0,5),j.aPanelId,...o.slice(5,10),j.aPanelId,...o.slice(10,20)].filter(id=>own||id!==j.aPanelId)) lesson(panels.get(id),eta,st);
  if(S.assess(panels.get(j.aPanelId),st).correct) kept++;}return kept;}
function lofo(panels,eta,R=6){const hit=new Set();for(const F of new Set(ids.map(fam))){const st=fresh(),r=rand(11),tr=ids.filter(id=>fam(id)!==F);
  for(let i=0;i<R;i++) for(const id of [...tr].sort(()=>r()-0.5)) lesson(panels.get(id),eta,st);
  for(const id of ids.filter(id=>fam(id)===F)) if(S.assess(panels.get(id),st).correct) hit.add(id);}
  return `${hit.size}/24 pairs ${twins.filter(t=>ids.filter(id=>twin(id)===t).every(id=>hit.has(id))).length}/12`;}
function rotation(panels,eta,R=8){const st=fresh(),r=rand(7),c=[];for(let i=0;i<R;i++){for(const id of [...ids].sort(()=>r()-0.5)) lesson(panels.get(id),eta,st);
  c.push(ids.filter(id=>S.assess(panels.get(id),st).correct).length);}return c.join(',');}
function ideal(panels){const box=new Map(),cb=({index,current})=>{const key=index+':'+current;if(!box.has(key)){const stim=[{index,current}],s0=S.score(stim,fresh());
    const ends=['PAM02','PPL103'].map(ch=>{const st=fresh();for(let i=0;i<60;i++) S.update(stim,factorsFor(ch,-1.01),alphaFor(ch,-0.99),0.5,st);return S.score(stim,st);});
    box.set(key,{key,s0,hi:Math.max(s0,...ends),lo:Math.min(s0,...ends)});}return box.get(key);};
  const F=new Map(ids.map(id=>[id,panels.get(id).exp.map(x=>({ok:x.status==='success',cells:panels.get(id).cues.get(x.move).map(cb)}))]));
  const step=0.05*median([...box.values()].map(b=>b.hi-b.lo));
  const train=trIds=>{const w=new Map(),r=rand(1),val=x=>w.get(x.key)??x.s0,sc=c=>c.cells.reduce((s,x)=>s+val(x),0);
    for(let e=0;e<300;e++){let err=0;for(const id of [...trIds].sort(()=>r()-0.5)){const C=F.get(id),s=C.map(sc),top=Math.max(...s),ok=C.findIndex(c=>c.ok);
      if(s[ok]===top&&s.filter(v=>v===top).length===1) continue;err++;let bad=-1;for(let i=0;i<C.length;i++) if(i!==ok&&(bad<0||s[i]>s[bad])) bad=i;
      for(const x of C[ok].cells) w.set(x.key,Math.min(x.hi,val(x)+step));for(const x of C[bad].cells) w.set(x.key,Math.max(x.lo,val(x)-step));}if(!err) break;}
    return id=>{const C=F.get(id),s=C.map(sc),top=Math.max(...s);return s.filter(v=>v===top).length===1&&C[s.indexOf(top)].ok;};};
  const hit=new Set();for(const f of new Set(ids.map(fam))){const p=train(ids.filter(id=>fam(id)!==f));for(const id of ids.filter(id=>fam(id)===f)) if(p(id)) hit.add(id);}
  const all=[...box.values()],spread=Math.max(...all.map(b=>b.s0))-Math.min(...all.map(b=>b.s0));
  return {fit:ids.filter(train(ids)).length+'/24',heldOut:`${hit.size}/24 pairs ${twins.filter(t=>ids.filter(id=>twin(id)===t).every(id=>hit.has(id))).length}/12`,
    medianRangeOverScratchSpread:+(median(all.map(b=>b.hi-b.lo))/spread).toFixed(3)};}
const configs=argConfigs?argConfigs.split(",").map(c=>{const [t,k,x]=c.split(":");return [t,Number(k),x];}):[["move",1],["capture",1],["capture",3],["capture",6],["capture",10]];
const etas=argEtas?argEtas.split(",").map(Number):[0.5,0.1];
for(const s of argSeeds?argSeeds.split(",").map(Number):[seed]) for(const [tagMode,k,extra] of configs){seed=s;
  const panels=panelsFor(tagMode,k,extra),cells=[...panels.values()].flatMap(P=>[...P.cues.values()]);
  console.log(JSON.stringify({seed,tag:tagMode,extra:extra??null,budget:[maxCells,totalCurrent],cellsPerTokenPerPool:k,cellsPerMove:+median(cells.map(c=>c.length)).toFixed(0),currentPerCell:+median(cells.map(c=>c[0].current)).toFixed(2),
    scratch:ids.filter(id=>S.assess(panels.get(id),fresh()).correct).length,idealBoxed:ideal(panels),
    r11:Object.fromEntries(etas.map(eta=>[`eta${eta}`,{probe:probe(panels,eta)+'/4',control:probe(panels,eta,false)+'/4',lofo:lofo(panels,eta),rotation:rotation(panels,eta)}]))}));
}
