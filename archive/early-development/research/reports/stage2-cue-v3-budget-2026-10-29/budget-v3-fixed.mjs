// Budget check for the revised public-attack-map-cue-v3 (v2 part reproduced exactly, extra budget separate) against v2 on Stage 1 training boards (first 6 legal moves each, synthetic 3x1000-KC mapping as in the cue tests). No graph. Usage (repo root): node research/reports/stage2-cue-v3-budget-2026-10-29/budget-v3-fixed.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {createPublicAttackMapEncoderV2} from '../../../.codebase/src/chess-input/public-attack-map-cue-v2.mjs';
import {createPublicAttackMapEncoderV3} from '../../../.codebase/src/chess-input/public-attack-map-cue-v3.mjs';
const range=(a,n)=>Array.from({length:n},(_,i)=>a+i);
const mapping={readyForCandidateExperiment:true,groups:['MBON01','MBON12','MBON07'].map((mbonType,i)=>({mbonType,kc:range(1000*i,1000)}))};
const e2=createPublicAttackMapEncoderV2(mapping),e3=createPublicAttackMapEncoderV3(mapping);
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
let kept=[],v2cells=[],v3cells=[],extraCells=[],identical=0;
for(const row of rows){const b=new Chess();b.loadPgn(row.lesson.context.pgn);
  for(const m of b.moves({verbose:true}).slice(0,6)){const task={objective:'capture-retention',plies:1},action=m.from+m.to+(m.promotion??'');
    const frame={schema:'public-lesson-frame-v1',fen:b.fen(),pgn:b.pgn(),action,task};
    const c2=e2.encode(frame),c3=e3.encode(frame);
    const k=c2.stimulation.length;
    // v2 cells kept in v3 with the same current (share of v2 cells that survive)
    const v3map=new Map(c3.stimulation.map(s=>[s.index,s.current]));
    const keptCells=c2.stimulation.filter(s=>v3map.get(s.index)===s.current).length;
    if(JSON.stringify(c3.stimulation.slice(0,k))===JSON.stringify(c2.stimulation))identical++;
    kept.push(keptCells/k);v2cells.push(k);v3cells.push(c3.stimulation.length);extraCells.push(c3.stimulation.length-k);}}
const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
const result={script:'research/reports/stage2-cue-v3-budget-2026-10-29/budget-v3-fixed.mjs',moves:kept.length,
  shareOfV2CellsKept:Number(avg(kept).toFixed(3)),minShareOfV2CellsKept:Number(Math.min(...kept).toFixed(3)),
  v2PartIdenticalMoves:identical,meanV2Cells:Number(avg(v2cells).toFixed(3)),meanV3Cells:Number(avg(v3cells).toFixed(3)),
  meanExtraCells:Number(avg(extraCells).toFixed(3)),maxExtraCells:Math.max(...extraCells),
  note:'Synthetic 3x1000-KC mapping, no graph. Extra budget size is TENTATIVE pending a verified KC coding-level source.'};
const text=JSON.stringify(result,null,2)+'\n';
writeFileSync('research/reports/stage2-cue-v3-budget-2026-10-29/budget-v3-fixed-results.json',text);
console.log(text);
