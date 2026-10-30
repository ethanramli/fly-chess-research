// Read-only, no graph: for every legal move on every Stage 1 training board, read
// the cached Stockfish review (deepest budget, last 'wdl' line of the child
// search) and convert it to the root actor's expected score E = (W + D/2)/1000.
// Reports how often E is saturated (<= 0.05 or >= 0.95) and whether the board's
// certified success move has the highest E. Training rows and the pinned smoke-r6
// review cache only.
// Usage: node research/reports/stage1-retention-probe-2026-10-24/stockfish-saturation.mjs
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

const cache='runs/lichess-stage1-synthetic-v1-smoke-r6-stockfish-cache';
const rows=new Map(readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/)
  .filter(Boolean).map(line=>JSON.parse(line)).map(row=>[row.lesson.context.fen,row]));
let moves=0,saturated=0,boards=0,successTop=0,allSameSide=0;const perBoard=[];
for(const file of readdirSync(cache).filter(name=>name.endsWith('.review.json'))){
  const review=JSON.parse(readFileSync(join(cache,file),'utf8')),row=rows.get(review.context.fen);
  if(!row)continue;boards++;
  const deepest=new Map();
  for(const analysis of review.analyses)
    if(!deepest.has(analysis.move)||analysis.budget>deepest.get(analysis.move).budget)deepest.set(analysis.move,analysis);
  const scores=[...deepest.values()].map(analysis=>{
    const wdl=analysis.transcript.filter(line=>/ wdl \d+ \d+ \d+/.test(line)).at(-1).match(/ wdl (\d+) (\d+) (\d+)/).slice(1).map(Number);
    // The child search reports the side to move in the child (the opponent).
    const child=(wdl[0]+wdl[1]/2)/1000;return {move:analysis.move,E:1-child};
  });
  const success=new Set(row.lesson.candidates.filter(c=>c.status==='success').map(c=>c.move));
  const best=Math.max(...scores.map(s=>s.E));
  moves+=scores.length;saturated+=scores.filter(s=>s.E<=0.05||s.E>=0.95).length;
  if(scores.some(s=>success.has(s.move)&&s.E===best))successTop++;
  if(scores.every(s=>s.E>=0.5)||scores.every(s=>s.E<0.5))allSameSide++;
  perBoard.push(`${row.lesson.lessonId}: E range ${Math.min(...scores.map(s=>s.E)).toFixed(2)}-${best.toFixed(2)}, success E ${scores.filter(s=>success.has(s.move)).map(s=>s.E.toFixed(2)).join('/')}`);
}
console.log(perBoard.sort().join('\n'));
console.log(JSON.stringify({boards,moves,saturatedMoves:saturated,boardsWhereSuccessHasTopE:successTop,
  boardsWhereEveryMoveIsOnOneSideOfHalf:allSameSide}));
