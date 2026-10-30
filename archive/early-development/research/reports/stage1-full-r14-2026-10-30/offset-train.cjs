// TRAINING-ONLY: per training board, trained (informative, blocks 25-32) minus naive (disabled lineage) score for
// every legal move. Splits the change into a board-common offset (mean over all legal moves) and the
// probe actions' deviations from it. Final/validation data untouched.
const fs=require('fs'),path=require('path');
const D='research/data/lichess-stage1-synthetic-v1/';
const train=fs.readFileSync(D+'train.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const plan=require(path.resolve(D+'train-plan.json'));const byId=new Map(train.map(r=>[r.lesson.lessonId,r.lesson]));
const base={r1:'runs/lichess-stage1-synthetic-v1-full-r14',r2:'runs/lichess-stage1-synthetic-v1-full-r14',r3:'runs/lichess-stage1-synthetic-v1-full-r14-resume-0001'};
function rowsByFen(d,lo,hi){const m=new Map();for(let b=lo;b<=hi;b++){const f=path.join(d,'block-'+String(b).padStart(2,'0'),'receipts.jsonl');if(!fs.existsSync(f))continue;
  for(const line of fs.readFileSync(f,'utf8').split('\n').filter(Boolean)){const v=JSON.parse(line).value;if(v?.assessment?.rows)m.set(v.assessment.fen,v.assessment.rows);
    const r=v?.receipt?.result;if(r?.rootAssessment?.rows&&r.context?.fen)m.set(r.context.fen,r.rootAssessment.rows);}}return m;}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
for(const rep of ['r1','r2','r3']){
  const naive=rowsByFen(path.join(base[rep],rep+'%3Adisabled','attempt-001'),1,32),trained=rowsByFen(path.join(base[rep],rep+'%3Ainformative','attempt-001'),25,32);
  const offsets=[],safeDev=[],unsafeDev=[],safeAbs=[],unsafeAbs=[];let safeAboveOffset=0,unsafeBelowOffset=0,n=0;
  const boards=new Map();for(const p of plan.probeActions)(boards.get(p.panelId)??boards.set(p.panelId,[]).get(p.panelId)).push(p.actionId);
  for(const [id,acts] of boards){const L=byId.get(id),a=naive.get(L.context.fen),b=trained.get(L.context.fen);if(!a||!b)continue;n++;
    const delta=new Map(b.map(r=>[r.move,r.score-a.find(x=>x.move===r.move).score]));const off=mean([...delta.values()]);offsets.push(off);
    for(const act of acts){const ok=L.candidates.find(c=>c.move===act).status==='success',dv=delta.get(act)-off;
      if(ok){safeDev.push(dv);safeAbs.push(delta.get(act));if(dv>0)safeAboveOffset++}else{unsafeDev.push(dv);unsafeAbs.push(delta.get(act));if(dv<0)unsafeBelowOffset++}}}
  const f=x=>+x.toExponential(2);
  console.log(rep,JSON.stringify({boards:n,meanOffset:f(mean(offsets)),offsetsNegative:offsets.filter(x=>x<0).length,
    safeDeltaMean:f(mean(safeAbs)),safeDevFromOffsetMean:f(mean(safeDev)),safeAboveOffset,
    unsafeDeltaMean:f(mean(unsafeAbs)),unsafeDevFromOffsetMean:f(mean(unsafeDev)),unsafeBelowOffset}));}
