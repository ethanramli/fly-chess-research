// Independent legal trace replay, no graph simulation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { sha256 } from '../runtime/fetch-graph.mjs';
const root='research/reports/multi-context-stability-v1-2026-10-07';
const pp='research/data/multi-context-stability-v1/protocol.json',p=JSON.parse(fs.readFileSync(pp));
const r=JSON.parse(fs.readFileSync(`${root}/report.json`));assert.equal(r.complete,true);
const records=[...r.state.naiveSearchRefs.map(ref=>{const raw=fs.readFileSync(ref.path);return {ref,value:JSON.parse(raw)};}),...r.evaluations.flatMap(e=>e.contexts.map(c=>({value:c.fixedBudgetSearch})))];
let traces=0,moves=0;
for(const record of records){
 if(record.ref)assert.equal(await sha256(record.ref.path),record.ref.sha256);
 const v=record.value;assert.equal(v.traces.length,v.search.simulations);
 assert.ok(v.search.evaluations<=p.evaluationSearch.maxEvaluations);assert.ok(v.search.simulations<=p.evaluationSearch.simulations);
 const visits=new Map();
 for(let i=0;i<v.traces.length;i++){
  const t=v.traces[i],b=new Chess();b.loadPgn(v.review.context.pgn);assert.equal(t.index,i);
  assert.ok(t.moves.length<=p.evaluationSearch.maxDepth);
  for(const key of t.moves){assert.equal(b.isGameOver(),false);const move=b.moves({verbose:true}).find(m=>m.from+m.to+(m.promotion??'')===key);assert.ok(move);b.move(move);moves++;}
  assert.equal(b.fen(),t.leafFen);
  if(t.moves.length)visits.set(t.moves[0],(visits.get(t.moves[0])??0)+1);
  if(t.reason==='terminal'){
   assert.equal(b.isGameOver(),true);const value=b.isCheckmate()?-1:0;
   assert.equal(t.rootEstimate,value===0?0:value*(t.moves.length%2?-1:1));assert.equal(t.evidence,'observed-terminal');
  }else if(['assessment','assessment-capacity'].includes(t.reason)){
   assert.equal(t.evidence,'model-estimate');assert.equal(t.rootEstimate===0,true);
  }else{assert.equal(t.evidence,'unknown-cutoff');assert.equal(t.rootEstimate,null);}
  traces++;
 }
 for(const c of v.search.candidates)assert.equal(c.visits,visits.get(c.uci)??0);
}
const dest=`${root}/audit-search-traces.json`;assert.ok(!fs.existsSync(dest));
const result={passed:true,reportSha256:await sha256(`${root}/report.json`),protocolSha256:await sha256(pp),auditorSha256:await sha256(import.meta.filename),searches:records.length,traces,moves,scope:'Recorded legal path/terminal perspective/root visits/bounds replay only. Not independent neural inference, exhaustive defense, or learned strategic evaluation.'};
fs.writeFileSync(dest+'.partial',JSON.stringify(result,null,2)+'\n');fs.renameSync(dest+'.partial',dest);console.log(JSON.stringify(result));
