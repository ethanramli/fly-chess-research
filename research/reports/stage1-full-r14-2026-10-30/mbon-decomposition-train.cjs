// TRAINING-ONLY: decompose (trained - naive) readout change of training probe actions into its four MBON terms
// (readout = MBON12 - MBON01 - MBON07 + MBON14). Naive = disabled lineage; trained = informative blocks 25-32.
const fs=require('fs'),path=require('path');
const D='research/data/lichess-stage1-synthetic-v1/';
const train=fs.readFileSync(D+'train.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const plan=require(path.resolve(D+'train-plan.json'));const byId=new Map(train.map(r=>[r.lesson.lessonId,r.lesson]));
const base={r1:'runs/lichess-stage1-synthetic-v1-full-r14',r2:'runs/lichess-stage1-synthetic-v1-full-r14',r3:'runs/lichess-stage1-synthetic-v1-full-r14-resume-0001'};
function rowsByFen(d,lo,hi){const m=new Map();for(let b=lo;b<=hi;b++){const f=path.join(d,'block-'+String(b).padStart(2,'0'),'receipts.jsonl');if(!fs.existsSync(f))continue;
  for(const line of fs.readFileSync(f,'utf8').split('\n').filter(Boolean)){const v=JSON.parse(line).value;if(v?.assessment?.rows)m.set(v.assessment.fen,v.assessment.rows);
    const r=v?.receipt?.result;if(r?.rootAssessment?.rows&&r.context?.fen)m.set(r.context.fen,r.rootAssessment.rows);}}return m;}
const sgn={MBON12:1,MBON01:-1,MBON07:-1,MBON14:1};const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;const f=x=>+x.toExponential(2);
for(const rep of ['r1','r2','r3']){
  const naive=rowsByFen(path.join(base[rep],rep+'%3Adisabled','attempt-001'),1,32),trained=rowsByFen(path.join(base[rep],rep+'%3Ainformative','attempt-001'),25,32);
  const acc={success:[],failure:[]};
  for(const p of plan.probeActions){const L=byId.get(p.panelId),a=naive.get(L.context.fen),b=trained.get(L.context.fen);if(!a||!b)continue;
    const ra=a.find(x=>x.move===p.actionId),rb=b.find(x=>x.move===p.actionId),st=L.candidates.find(c=>c.move===p.actionId).status;
    acc[st].push(Object.fromEntries(Object.keys(sgn).map(k=>[k,sgn[k]*(rb[k]-ra[k])])));}
  for(const st of ['success','failure'])console.log(rep,st==='success'?'safe  ':'unsafe',acc[st].length,JSON.stringify(Object.fromEntries(Object.keys(sgn).map(k=>[k,f(mean(acc[st].map(r=>r[k])))]))));}
console.log('Each term = signed contribution to the readout change (+ raises the score).');
