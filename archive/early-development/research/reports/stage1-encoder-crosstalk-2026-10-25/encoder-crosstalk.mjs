// Read-only, no-graph diagnostic (2026-10-25, researcher decision 1a).
// For each retention-probe A board, take the tokens that separate its certified
// move S from its punished move F (in one cue but not both; task token dropped:
// shared tokens cancel in the S-vs-F comparison). Count how many of them the
// taught moves of the 10 interfering lessons also produce, per encoder.
// Lower = less cross-board rewriting of A's lesson. Token level, so it ignores
// hashing collisions, KC pools and graph dynamics; training rows only.
// Usage: node research/reports/stage1-encoder-crosstalk-2026-10-25/encoder-crosstalk.mjs [PROBE_RUN_DIR]
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {Chess} from 'chess.js';
import {createPublicActionRelativeEncoder} from '../../../.codebase/src/chess-input/public-action-relative-cue.mjs';
import {createRelationalChessCueEncoder as rel1} from '../../../.codebase/src/chess-input/relational-chess-cue.mjs';
import {createRelationalChessCueEncoder as rel2} from '../../../.codebase/src/chess-input/relational-chess-cue-v2.mjs';
import {createRelationalChessCueEncoder as rel3} from '../../../.codebase/src/chess-input/relational-chess-cue-v3.mjs';
import {createAllLegalBoundRayCueEncoder} from '../../../.codebase/src/chess-input/bound-ray-relational-cue.mjs';

const run=process.argv[2]??'runs/stage1-retention-probe-v1';
const mapping=JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json','utf8')).mapping;
const encoders={
  'public-action-relative-v1':createPublicActionRelativeEncoder(mapping,{taskFamily:'capture-retention'}),
  'relational-v1':rel1(mapping),'relational-v2':rel2(mapping),'relational-v3':rel3(mapping),
  'bound-ray-all-legal':createAllLegalBoundRayCueEncoder(mapping),
};
const task={objective:'capture-retention',plies:1};
const rows=new Map(readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/)
  .filter(Boolean).map(l=>JSON.parse(l)).map(r=>[r.lesson.lessonId??r.lesson.puzzleId,r]));
const board=id=>{const b=new Chess();b.loadPgn(rows.get(id).lesson.context.pgn);return b;};
const tokens=(enc,id,move)=>{try{return new Set(enc.encode(board(id),move,task).tokens.filter(t=>!t.startsWith('task:')));}catch(e){return null;}};

// One probe per A board (interference order is the same across eta).
const probes=new Map();
for(const f of readdirSync(run).filter(f=>f.startsWith('probe-'))){const p=JSON.parse(readFileSync(join(run,f),'utf8'));if(!probes.has(p.aPanelId))probes.set(p.aPanelId,p);}
const out={};
for(const [name,enc] of Object.entries(encoders)){
  const perBoard=[];let failed=0;
  for(const [id,p] of probes){
    const own=p.lessons[0].events,F=tokens(enc,id,own.find(e=>e.status==='failure').move),S=tokens(enc,id,own.find(e=>e.status==='success').move);
    if(!F||!S){failed++;continue;}
    const D=[...F].filter(t=>!S.has(t)).concat([...S].filter(t=>!F.has(t))),hit=new Set();
    for(const l of p.lessons.slice(1))for(const e of l.events){const C=tokens(enc,l.panelId,e.move);if(!C){failed++;continue;}for(const t of D)if(C.has(t))hit.add(t);}
    perBoard.push({board:id,sameBoardOverlap:+([...F].filter(t=>S.has(t)).length/new Set([...F,...S]).size).toFixed(2),discriminating:D.length,hitByInterference:hit.size,fraction:+(hit.size/Math.max(1,D.length)).toFixed(2)});
  }
  const mean=perBoard.reduce((s,b)=>s+b.fraction,0)/Math.max(1,perBoard.length);
  out[name]={meanHitFraction:+mean.toFixed(2),encodeFailures:failed,perBoard};
}
console.log(JSON.stringify(out,null,1));
