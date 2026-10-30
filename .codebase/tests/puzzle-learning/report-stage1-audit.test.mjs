import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildReport,formatReport} from '../../scripts/puzzle-learning/report-stage1-audit.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const fixture=name=>join(here,'fixtures','stage1-audit-report',name);
const tool=join(here,'..','..','scripts','puzzle-learning','report-stage1-audit.mjs');
const run=(...args)=>execFileSync(process.execPath,[tool,...args],{encoding:'utf8'});
const load=name=>JSON.parse(readFileSync(fixture(name),'utf8'));
const verdictOf=(report,replica,gate)=>report.replicas.find(r=>String(r.replica)===String(replica))
  .gates.find(g=>g.gate===gate).verdict;

test('accepted fixture prints overall acceptance and per-gate passes', () => {
  const text=run(fixture('accepted.json'));
  assert.match(text,/^Status: accepted  stageAccepted: true$/m);
  assert.match(text,/^fullNeuralReplay: true  memoryContinuityVerified: true$/m);
  assert.match(text,/^Replica 1: status=accepted stageAccepted=true$/m);
  assert.match(text,/D1\s+23\/24.*training >=22\/24 \[curriculum-stage-acceptance\.mjs:100\].*pass/);
  assert.match(text,/D7\s+not stated.*deferred/);
  const report=buildReport(load('accepted.json'));
  for(const replica of [1,2]){
    for(const gate of ['D1','D2','D3','D4','D5','D6','D8'])assert.equal(verdictOf(report,replica,gate),'pass');
    assert.equal(verdictOf(report,replica,'D7'),'deferred');
  }
  assert.deepEqual(report.firstFailing,[{replica:1,gate:'none'},{replica:2,gate:'none'}]);
});

test('selection failure at D2 shows the validation blocks and leaves sealed gates not stated', () => {
  const text=run(fixture('selection-fail-d2.json'));
  assert.match(text,/^Status: gate-failed  stageAccepted: false$/m);
  assert.match(text,/^Replica 1: status=gate-failed stageAccepted=false$/m);
  assert.match(text,/by block 0:11\/16 1:13\/16 2:12\/16/);
  assert.match(text,/D2\s+.*fail/);
  assert.match(text,/D3\s+not stated/);
  assert.match(text,/^  replica 1: D2$/m);
  assert.match(text,/^  replica 2: D2$/m);
  const report=buildReport(load('selection-fail-d2.json'));
  assert.equal(verdictOf(report,'1','D2'),'fail');
  assert.equal(verdictOf(report,'1','D6'),'not stated');
});

test('D6 failure reports control advantages and bootstrap lower bounds', () => {
  const text=run(fixture('fail-d6.json'));
  assert.match(text,/^Replica 1: status=gate-failed stageAccepted=false$/m);
  assert.match(text,/D6\s+scratch 9, absent 8.*advantage >=10 and paired.*fail/);
  assert.match(text,/scratch 9, absent 8, shuffled 10, disabled 6/);
  assert.match(text,/absent lower95 -1, .*disabled lower95 -2/);
  assert.match(text,/^  replica 1: D6$/m);
  const report=buildReport(load('fail-d6.json'));
  assert.equal(verdictOf(report,1,'D1'),'pass');
  assert.equal(verdictOf(report,1,'D7'),'deferred');
});

test('unknown fixture reports missing prerequisites and the unknown reason', () => {
  const text=run(fixture('unknown-missing-prereqs.json'));
  assert.match(text,/^Status: unknown  stageAccepted: false$/m);
  assert.match(text,/^Replica 1: status=unknown stageAccepted=false$/m);
  assert.match(text,/^  replica 1 note: missing finalSetSealedUntilFreeze \| unknown: Retention challenge evidence is incomplete$/m);
  assert.match(text,/D1\s+not stated.*not stated/);
  const report=buildReport(load('unknown-missing-prereqs.json'));
  assert.equal(verdictOf(report,1,'D1'),'not stated');
});

test('--json prints the same verdicts as the text report', () => {
  const parsed=JSON.parse(run(fixture('fail-d6.json'),'--json'));
  assert.deepEqual(parsed,buildReport(load('fail-d6.json')));
  assert.equal(verdictOf(parsed,1,'D6'),'fail');
});

test('formatReport prints the diagnosis verbatim', () => {
  const audit=load('selection-fail-d2.json');
  assert.ok(formatReport(buildReport(audit)).includes(audit.diagnosis[0]));
});
