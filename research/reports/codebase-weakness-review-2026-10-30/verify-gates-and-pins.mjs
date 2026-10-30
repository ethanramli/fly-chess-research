// Bounded no-graph review. Reads source, registrations and training data only.
import assert from 'node:assert/strict';
import {readFileSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {resolve,dirname,relative} from 'node:path';
import os from 'node:os';
import {evaluateStage1Acceptance} from '../../../.codebase/src/puzzle-learning/curriculum-stage-acceptance.mjs';
import {auditSplit} from '../../../.codebase/scripts/data/audit-lichess-stage1-synthetic-families-v1.mjs';

assert(process.execArgv.includes('--max-old-space-size=256'));
assert(os.freemem()>=256*2**20);
const root=process.cwd(),out=resolve(root,'research/reports/codebase-weakness-review-2026-10-30');
const read=p=>{assert(statSync(p).size<=16*2**20);return readFileSync(p);};
const json=p=>JSON.parse(read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fixtureSource=read('.codebase/tests/puzzle-learning/curriculum-stage-acceptance.test.mjs').toString();
const fixture=runInNewContext(fixtureSource.slice(fixtureSource.indexOf("const hash="),fixtureSource.indexOf('\ntest('))+'\nfixture();',{createHash});
const baseline=evaluateStage1Acceptance(fixture);assert.equal(baseline.status,'accepted');
const duplicate=structuredClone(fixture);
const pair=duplicate.counterfactualPairs[0];
duplicate.counterfactualPairs=Array.from({length:32},(_,i)=>({...pair,pairId:`repeated-${i}`}));
const duplicateGate=evaluateStage1Acceptance(duplicate);
assert.equal(duplicateGate.checks.D5,true);assert.equal(duplicateGate.metrics.counterfactualPairsCorrect,32);

const dir='research/data/lichess-stage1-synthetic-v1';
const familyBytes=read(`${dir}/train-families.json`),familyDoc=JSON.parse(familyBytes);
const plan=json(`${dir}/train-plan.json`),manifest=json(`${dir}/train-manifest.json`);
const lines=b=>b.toString().split(/\r?\n/).filter(Boolean);
const args={split:'train',rowLines:lines(read(`${dir}/train.jsonl`)),familyDoc,familyBytes,plan,
  sourceLines:manifest.inputs.flatMap(ref=>{assert(!/validation|final/i.test(ref.path));return lines(read(ref.path));})};
const clean=auditSplit(args);assert.equal(clean.passed,true,JSON.stringify(clean.failures));
const duplicatePlan=structuredClone(plan);
duplicatePlan.counterfactualPairs=Array.from({length:12},(_,i)=>({...plan.counterfactualPairs[0],pairId:`repeat-${i}`}));
const malformed=auditSplit({...args,plan:duplicatePlan});assert.equal(malformed.passed,true,JSON.stringify(malformed.failures));

// Static import walk: do not import or run the learner or read graph bytes.
const stepFiles=['r1','r2','r3','merge'].map(s=>`python actions/lichess-stage1-synthetic-v1-full-r15-${s}-step.json`);
const steps=stepFiles.map(json),reg=json(`${dir}/stage1-full-r15-registration.json`);
const roots=['.codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix-v5.mjs',reg.runtimeFactory.path,reg.stageAcceptanceEvaluator.path];
const seen=new Map();
function visit(path){
  path=resolve(path);if(seen.has(path))return;
  const bytes=read(path),text=bytes.toString();seen.set(path,sha(bytes));
  for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+\.mjs)['"]/g))visit(resolve(dirname(path),match[1]));
}
roots.forEach(visit);
function refs(value,result=new Map()){
  if(value&&typeof value==='object'){
    if(typeof value.path==='string'&&typeof value.sha256==='string')result.set(resolve(value.path),value.sha256);
    for(const item of Object.values(value))refs(item,result);
  }return result;
}
const registeredRefs=refs(reg);
const pins=steps.map(step=>new Map([...Object.entries(step.pins).map(([path,hash])=>[resolve(path.replace(/\{([^}]+)\}/g,(_,k)=>step.paths[k])),hash]),...registeredRefs]));
const unpinned=[...seen].filter(([path])=>pins.every(set=>!set.has(path))).map(([path,sha256])=>({path:relative(root,path).replaceAll('\\','/'),sha256}));
assert(unpinned.some(row=>row.path==='.codebase/src/supervised-baselines/trainer.mjs'));
const result={scope:'Synthetic unit-test observations and training-only data; no validation/final rows or outputs read',
  gateFixtureBaseline:baseline.status,duplicatePairGate:{status:duplicateGate.status,D5:duplicateGate.checks.D5,count:duplicateGate.metrics.counterfactualPairsCorrect,distinctPairs:1},
  trainingDataAudit:{baselinePassed:clean.passed,duplicatePairPlanPassed:malformed.passed,count:12,distinctPairs:1},
  staticImports:{roots,visited:seen.size,stepFiles,unpinned},
  rssMiB:process.memoryUsage().rss/2**20,freeMiB:os.freemem()/2**20};
assert(result.rssMiB<2048&&result.freeMiB>=256);
writeFileSync(resolve(out,'gates-and-pins-output.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,staticImports:{visited:seen.size,unpinned:unpinned.length}}));
