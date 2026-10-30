// Training-only: token inventory of cue v2 and leave-one-family-out transfer of a pure token-valence lookup.
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js'; // run from this report folder
const root='C:/Users/ethan/Documents/fly-chess-research/';
const {createPublicAttackMapEncoderV2}=await import('file:///'+root+'.codebase/src/chess-input/public-attack-map-cue-v2.mjs');
const dir=root+'research/data/lichess-stage1-synthetic-v1';
const rows=readFileSync(`${dir}/train.jsonl`,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const fam=JSON.parse(readFileSync(`${dir}/train-families.json`,'utf8')).assignments;
const famOf=new Map(fam.map(a=>[a.lessonId,a.familyId])),stratOf=new Map(fam.map(a=>[a.lessonId,a.stratum]));
const enc=createPublicAttackMapEncoderV2({readyForCandidateExperiment:true,groups:['MBON01','MBON12','MBON07'].map((m,i)=>({mbonType:m,kc:[i]}))});
const items=[];const tokenCount=new Map();
for(const row of rows){const b=new Chess();b.loadPgn(row.lesson.context.pgn);
  for(const c of row.lesson.candidates){const t=enc.encode(b,c.move,row.lesson.context.task).tokens;
    items.push({lesson:row.lesson.lessonId,family:famOf.get(row.lesson.lessonId),move:c.move,tokens:t,success:c.status==='success'});
    for(const k of t)tokenCount.set(k,(tokenCount.get(k)??0)+1);}}
console.log('actions',items.length,'distinct tokens',tokenCount.size);
console.log('capture-attack tokens:',[...tokenCount].filter(([k])=>k.startsWith('act:capture|')).map(([k,n])=>k.replace('act:capture|','')+'×'+n).join(' '));
console.log('distinct token SETS',new Set(items.map(i=>i.tokens.join(','))).size,'; success by stratum:',JSON.stringify(Object.fromEntries([...new Set(fam.map(a=>a.stratum))].map(s=>[s,fam.filter(a=>a.stratum===s).length]))));
// Lookup learner: token valence = mean outcome (+1/-1) of training actions containing it; action score = sum; held-out family LOFO.
const families=[...new Set(items.map(i=>i.family))];let boardsOK=0,boards=0,unseen=0,heldActions=0;
for(const f of families){const train=items.filter(i=>i.family!==f),test=items.filter(i=>i.family===f);
  const v=new Map();for(const i of train)for(const k of i.tokens){const e=v.get(k)??[0,0];e[0]+=i.success?1:-1;e[1]++;v.set(k,e);}
  const score=i=>i.tokens.reduce((s,k)=>s+(v.has(k)?v.get(k)[0]/v.get(k)[1]:0),0);
  for(const i of test){heldActions++;if(i.tokens.some(k=>!v.has(k)))unseen++;}
  for(const l of new Set(test.map(i=>i.lesson))){const acts=test.filter(i=>i.lesson===l);const best=Math.max(...acts.map(score));
    const top=acts.filter(i=>score(i)===best);boards++;if(top.length===1&&top[0].success)boardsOK++;}}
console.log('LOFO token-lookup: boards correct',boardsOK,'/',boards,'; held-out actions with a token unseen in the other 5 families',unseen,'/',heldActions);
