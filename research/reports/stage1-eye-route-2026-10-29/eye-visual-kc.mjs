// Eye route, step 2 (read-only; training rows only; no memory change). Same setup as eye-reach.mjs (registration,
// replica r1, rendering mover 1.5 / opponent 1.5 / empty 0, brightness x10 as in eye-gain.mjs; 8-step forward pass).
// Splits KC activity above rest by FlyWire primary_type group (kc-types.json, from kc-types.py): visual = KCg-d + KCab-p,
// KCg-m, KCab (other KCab types), KCapbp-*, and KCg-s* (other). Reports per board and per group: active KCs (>1e-6),
// mean activity, share of total above-rest activity. Board specificity is computed within the visual group.
// Cue reference: 1.5 injected into 128 KCs at offsets 0/1000/2000 (as cue-reference.mjs), per-group mean activity.
// Usage (repo root): node --max-old-space-size=512 research/reports/stage1-eye-route-2026-10-29/eye-visual-kc.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {createLichessStage1BrainV8} from '../../../.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v8.mjs';

const R='research/reports/stage1-eye-route-2026-10-29/';
const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-full-r14-registration.json','utf8'));
const {model,mapping,rest,brain}=createLichessStage1BrainV8({registration,replica:'r1',repositoryRoot:process.cwd()});
const fingerprint=brain.memoryFingerprint();
const cells=JSON.parse(readFileSync(R+'eye-cells.json','utf8'));
const kcTypes=JSON.parse(readFileSync(R+'kc-types.json','utf8'));
if(kcTypes.kcIdx.length!==cells.kcIdx.length||kcTypes.kcIdx.some((v,i)=>v!==cells.kcIdx[i]))throw new Error('kc-types.json does not match eye-cells.json');
const LEVELS={mover:1.5,opponent:1.5,empty:0}, BRIGHTNESS=10;
const groupOf=t=>t==='KCg-d'||t==='KCab-p'?'visual':t==='KCg-m'?'KCg-m':t.startsWith('KCapbp')?'KCapbp-*':t.startsWith('KCab')?'KCab-other':'KCg-s-other';
const GROUPS=['visual','KCg-m','KCab-other','KCapbp-*','KCg-s-other'];
const groups=kcTypes.type.map(groupOf);
const members=Object.fromEntries(GROUPS.map(g=>[g,groups.map((x,i)=>x===g?i:-1).filter(i=>i>=0)]));
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).slice(0,24);
if(rows.length!==24)throw new Error('expected 24 training rows, got '+rows.length);
// Square index rank*8+file from the mover's perspective (board mirrored when Black moves), as in eye-reach.mjs.
function squareSides(board){const mover=board.turn(),out=new Array(64).fill('empty');
  for(const row of board.board())for(const p of row)if(p){const file=p.square.charCodeAt(0)-97,rank=Number(p.square[1])-1;
    const r=mover==='w'?rank:7-rank;out[r*8+file]=p.color===mover?'mover':'opponent';}return out;}
const above=i=>Math.max(0,model.h[model.steps][i]-rest[i]);
const corr=(a,b)=>{const n=a.length,ma=a.reduce((s,x)=>s+x,0)/n,mb=b.reduce((s,x)=>s+x,0)/n;let sab=0,saa=0,sbb=0;
  for(let i=0;i<n;i++){const x=a[i]-ma,y=b[i]-mb;sab+=x*y;saa+=x*x;sbb+=y*y;}return saa&&sbb?sab/Math.sqrt(saa*sbb):null;};
const out=[];let peakRss=process.memoryUsage().rss;
const sumAbove=(vec,idx)=>idx.reduce((s,i)=>s+vec[i],0);
const groupStats=(vec)=>Object.fromEntries(GROUPS.map(g=>{const idx=members[g];
  return [g,{n:idx.length,active:idx.filter(i=>vec[i]>1e-6).length,mean:sumAbove(vec,idx)/idx.length,sum:sumAbove(vec,idx)}];}));

const boardVectors=[],boardStats=[];
const totals=Object.fromEntries(GROUPS.map(g=>[g,0]));let totalAll=0;
for(const row of rows){
  const board=new Chess();board.loadPgn(row.lesson.context.pgn);const sides=squareSides(board);
  const stimulation=cells.retinaIdx.map((index,k)=>({index,current:LEVELS[sides[cells.retinaSquare[k]]]*BRIGHTNESS})).filter(s=>s.current>0);
  model.forward([0],stimulation);
  const vec=cells.kcIdx.map(above);boardVectors.push(vec);
  const st=groupStats(vec),all=vec.reduce((s,x)=>s+x,0);totalAll+=all;
  for(const g of GROUPS)totals[g]+=st[g].sum;
  boardStats.push({id:row.lesson.lessonId,drivenPhotoreceptors:stimulation.length,kcActiveAll:vec.filter(x=>x>1e-6).length,groups:st});
  peakRss=Math.max(peakRss,process.memoryUsage().rss);
  out.push({kind:'board',...boardStats.at(-1)});
}
// Per-group summary across boards (mean over boards of group mean; share pooled over all boards).
const eyeSummary=Object.fromEntries(GROUPS.map(g=>{
  const perBoard=boardStats.map(b=>b.groups[g]);
  return [g,{n:members[g].length,meanActiveKcs:+(perBoard.reduce((s,x)=>s+x.active,0)/24).toFixed(1),
    meanActivity:+(perBoard.reduce((s,x)=>s+x.mean,0)/24).toExponential(3),
    shareOfAboveRest:+(totals[g]/totalAll).toFixed(4)}];}));
// Board specificity within the visual group.
const visVecs=boardVectors.map(v=>members.visual.map(i=>v[i]));
const cs=[];for(let i=0;i<visVecs.length;i++)for(let j=i+1;j<visVecs.length;j++){const c=corr(visVecs[i],visVecs[j]);if(c!==null)cs.push(c);}
const visualSpecificity={pairs:cs.length,meanPairwiseCorrelation:cs.length?+(cs.reduce((s,x)=>s+x,0)/cs.length).toFixed(4):null};
out.push({kind:'eyeSummary',boards:24,groups:eyeSummary,visualSpecificity});

// Cue reference: 1.5 into 128 KCs, per-group mean activity, offsets 0/1000/2000 (cue-reference.mjs).
const cueByOffset=[];
for(const offset of [0,1000,2000]){const chosen=cells.kcIdx.slice(offset,offset+128);
  model.forward([0],chosen.map(index=>({index,current:1.5})));
  const vec=cells.kcIdx.map(above);cueByOffset.push(groupStats(vec));
  peakRss=Math.max(peakRss,process.memoryUsage().rss);}
const cueMean=Object.fromEntries(GROUPS.map(g=>[g,cueByOffset.reduce((s,x)=>s+x[g].mean,0)/3]));
const ratio=Object.fromEntries(GROUPS.map(g=>[g,{eyeMeanActivity:eyeSummary[g].meanActivity,cueMeanActivity:+cueMean[g].toExponential(3),
  eyeOverCue:cueMean[g]>0?+(boardStats.reduce((s,b)=>s+b.groups[g].mean,0)/24/cueMean[g]).toExponential(3):null}]));
out.push({kind:'cueReference',offsets:[0,1000,2000],perOffset:cueByOffset.map((x,k)=>({offset:[0,1000,2000][k],...Object.fromEntries(GROUPS.map(g=>[g,{active:x[g].active,mean:+x[g].mean.toExponential(3)}]))})),ratio});
const memoryUnchanged=brain.memoryFingerprint()===fingerprint;
out.push({kind:'final',memoryUnchanged,peakRssMiB:+(peakRss/1048576).toFixed(1)});
writeFileSync(R+'eye-visual-kc-results.jsonl',out.map(x=>JSON.stringify(x)).join('\n')+'\n');
console.log(JSON.stringify(eyeSummary));console.log(JSON.stringify(visualSpecificity));console.log(JSON.stringify(ratio));
console.log(JSON.stringify({memoryUnchanged,peakRssMiB:+(peakRss/1048576).toFixed(1)}));
