// TRAINING-ONLY within-training transfer: for each training board, take its FIRST unaided assessment in the
// informative lineage (before any lesson on that board). Score the sign of candidate readouts on its two probe
// actions. Split by whether the board's family had already been taught (same-family transfer) or not
// (cross-family transfer). Also report the naive (disabled) sign on the same boards. Final/validation untouched.
const fs=require('fs'),path=require('path');
const D='research/data/lichess-stage1-synthetic-v1/';
const train=fs.readFileSync(D+'train.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const plan=require(path.resolve(D+'train-plan.json'));
const byFen=new Map(train.map(r=>[r.lesson.context.fen,r.lesson]));
const fam=id=>id.replace(/-p\d+[ab]$/,'');
const base={r1:'runs/lichess-stage1-synthetic-v1-full-r14',r2:'runs/lichess-stage1-synthetic-v1-full-r14',r3:'runs/lichess-stage1-synthetic-v1-full-r14-resume-0001'};
const probes=new Map();for(const p of plan.probeActions)(probes.get(p.panelId)??probes.set(p.panelId,[]).get(p.panelId)).push(p.actionId);
const sign=x=>x>0?1:x<0?-1:0;
const readouts={alpha:r=>r.MBON14-r.MBON07,score:r=>r.score};
for(const rep of ['r1','r2','r3']){
  const dir=path.join(base[rep],rep+'%3Ainformative','attempt-001');
  const taughtBoards=new Set(),taughtFamilies=new Set(),first=new Map();
  let lessons=0;
  for(let b=1;b<=32;b++){const f=path.join(dir,'block-'+String(b).padStart(2,'0'),'receipts.jsonl');if(!fs.existsSync(f))continue;
    for(const line of fs.readFileSync(f,'utf8').split('\n').filter(Boolean)){const v=JSON.parse(line).value;
      const r=v?.receipt?.result;if(!(r?.schema==='coupled-neural-feedback-preparation-v2'&&r.rootAssessment?.rows))continue;
      const L=byFen.get(r.context.fen);if(!L)continue;const id=L.lessonId;
      if(!first.has(id)&&!taughtBoards.has(id))first.set(id,{rows:r.rootAssessment.rows,familySeen:taughtFamilies.has(fam(id)),lessonsBefore:lessons});
      taughtBoards.add(id);taughtFamilies.add(fam(id));lessons++;}}
  // naive rows: first assessment of each board in the disabled lineage (memory never changes)
  const naive=new Map();const ndir=path.join(base[rep],rep+'%3Adisabled','attempt-001');
  for(let b=1;b<=32;b++){const f=path.join(ndir,'block-'+String(b).padStart(2,'0'),'receipts.jsonl');if(!fs.existsSync(f))continue;
    for(const line of fs.readFileSync(f,'utf8').split('\n').filter(Boolean)){const r=JSON.parse(line).value?.receipt?.result;
      if(r?.rootAssessment?.rows&&r.context?.fen){const L=byFen.get(r.context.fen);if(L&&!naive.has(L.lessonId))naive.set(L.lessonId,r.rootAssessment.rows);}}}
  const out={};
  for(const [id,info] of first){if(info.lessonsBefore===0)continue;const group=info.familySeen?'sameFamily':'crossFamily';
    for(const a of probes.get(id)){const exp=byFen.get([...byFen.keys()].find(k=>byFen.get(k).lessonId===id)).candidates.find(c=>c.move===a).status==='success'?1:-1;
      const row=info.rows.find(x=>x.move===a),nrow=naive.get(id)?.find(x=>x.move===a);
      const o=out[group]??={probes:0,alpha:0,score:0,naiveAlpha:0,naiveN:0};o.probes++;
      for(const [k,fn] of Object.entries(readouts))if(sign(fn(row))===exp)o[k]++;
      if(nrow){o.naiveN++;if(sign(readouts.alpha(nrow))===exp)o.naiveAlpha++;}}}
  console.log(rep,'boards first-seen after other lessons:',[...first.values()].filter(x=>x.lessonsBefore>0).length,JSON.stringify(out));}
console.log('Counts = probe actions whose readout sign equals the verified sign, at the board\'s first (pre-lesson) assessment.');
