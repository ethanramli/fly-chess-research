// Eye route, step 1 (read-only full-graph simulation; training rows only; no memory change). Question:
// does a board shown to the 5,543 retina photoreceptors (Esposito's fly-chess placement, stored in the
// pinned graph; research/literature/cesp99-retina-2026-10-28) produce board-specific activity in the
// Kenyon cells, especially the learner's encoder pools, within the model's 8 steps?
// Rendering (fixed, declared engineering choice; nothing is trained): every photoreceptor watching a
// square gets current LEVELS[side] (mover's piece, opponent's piece, empty), from the mover's view as the
// retina map assumes (rank 1 ventral). Boards: the 24 training roots. Reports, per rendering level set:
// KCs above rest (all KCs and the encoder pools), mean activity, and board specificity = mean pairwise
// correlation of KC activity vectors across boards (1 = every board looks the same to the KCs).
// Run only when no other graph job is live. Usage (repo root):
//   node --max-old-space-size=512 research/reports/stage1-eye-route-2026-10-29/eye-reach.mjs
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {createLichessStage1BrainV8} from '../../../.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v8.mjs';

const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-full-r14-registration.json','utf8'));
const built=createLichessStage1BrainV8({registration,replica:'r1',repositoryRoot:process.cwd()});
const {model,mapping,rest,brain}=built,fingerprint=brain.memoryFingerprint();
const cells=JSON.parse(readFileSync('research/reports/stage1-eye-route-2026-10-29/eye-cells.json','utf8'));
const pools=Object.fromEntries(['MBON01','MBON12','MBON07'].map(t=>[t,[...new Set(mapping.groups.filter(g=>g.mbonType===t).flatMap(g=>g.kc))]]));
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
// Square index rank*8+file from the mover's perspective (board mirrored when Black moves), as in the retina map.
function squareSides(board){const mover=board.turn(),out=new Array(64).fill('empty');
  for(const row of board.board())for(const p of row)if(p){const file=p.square.charCodeAt(0)-97,rank=Number(p.square[1])-1;
    const r=mover==='w'?rank:7-rank;out[r*8+file]=p.color===mover?'mover':'opponent';}return out;}
const above=i=>Math.max(0,model.h[model.steps][i]-rest[i]);
const corr=(a,b)=>{const n=a.length,ma=a.reduce((s,x)=>s+x,0)/n,mb=b.reduce((s,x)=>s+x,0)/n;let sab=0,saa=0,sbb=0;
  for(let i=0;i<n;i++){const x=a[i]-ma,y=b[i]-mb;sab+=x*y;saa+=x*x;sbb+=y*y;}return saa&&sbb?sab/Math.sqrt(saa*sbb):null;};
for(const LEVELS of [{mover:1.5,opponent:0.75,empty:0},{mover:1.5,opponent:1.5,empty:0}]){
  const vectors=[],summary=[];
  for(const row of rows){const board=new Chess();board.loadPgn(row.lesson.context.pgn);const sides=squareSides(board);
    const stimulation=cells.retinaIdx.map((index,k)=>({index,current:LEVELS[sides[cells.retinaSquare[k]]]})).filter(s=>s.current>0);
    model.forward([0],stimulation);
    const kc=cells.kcIdx.map(above),pool=Object.fromEntries(Object.entries(pools).map(([t,c])=>[t,c.filter(i=>above(i)>1e-6).length]));
    vectors.push(kc);summary.push({id:row.lesson.lessonId,drivenPhotoreceptors:stimulation.length,kcActive:kc.filter(x=>x>1e-6).length,
      kcMean:+(kc.reduce((s,x)=>s+x,0)/kc.length).toExponential(3),poolActive:pool});}
  const cs=[];for(let i=0;i<vectors.length;i++)for(let j=i+1;j<vectors.length;j++){const c=corr(vectors[i],vectors[j]);if(c!==null)cs.push(c);}
  for(const s of summary)console.log(JSON.stringify({levels:LEVELS,...s}));
  console.log(JSON.stringify({levels:LEVELS,boards:summary.length,meanKcActive:+(summary.reduce((s,x)=>s+x.kcActive,0)/summary.length).toFixed(1),
    boardPairsWithActivity:cs.length,meanPairwiseKcCorrelation:cs.length?+(cs.reduce((s,x)=>s+x,0)/cs.length).toFixed(4):null}));
}
console.log(JSON.stringify({memoryUnchanged:brain.memoryFingerprint()===fingerprint}));
