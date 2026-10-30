import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const success=new Map(),ids=new Map();
for(const line of readFileSync(join(root,'research/data/lichess-stage1-synthetic-v1/train.jsonl'),'utf8').split(/\r?\n/)){
  if(!line)continue;const row=JSON.parse(line);
  success.set(row.lesson.context.fen,new Set(row.lesson.candidates.filter(c=>c.status==='success').map(c=>c.move)));
  ids.set(row.lesson.context.fen,row.lesson.lessonId);
}
const dirs=process.argv.slice(2).map(r=>join(root,'runs',r,'r1%3Ainformative','attempt-001'));
const seen=new Map();
for(const dir of dirs){if(!existsSync(dir))continue;
  for(const block of readdirSync(dir).filter(n=>/^block-\d+$/.test(n))){
    const log=join(dir,block,'receipts.jsonl');if(!existsSync(log))continue;
    const rows=readFileSync(log,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).filter(r=>r.kind==='event-start');
    if(rows.length===4||!seen.has(block))seen.set(block,rows);
  }}
for(const [block,rows] of [...seen.entries()].sort()){
  const a=rows[0].value.assessment,ok=success.get(a.fen);
  const best=Math.max(...a.rows.map(r=>r.score)),sc=Math.max(...a.rows.filter(r=>ok.has(r.move)).map(r=>r.score));
  const rank=1+a.rows.filter(r=>r.score>sc).length;
  console.log(block,ids.get(a.fen),'chose',a.choice,'success',[...ok].join('/'),'rank',rank+'/'+a.rows.length,'gap',(best-sc).toExponential(2));
}

