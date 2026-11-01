import test from 'node:test';
import assert from 'node:assert/strict';
import { registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { register } from '../../src/neural-learning/memory-assay-rule-local-reservoir-rate.mjs';
import { runCellSeed } from '../../src/neural-learning/memory-assay-phase-recorded.mjs';
import { auditRecordedEvents } from '../../src/neural-learning/memory-assay-phase-audit.mjs';
register(registerRule);
test('rate comparison preserves verified own-choice replay, no-event controls and hidden-state persistence',()=>{
  const profile={ruleName:'local-reservoir-rate-v1',seeds:[1001],nKC:200,s:20,cell:{q:.25,relation:'conflicting',w:0,bg:0},temperature:.1,danDip:0};
  const rows=[],records=runCellSeed({...profile,seed:1001,writeRecord:r=>rows.push(r)});
  let i=0;const replay=auditRecordedEvents(()=>rows[i++]??null,profile);
  assert.deepEqual(replay.summaries,records);assert.equal(replay.checkedTrials,576);assert.equal(replay.unknownTrials,72);
  const tests=rows.filter(r=>r.kind==='test');assert.equal(tests.length,20);
  assert.ok(tests.every(r=>r.snapshot.states.length===1600));
  assert.ok(records.filter(r=>['absent','disabled'].includes(r.arm)).every(r=>r.initialGainsHash===r.finalGainsHash));
});
