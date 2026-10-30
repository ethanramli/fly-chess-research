// Read-only static check (no presentations beyond the factory's own rest pass, no memory change,
// no files written). Question: is the r11 full-graph learner effectively a fixed linear map from
// stimulated cue KCs to the readout score? Predict each training board's scratch choice from direct
// KC->MBON weights only and compare with the full-model scratch file of probe v7.
// Also report MBON input composition and MBON->teaching-DAN feedback strength.
// Run from the repository root: node --max-old-space-size=512 <this file>
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const repo=process.cwd(), req=createRequire(resolve(repo,'package.json'));
const {Chess}=await import(pathToFileURL(req.resolve('chess.js')).href);
const {createLichessStage1BrainV5}=await import(pathToFileURL(resolve(repo,'.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v5.mjs')).href);

const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r11-registration.json','utf8'));
const built=createLichessStage1BrainV5({registration,replica:'r1',repositoryRoot:process.cwd()});
const {model,mapping,readouts,rest,encoder,graph}=built;
const n=model.n, w=model.signedMagnitude;
const types=['MBON12','MBON01','MBON07','MBON14'], coef={MBON12:1,MBON01:-1,MBON07:-1,MBON14:1};
const kcSet=new Set(); for(const g of mapping.groups) for(const k of g.kc) kcSet.add(k);
// incoming edges of a node j are graph.row[j]..graph.row[j+1], presynaptic graph.col[e]
const inEdges=j=>{const out=[];for(let e=graph.row[j];e<graph.row[j+1];e++) out.push(e);return out;};
// Direct weight from presynaptic index i to each readout population (mean over cells)
const direct=new Map();
const composition={};
for(const t of types){
  const cells=readouts[t].map(c=>c.index);
  let total=0,fromMapped=0,neg=0;
  for(const c of cells) for(const e of inEdges(c)){
    const v=w[e]; total+=Math.abs(v); if(v<0) neg+=-v;
    if(kcSet.has(graph.col[e])) fromMapped+=Math.abs(v);
    const key=graph.col[e]; const d=direct.get(key)??{}; d[t]=(d[t]??0)+v/cells.length; direct.set(key,d);
  }
  composition[t]={cells:cells.length,inEdges:cells.reduce((s,c)=>s+graph.row[c+1]-graph.row[c],0),
    meanAbsInputPerCell:+(total/cells.length).toFixed(4),shareFromMappedPlasticKCs:+(fromMapped/total).toFixed(3),shareInhibitory:+(neg/total).toFixed(3),
    restRate:+(cells.reduce((s,c)=>s+rest[c],0)/cells.length).toExponential(3)};
}
// MBON -> teaching DAN feedback
const danTypes=['PPL103','PAM02','PAM11','PPL106'];
const feedback={};
const readoutIndex=new Map(); for(const t of types) for(const c of readouts[t]) readoutIndex.set(c.index,t);
for(const dt of danTypes){
  const dans=[...new Set(mapping.groups.filter(g=>g.danType===dt).flatMap(g=>g.dan.map(c=>c.index)))];
  const f={}; let total=0;
  for(const d of dans) for(const e of inEdges(d)){ total+=Math.abs(w[e]); const t=readoutIndex.get(graph.col[e]); if(t) f[t]=(f[t]??0)+w[e]/dans.length; }
  feedback[dt]={cells:dans.length,signedWeightFromReadoutMBONsPerDAN:Object.fromEntries(Object.entries(f).map(([k,v])=>[k,+v.toExponential(3)])),
    restRate:+(dans.reduce((s,c)=>s+rest[c],0)/dans.length).toExponential(3)};
}
// Linear direct-path surrogate of scratch choices
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const scratch=JSON.parse(readFileSync('runs/stage1-retention-probe-v7-spaced-alpha-three/scratch.json','utf8')).panels;
const task={objective:'capture-retention',plies:1};
let agreeChoice=0, agreeRank=0; const detail=[];
const gaps=[];
for(const row of rows){
  const id=row.lesson.lessonId, s=scratch.find(p=>p.panelId===id);
  const board=new Chess(); board.loadPgn(row.lesson.context.pgn);
  const moves=board.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
  const scored=moves.map(a=>{const cue=encoder.encode(board,a,task); let sc=0;
    for(const {index,current} of cue.stimulation){const d=direct.get(index); if(d) for(const t of types) sc+=coef[t]*(d[t]??0)*current;}
    return {a,sc};}).sort((x,y)=>y.sc-x.sc);
  const choice=scored[0].a; if(choice===s.choice) agreeChoice++;
  // certified success = full-model scratch says rank; recover certified move from lesson
  const cert=row.lesson.certifiedSuccess??row.lesson.success??row.lesson.expected??null;
  detail.push({id,fullChoice:s.choice,linearChoice:choice,fullRank:s.rank,legal:s.legal});
  const spread=scored[0].sc-scored[scored.length-1].sc; gaps.push(spread);
}
console.log(JSON.stringify({composition,feedback,teachingCurrent:1.5,
  linearSurrogate:{boards:rows.length,scratchChoiceAgreement:agreeChoice,
    medianWithinBoardScoreSpread:gaps.sort((a,b)=>a-b)[gaps.length>>1].toExponential(3)},
  disagreements:detail.filter(d=>d.fullChoice!==d.linearChoice)},null,1));
