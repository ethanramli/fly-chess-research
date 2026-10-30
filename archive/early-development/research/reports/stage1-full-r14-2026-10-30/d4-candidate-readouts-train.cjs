// TRAINING-ONLY: per-probe sign accuracy of candidate D4 readouts (derived from mbon-decomposition-train.cjs).
// (readout = MBON12 - MBON01 - MBON07 + MBON14). Naive = disabled lineage; trained = informative blocks 25-32.
const fs=require('fs'),path=require('path');
const D='research/data/lichess-stage1-synthetic-v1/';
const train=fs.readFileSync(D+'train.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const plan=require(path.resolve(D+'train-plan.json'));const byId=new Map(train.map(r=>[r.lesson.lessonId,r.lesson]));
const base={r1:'runs/lichess-stage1-synthetic-v1-full-r14',r2:'runs/lichess-stage1-synthetic-v1-full-r14',r3:'runs/lichess-stage1-synthetic-v1-full-r14-resume-0001'};
function rowsByFen(d,lo,hi){const m=new Map();for(let b=lo;b<=hi;b++){const f=path.join(d,'block-'+String(b).padStart(2,'0'),'receipts.jsonl');if(!fs.existsSync(f))continue;
  for(const line of fs.readFileSync(f,'utf8').split('\n').filter(Boolean)){const v=JSON.parse(line).value;if(v?.assessment?.rows)m.set(v.assessment.fen,v.assessment.rows);
    const r=v?.receipt?.result;if(r?.rootAssessment?.rows&&r.context?.fen)m.set(r.context.fen,r.rootAssessment.rows);}}return m;}
const sgn={MBON12:1,MBON01:-1,MBON07:-1,MBON14:1};const sign=x=>x>0?1:x<0?-1:0;
for(const rep of ['r1','r2','r3']){
  const naive=rowsByFen(path.join(base[rep],rep+'%3Adisabled','attempt-001'),1,32),trained=rowsByFen(path.join(base[rep],rep+'%3Ainformative','attempt-001'),25,32);
  const c={n:0,fullDelta:0,alphaDelta:0,restrainedDelta:0,alphaAbs:0,fullAbs:0};
  for(const p of plan.probeActions){const L=byId.get(p.panelId),a=naive.get(L.context.fen),b=trained.get(L.context.fen);if(!a||!b)continue;
    const ra=a.find(x=>x.move===p.actionId),rb=b.find(x=>x.move===p.actionId),st=L.candidates.find(c=>c.move===p.actionId).status;
    const exp=st==="success"?1:-1,d=k=>sgn[k]*(rb[k]-ra[k]);c.n++;if(sign(rb.score-ra.score)===exp)c.fullDelta++;if(sign(d("MBON07")+d("MBON14"))===exp)c.alphaDelta++;if(sign(d("MBON12")+d("MBON01"))===exp)c.restrainedDelta++;if(sign(rb.MBON14-rb.MBON07)===exp)c.alphaAbs++;if(sign(rb.score)===exp)c.fullAbs++;if(sign(ra.MBON14-ra.MBON07)===exp)c.naiveAlphaAbs=(c.naiveAlphaAbs||0)+1;c.naiveAlphaPos=(c.naiveAlphaPos||0)+(ra.MBON14-ra.MBON07>0?1:0);}
  console.log(rep,JSON.stringify(c));}
console.log('Counts of training probe actions whose predicted sign equals the verified sign (success +1, failure -1). Delta = trained minus naive (disabled lineage).');
