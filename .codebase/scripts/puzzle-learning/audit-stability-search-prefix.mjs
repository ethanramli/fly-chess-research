import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { sha256 } from '../runtime/fetch-graph.mjs';
const root='research/reports/multi-context-stability-v1-2026-10-07';
const file=`${root}/evaluation-informative.json`,v=JSON.parse(fs.readFileSync(file));
const pp='research/data/multi-context-stability-v1/protocol.json',p=JSON.parse(fs.readFileSync(pp));
let traces=0,moves=0;
for(const c of v.contexts){
 const s=c.fixedBudgetSearch;
 assert.equal(s.memoryFingerprint,v.memoryFingerprint);
 assert.equal(c.panel.assessment.memoryFingerprint,v.memoryFingerprint);
 assert.ok(s.search.evaluations<=p.evaluationSearch.maxEvaluations);
 assert.ok(s.search.simulations<=p.evaluationSearch.simulations);
 assert.equal(s.traces.length,s.search.simulations);
 assert.equal(s.review.status,'success');
 const cert=s.review.proof.certificate,cb=new Chess();cb.loadPgn(cert.rootPgn);
 const checked=checkMateCertificate(cert,cb,{attacker:cert.attacker,plies:cert.plies,maxNodes:100000});
 assert.equal(checked.verified,true);assert.equal(checked.status,'success');
 for(const t of s.traces){
  const b=new Chess();b.loadPgn(s.review.context.pgn);
  assert.ok(t.moves.length<=p.evaluationSearch.maxDepth);
  for(const key of t.moves){const m=b.moves({verbose:true}).find(x=>x.from+x.to+(x.promotion??'')===key);assert.ok(m);b.move(m);moves++;}
  assert.equal(b.fen(),t.leafFen);traces++;
 }
}
const out='research/reports/stability-search-prefix-v1-2026-10-07';assert.ok(!fs.existsSync(out));fs.mkdirSync(out);
const result={passed:true,evaluationSha256:await sha256(file),protocolSha256:await sha256(pp),auditorSha256:await sha256(import.meta.filename),searches:v.contexts.length,traces,moves,scope:'Informative search prefix: selected certificates, recorded legal traces and bounds only. Matched controls and terminal full trace audit pending; no independent neural replay or unfamiliar reasoning.'};
fs.writeFileSync(`${out}/report.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
