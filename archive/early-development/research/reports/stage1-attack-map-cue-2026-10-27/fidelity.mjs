// Read-only full-graph check of the surrogate for the attack-map cue (no plasticity in the graph,
// no teaching event). Gate-relevant question: does the direct-path surrogate, used to choose the
// cue's cell count and eta, rank moves as the full r11 graph does for this cue? Gains learned in
// the surrogate (outcome-only lessons, eta 0.1) are copied into the graph's memory with restore();
// every training move is then presented once from rest and read out as the registered brain does.
// Training rows only. Usage (repo root):
//   node --max-old-space-size=512 research/reports/stage1-attack-map-cue-2026-10-27/fidelity.mjs
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {buildSurrogate,Chess,TASK}=await import(pathToFileURL(resolve('research/reports/stage1-memory-literature-and-surrogate-2026-10-27/scripts/surrogate.mjs')).href);
const {createPublicAttackMapEncoderV1}=await import(pathToFileURL(resolve('.codebase/src/chess-input/public-attack-map-cue-v1.mjs')).href);
const {readAlphaLobeMBON}=await import(pathToFileURL(resolve('.codebase/src/neural-learning/alpha-lobe-memory.mjs')).href);
const S=buildSurrogate(),memory=S.memory,model=memory.model;
const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r11-registration.json','utf8')),spec=registration.learner;
const json=ref=>JSON.parse(readFileSync(ref.path,'utf8'));
const readouts={...json(spec.modelSource).identity.readouts,MBON07:json(spec.alphaOneMapping).mapping.readouts.MBON07,MBON14:json(spec.alphaThreeMapping).mapping.readouts.MBON14};
const seed=spec.replicaSeeds.r1,encoder=createPublicAttackMapEncoderV1(memory.mapping,{seed});
// The encoder must reproduce the variants.mjs "capture:20:notask" cells (budget 128,192) that were screened.
const pools=['MBON01','MBON12','MBON07'].map(t=>[...new Set(memory.mapping.groups.filter(g=>g.mbonType===t).flatMap(g=>g.kc))].sort((a,b)=>a-b));
const bucket=(token,size)=>createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0)%size;
const screened=tokens=>{const c=[...new Set(tokens.flatMap(t=>pools.flatMap((pool,p)=>Array.from({length:20},(_,r)=>pool[bucket(`${p}\0${t}\0${r}`,pool.length)]))))];
  c.sort((a,b)=>bucket(`budget:${a}`,0x100000000)-bucket(`budget:${b}`,0x100000000)||a-b);const k=c.slice(0,128).sort((a,b)=>a-b);return k.map(index=>({index,current:Math.min(1.5,192/k.length)}));};
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const ids=rows.map(r=>r.lesson.lessonId),fam=id=>id.split('-').slice(0,3).join('-'),twin=id=>id.slice(0,-1),twins=[...new Set(ids.map(twin))];
let mismatches=0;
const attackPanels=new Map(rows.map(row=>{const board=new Chess();board.loadPgn(row.lesson.context.pgn);
  const exp=row.lesson.candidates.map(c=>({move:c.move,status:c.proof.status}));
  return [row.lesson.lessonId,{id:row.lesson.lessonId,exp,cues:new Map(exp.map(x=>{const cue=encoder.encode(board,x.move,TASK);
    if(JSON.stringify(cue.stimulation)!==JSON.stringify(screened(cue.tokens))) mismatches++;return [x.move,cue.stimulation];}))}];}));
const rg=S.rGroups.map(g=>g.danType),ag=S.aGroups.map(g=>g.danType);
const fresh=()=>({r:new Float64Array(S.state.r.length).fill(1),a:new Float64Array(S.state.a.length).fill(1)});
const rand=s=>()=>((s=Math.imul(s^s>>>15,2246822519)+0x9e3779b9>>>0)/2**32);
function lesson(P,eta,st){const score=new Map(S.assess(P,st).rows.map(r=>[r.move,r.score]));
  const order=(x,y)=>score.get(y.move)-score.get(x.move)||x.move.localeCompare(y.move);
  for(const ev of [P.exp.filter(x=>x.status==='failure').sort(order)[0],P.exp.filter(x=>x.status==='success').sort(order)[0]]){
    const ch=ev.status==='success'?'PAM02':'PPL103';
    S.update(P.cues.get(ev.move),rg.map(t=>t===ch?-1.01:0),ag.map(t=>(ch==='PAM02'&&t==='PAM11')||(ch==='PPL103'&&t==='PPL106')?-0.99:0),eta,st);}}
let presentations=0;
function graphScores(P,st){memory.restore({version:1,identity:memory.identity,events:0,gains:[...st.r,...st.a]});
  return P.exp.map(x=>{model.forward([0],P.cues.get(x.move));presentations++;
    return readAlphaLobeMBON(Object.fromEntries(Object.entries(readouts).map(([t,cells])=>[t,cells.map(c=>model.h[model.steps][c.index])]))).score;});}
const unique=(P,s)=>{const top=Math.max(...s),i=s.indexOf(top);return s.filter(v=>v===top).length===1?i:-1;};
function compare(label,panels,boardIds,stateFor){const g=[],q=[];let argmaxAgree=0,graphRight=0,surrogateRight=0;const hitG=new Set(),hitS=new Set();
  for(const id of boardIds){const P=panels.get(id),st=stateFor(id),gs=graphScores(P,st),ss=P.exp.map(x=>S.score(P.cues.get(x.move),st));
    const cg=gs.map(v=>v-gs.reduce((a,b)=>a+b,0)/gs.length),cs=ss.map(v=>v-ss.reduce((a,b)=>a+b,0)/ss.length);g.push(...cg);q.push(...cs);
    const ig=unique(P,gs),is=unique(P,ss);if(ig===is) argmaxAgree++;
    if(ig>=0&&P.exp[ig].status==='success'){graphRight++;hitG.add(id);}if(is>=0&&P.exp[is].status==='success'){surrogateRight++;hitS.add(id);}}
  const m=a=>a.reduce((x,y)=>x+y,0)/a.length,mg=m(g),mq=m(q);
  const r=g.reduce((s,v,i)=>s+(v-mg)*(q[i]-mq),0)/Math.sqrt(g.reduce((s,v)=>s+(v-mg)**2,0)*q.reduce((s,v)=>s+(v-mq)**2,0));
  const pairs=h=>twins.filter(t=>ids.filter(id=>twin(id)===t).every(id=>h.has(id))).length;
  console.log(JSON.stringify({check:label,boards:boardIds.length,withinBoardScoreCorrelation:+r.toFixed(3),sameUniqueTopChoice:argmaxAgree,
    graphCorrect:graphRight,surrogateCorrect:surrogateRight,graphTwinPairsBoth:pairs(hitG),surrogateTwinPairsBoth:pairs(hitS),presentations}));}
console.log(JSON.stringify({encoderMatchesScreenedCells:mismatches===0,mismatches}));
const scratch=fresh();
compare('v4 cue at scratch (reference)',S.panels,ids,()=>scratch);
compare('attack-map cue at scratch',attackPanels,ids,()=>scratch);
const all=fresh(),r=rand(7);for(let i=0;i<8;i++) for(const id of [...ids].sort(()=>r()-0.5)) lesson(attackPanels.get(id),0.1,all);
compare('attack-map cue after surrogate learning on all 24 (8 rounds, eta 0.1)',attackPanels,ids,()=>all);
const folds=new Map();for(const F of new Set(ids.map(fam))){const st=fresh(),rr=rand(11),tr=ids.filter(id=>fam(id)!==F);
  for(let i=0;i<6;i++) for(const id of [...tr].sort(()=>rr()-0.5)) lesson(attackPanels.get(id),0.1,st);folds.set(F,st);}
compare('attack-map cue, held-out family after surrogate learning on the other 5 (6 rounds, eta 0.1)',attackPanels,ids,id=>folds.get(fam(id)));
memory.restore({version:1,identity:memory.identity,events:0,gains:[...fresh().r,...fresh().a]});
