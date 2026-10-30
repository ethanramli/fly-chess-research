// Read-only: score the Fly's unaided event-start choices on taught training boards, per block.
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const success=new Map();
for(const line of readFileSync(join(root,'research/data/lichess-stage1-synthetic-v1/train.jsonl'),'utf8').split(/\r?\n/)){
  if(!line)continue;const row=JSON.parse(line);
  success.set(row.lesson.context.fen,new Set(row.lesson.candidates.filter(c=>c.status==='success').map(c=>c.move)));
}
function lineage(dirs){
  const byBlock=new Map();
  for(const dir of dirs){
    if(!existsSync(dir))continue;
    for(const block of readdirSync(dir).filter(n=>/^block-\d+$/.test(n))){
      const log=join(dir,block,'receipts.jsonl');if(!existsSync(log))continue;
      const rows=readFileSync(log,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)
        .filter(r=>r.kind==='event-start').map(r=>r.value.assessment);
      if(rows.length===4||!byBlock.has(block))byBlock.set(block,rows);
    }
  }
  return [...byBlock.entries()].sort().map(([block,rows])=>{
    const ok=rows.filter(a=>a.choice&&success.get(a.fen)?.has(a.choice)).length;
    const captures=rows.filter(a=>a.choice&&/x/.test(a.choice)===false).length;
    return `${block.slice(6)}:${ok}/${rows.length}`;
  }).join(' ');
}
const runs=process.argv.slice(2);
for(const arm of ['informative','outcome-only','absent','disabled','shuffled','stockfish-shuffled']){
  const dirs=runs.map(r=>join(root,'runs',r,`r1%3A${arm}`,'attempt-001'));
  console.log(arm.padEnd(13),lineage(dirs));
}


