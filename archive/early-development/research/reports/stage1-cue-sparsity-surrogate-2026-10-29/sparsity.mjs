// Cue-sparsity sweep on the planner-driven direct-path surrogate (no graph; training rows only).
// Reuses the logic of research/reports/stage1-attack-map-cue-v2-2026-10-28/planner-surrogate.mjs
// (copied, not edited) with the test-only cue variant cue-v2-sparsity-variant.mjs. Null frame kept
// (the v2 primary row). Settings: cellsPerToken/maxCells = 5/32, 10/64, 20/128, 40/256, 80/512,
// totalCurrent = 1.5*maxCells (per-cell current 1.5). Writes sparsity-results.jsonl here.
// Usage (repo root): node --max-old-space-size=512 research/reports/stage1-cue-sparsity-surrogate-2026-10-29/sparsity.mjs [blocks=32]
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
const imp=path=>import(pathToFileURL(resolve(path)).href);
const here=dirname(fileURLToPath(import.meta.url));
const OUT=resolve(here,'sparsity-results.jsonl');
const {buildSurrogate,Chess,TASK}=await imp('research/reports/stage1-memory-literature-and-surrogate-2026-10-27/scripts/surrogate.mjs');
const {createPublicAttackMapEncoderV2}=await imp(resolve(here,'cue-v2-sparsity-variant.mjs'));
const S=buildSurrogate(),registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r13-registration.json','utf8'));
const {schema,...config}=registration.learner.encoder,eta=registration.learner.memory.eta,blocks=Number(process.argv[2]??32);
const SETTINGS=[[5,32],[10,64],[20,128],[40,256],[80,512]];
const SEEDS=[registration.learner.replicaSeeds.r1,101,202,303,404];

// Mean recorded factors per frame type (same receipts as planner-surrogate.mjs).
const dir='runs/lichess-stage1-synthetic-v1-smoke-r13/r1%3Ainformative/attempt-001',sums={};
for(let b=1;b<=5;b++) for(const line of readFileSync(`${dir}/block-0${b}/receipts.jsonl`,'utf8').split(/\r?\n/).filter(Boolean)){
  const l=JSON.parse(line);if(l.kind!=='frame'||!l.value.receipt.learningApplied)continue;
  const r=l.value.receipt.result,key=`${l.value.receipt.phase}:${r.verifiedTaskStatus}`,s=sums[key]??={n:0,f:[0,0,0,0],a:[0,0,0,0]};
  s.n++;r.update.factors.forEach((x,i)=>s.f[i]+=x);r.update.alphaFactors.forEach((x,i)=>s.a[i]+=x);}
const mean=Object.fromEntries(Object.entries(sums).map(([k,s])=>[k,{f:s.f.map(x=>x/s.n),a:s.a.map(x=>x/s.n),n:s.n}]));

const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const fam=id=>id.split('-').slice(0,3).join('-');
function panelsFor(cellsPerToken,maxCells,seed){
  const enc=createPublicAttackMapEncoderV2(S.memory.mapping,{...config,cellsPerToken,maxCells,totalCurrent:1.5*maxCells,seed});
  return rows.map(row=>{const board=new Chess();board.loadPgn(row.lesson.context.pgn);
    const exp=row.lesson.candidates.map(c=>({move:c.move,status:c.proof.status}));
    return {id:row.lesson.lessonId,exp,cues:new Map(exp.map(x=>[x.move,enc.encode(board,x.move,TASK).stimulation]))};});}
const fresh=()=>({r:new Float64Array(S.state.r.length).fill(1),a:new Float64Array(S.state.a.length).fill(1)});

// Mean pairwise Jaccard of stimulated cell sets between different legal moves of the same board.
function overlap(panels){const boards=[];for(const p of panels){const sets=p.exp.map(x=>new Set(p.cues.get(x.move).map(s=>s.index)));
  const pairs=[];for(let i=0;i<sets.length;i++)for(let j=i+1;j<sets.length;j++){let inter=0;for(const v of sets[i])if(sets[j].has(v))inter++;
    pairs.push(inter/(sets[i].size+sets[j].size-inter));}
  if(pairs.length)boards.push(pairs.reduce((a,b)=>a+b,0)/pairs.length);}
  return {jaccard:boards.reduce((a,b)=>a+b,0)/boards.length,boards:boards.length};}
const meanCells=panels=>{const v=panels.flatMap(p=>p.exp.map(x=>p.cues.get(x.move).length));return v.reduce((a,b)=>a+b,0)/v.length;};

function teach(panel,move,status,st){
  const stim=panel.cues.get(move),t=mean[`task:${status}`],n=mean[`stockfish:${status}`];
  S.update(stim,t.f,t.a,eta,st);S.update(stim,n.f,n.a,eta,st);}
function observe(panel,st){const a=S.assess(panel,st),status=new Map(panel.exp.map(x=>[x.move,x.status]));
  const order=(x,y)=>y.score-x.score||x.move.localeCompare(y.move);
  const success=a.rows.filter(r=>status.get(r.move)==='success').sort(order)[0],failure=a.rows.filter(r=>status.get(r.move)==='failure').sort(order)[0];
  return {id:panel.id,correct:a.correct,error:a.choice!==null&&status.get(a.choice)==='failure',success,failure,margin:success.score-failure.score};}
function run(panels,st,{nBlocks,noStop=false}){
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
    teach(P.get(target.id),target.failure.move,'failure',st);teach(P.get(target.id),target.success.move,'success',st);
    teach(P.get(sentinel.id),sentinel.success.move,'success',st);teach(P.get(sentinel.id),sentinel.failure.move,'failure',st);
    targets.push(target.id);sel[target.id]=(sel[target.id]??0)+1;sel[sentinel.id]=(sel[sentinel.id]??0)+1;
  }
  return {counts,targets,stopped:null};
}

// Reproduction reference: v2 rows of the planner-surrogate screen (nullFrame true).
const ref=readFileSync('research/reports/stage1-attack-map-cue-v2-2026-10-28/planner-surrogate-results.jsonl','utf8').split(/\r?\n/).filter(Boolean)
  .map(JSON.parse).filter(l=>l.cue==='v2'&&l.nullFrame===true);
let peakRss=process.memoryUsage().rss;
const out=[],t0=Date.now();
for(const [cpt,maxCells] of SETTINGS){
  const t1=Date.now(),perSeed=[];
  for(const seed of SEEDS){
    const panels=panelsFor(cpt,maxCells,seed);
    const smoke=run(panels,fresh(),{nBlocks:8});
    const long=run(panels,fresh(),{nBlocks:blocks,noStop:true});
    let held=0;for(const F of new Set(panels.map(p=>fam(p.id)))){const st=fresh();run(panels.filter(p=>fam(p.id)!==F),st,{nBlocks:16,noStop:true});
      held+=panels.filter(p=>fam(p.id)===F&&S.assess(p,st).correct).length;}
    const ov=overlap(panels),post=long.counts.slice(16);
    peakRss=Math.max(peakRss,process.memoryUsage().rss);
    perSeed.push({seed,smokeCounts:smoke.counts.join(','),earlyStopBefore:smoke.stopped,counts:long.counts,
      min16to:Math.min(...post),max16to:Math.max(...post),heldOut:held,overlapJaccard:ov.jaccard,meanCellsPerMove:meanCells(panels)});
  }
  const post=perSeed.flatMap(r=>r.counts.slice(16)),summary={cellsPerToken:cpt,maxCells,totalCurrent:1.5*maxCells,
    afterBlock16:{min:Math.min(...post),max:Math.max(...post),perWiringMin:perSeed.map(r=>r.min16to)},
    heldOut:perSeed.map(r=>r.heldOut),overlapJaccard:perSeed.reduce((a,r)=>a+r.overlapJaccard,0)/perSeed.length,
    meanCellsPerMove:perSeed.reduce((a,r)=>a+r.meanCellsPerMove,0)/perSeed.length,seconds:(Date.now()-t1)/1000};
  out.push({kind:'setting',...summary,perSeed});
  console.error(`done ${cpt}/${maxCells} in ${summary.seconds}s, peak RSS ${(peakRss/2**20).toFixed(0)} MiB`);
}
// Reproduction check: setting 20/128 against the planner-surrogate v2 rows.
const base=out.find(o=>o.cellsPerToken===20).perSeed;
const repro=ref.map(r=>{const m=base.find(b=>b.seed===r.seed);return {seed:r.seed,
  smokeMatch:m.smokeCounts===r.smokeCounts,counts32Match:m.counts.join(',')===r.counts32,heldOutMatch:`${m.heldOut}/24`===r.heldOut,
  ref:{smoke:r.smokeCounts,counts32:r.counts32,heldOut:r.heldOut},got:{smoke:m.smokeCounts,heldOut:`${m.heldOut}/24`}};});
const reproduced=repro.length===5&&repro.every(r=>r.smokeMatch&&r.counts32Match&&r.heldOutMatch);
out.push({kind:'reproduction',reproduced,rows:repro});
out.push({kind:'run',blocks,settings:SETTINGS,seeds:SEEDS,eta,encoderBase:'public-attack-map-cue-v2 (test variant)',
  wallSeconds:(Date.now()-t0)/1000,peakRssMiB:+(peakRss/2**20).toFixed(0),nodeOptions:'--max-old-space-size=512'});
writeFileSync(OUT,out.map(o=>JSON.stringify(o)).join('\n')+'\n');
console.log(JSON.stringify(out.map(o=>o.kind==='setting'?{cpt:o.cellsPerToken,maxCells:o.maxCells,after16:o.afterBlock16,heldOut:o.heldOut,overlap:+o.overlapJaccard.toFixed(3),cells:+o.meanCellsPerMove.toFixed(1)}:o)));
