import test from 'node:test';
import assert from 'node:assert/strict';
import {planG0HistoryDiagnostic} from '../../src/neural-learning/g0-reversal-history-diagnostic.mjs';
import {createG0Table,verifyG0} from '../../src/neural-learning/curriculum-g0.mjs';

test('diagnostic yokes certified public experiences and matches per-action teaching totals',()=>{
  const plan=planG0HistoryDiagnostic(),table=createG0Table();
  assert.equal(plan.stages.length,24);
  assert.equal(plan.stages.reduce((n,s)=>n+s.slots.length,0),672);
  for(const phase of ['acquisition','interference','reversal']){
    const stages=plan.stages.filter(s=>s.phase===phase),reference=stages[0].slots;
    for(const stage of stages){
      assert.deepEqual(stage.slots.map(s=>s.experience),reference.map(s=>s.experience));
      for(const slot of stage.slots)assert.equal(verifyG0(table,slot.experience).learningAllowed,true);
      if(stage.condition.kind==='shuffled')for(const action of ['A','B']){
        const rows=stage.slots.filter(s=>s.experience.publicInput.action===action);
        assert.equal(rows.filter(s=>s.options.shuffledStatus==='success').length,
          rows.filter(s=>s.experience.status==='success').length);
        assert(rows.some(s=>s.options.shuffledStatus!==s.experience.status));
      }
    }
  }
});

test('paired branches have identical teaching, explicit distinct entry states and independent objects',()=>{
  const plan=planG0HistoryDiagnostic();
  for(const condition of plan.conditions){
    const retained=plan.stages.find(s=>s.branch==='retained'&&s.condition.id===condition.id);
    const reset=plan.stages.find(s=>s.branch==='reset'&&s.condition.id===condition.id);
    assert.deepEqual(retained.slots,reset.slots);
    assert.equal(retained.memoryStart,'pre-reversal');assert.equal(reset.memoryStart,'initial');
    retained.slots[0].experience.publicInput.cue[0]=9;
    assert.equal(reset.slots[0].experience.publicInput.cue[0],0);
  }
  const shuffles=plan.stages.filter(s=>s.phase==='reversal'&&s.branch==='reset'&&s.condition.kind==='shuffled');
  assert.equal(new Set(shuffles.map(s=>JSON.stringify(s.slots.map(x=>x.options.shuffledStatus)))).size,3);
  assert.deepEqual(planG0HistoryDiagnostic().shuffleSeeds,[20261011,20261014,20261015]);
});
