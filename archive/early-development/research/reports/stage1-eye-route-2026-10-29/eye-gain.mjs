// Gain curve for the eye route: photoreceptor current scaled 1.5 x {1,10,100,1000} on 4 training boards (mover and
// opponent pieces equal, empty 0). Reports KC mean activity above rest and its ratio to the cue reference (0.038,
// cue-reference-results.jsonl), and board specificity across the 4 boards. Read-only; no memory change.
// Usage (repo root): node --max-old-space-size=512 research/reports/stage1-eye-route-2026-10-29/eye-gain.mjs
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {createLichessStage1BrainV8} from '../../../.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v8.mjs';
const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-full-r14-registration.json','utf8'));
const {model,rest,brain}=createLichessStage1BrainV8({registration,replica:'r1',repositoryRoot:process.cwd()}),fingerprint=brain.memoryFingerprint();
const cells=JSON.parse(readFileSync('research/reports/stage1-eye-route-2026-10-29/eye-cells.json','utf8'));
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).filter((_,i)=>i%6===0).slice(0,4);
const above=i=>Math.max(0,model.h[model.steps][i]-rest[i]);
const corr=(a,b)=>{const n=a.length,ma=a.reduce((s,x)=>s+x,0)/n,mb=b.reduce((s,x)=>s+x,0)/n;let sab=0,saa=0,sbb=0;
  for(let i=0;i<n;i++){const x=a[i]-ma,y=b[i]-mb;sab+=x*y;saa+=x*x;sbb+=y*y;}return saa&&sbb?sab/Math.sqrt(saa*sbb):null;};
for(const scale of [1,10,100,1000]){const vectors=[];
  for(const row of rows){const board=new Chess();board.loadPgn(row.lesson.context.pgn);const occupied=new Array(64).fill(false);
    for(const r of board.board())for(const p of r)if(p){const f=p.square.charCodeAt(0)-97,k=Number(p.square[1])-1;occupied[(board.turn()==='w'?k:7-k)*8+f]=true;}
    model.forward([0],cells.retinaIdx.map((index,k)=>({index,current:occupied[cells.retinaSquare[k]]?1.5*scale:0})).filter(s=>s.current>0));
    vectors.push(cells.kcIdx.map(above));}
  const mean=vectors.map(v=>v.reduce((s,x)=>s+x,0)/v.length),cs=[];
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)cs.push(corr(vectors[i],vectors[j]));
  console.log(JSON.stringify({scale,kcMean:mean.map(x=>+x.toExponential(2)),ratioToCue:+(mean.reduce((s,x)=>s+x,0)/4/0.038).toExponential(2),
    kcActive:vectors.map(v=>v.filter(x=>x>1e-6).length),meanPairwiseCorr:+(cs.reduce((s,x)=>s+(x??0),0)/cs.length).toFixed(3)}));}
console.log(JSON.stringify({memoryUnchanged:brain.memoryFingerprint()===fingerprint}));
