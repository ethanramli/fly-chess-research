// Exact final check command, from repository root:
// node --max-old-space-size=256 research/reports/codebase-weakness-review-2026-10-30/verify-report.mjs > research/reports/codebase-weakness-review-2026-10-30/completion-checks.txt 2>&1
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const dir='research/reports/codebase-weakness-review-2026-10-30';
const read=name=>{
  const bytes=readFileSync(`${dir}/${name}`);
  return bytes.toString(bytes[0]===255&&bytes[1]===254?'utf16le':'utf8').replace(/^\uFEFF/,'');
};
const report=read('README.md');
assert(!report.includes('review is incomplete'));
assert.equal((report.match(/^## W0[1-7] /gm)||[]).length,7);
for(let i=1;i<=7;i++){
  const section=report.split(`## W0${i} `)[1].split('\n## ')[0];
  for(const required of ['Component / severity / verdict','Locations:','Failure scenario:','Evidence:','Impact on existing evidence:','Smallest fix:'])
    assert(section.includes(required),`W0${i}: missing ${required}`);
  assert(section.includes('CONFIRMED'));
}
for(let i=1;i<=9;i++)assert(report.includes(`| ${i}. `),`Missing coverage ${i}`);
for(const match of report.matchAll(/\]\(([^)]+)\)/g)){
  assert(!match[1].includes('://'));assert(existsSync(resolve(dir,match[1])),`Missing report link ${match[1]}`);
}
const gate=JSON.parse(read('gates-and-pins-output.json'));
assert.equal(gate.duplicatePairGate.status,'accepted');assert.equal(gate.trainingDataAudit.duplicatePairPlanPassed,true);
assert.equal(JSON.parse(read('supervisor-output.json')).concurrentSupervisorEntries,2);
assert.equal(JSON.parse(read('recovery-selection-output.json')).scansOfActiveAttempt,0);
assert(read('alpha-lobe-tests-unsandboxed.txt').includes('# pass 4'));
assert(read('acceptance-tests-unsandboxed.txt').includes('# pass 8'));
for(const item of gate.staticImports.unpinned){
  const current=createHash('sha256').update(readFileSync(item.path)).digest('hex');
  assert.equal(current,item.sha256,`Source changed during review: ${item.path}`);
}
console.log(JSON.stringify({report:'complete',findings:7,critical:3,high:2,medium:1,low:1,coverageAreas:9,
  reproduced:['W02 synthetic gate and training auditor','W04 exact source expression with mocked paths','W06 mocked concurrent supervisor wrapper'],
  traced:['W01 positional separation gap','W03 D8 recovery evidence gap','W05 executing dependency pin omissions','W07 documentation contradiction'],
  unitTests:{alphaLobe:4,acceptance:8},sourceHashesRechecked:gate.staticImports.unpinned.length,
  scope:'Completion of the bounded review and its artifact requirements, not experiment or scientific gate acceptance'}));
