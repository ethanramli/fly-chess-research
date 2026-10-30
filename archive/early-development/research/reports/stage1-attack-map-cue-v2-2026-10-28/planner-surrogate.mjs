// Planner-driven surrogate (no graph; training rows only). The r11 surrogate (direct path; fidelity
// checked by replay-r13.mjs) taught by the registered rehearsal planner v2 rule: per block, the
// target is the current-error board with the smallest success-failure margin (else the least
// selected, then id; a board targeted in each of the last 2 blocks is skipped), and the sentinel is
// another board, preferring one currently correct, then least selected. Events: target failure,
// target success, sentinel success, sentinel failure, each the highest-scored move of its status.
// Each event applies the mean factors recorded in the smoke r13 informative receipts for its frame
// type (task pulse with untaught-channel background, then the no-channel frame), unless the
// variant drops the no-channel frame. Early stop as registered (window 3).
// Usage (repo root): node --max-old-space-size=512 research/reports/stage1-attack-map-cue-v2-2026-10-28/planner-surrogate.mjs [blocks]
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const imp=path=>import(pathToFileURL(resolve(path)).href);
const {buildSurrogate,Chess,TASK}=await imp('research/reports/stage1-memory-literature-and-surrogate-2026-10-27/scripts/surrogate.mjs');
const {createPublicAttackMapEncoderV1}=await imp('.codebase/src/chess-input/public-attack-map-cue-v1.mjs');
const {createPublicAttackMapEncoderV2}=await imp('.codebase/src/chess-input/public-attack-map-cue-v2.mjs');
const S=buildSurrogate(),registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r13-registration.json','utf8'));
const {schema,...config}=registration.learner.encoder,eta=registration.learner.memory.eta,blocks=Number(process.argv[2]??8);

// Mean recorded factors per frame type.
const dir='runs/lichess-stage1-synthetic-v1-smoke-r13/r1%3Ainformative/attempt-001',sums={};
for(let b=1;b<=5;b++) for(const line of readFileSync(`${dir}/block-0${b}/receipts.jsonl`,'utf8').split(/\r?\n/).filter(Boolean)){
  const l=JSON.parse(line);if(l.kind!=='frame'||!l.value.receipt.learningApplied)continue;
  const r=l.value.receipt.result,key=`${l.value.receipt.phase}:${r.verifiedTaskStatus}`,s=sums[key]??={n:0,f:[0,0,0,0],a:[0,0,0,0]};
  s.n++;r.update.factors.forEach((x,i)=>s.f[i]+=x);r.update.alphaFactors.forEach((x,i)=>s.a[i]+=x);}
const mean=Object.fromEntries(Object.entries(sums).map(([k,s])=>[k,{f:s.f.map(x=>x/s.n),a:s.a.map(x=>x/s.n),n:s.n}]));

const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const fam=id=>id.split('-').slice(0,3).join('-');
function panelsFor(make,seed){return rows.map(row=>{const board=new Chess();board.loadPgn(row.lesson.context.pgn);
  const enc=make(S.memory.mapping,{...config,seed}),exp=row.lesson.candidates.map(c=>({move:c.move,status:c.proof.status}));
  return {id:row.lesson.lessonId,exp,cues:new Map(exp.map(x=>[x.move,enc.encode(board,x.move,TASK).stimulation]))};});}
const fresh=()=>({r:new Float64Array(S.state.r.length).fill(1),a:new Float64Array(S.state.a.length).fill(1)});

function teach(panel,move,status,st,nullFrame){
  const stim=panel.cues.get(move),t=mean[`task:${status}`],n=mean[`stockfish:${status}`];
  S.update(stim,t.f,t.a,eta,st);if(nullFrame)S.update(stim,n.f,n.a,eta,st);}
function observe(panel,st){const a=S.assess(panel,st),status=new Map(panel.exp.map(x=>[x.move,x.status]));
  const order=(x,y)=>y.score-x.score||x.move.localeCompare(y.move);
  const success=a.rows.filter(r=>status.get(r.move)==='success').sort(order)[0],failure=a.rows.filter(r=>status.get(r.move)==='failure').sort(order)[0];
  return {id:panel.id,correct:a.correct,error:a.choice!==null&&status.get(a.choice)==='failure',success,failure,margin:success.score-failure.score};}
// Returns block-start counts and targets; stops early as registered (window 3) unless noStop.
function run(panels,st,{nBlocks,nullFrame=true,noStop=false}){
  const counts=[],targets=[],sel={};
  for(let b=0;b<=nBlocks;b++){
    const obs=panels.map(p=>observe(p,st));counts.push(obs.filter(o=>o.correct).length);
    if(b===nBlocks)break;
    if(!noStop&&b>=3&&Math.max(...counts.slice(b-2))<=Math.max(...counts.slice(0,b-2)))return {counts,targets,stopped:b};
    const oldest=(x,y)=>(sel[x.id]??0)-(sel[y.id]??0)||x.id.localeCompare(y.id);
    const capped=targets.length>=2&&targets.at(-1)===targets.at(-2)?targets.at(-1):null;
    const unc=obs.filter(o=>o.error).sort((x,y)=>x.margin-y.margin||oldest(x,y))[0]??[...obs].sort(oldest)[0];
    const target=unc.id!==capped?unc:obs.filter(o=>o.id!==capped).sort(oldest)[0];
    const sentinel=obs.filter(o=>o.id!==target.id).sort((x,y)=>Number(y.correct)-Number(x.correct)||oldest(x,y))[0];
    const P=new Map(panels.map(p=>[p.id,p]));
    teach(P.get(target.id),target.failure.move,'failure',st,nullFrame);teach(P.get(target.id),target.success.move,'success',st,nullFrame);
    teach(P.get(sentinel.id),sentinel.success.move,'success',st,nullFrame);teach(P.get(sentinel.id),sentinel.failure.move,'failure',st,nullFrame);
    targets.push(target.id);sel[target.id]=(sel[target.id]??0)+1;sel[sentinel.id]=(sel[sentinel.id]??0)+1;
  }
  return {counts,targets,stopped:null};
}
const short=id=>id.replace('s1syn-train-','');
console.log(JSON.stringify({meanFactors:Object.fromEntries(Object.entries(mean).map(([k,v])=>[k,{n:v.n,f:v.f.map(x=>+x.toFixed(3)),a:v.a.map(x=>+x.toFixed(3))}]))}));
const seeds=[registration.learner.replicaSeeds.r1,101,202,303,404];
for(const [cue,make] of [['v1',createPublicAttackMapEncoderV1],['v2',createPublicAttackMapEncoderV2]])
  for(const nullFrame of [true,false]) for(const seed of seeds){
    const panels=panelsFor(make,seed);
    const smoke=run(panels,fresh(),{nBlocks:blocks,nullFrame});
    const long=run(panels,fresh(),{nBlocks:32,nullFrame,noStop:true});
    // Leave-one-family-out: planner-taught on the other families for 16 blocks, then the held-out boards.
    let held=0;for(const F of new Set(panels.map(p=>fam(p.id)))){const st=fresh();run(panels.filter(p=>fam(p.id)!==F),st,{nBlocks:16,nullFrame,noStop:true});
      held+=panels.filter(p=>fam(p.id)===F&&S.assess(p,st).correct).length;}
    console.log(JSON.stringify({cue,nullFrame,seed,smokeCounts:smoke.counts.join(','),earlyStopBefore:smoke.stopped,
      smokeTargets:seed===seeds[0]&&cue==='v1'&&nullFrame?smoke.targets.map(short).join(' '):undefined,
      counts32:long.counts.join(','),min16to32:Math.min(...long.counts.slice(16)),max:Math.max(...long.counts),heldOut:`${held}/24`}));
  }
