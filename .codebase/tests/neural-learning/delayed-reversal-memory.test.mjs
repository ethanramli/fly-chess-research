import test from 'node:test';
import assert from 'node:assert/strict';
import { SparseTrainer } from '../../src/supervised-baselines/trainer.mjs';
import { DelayedReversalMemory } from '../../src/neural-learning/delayed-reversal-memory.mjs';
function fixture() {
  const graph = { row: Int32Array.from([0,0,0,0,2]), col: Int32Array.from([0,1]),
    sign: Int8Array.from([1,1]), initial: Float32Array.from([1,1]), input: Int32Array.from([0]), output: Int32Array.from([3]) };
  const model = new SparseTrainer(graph,{ inputDim:1, outputs:1 });
  const mapping = { readyForCandidateExperiment:true, groups:[{ kc:[0,1], edges:[0,1], dan:[{index:2}] }] };
  const memory = new DelayedReversalMemory(model,mapping);
  const h = model.h[model.steps], rest = new Float32Array(4);
  return { model,memory,h,rest };
}
test('delayed signal credits earlier active KC rather than endpoint KC; inactive depression can recover', () => {
  const {memory,h,rest} = fixture(); h[0]=1.5; memory.tagAction(rest); memory.advance(1);
  h[0]=0; h[1]=1.5; h[2]=1.5; memory.observe(rest);
  assert.ok(memory.gains[0]<1); assert.equal(memory.gains[1],1);
  const depressed=memory.gains[0]; memory.endEpisode(); h.fill(0); h[1]=1.5;
  memory.tagAction(rest); h[2]=1.5; const receipt=memory.observe(rest);
  assert.ok(memory.gains[0]>depressed); assert.equal(receipt.recoveredEdges,1);
  // Recovery also changes an earlier, now inactive memory: retention is NOT solved.
});
test('resumed root trace reproduces next update; zero reinforcement, bad checkpoint and NaN fail safely', () => {
  const a=fixture(), b=fixture(); a.h[0]=1.5; a.memory.tagAction(a.rest); a.memory.advance(2);
  b.memory.restore(JSON.parse(JSON.stringify(a.memory.snapshot())));
  a.h.fill(0); b.h.fill(0); a.h[2]=1.5; b.h[2]=1.5;
  assert.deepEqual(a.memory.observe(a.rest),b.memory.observe(b.rest));
  assert.deepEqual(a.memory.snapshot(),b.memory.snapshot());
  a.h[2]=0; const gains=[...a.memory.gains]; a.memory.observe(a.rest); assert.deepEqual([...a.memory.gains],gains);
  const before=a.memory.snapshot(); a.h[2]=NaN; assert.throws(()=>a.memory.observe(a.rest),/Nonfinite/);
  assert.deepEqual(a.memory.snapshot(),before);
  assert.throws(()=>a.memory.restore({...before,eligibility:[NaN,0]}),/Incompatible/);
  assert.deepEqual(a.memory.snapshot(),before);
});
