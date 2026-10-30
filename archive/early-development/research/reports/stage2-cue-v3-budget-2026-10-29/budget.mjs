// Budget check for public-attack-map-cue-v3 against v2 on Stage 1 training boards (first 6 legal moves each, synthetic 3x1000-KC mapping as in the cue tests). No graph. Usage (repo root): node research/reports/stage2-cue-v3-budget-2026-10-29/budget.mjs
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {createPublicAttackMapEncoderV2} from '../../../.codebase/src/chess-input/public-attack-map-cue-v2.mjs';
import {createPublicAttackMapEncoderV3} from '../../../.codebase/src/chess-input/public-attack-map-cue-v3.mjs';
const range=(a,n)=>Array.from({length:n},(_,i)=>a+i);
const mapping={readyForCandidateExperiment:true,groups:['MBON01','MBON12','MBON07'].map((mbonType,i)=>({mbonType,kc:range(1000*i,1000)}))};
const e2=createPublicAttackMapEncoderV2(mapping),e3=createPublicAttackMapEncoderV3(mapping);
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
let kept=[],v2cells=[],v3cells=[],dropped=[];
for(const row of rows){const b=new Chess();b.loadPgn(row.lesson.context.pgn);
  for(const m of b.moves({verbose:true}).slice(0,6)){const task={objective:'capture-retention',plies:1},action=m.from+m.to+(m.promotion??'');
    const frame={schema:'public-lesson-frame-v1',fen:b.fen(),pgn:b.pgn(),action,task};
    const c2=e2.encode(frame),c3=e3.encode(frame);
    const s2=new Set(c2.stimulation.map(s=>s.index)),s3=new Set(c3.stimulation.map(s=>s.index));
    // v2-token cells that survive in v3
    const v2tok=new Set(c2.tokens),surv=c3.assignments.filter(a=>v2tok.has(a.token)&&s3.has(a.index)).length,
      want=c3.assignments.filter(a=>v2tok.has(a.token)).length;
    kept.push(surv/want);v2cells.push(s2.size);v3cells.push(s3.size);dropped.push(c3.accounting.droppedFeatures/c3.assignments.length);}}
const avg=a=>(a.reduce((s,x)=>s+x,0)/a.length).toFixed(3);
console.log(JSON.stringify({moves:kept.length,meanV2Cells:avg(v2cells),meanV3Cells:avg(v3cells),meanShareOfV2TokenAssignmentsKeptInV3:avg(kept),minKept:Math.min(...kept).toFixed(3),meanV3DroppedShare:avg(dropped)}));
