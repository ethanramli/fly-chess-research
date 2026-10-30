import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const success=new Map();
for(const line of readFileSync(join(root,'research/data/lichess-stage1-synthetic-v1/train.jsonl'),'utf8').split(/\r?\n/)){
  if(!line)continue;const row=JSON.parse(line);
  success.set(row.lesson.context.fen,{id:row.lesson.lessonId,ok:new Set(row.lesson.candidates.filter(c=>c.status==='success').map(c=>c.move))});}
const dir=join(root,'runs',process.argv[2],'r1%3Ainformative','attempt-001');
for(const block of readdirSync(dir).filter(n=>/^block-\d+$/.test(n)).sort()){
  const rows=readFileSync(join(dir,block,'receipts.jsonl'),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).filter(r=>r.kind==='event-start');
  for(const r of rows){const a=r.value.assessment,s=success.get(a.fen),sorted=[...a.rows].sort((x,y)=>y.score-x.score);
    const rank=1+sorted.findIndex(x=>s.ok.has(x.move));
    console.log(block,s.id.padEnd(28),'taught',r.value.result.plannedAction,'| top3',sorted.slice(0,3).map(x=>x.move+':'+x.score.toFixed(4)).join(' '),'| success',[...s.ok][0],'rank',rank+'/'+sorted.length);}
}

