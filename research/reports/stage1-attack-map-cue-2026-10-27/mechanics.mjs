// Real-graph mechanics check of factory v6 / registration r12 (read-only; no memory change).
// Builds the registered learner, then for training moves presents the attack-map cue alone and
// with each teaching channel's DAN cells at the registered pulse current, and compares the graph's
// KC activity k and DAN factor D with the surrogate's assumptions (k = KC current-driven activity
// above rest / 1.5; D = -1.01 measured for cue v4). Usage (repo root):
//   node --max-old-space-size=512 research/reports/stage1-attack-map-cue-2026-10-27/mechanics.mjs
import {readFileSync} from 'node:fs';
import {Chess} from 'chess.js';
import {createLichessStage1BrainV6} from '../../../.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v6.mjs';

const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r12-registration.json','utf8'));
const built=createLichessStage1BrainV6({registration,replica:'r1',repositoryRoot:process.cwd()});
const {model,memory,mapping,rest,encoder,brain}=built,TASK={objective:'capture-retention',plies:1};
const fingerprint=brain.memoryFingerprint(),scale=memory.config.activityScale,current=registration.learner.current??1.5;
console.log(JSON.stringify({encoder:encoder.config,encoderIdentity:encoder.identity,brainIdentity:built.identity,pulseCurrent:current,memoryEta:memory.config.eta}));
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const danOf=type=>mapping.groups.filter(g=>g.danType===type).flatMap(g=>g.dan.map(c=>c.index));
const above=i=>Math.max(0,model.h[model.steps][i]-rest[i])/scale;
const out=[];
for(const row of rows.filter((_,i)=>i%4===0)){const board=new Chess();board.loadPgn(row.lesson.context.pgn);
  for(const c of row.lesson.candidates.filter(c=>c.proof.status==='success'||c.move===row.lesson.candidates.find(x=>x.proof.status==='failure').move)){
    const cue=encoder.encode(board,c.move,TASK).stimulation,expectedK=cue.map(s=>Math.max(0,(s.current+0.01)*(1-2**-model.steps)-rest[s.index])/scale);
    model.forward([0],cue);const k=cue.map(s=>above(s.index));
    const D={};for(const type of ['PAM02','PPL103','PAM11','PPL106']){const dan=danOf(type);
      model.forward([0],[...cue,...dan.map(index=>({index,current}))]);D[type]=-dan.reduce((s,i)=>s+above(i),0)/dan.length;}
    out.push({id:row.lesson.lessonId,move:c.move,cells:cue.length,kGraphOverSurrogate:+(k.reduce((a,b)=>a+b,0)/expectedK.reduce((a,b)=>a+b,0)).toFixed(4),D});}}
for(const r of out) console.log(JSON.stringify(r));
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
console.log(JSON.stringify({summary:{moves:out.length,meanCells:+mean(out.map(r=>r.cells)).toFixed(1),meanKRatio:+mean(out.map(r=>r.kGraphOverSurrogate)).toFixed(4),
  meanD:Object.fromEntries(['PAM02','PPL103','PAM11','PPL106'].map(t=>[t,+mean(out.map(r=>r.D[t])).toFixed(3)])),memoryUnchanged:brain.memoryFingerprint()===fingerprint}}));
