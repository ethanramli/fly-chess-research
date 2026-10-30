// No-graph linear surrogate of the r11 learner (engineering diagnostic, not evidence).
// Uses the pinned r11 factory only to read the fixed weights, mappings, rest state and cue v4;
// it never presents a stimulus after construction and never changes the model or memory.
// Score(move) = sum over stimulated cue KCs of current * sum over readout MBON types of
//   coef * mean-over-cells(direct KC->MBON weight * gain).  (direct path only)
// Gain rules: restrained g += eta*D*(k+g-1); alpha1/alpha3 g += eta*D*k  (r11 code).
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const repo=process.cwd(), req=createRequire(resolve(repo,'package.json'));
export const {Chess}=await import(pathToFileURL(req.resolve('chess.js')).href);
const {createLichessStage1BrainV5}=await import(pathToFileURL(resolve(repo,'.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v5.mjs')).href);

export const TASK={objective:'capture-retention',plies:1};
export function buildSurrogate(){
  const registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r11-registration.json','utf8'));
  const {model,memory,readouts,rest,encoder,graph}=createLichessStage1BrainV5({registration,replica:'r1',repositoryRoot:repo});
  const coef={MBON12:1,MBON01:-1,MBON07:-1,MBON14:1};
  const rGroups=memory.restrained.mapping.groups, aGroups=memory.alphaLobe;
  const slot=new Map(); let off=0;
  rGroups.forEach((g,gi)=>g.edges.forEach((e,i)=>slot.set(e,{store:'r',idx:off+i,group:gi}))); off=0;
  for(const g of rGroups) off+=0; // offsets per group
  let ro=0; const rOffset=rGroups.map(g=>{const o=ro;ro+=g.edges.length;return o;});
  let ao=0; const aOffset=aGroups.map(g=>{const o=ao;ao+=g.edges.length;return o;});
  slot.clear();
  rGroups.forEach((g,gi)=>g.edges.forEach((e,i)=>slot.set(e,{store:'r',idx:rOffset[gi]+i})));
  aGroups.forEach((g,gi)=>g.edges.forEach((e,i)=>slot.set(e,{store:'a',idx:aOffset[gi]+i})));
  // presynaptic KC -> list of [store('c'|'r'|'a'), idx, signed weight * coef / ncells]
  const byPre=new Map();
  for(const [type,cells] of Object.entries(readouts)){ if(!(type in coef)) continue;
    for(const {index:c} of cells) for(let e=graph.row[c];e<graph.row[c+1];e++){
      const s=slot.get(e), term=coef[type]*model.signedMagnitude[e]/cells.length;
      const list=byPre.get(graph.col[e])??[]; list.push(s?[s.store,s.idx,term]:['c',0,term]); byPre.set(graph.col[e],list);
    }}
  const kOf=(index,current)=>Math.max(0,(current+0.01)*(1-2**-model.steps)-rest[index])/memory.config.activityScale;
  const state={r:new Float64Array(ro).fill(1),a:new Float64Array(ao).fill(1)};
  const score=(stim,st=state)=>{let s=0;for(const {index,current} of stim){const l=byPre.get(index);if(l)for(const [store,idx,t] of l)s+=current*t*(store==='c'?1:st[store][idx]);}return s;};
  // One plasticity observation with given per-group factors; stimulated KCs active, others silent.
  const update=(stim,factors,alphaFactors,eta,st=state,opts={})=>{
    const k=new Map(stim.map(({index,current})=>[index,kOf(index,current)]));
    const {minGain=0.2,maxGain=1.8,recovery=true}=opts;
    rGroups.forEach((g,gi)=>{const D=factors[gi]??0; if(!D) return;
      for(let i=0;i<g.edges.length;i++){const j=rOffset[gi]+i,kk=k.get(g.kc[i])??0;
        const delta=recovery?eta*D*(kk+st.r[j]-1):eta*D*kk; st.r[j]=Math.max(minGain,Math.min(maxGain,st.r[j]+delta));}});
    aGroups.forEach((g,gi)=>{const D=alphaFactors[gi]??0; if(!D) return;
      for(let i=0;i<g.edges.length;i++){const j=aOffset[gi]+i,kk=k.get(g.kc[i])??0;
        st.a[j]=Math.max(minGain,Math.min(maxGain,st.a[j]+eta*D*kk));}});
  };
  const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const panels=new Map(rows.map(row=>{const board=new Chess();board.loadPgn(row.lesson.context.pgn);
    const exp=row.lesson.candidates.map(c=>({move:c.move,status:c.proof.status}));
    const cues=new Map(exp.map(x=>[x.move,encoder.encode(board,x.move,TASK).stimulation]));
    const child=new Map(exp.map(x=>{const b=new Chess();b.loadPgn(row.lesson.context.pgn);b.move({from:x.move.slice(0,2),to:x.move.slice(2,4),promotion:x.move[4]});return [x.move,encoder.encode(b,null,TASK).stimulation];}));
    return [row.lesson.lessonId,{id:row.lesson.lessonId,exp,cues,child}];}));
  const assess=(panel,st=state)=>{const rowsS=panel.exp.map(x=>({move:x.move,score:score(panel.cues.get(x.move),st)}));
    const top=Math.max(...rowsS.map(r=>r.score)),tops=rowsS.filter(r=>r.score===top);
    const choice=tops.length===1?tops[0].move:null;
    const succ=new Set(panel.exp.filter(x=>x.status==='success').map(x=>x.move));
    const best=Math.max(...rowsS.filter(r=>succ.has(r.move)).map(r=>r.score));
    return {rows:rowsS,choice,rank:1+rowsS.filter(r=>r.score>best).length,legal:rowsS.length,correct:choice!==null&&succ.has(choice)};};
  return {state,score,update,panels,assess,rGroups,aGroups,memory,reset:()=>{state.r.fill(1);state.a.fill(1);},
    clone:()=>({r:Float64Array.from(state.r),a:Float64Array.from(state.a)})};
}
