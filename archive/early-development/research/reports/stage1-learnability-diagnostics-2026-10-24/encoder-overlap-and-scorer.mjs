// Read-only, training rows only. (1) same-board vs cross-board cue overlap for v1 and the
// action-relative encoder; (2) a representation diagnostic: a linear token scorer trained
// leave-one-family-out (logistic, fixed epochs) and scored on the held-out family's boards.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const load=async p=>import(pathToFileURL(join(root,p)).href);
const {createPublicLessonFrameEncoder}=await load('.codebase/src/chess-input/public-lesson-frame-cue.mjs');
const {createPublicActionRelativeEncoder}=await load('.codebase/src/chess-input/public-action-relative-cue.mjs');
const mapping=JSON.parse(readFileSync(join(root,'research/reports/reversal-candidate-2026-10-05/mapping.json'),'utf8')).mapping;
const rows=readFileSync(join(root,'research/data/lichess-stage1-synthetic-v1/train.jsonl'),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const families=JSON.parse(readFileSync(join(root,'research/data/lichess-stage1-synthetic-v1/train-families.json'),'utf8')).assignments;
const familyOf=new Map(families.map(f=>[f.lessonId??f.puzzleId,f.familyId]));
const jac=(a,b)=>{const A=new Set(a),B=new Set(b);let i=0;for(const x of A)if(B.has(x))i++;return i/(A.size+B.size-i);};
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
function study(name,encoder){
  const boards=rows.map(row=>{const c=row.lesson.context;return {family:familyOf.get(row.lesson.lessonId),
    moves:row.lesson.candidates.map(m=>{const e=encoder.encode({schema:'public-lesson-frame-v1',fen:c.fen,pgn:c.pgn,action:m.move,task:c.task},null,null);
      return {move:m.move,success:m.status==='success',cells:e.stimulation.map(s=>s.index),tokens:e.tokens};})};});
  const same=[],cross=[];
  for(const b of boards)for(let i=0;i<b.moves.length;i++)for(let j=i+1;j<b.moves.length;j++)same.push(jac(b.moves[i].cells,b.moves[j].cells));
  for(let x=0;x<boards.length;x++)for(let y=x+1;y<boards.length;y++)cross.push(jac(boards[x].moves[0].cells,boards[y].moves[0].cells));
  // Leave-one-family-out linear scorer over the stimulated cells (what the readout can see).
  const fams=[...new Set(boards.map(b=>b.family))];let heldCorrect=0,trainCorrect=0,heldBoards=0;
  for(const fam of fams){
    const w=new Map(),train=boards.filter(b=>b.family!==fam),held=boards.filter(b=>b.family===fam);
    for(let epoch=0;epoch<200;epoch++)for(const b of train)for(const m of b.moves){
      const z=m.cells.reduce((s,c)=>s+(w.get(c)??0),0),p=1/(1+Math.exp(-z)),g=(m.success?1:0)-p;
      for(const c of m.cells)w.set(c,(w.get(c)??0)+0.1*g);}
    const pick=b=>{const s=b.moves.map(m=>m.cells.reduce((t,c)=>t+(w.get(c)??0),0)),best=Math.max(...s);
      const top=b.moves.filter((m,i)=>s[i]===best);return top.length===1&&top[0].success;};
    heldCorrect+=held.filter(pick).length;heldBoards+=held.length;
    if(fam===fams[0])trainCorrect=train.filter(pick).length;
  }
  console.log(JSON.stringify({encoder:name,cellsPerCue:mean(boards.flatMap(b=>b.moves.map(m=>m.cells.length))).toFixed(1),
    sameBoardJaccard:mean(same).toFixed(3),crossBoardJaccard:mean(cross).toFixed(3),
    linearScorerFitOnTraining:`${trainCorrect}/${boards.length-boards.filter(b=>b.family===fams[0]).length}`,
    linearScorerHeldOutFamilies:`${heldCorrect}/${heldBoards}`,legalMovesPerBoard:mean(boards.map(b=>b.moves.length)).toFixed(1)}));
}
study('v1-absolute',createPublicLessonFrameEncoder(mapping,{seed:20261101}));
study('action-relative',createPublicActionRelativeEncoder(mapping,{seed:20261101}));

