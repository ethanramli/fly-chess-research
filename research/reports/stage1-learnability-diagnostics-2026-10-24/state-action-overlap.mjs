import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Chess} from 'chess.js';
const root=process.cwd();
const {createPublicActionRelativeEncoder}=await import(pathToFileURL(join(root,'.codebase/src/chess-input/public-action-relative-cue.mjs')).href);
const mapping=JSON.parse(readFileSync(join(root,'research/reports/reversal-candidate-2026-10-05/mapping.json'),'utf8')).mapping;
const enc=createPublicActionRelativeEncoder(mapping,{seed:20261101});
const rows=readFileSync(join(root,'research/data/lichess-stage1-synthetic-v1/train.jsonl'),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
let shared=0,total=0,n=0;
for(const row of rows){const c=row.lesson.context;
  for(const m of row.lesson.candidates){
    const a=enc.encode({schema:'public-lesson-frame-v1',fen:c.fen,pgn:c.pgn,action:m.move,task:c.task},null,null);
    const child=new Chess();child.loadPgn(c.pgn);child.move({from:m.move.slice(0,2),to:m.move.slice(2,4),promotion:m.move[4]});
    const s=enc.encode(child,null,c.task);
    const A=new Set(a.stimulation.map(x=>x.index));shared+=s.stimulation.filter(x=>A.has(x.index)).length;total+=s.stimulation.length;n++;}}
console.log(JSON.stringify({pairs:n,meanStateCells:(total/n).toFixed(1),meanSharedWithActionCue:(shared/n).toFixed(2)}));
