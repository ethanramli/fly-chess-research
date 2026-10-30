// Training-only dose proxy (NOT the Fly): ReversalMemory's rule dg = eta*D*(k+g-1), D=-1 per task
// pulse, on the action-relative cue cells, with a linear readout sum(g12*w) - sum(g01*w).
// Planner: target = worst-margin board; teach its top wrong move (failure) then its success move;
// then a success on another board and a failure on another board (2/2 per block, like the registration).
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const {createPublicActionRelativeEncoder}=await import(pathToFileURL(join(root,'.codebase/src/chess-input/public-action-relative-cue.mjs')).href);
const mapping=JSON.parse(readFileSync(join(root,'research/reports/reversal-candidate-2026-10-05/mapping.json'),'utf8')).mapping;
const P01=new Set(mapping.groups.filter(g=>g.mbonType==='MBON01').flatMap(g=>g.kc));
const P12=new Set(mapping.groups.filter(g=>g.mbonType==='MBON12').flatMap(g=>g.kc));
const encoder=createPublicActionRelativeEncoder(mapping,{seed:20261101});
const rows=readFileSync(join(root,'research/data/lichess-stage1-synthetic-v1/train.jsonl'),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const boards=rows.map(row=>{const c=row.lesson.context;return row.lesson.candidates.map(m=>({success:m.status==='success',
  cells:encoder.encode({schema:'public-lesson-frame-v1',fen:c.fen,pgn:c.pgn,action:m.move,task:c.task},null,null).stimulation.map(s=>s.index)}));});
let x=12345;const rand=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/2**32;};
const w=new Map();for(const b of boards)for(const m of b)for(const c of m.cells)if(!w.has(c))w.set(c,0.5+rand());
function run(eta,blocks,recovery=1){
  const g01=new Map(),g12=new Map(),G=(m,c)=>m.get(c)??1;
  const score=m=>m.cells.reduce((s,c)=>s+(P12.has(c)?G(g12,c)*w.get(c):0)-(P01.has(c)?G(g01,c)*w.get(c):0),0);
  const pulse=(m,compartment)=>{const pool=compartment==='01'?P01:P12,g=compartment==='01'?g01:g12,active=new Set(m.cells);
    for(const c of pool){const k=active.has(c)?1:0,before=G(g,c);g.set(c,Math.max(0.2,Math.min(1.8,before+eta*-1*(k*before+recovery*(1-k)*(before-1)))));}};
  const top=b=>{let best=null;for(const m of b)if(!best||score(m)>score(best))best=m;return best;};
  const margin=b=>score(b.find(m=>m.success))-Math.max(...b.filter(m=>!m.success).map(score));
  const correct=()=>boards.filter(b=>top(b).success).length,out={};let last=0;
  for(let block=1;block<=blocks;block++){
    const order=boards.map((b,i)=>[margin(b),i]).sort((a,b)=>a[0]-b[0]);
    const t=boards[order[0][1]],other=boards[order[order.length-1-(block%3)][1]],third=boards[order[1+(block%5)][1]];
    const wrong=top(t).success?t.find(m=>!m.success):top(t);
    pulse(wrong,'12');pulse(t.find(m=>m.success),'01');
    pulse(other.find(m=>m.success),'01');pulse(third.filter(m=>!m.success)[block%third.filter(m=>!m.success).length],'12');
    if([8,16,32].includes(block))out[block]=correct();
  }
  return out;
}
const initial=boards.filter(b=>{let best=null;for(const m of b){const s=m.cells.reduce((t,c)=>t+(P12.has(c)?w.get(c):0)-(P01.has(c)?w.get(c):0),0);if(!best||s>best.s)best={s,m};}return best.m.success;}).length;
console.log(JSON.stringify({initialCorrect:`${initial}/24`}));
for(const recovery of [1,0.1,0])for(const eta of [0.5,0.2,0.05])console.log(JSON.stringify({recovery,eta,trainingCorrectByBlock:run(eta,32,recovery)}));


