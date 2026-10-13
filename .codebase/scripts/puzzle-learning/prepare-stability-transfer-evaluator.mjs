import fs from 'node:fs';
let source=fs.readFileSync('.codebase/scripts/puzzle-learning/evaluate-near-transfer-repair-transfer.mjs','utf8');
const replacements=[
 ["'adaptive-near-transfer-repair-transfer-v1'","'multi-context-stability-transfer-v1'"],
 ["const continuationDir = 'research/reports/adaptive-near-transfer-repair-v2-2026-10-07/run';","const continuationDir = 'research/reports/multi-context-stability-v1-2026-10-07';"],
 ['continuation.complete && continuationAudit.passed && continuationComplete.auditPassed','continuation.complete && continuationAudit.passed && continuationComplete.passed'],
 ['continuation.summary.acquiredRepair','continuation.summary.allContextAcquisition'],
 ['continuation.identity.initialMemoryHash, p.warmStartContinuation.initialMemoryHash','continuation.identity.initialMemoryHash, p.warmStartContinuation.initialMemoryHash'],
 ['continuation.state.results.find(result => result.condition === \'informative\')','continuation.state.results.find(result => result.condition === \'informative\')'],
 ['const restStart = performance.now(); model.forward([0]);',"const restMemory = read(p.restMemoryPath).memory;\nassert.equal(digest(restMemory), p.warmStartContinuation.initialMemoryHash);\nmemory.restore(restMemory);\nconst restStart = performance.now(); model.forward([0]);"],
];
for(const [old,next]of replacements){if(!source.includes(old))throw Error(`Missing source fragment: ${old}`);source=source.replaceAll(old,next);}
source=source.replace("'research/data/adaptive-near-transfer-v4/protocol.json'","'research/data/multi-context-stability-transfer-v1/protocol.json'");
const target='.codebase/scripts/puzzle-learning/evaluate-stability-transfer.mjs';fs.writeFileSync(target,source,{flag:'wx'});
console.log('Separate no-feedback evaluator prepared; requires future frozen protocol and terminal prerequisite audits.');
