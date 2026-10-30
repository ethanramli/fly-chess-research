// Training rows only, no graph, no engine run: does the existing all-legal regret signal
// (gradeStockfishChoice().signal, relative to the board's best alternative) agree with the
// verified capture-retention outcome more often than the absolute expected score that the
// coupled brain uses now? Reads the pinned smoke-r6 review cache (every legal move analysed).
// Usage (repo root): node research/reports/stage1-attack-map-cue-2026-10-27/stockfish-relative-check.mjs
import {readFileSync,readdirSync} from 'node:fs';
import {gradeStockfishChoice} from '../../../.codebase/src/search-and-feedback/stockfish-feedback-rubric.mjs';
const cache='runs/lichess-stage1-synthetic-v1-smoke-r6-stockfish-cache';
const reviews=new Map(readdirSync(cache).filter(f=>f.endsWith('.review.json')).map(f=>JSON.parse(readFileSync(`${cache}/${f}`,'utf8'))).map(r=>[r.context.fen,r]));
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const blank=()=>({agree:0,oppose:0,none:0}),tally={};
const add=(key,value,ok)=>{(tally[key]??=blank())[value===0?'none':(value>0)===ok?'agree':'oppose']++;};
for(const row of rows){const review=reviews.get(row.lesson.context.fen);
  for(const c of row.lesson.candidates){const g=gradeStockfishChoice({...review,chosen:c.move}),ok=c.proof.status==='success';
    const capture=c.proof.certificate?.consequence!=='does-not-perform-capture-task',kind=ok?'certified':capture?'unsafe capture':'non-capture';
    const absolute=g.selectedExpectedScore?g.selectedExpectedScore.low+g.selectedExpectedScore.high-1:0;
    add(`relative regret signal / ${kind}`,g.signal,ok);add(`absolute expected score / ${kind}`,absolute,ok);}}
for(const [key,value] of Object.entries(tally)) console.log(JSON.stringify({signal:key,...value}));
