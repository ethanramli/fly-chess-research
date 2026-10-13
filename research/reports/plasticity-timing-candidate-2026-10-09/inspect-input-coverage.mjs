// Static encodings only. No outcome certificates, learner or prospective simulation.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createConjoinedPublicMateFrameEncoder } from '../../../.codebase/src/chess-input/conjoined-public-mate-frame-cue.mjs';
const paths = { target: 'research/reports/plasticity-timing-candidate-2026-10-09/target.json',
  mapping: 'research/reports/reversal-candidate-2026-10-05/mapping.json',
  receipt: 'research/reports/mate-conjoined-input-v1-2026-10-08/receipt-4-0.json' };
const hashes = {};
const read = path => { const b=readFileSync(path); hashes[path]=createHash('sha256').update(b).digest('hex'); return JSON.parse(b); };
const target=read(paths.target), {mapping}=read(paths.mapping), receipt=read(paths.receipt);
assert.equal(hashes[paths.mapping],target.hashes.mapping);
const edges=new Set(target.groups.flatMap(g=>g.candidateEdges));
const groups=mapping.groups.map(g=>{
  const offsets=g.edges.flatMap((e,i)=>edges.has(e)?[i]:[]);
  return {...g,edges:offsets.map(i=>g.edges[i]),kc:offsets.map(i=>g.kc[i])};
}).filter(g=>g.edges.length);
const candidate={...mapping,schema:'gamma2-input-pool-hypothesis-v1',groups,
  approximation:'Source-scoped gamma-KC subset; engineered symbolic injection, not natural sensory mapping'};
const cells=new Set(groups.flatMap(g=>g.kc)); assert.equal(cells.size,120);
const frame=receipt.frames[0].frame,board=new Chess();board.loadPgn(frame.pgn);
const config={seed:14009,maxCells:8,totalCurrent:12}; // Existing defaults/dose; no outcome-dependent selection.
const variants={existing:createConjoinedPublicMateFrameEncoder(mapping,config),
  gamma2:createConjoinedPublicMateFrameEncoder(candidate,config)};
assert.equal(variants.existing.identity,receipt.frames[0].cue.identity);
const output={hashes,config,scope:'One historical training board, static all-legal coverage only; no neural separation or transfer evidence',variants:{}};
for(const [name,encoder] of Object.entries(variants)) {
  const rows=board.moves({verbose:true}).map(m=>{
    const action=m.from+m.to+(m.promotion??''),cue=encoder.encode({...frame,action});
    const stimulation=cue.stimulation;
    return {action,stimulation,candidateCells:stimulation.filter(c=>cells.has(c.index)).length,
      dose:stimulation.reduce((n,c)=>n+c.current,0)};
  });
  const identicalPairs=[]; let maxShared=0;
  for(let i=0;i<rows.length;i++)for(let j=0;j<i;j++){
    const a=rows[i].stimulation.map(c=>c.index),b=new Set(rows[j].stimulation.map(c=>c.index));
    const shared=a.filter(c=>b.has(c)).length;maxShared=Math.max(maxShared,shared);
    if(shared===a.length && shared===b.size)identicalPairs.push([rows[i].action,rows[j].action]);
  }
  output.variants[name]={identity:encoder.identity,rows,identicalPairs,maxShared,
    zeroCandidateMoves:rows.filter(r=>!r.candidateCells).map(r=>r.action),
    doseRange:[Math.min(...rows.map(r=>r.dose)),Math.max(...rows.map(r=>r.dose))]};
}
writeFileSync(new URL('./input-coverage.json',import.meta.url),JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(Object.fromEntries(Object.entries(output.variants).map(([name,{rows,...v}])=>[name,{...v,moves:rows.length}]))));
