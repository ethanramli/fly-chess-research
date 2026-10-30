// Static encoder/provenance and saved-result arithmetic. No graph inference.
import assert from 'node:assert/strict';
import {readFileSync,createReadStream,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Chess} from 'chess.js';
import {createConjoinedPublicMateFrameEncoder} from '../../../.codebase/src/chess-input/conjoined-public-mate-frame-cue.mjs';
import {certifyMate} from '../../../.codebase/src/search-and-feedback/mate-certificate.mjs';
import {verifiedExperience} from '../../../.codebase/src/search-and-feedback/verified-feedback.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
async function hash(path){const h=createHash('sha256');for await(const b of createReadStream(path))h.update(b);return h.digest('hex');}
const out='research/reports/plasticity-evidence-review-2026-10-10';
const index=read(`${out}/evidence-index.json`),byPath=new Map(index.records.map(r=>[r.path,r]));
let auditBindings=0;
for(const r of index.records){
  assert.equal(await hash(r.path),r.sha256);
  if(!r.path.endsWith('/audit.json'))continue;
  const audit=read(r.path),resultPath=r.path.replace(/audit\.json$/,'report.json');
  const report=byPath.get(resultPath);
  const claimed=audit.reportSha256??audit.rawReportHash??audit.reportSHA256;
  if(report&&claimed){assert.equal(claimed,report.sha256,r.path);auditBindings++;}
}
const protocolPath='research/data/adaptive-temporal-loop-v1/protocol.json',p=read(protocolPath);
for(const [path,sha] of Object.entries(p.sources))assert.equal(await hash(path),sha,`Changed source ${path}`);
const mapping=read(p.mappingPath);
assert.equal(await hash(p.graphPath),mapping.inputs.graph);
assert.equal(await hash(p.annotationPath),mapping.inputs.annotations);
const result=read('runs/adaptive-temporal-loop-v1-resumed/result.json');
const audit=read('runs/adaptive-temporal-loop-v1-resumed/audit.json');
const prior=read('research/reports/adaptive-temporal-loop-2026-10-09/evidence.json');
assert.equal(await hash('runs/adaptive-temporal-loop-v1-resumed/result.json'),prior.resultSha256);
assert.equal(await hash('runs/adaptive-temporal-loop-v1-resumed/audit.json'),prior.auditSha256);
assert.equal(await hash(protocolPath),audit.protocolHash);
const informative=result.results.find(r=>r.condition==='informative');
const scores=assessment=>Object.fromEntries(assessment.rows.map(r=>[r.move,r.score]));
const trajectory=[informative.initial,...informative.selections.slice(1).map(s=>s.assessment),informative.final]
  .map(a=>({choice:a.choice,scores:Object.fromEntries(['f7g8','f7d7','f7h7'].map(m=>[m,scores(a)[m]]))}));
const margins=a=>scores(a)[p.successMove]-Math.max(...a.rows.filter(r=>r.move!==p.successMove).map(r=>r.score));
const before=margins(informative.initial),after=margins(informative.final);
assert.equal(before,audit.strongestCompetitorMargins.find(r=>r.condition==='informative').before);
assert.equal(after,audit.strongestCompetitorMargins.find(r=>r.condition==='informative').after);
const encoder=createConjoinedPublicMateFrameEncoder(mapping,p.encoder);
const task=p.task;
const cases=[{fen:p.fen,action:p.successMove},
  {fen:'6k1/4Q3/5K2/8/8/8/8/8 w - - 0 1',action:'e7g7'}];
const encoded=cases.map(c=>{
  const board=new Chess(c.fen),child=new Chess(c.fen);child.move({from:c.action.slice(0,2),to:c.action.slice(2,4)});
  const proof=certifyMate(child,board.turn(),{plies:0,maxNodes:4096,milliseconds:2000});
  const checked=verifiedExperience(board,c.action,task,proof);assert.equal(checked.status,'success');
  const frame={schema:'public-lesson-frame-v1',fen:board.fen(),pgn:board.pgn(),task,action:c.action};
  return {frame,proof,status:checked.status,cue:encoder.encode(frame)};
});
const common=(a,b)=>a.filter(x=>new Set(b).has(x));
const sharedTokens=common(encoded[0].cue.tokens,encoded[1].cue.tokens);
assert.equal(sharedTokens.length,0,'Different absolute actions must yield different conjunction keys');
const sharedCells=common(encoded[0].cue.stimulation.map(c=>c.index),encoded[1].cue.stimulation.map(c=>c.index));
const gainRange=[Math.min(...informative.finalMemory.gains),Math.max(...informative.finalMemory.gains)];
const output={date:'2026-10-10',scope:'Artifact integrity, saved-score arithmetic and static certified encoder illustration only. No new graph replay, training, final-family read or biological validation.',
  verifiedExistingArtifacts:index.records.length,auditReportHashBindings:auditBindings,
  protocolHash:await hash(protocolPath),sourcePinsChecked:Object.keys(p.sources).length,
  graphSha256:mapping.inputs.graph,annotationSha256:mapping.inputs.annotations,
  mappedEdges:mapping.groups.flatMap(g=>g.edges).length,distinctCueKCs:new Set(mapping.groups.flatMap(g=>g.kc)).size,
  gainRange,strongestCompetitorMargin:{before,after,fractionGapClosed:(after-before)/-before},trajectory,
  coordinateConjunctionIllustration:{cases:encoded,sharedTokens,sharedCells,
    interpretation:'Both moves verify mate in one after a one-file translation. No shared exact encoded token remains because every token includes a different absolute action. Shared KC identities are possible through hashing; downstream dynamics/generalization not tested.'}};
writeFileSync(`${out}/source-review.json`,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({...output,coordinateConjunctionIllustration:{sharedTokens:sharedTokens.length,sharedCells:sharedCells.length,
  selectedCells:encoded.map(c=>c.cue.stimulation.length),statuses:encoded.map(c=>c.status)}}));
