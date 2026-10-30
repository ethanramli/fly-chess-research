// TRAINING-ONLY: candidate D4 readout = sign(score_trained - score_naive) for each training probe action.
// Naive rows come from the disabled lineage (memory never changes). Final/validation data untouched.
const fs=require('fs'),path=require('path');
const D='research/data/lichess-stage1-synthetic-v1/';
const train=fs.readFileSync(D+'train.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const plan=require(path.resolve(D+'train-plan.json'));const byId=new Map(train.map(r=>[r.lesson.lessonId,r.lesson]));
const base={r1:'runs/lichess-stage1-synthetic-v1-full-r14',r2:'runs/lichess-stage1-synthetic-v1-full-r14',r3:'runs/lichess-stage1-synthetic-v1-full-r14-resume-0001'};
function rowsByFen(d,lo,hi){const m=new Map();for(let b=lo;b<=hi;b++){const f=path.join(d,'block-'+String(b).padStart(2,'0'),'receipts.jsonl');if(!fs.existsSync(f))continue;
  for(const line of fs.readFileSync(f,'utf8').split('\n').filter(Boolean)){const v=JSON.parse(line).value;if(v?.assessment?.rows)m.set(v.assessment.fen,v.assessment.rows);
    const r=v?.receipt?.result;if(r?.rootAssessment?.rows&&r.context?.fen)m.set(r.context.fen,r.rootAssessment.rows);}}return m;}
const sign=x=>x>0?1:x<0?-1:0;
for(const rep of ['r1','r2','r3']){
  const dis=(()=>{const p=path.join(base[rep],rep+'%3Adisabled','attempt-001');return rowsByFen(p,1,32)})();
  const inf=rowsByFen(path.join(base[rep],rep+'%3Ainformative','attempt-001'),25,32);
  const c={covered:0,deltaScore:0,deltaRestrained:0,succPos:0,failNeg:0,naiveCovered:dis.size,trainedCovered:inf.size};
  for(const p of plan.probeActions){const L=byId.get(p.panelId),n=dis.get(L.context.fen),t=inf.get(L.context.fen);if(!n||!t)continue;
    const exp=L.candidates.find(x=>x.move===p.actionId).status==='success'?1:-1,rn=n.find(x=>x.move===p.actionId),rt=t.find(x=>x.move===p.actionId);
    c.covered++;const ds=sign(rt.score-rn.score);if(ds===exp){c.deltaScore++;exp>0?c.succPos++:c.failNeg++}
    if(sign((rt.MBON12-rt.MBON01)-(rn.MBON12-rn.MBON01))===exp)c.deltaRestrained++;}
  console.log(rep,JSON.stringify(c));}
