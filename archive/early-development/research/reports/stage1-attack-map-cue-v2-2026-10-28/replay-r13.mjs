// Surrogate fidelity test (no graph; training rows only). Replays every learning frame recorded in
// the smoke r13 informative receipts (stimulated cells, restrained and alpha-lobe factors) through the
// r11 surrogate at the registered eta, then compares with the graph run at each block start:
// (1) the memory gains against the stage checkpoint, (2) the training-board count (graph: 0,7,20,19,7,20).
// Mode "task-only" drops the no-channel frames and the untaught-channel factors, as the earlier
// surrogate screens did; "no null frame" drops only the no-channel frames; "null frame, task pulse only"
// keeps them but drops the untaught-channel factors of the task frame.
// Usage (repo root): node --max-old-space-size=512 research/reports/stage1-attack-map-cue-v2-2026-10-28/replay-r13.mjs
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {buildSurrogate,Chess,TASK}=await import(pathToFileURL(resolve('research/reports/stage1-memory-literature-and-surrogate-2026-10-27/scripts/surrogate.mjs')).href);
const {createPublicAttackMapEncoderV1}=await import(pathToFileURL(resolve('.codebase/src/chess-input/public-attack-map-cue-v1.mjs')).href);
const {decodeCheckpoint}=await import(pathToFileURL(resolve('.codebase/src/runtime/checkpoint-codec.mjs')).href);
const S=buildSurrogate(),registration=JSON.parse(readFileSync('research/data/lichess-stage1-synthetic-v1/stage1-smoke-r13-registration.json','utf8'));
const {schema,...config}=registration.learner.encoder,eta=registration.learner.memory.eta;
const encoder=createPublicAttackMapEncoderV1(S.memory.mapping,{...config,seed:registration.learner.replicaSeeds.r1});
const rows=readFileSync('research/data/lichess-stage1-synthetic-v1/train.jsonl','utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const panels=rows.map(row=>{const board=new Chess();board.loadPgn(row.lesson.context.pgn);
  const exp=row.lesson.candidates.map(c=>({move:c.move,status:c.proof.status}));
  return {id:row.lesson.lessonId,exp,cues:new Map(exp.map(x=>[x.move,encoder.encode(board,x.move,TASK).stimulation]))};});
const dir='runs/lichess-stage1-synthetic-v1-smoke-r13/r1%3Ainformative/attempt-001';
const frames=block=>readFileSync(`${dir}/block-${String(block).padStart(2,'0')}/receipts.jsonl`,'utf8').split(/\r?\n/).filter(Boolean)
  .map(JSON.parse).filter(l=>l.kind==='frame'&&l.value.receipt.learningApplied).map(l=>l.value.receipt);
const graphCounts=[0,7,20,19,7,20],nr=S.state.r.length;
function compare(st,index){
  const saved=decodeCheckpoint(readFileSync(`${dir}/stage-checkpoint-${String(index).padStart(3,'0')}.json.gz`)).block.session.memory.gains;
  let max=0,sxy=0,sxx=0,syy=0;
  for(let i=0;i<saved.length;i++){const x=(i<nr?st.r[i]:st.a[i-nr])-1,y=saved[i]-1;max=Math.max(max,Math.abs(x-y));sxy+=x*y;sxx+=x*x;syy+=y*y;}
  return {maxAbsGainDiff:+max.toFixed(4),deviationCorrelation:sxx&&syy?+(sxy/Math.sqrt(sxx*syy)).toFixed(4):null};
}
for(const mode of ['all recorded frames','task-only','no null frame','null frame, task pulse only']){
  const st={r:new Float64Array(nr).fill(1),a:new Float64Array(S.state.a.length).fill(1)},out=[];
  for(let block=0;block<=5;block++){
    if(block>0) for(const f of frames(block)){
      const u=f.result.update,stim=f.result.presentation.stimulation;
      const big=x=>Math.abs(x)>0.5?x:0;
      if(mode==='no null frame'){if(f.phase!=='task')continue;S.update(stim,u.factors,u.alphaFactors,eta,st);}
      else if(mode==='null frame, task pulse only'){S.update(stim,f.phase==='task'?u.factors.map(big):u.factors,f.phase==='task'?u.alphaFactors.map(big):u.alphaFactors,eta,st);}
      else if(mode==='task-only'){
        if(f.phase!=='task')continue;
        S.update(stim,u.factors.map(big),u.alphaFactors.map(big),eta,st);
      }else S.update(stim,u.factors,u.alphaFactors,eta,st);
    }
    out.push({blockStart:block,surrogateCorrect:panels.filter(p=>S.assess(p,st).correct).length,graphCorrect:graphCounts[block],...compare(st,block)});
  }
  for(const o of out) console.log(JSON.stringify({mode,...o}));
}
