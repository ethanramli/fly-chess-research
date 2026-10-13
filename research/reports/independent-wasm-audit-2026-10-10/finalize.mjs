import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
const out=fileURLToPath(new URL('.',import.meta.url)),json=p=>JSON.parse(readFileSync(join(out,p))),hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const graph=json('full-graph-replay.json'),http=json('http-probe.json'),probes=json('production-probes.json'),stats=json('recomputed.json'),binary=json('binary-disassembly.json');
assert.equal(graph.passed,true);assert.equal(graph.count,92);assert.equal(http.passed,true);assert.equal(http.checks.length,2);
assert.equal(probes.checks[0].cases,36);assert.ok(probes.checks[1].stale.every(s=>s.reproduced));
assert.equal(stats.runs[0].conventionalPerFixtureGate,true);assert.equal(stats.runs[1].conventionalPerFixtureGate,false);
assert.equal(binary.functions.length,2);
assert.equal(hash('.codebase/src/supervised-baselines/trainer.mjs'),stats.productionSHA256);
assert.equal(hash('.codebase/src/runtime/sparse-accumulator.mjs'),stats.accumulatorSHA256);
for(const [p,h] of Object.entries(http.sourceHashes))assert.equal(hash(p),h);
const regression=readFileSync(join(out,'production-regression-unsandboxed.txt'));
const tap=regression[0]===255&&regression[1]===254?regression.subarray(2).toString('utf16le'):regression.toString('utf8');
assert.match(tap,/# tests 221/);assert.match(tap,/# pass 221/);assert.match(tap,/# fail 0/);
const report=readFileSync(join(out,'README.md'),'utf8'),links=[];
for(const match of report.matchAll(/\]\(([^)]+)\)/g)){
  if(/^https?:/.test(match[1]))continue;
  const target=resolve(out,decodeURIComponent(match[1].split('#')[0]));assert.ok(existsSync(target),target);links.push(match[1]);
}
const scientificEvidence=JSON.parse(readFileSync('research/reports/adaptive-temporal-loop-2026-10-09/evidence.json'));
assert.equal(hash('runs/adaptive-temporal-loop-v1-resumed/result.json'),scientificEvidence.resultSha256);
assert.equal(hash('runs/adaptive-temporal-loop-v1-resumed/audit.json'),scientificEvidence.auditSha256);
const science=JSON.parse(readFileSync('runs/adaptive-temporal-loop-v1-resumed/audit.json'));assert.equal(science.usefulChoice,false);assert.equal(science.causalChoice,false);
const additions=[
 ['documentation/current-status.md', '\n\n## 2026-10-10: Independent WASM adoption audit\n\nIndependent audit confirms production integration, 221/221 new loader-free regression, exact full trajectories for all 92 frozen full-graph successors, and production HTTP application for both colours. A high-severity inherited defect remains: disk checkpoint loading restores canonical magnitudes without refreshing signed recurrent weights, producing different outputs from the saved model. This occurs in both current production and the archived JS oracle. No implementation repair was made. Published 11–23% values are lower-middle nearest-rank p50; conventional medians yield 19–40% in the same samples and leave WASM passing/zero-reset failing. Four pairs per fixture do not establish dependable tails or cold speed. Broad build acceptance is blocked by checkpoint correctness and statistical labeling; the bounded untrained WASM engineering result is supported. Learning, transfer and biological/Elo claims remain unproved. [Independent report and raw evidence](../research/reports/independent-wasm-audit-2026-10-10/README.md).\n'],
 ['research/project/decision_log.md','\n\n## 2026-10-10: Independent audit constrains WASM acceptance\n\nPreserve the adopted accumulator and frozen latency artifacts during the researcher-requested independent audit. Exact production/oracle equivalence and HTTP application pass within the checked untrained workloads, but general checkpoint-restoration acceptance is rejected: the common disk loader leaves signed weights stale. This predates WASM and needs a separate shared-boundary repair; none was performed here. Correct the interpretation of historical nearest-rank p50 versus conventional medians without changing archived gates/results. No failure was removed and zero-reset remains rejected. Before: [adoption report](../reports/move-latency-wasm-2026-10-10/README.md). After: [independent findings](../reports/independent-wasm-audit-2026-10-10/README.md), [audit mistakes and evidence](../reports/independent-wasm-audit-2026-10-10/audit-log.md).\n'],
 ['research/reports/README.md','\n- [Independent WASM adoption audit: exact engineering checks pass; checkpoint defect and statistical limits remain](independent-wasm-audit-2026-10-10/README.md)\n'],
 ['research/journal/README.md','\n- [2026-10-10: Independent WASM audit, inspection failures, checkpoint finding and publication record](../reports/independent-wasm-audit-2026-10-10/audit-log.md)\n']
];
for(const [path,text] of additions){
  if(readFileSync(path,'utf8').includes(text.trim()))continue;
  const original=readFileSync(path);appendFileSync(path,text,'utf8');
  assert.deepEqual(readFileSync(path).subarray(0,original.length),original,'Historical bytes changed');
}
const files=Object.fromEntries(readdirSync(out,{recursive:true}).filter(p=>p!=='completion.json'&&statSync(join(out,p)).isFile()).map(p=>[p,hash(join(out,p))]));
const sources=Object.fromEntries(['.codebase/src/supervised-baselines/trainer.mjs','.codebase/src/runtime/sparse-accumulator.mjs','.codebase/src/runtime/storage.mjs','.codebase/src/evaluation-and-performance/fly-policy.mjs','.codebase/scripts/browser/play-server.mjs'].map(p=>[p,hash(p)]));
const completion={timestamp:new Date().toISOString(),auditCompleted:true,implementationRepaired:false,linksVerified:links.length,files,sources,
  coverage:{productionPath:'verified',numericalImplementation:'generated binary decoded and valid-domain checks',equivalence:'92 full-graph successors, 36 synthetic update cases, checkpoint defect reproduced',performance:'both raw runs recomputed; no new timing campaign',mistakesAndPivots:'named latency journal, original failures, frozen protocols inspected',scientificValidity:'browser untrained; local memory mechanisms inspected; current raw failure gates/hash bindings checked'},
  verdicts:{generalBuildAcceptance:false,boundedWasmEquivalence:true,recordedWarmedGate:true,dependableGeneralSpeed:'unverified',biologicalLearningOrReasoning:'not established'},
  unresolvedFindings:['inherited stale signed recurrent weights after disk checkpoint load','nearest-rank p50 labeled median','limited timing sample cannot establish general/cold latency'],
  limitations:'No code repair, full biological/transfer experiment, exhaustive historical receipt replay or visual browser verification',
  scientificEvidence:{executionAudit:science.passed,usefulChoice:science.usefulChoice,causalChoice:science.causalChoice,adaptiveAdvantage:science.adaptiveAdvantage},
  testCounts:{production221:true,syntheticCases:36,fullGraphSuccessors:92,httpColours:2},navigationAddenda:additions.map(([p])=>p)};
writeFileSync(join(out,'completion.json'),JSON.stringify(completion,null,2),{flag:'wx'});
console.log(JSON.stringify({auditCompleted:true,linksVerified:links.length,implementationRepaired:false,generalBuildAcceptance:false}));
