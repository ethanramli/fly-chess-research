import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync,renameSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { checkMateCertificate } from '../../src/search-and-feedback/mate-certificate-check.mjs';
import { uci } from '../../src/search-and-feedback/experimental-puzzle-search.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),read=p=>JSON.parse(readFileSync(p,'utf8'));
const protocolPath='research/data/cached-root-search-v4/protocol.json',p=read(protocolPath);
assert.equal(p.schema,'cached-root-search-v4');const reportPath=join(p.out,'report.json'),r=read(reportPath);
assert.equal(r.complete,true);assert.equal(r.identity.protocolSha256,hash(readFileSync(protocolPath)));
assert.deepEqual(r.identity.pins,p.pins);
for(const [path,expected] of Object.entries(p.pins))assert.equal(hash(readFileSync(path)),expected,path);
const puzzle=readFileSync(p.puzzlePath,'utf8').trim().split(/\r?\n/).map(JSON.parse).find(x=>x.id===p.puzzleId);
assert.equal(puzzle.split,'train');const root=new Chess(puzzle.fen),legal=root.moves({verbose:true}).map(m=>uci(m));
assert.equal(r.rootLegalMoves,legal.length);assert.equal(r.outcomes.length,2);
const reference=read(p.neuralReport),eventRef=reference.results.find(x=>x.condition==='informative').eventRefs[0];
assert.equal(hash(readFileSync(eventRef.path)),eventRef.sha256);const event=read(eventRef.path);
assert.equal(event.experience.status,'failure');assert.equal(event.channel,'PPL103');
const after=new Chess(root.fen());after.move(event.experience.move);
const trainingProof=checkMateCertificate(event.experience.proof.certificate,after,{attacker:root.turn(),plies:puzzle.plies-1,maxNodes:100000});
assert.equal(trainingProof.verified,true);assert.equal(trainingProof.status,'failure');
const signature=x=>({move:uci(x.move),candidates:x.candidates.map(c=>({uci:c.uci,visits:c.visits,valueVisits:c.valueVisits,prior:c.prior,value:c.value})),
 seed:x.seed,randomState:x.randomState,simulations:x.simulations,evaluations:x.evaluations,nodes:x.nodes,terminalLeaves:x.terminalLeaves,
 cutoffs:x.cutoffs,candidateMode:x.candidateMode,forcingPriorMix:x.forcingPriorMix,candidateCoverage:x.candidateCoverage,task:x.task,stoppedBy:x.stoppedBy});
const certificateStatuses=[];
for(const outcome of r.outcomes){
 assert.deepEqual(outcome.fen,puzzle.fen);assert.deepEqual(outcome.task,{objective:puzzle.objective,plies:puzzle.plies});
 assert.deepEqual(outcome.assessment,outcome.freshRepeat);assert.deepEqual(outcome.memory,event.after);
 assert.equal(outcome.fixedStateHash,p.shared?.invariant ?? read(p.baseProtocol).shared.invariant);
 assert.equal(outcome.search.candidateCoverage.rootSelected.length,legal.length);
 assert.deepEqual(outcome.search.candidateCoverage.rootSelected.map(x=>x.uci).sort(),legal.slice().sort());
 assert.deepEqual(outcome.search.candidates.map(x=>x.uci).sort(),legal.slice().sort());
 for(const candidate of outcome.search.candidates)assert.ok(Number.isFinite(candidate.prior)&&candidate.prior>=0);
 assert.equal(outcome.search.evaluations,2);assert.equal(outcome.search.simulations,1);
 assert.equal(outcome.searchReview.status,outcome.assessmentChoiceReview.status);
 const move=uci(outcome.search.move),successor=new Chess(root.fen());successor.move({from:move.slice(0,2),to:move.slice(2,4),...(move.length===5?{promotion:move[4]}:{})});
 const proof=checkMateCertificate(outcome.searchReview.proof.certificate,successor,{attacker:root.turn(),plies:puzzle.plies-1,maxNodes:100000});
 assert.equal(proof.verified,true);assert.equal(proof.status,outcome.searchReview.status);certificateStatuses.push(proof.status);
 assert.equal(outcome.stages.feedback,false);assert.equal(outcome.stages.persistentLearning,false);assert.equal(outcome.stages.transfer,false);
}
assert.deepEqual(signature(r.outcomes[0].search),signature(r.outcomes[1].search));
assert.deepEqual(r.outcomes[0].searchReview.certificateSha256,r.outcomes[1].searchReview.certificateSha256);
assert.deepEqual(r.outcomes[0].memory,r.outcomes[1].memory);
assert.equal(r.outcomes[1].cache.hits,1);assert.equal(r.outcomes[1].cache.avoidedCandidatePresentations,legal.length);
assert.equal(r.outcomes[1].presentations+legal.length,r.outcomes[0].presentations);
const audit={passed:true,reportSha256:hash(readFileSync(reportPath)),sourceSha256:hash(readFileSync('.codebase/scripts/evaluation-and-performance/audit-cached-root-search.mjs')),
 legalRootCoverage:legal.length,trainingReceiptCertificateChecks:1,searchCertificates:2,trainingReceiptCertificate:'failure',searchCertificateStatuses:certificateStatuses,
 exactSearchPolicyAndTrace:true,exactMemory:true,cachedRootHits:r.outcomes[1].cache.hits,avoidedCandidatePresentations:legal.length,
 claims:'One development search repeated after its fresh neural assessment. Both search choices verified as failures. No learning or transfer claim.'};
const path=join(p.out,'audit.json');writeFileSync(path+'.partial',JSON.stringify(audit,null,2)+'\n');renameSync(path+'.partial',path);
const marker=join(p.out,'AUDITED.json');writeFileSync(marker+'.partial',JSON.stringify({reportSha256:audit.reportSha256,auditSha256:hash(readFileSync(path))},null,2)+'\n');renameSync(marker+'.partial',marker);
console.log(JSON.stringify(audit));
