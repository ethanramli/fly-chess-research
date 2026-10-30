// Representation ceilings on TRAINING boards (engineering diagnostic; supervised perceptron is a
// comparison baseline, not a Fly mechanism). Features: (a) the stimulated KC cells of cue v4 with the
// r11 scratch weights as the starting point; (b) the cue v4 tokens directly (no hashing/collisions).
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {buildSurrogate,Chess,TASK}=await import(pathToFileURL(resolve(process.argv[2])).href);
const S=buildSurrogate();
const {createPublicActionRelativeEncoderV4}=await import(pathToFileURL(resolve('.codebase/src/chess-input/public-action-relative-cue-v4.mjs')).href);
const ids=[...S.panels.keys()];
const rows=new Map(readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).map(r=>[r.lesson.lessonId,r]));
// token features via the registered encoder's token list (same tokens that drive the KC cells)
const enc=S.memory; // unused
const tokenFeat=new Map();
for(const id of ids){const P=S.panels.get(id);const b=new Chess();b.loadPgn(rows.get(id).lesson.context.pgn);
  // re-encode with the factory encoder via the surrogate's cue cache is cell-level; tokens need the encoder
  tokenFeat.set(id,null);}
const {readFileSync:rf}=await import('node:fs');
const reg=JSON.parse(rf('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r11-registration.json','utf8'));
const built=(await import(pathToFileURL(resolve('.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v5.mjs')).href)).createLichessStage1BrainV5({registration:reg,replica:'r1',repositoryRoot:process.cwd()});
const feats={cells:new Map(),tokens:new Map()};
for(const id of ids){const P=S.panels.get(id);const b=new Chess();b.loadPgn(rows.get(id).lesson.context.pgn);
  const mc=new Map(),mt=new Map();
  for(const x of P.exp){const cue=built.encoder.encode(b,x.move,TASK);mc.set(x.move,cue.stimulation.map(s=>s.index));mt.set(x.move,cue.tokens);}
  feats.cells.set(id,mc);feats.tokens.set(id,mt);}
const base=new Map(); // per-cell scratch contribution
for(const id of ids) for(const cells of feats.cells.get(id).values()) for(const c of cells) if(!base.has(c)) base.set(c,S.score([{index:c,current:1.5}]));
const fam=id=>id.split('-').slice(0,3).join('-');
const rand=seed=>()=>((seed=Math.imul(seed^seed>>>15,2246822519)+0x9e3779b9>>>0)/2**32);
function run(kind,trainIds,testIds,R,lr){
  const w=new Map();const f=feats[kind];
  const sc=(id,m)=>f.get(id).get(m).reduce((s,x)=>s+(kind==='cells'?base.get(x):0)+(w.get(x)??0),0);
  const pick=id=>{const P=S.panels.get(id);const r=P.exp.map(x=>({m:x.move,s:sc(id,x.move),ok:x.status==='success'}));
    const top=Math.max(...r.map(z=>z.s)),t=r.filter(z=>z.s===top);return {choice:t.length===1?t[0]:null,r};};
  const rnd=rand(5);
  for(let k=0;k<R;k++) for(const id of [...trainIds].sort(()=>rnd()-0.5)){const {choice,r}=pick(id);const cert=r.find(z=>z.ok);
    if(!choice||!choice.ok){const wrong=choice??r.filter(z=>!z.ok).sort((a,b)=>b.s-a.s)[0];
      for(const x of f.get(id).get(cert.m)) w.set(x,(w.get(x)??0)+lr);for(const x of f.get(id).get(wrong.m)) w.set(x,(w.get(x)??0)-lr);}}
  return {train:trainIds.filter(id=>pick(id).choice?.ok).length,test:testIds.filter(id=>pick(id).choice?.ok).length};
}
for(const kind of ['cells','tokens']){
  const fit=run(kind,ids,[],30,0.002);
  let held=0;for(const F of [...new Set(ids.map(fam))]){const tr=ids.filter(id=>fam(id)!==F),te=ids.filter(id=>fam(id)===F);held+=run(kind,tr,te,30,0.002).test;}
  console.log(JSON.stringify({features:kind,errorDrivenPerceptron:{fitAll24:fit.train,lofoHeldOut:held+'/24'}}));
}
