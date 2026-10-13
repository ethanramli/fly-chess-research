import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir=new URL('.',import.meta.url),json=p=>JSON.parse(readFileSync(p));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const v=json(new URL('verification.json',dir));
assert.equal(hash(new URL('storage-before.mjs',dir)),v.storageBeforeSHA256);
assert.equal(hash('.codebase/src/runtime/storage.mjs'),v.storageAfterSHA256);
assert.equal(hash('.codebase/tests/runtime/storage.test.mjs'),v.testSHA256);
for(const [p,h] of Object.entries(v.evidence))assert.equal(hash(new URL(p,dir)),h,p);
const before=readFileSync(new URL('storage-before.mjs',dir),'utf8'),after=readFileSync('.codebase/src/runtime/storage.mjs','utf8');
const newline=before.includes('\r\n')?'\r\n':'\n';
assert.equal(after,before.replace('  model.zeroGrad();','  model.refreshSignedMagnitude();'+newline+'  model.zeroGrad();'));
const old=json(new URL('../independent-wasm-audit-2026-10-10/completion.json',dir));
assert.equal(v.storageBeforeSHA256,old.sources['.codebase/src/runtime/storage.mjs']);
for(const [p,h] of Object.entries(old.sources))if(p!=='.codebase/src/runtime/storage.mjs')assert.equal(hash(p),h,p);
const decode=p=>{const b=readFileSync(new URL(p,dir));return b[0]===255&&b[1]===254?b.subarray(2).toString('utf16le'):b.toString('utf8');};
assert.match(decode('regression-before.txt'),/# fail 1/);
assert.match(decode('regression-after.txt'),/# pass 1/);assert.match(decode('regression-after.txt'),/# fail 0/);
assert.match(decode('full-regression.txt'),/# tests 222/);assert.match(decode('full-regression.txt'),/# pass 222/);assert.match(decode('full-regression.txt'),/# fail 0/);
const correction=json(new URL('statistics-correction.json',dir)),median=a=>{const s=a.toSorted((x,y)=>x-y);return(s[s.length/2-1]+s[s.length/2])/2;};
const rows=[];
for(const run of correction.runs){
  const root=`runs/move-latency-${run.kind}-v1/`;
  assert.equal(hash(root+'report.json'),run.reportSHA256);assert.equal(hash(root+'samples.jsonl'),run.samplesSHA256);
  const samples=readFileSync(root+'samples.jsonl','utf8').trim().split('\n').map(JSON.parse);
  for(const f of run.fixtures){
    const values={};for(const name of ['oracle','candidate']){
      const a=samples.filter(s=>s.fixture===f.fixture&&s.name===name).map(s=>s.elapsedMs);assert.equal(a.length,4);
      values[name]=median(a);assert.equal(values[name],f[name].conventionalMedianMs);
    }
    rows.push({kind:run.kind,fixture:f.fixture,...values,reductionPercent:100*(1-values.candidate/values.oracle)});
  }
}
const result={timestamp:new Date().toISOString(),passed:true,scope:'Read-only review of source difference, test coverage, raw TAP, hash provenance and direct statistical recomputation; no tests or graph runs repeated',
  actionableFindingsClosed:true,loaderChange:'Existing shared refresh helper called after successful validation',coverage:'Changed magnitudes; float32/float64; SGD/Adam; used restoration target; trajectories, gradients, optimizer state and next update',
  rawRegression:{tests:222,passed:222,failed:0},rows,
  auditorProseCorrection:'Original zero-reset prose 8.098/8.660 s was a transcription error; raw medians are 7.963/8.516 s. Percentage and rejection unchanged.',
  remainingLimits:'General failure-mode correctness, historical checkpoint impact, dependable tail/cold speed, biology, transfer/reasoning and Elo remain unverified'};
writeFileSync(new URL('independent-review.json',dir),JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({passed:true,actionableFindingsClosed:true,rawRegression:result.rawRegression,zeroReset:rows.find(r=>r.kind==='zero-reset'&&r.fixture==='black-after-e4')}));
