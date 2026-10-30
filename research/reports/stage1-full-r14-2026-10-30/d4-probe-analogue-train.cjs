// TRAINING-ONLY D4 analogue: training plan's 48 probe actions (24 boards x 2), scored on the last unaided
// all-legal assessment of each board found in the given blocks' receipts. Final/validation data untouched.
const fs=require('fs'),path=require('path');
const D='research/data/lichess-stage1-synthetic-v1/';
const train=fs.readFileSync(D+'train.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const plan=require(path.resolve(D+'train-plan.json'));
const byId=new Map(train.map(r=>[r.lesson.lessonId,r.lesson]));
const dirs={r1:'runs/lichess-stage1-synthetic-v1-full-r14/r1%3Ainformative/attempt-001',
 r2:'runs/lichess-stage1-synthetic-v1-full-r14/r2%3Ainformative/attempt-001',
 r3:'runs/lichess-stage1-synthetic-v1-full-r14-resume-0001/r3%3Ainformative/attempt-001'};
const sign=x=>x>0?1:x<0?-1:0;
for(const [rep,d] of Object.entries(dirs)) for(const [lo,hi] of [[1,2],[29,32]]){
  const last=new Map();
  for(let b=lo;b<=hi;b++){const f=path.join(d,'block-'+String(b).padStart(2,'0'),'receipts.jsonl');if(!fs.existsSync(f))continue;
    for(const line of fs.readFileSync(f,'utf8').split('\n').filter(Boolean)){const v=JSON.parse(line).value;
      for(const a of [v?.assessment,v?.receipt?.result?.rootAssessment]) if(a?.rows&&a.fen!==undefined) last.set(a.fen,a.rows);
      const r=v?.receipt?.result; if(r?.rootAssessment?.rows&&r.context?.fen) last.set(r.context.fen,r.rootAssessment.rows);}}
  const c={probes:0,covered:0,restrained:0,score:0,centered:0,pairOrdered:0,pairs:0};
  const boards=new Map();for(const p of plan.probeActions){(boards.get(p.panelId)??boards.set(p.panelId,[]).get(p.panelId)).push(p.actionId)}
  for(const [id,acts] of boards){const L=byId.get(id),rows=last.get(L.context.fen);c.probes+=acts.length;if(!rows)continue;
    const sc=rows.map(x=>x.score),mean=sc.reduce((a,b)=>a+b)/sc.length;const got=[];
    for(const a of acts){const row=rows.find(x=>x.move===a),st=L.candidates.find(x=>x.move===a).status,exp=st==='success'?1:-1;c.covered++;
      if(sign(row.MBON12-row.MBON01)===exp)c.restrained++;if(sign(row.score)===exp)c.score++;if(sign(row.score-mean)===exp)c.centered++;got.push([exp,row.score]);}
    c.pairs++;const s=got.find(g=>g[0]>0),f=got.find(g=>g[0]<0);if(s&&f&&s[1]>f[1])c.pairOrdered++;}
  console.log(rep,`blocks ${lo}-${hi}`,JSON.stringify(c));
}
