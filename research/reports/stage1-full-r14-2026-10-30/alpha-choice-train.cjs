// TRAINING-ONLY: would choices survive if only the alpha-lobe stores were read (option b, restrained stores decayed)?
// For each training board: top-1 choice under the full readout vs the alpha-only readout (MBON14 - MBON07),
// (i) at the board's first pre-lesson assessment (within-training transfer), (ii) at its last assessment (blocks 25-32).
// Success = the top move's certified status is 'success'. Ties count as wrong. Final/validation untouched.
const fs=require('fs'),path=require('path');
const D='research/data/lichess-stage1-synthetic-v1/';
const train=fs.readFileSync(D+'train.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const byFen=new Map(train.map(r=>[r.lesson.context.fen,r.lesson]));
const base={r1:'runs/lichess-stage1-synthetic-v1-full-r14',r2:'runs/lichess-stage1-synthetic-v1-full-r14',r3:'runs/lichess-stage1-synthetic-v1-full-r14-resume-0001'};
const top=(rows,fn)=>{const v=rows.map(fn),m=Math.max(...v),i=v.flatMap((x,j)=>x===m?[j]:[]);return i.length===1?rows[i[0]].move:null};
const readouts={full:r=>r.score,alpha:r=>r.MBON14-r.MBON07,restrained:r=>r.MBON12-r.MBON01};
for(const rep of ['r1','r2','r3']){const dir=path.join(base[rep],rep+'%3Ainformative','attempt-001');
  const first=new Map(),last=new Map();let lessons=0;const taught=new Set();
  for(let b=1;b<=32;b++){const f=path.join(dir,'block-'+String(b).padStart(2,'0'),'receipts.jsonl');if(!fs.existsSync(f))continue;
    for(const line of fs.readFileSync(f,'utf8').split('\n').filter(Boolean)){const r=JSON.parse(line).value?.receipt?.result;
      if(!(r?.schema==='coupled-neural-feedback-preparation-v2'&&r.rootAssessment?.rows))continue;const L=byFen.get(r.context.fen);if(!L)continue;
      if(!taught.has(L.lessonId)&&lessons>0&&!first.has(L.lessonId))first.set(L.lessonId,r.rootAssessment.rows);
      if(b>=25)last.set(L.lessonId,r.rootAssessment.rows);taught.add(L.lessonId);lessons++;}}
  const score=m=>Object.fromEntries(Object.entries(readouts).map(([k,fn])=>[k,[...m].filter(([id,rows])=>{const mv=top(rows,fn);const L=train.find(t=>t.lesson.lessonId===id).lesson;return mv&&L.candidates.find(c=>c.move===mv).status==='success'}).length+'/'+m.size]));
  console.log(rep,'firstVisit',JSON.stringify(score(first)),'late',JSON.stringify(score(last)));}
