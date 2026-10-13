import test from 'node:test';
import assert from 'node:assert/strict';
import { RateTimingMemory } from '../../src/neural-learning/rate-timing-memory.mjs';

// Inert manually supplied rate arrays. No SparseTrainer or neural simulation.
function fixture(){
  const model={n:4,steps:2,config:{fixture:true},graph:{col:Int32Array.from([0,1]),sign:Int8Array.from([1,1])},
    params:{magnitude:Float32Array.from([0.5,0.4])},h:Array.from({length:3},()=>new Float32Array(4)),
    setMagnitude(e,v){this.params.magnitude[e]=v;}};
  const mapping={schema:'gamma2-rate-timing-map-v1',readyForCandidateExperiment:true,groups:[{
    mbonType:'MBON12',danType:'PPL103',kc:[0,1],kcTypes:['KCg-m','KCg-m'],edges:[0,1],dan:[{index:2}]}]};
  const config={referenceMode:'fixed-unstimulated-model',tauKC:0.4,tauShort:0.6,tauLong:1,
    stepDuration:0.1,eta:0.5,minGain:0.2,maxGain:1.8,activityScale:1};
  return {model,mapping,config,memory:new RateTimingMemory(model,mapping,new Float32Array(4),config)};
}
test('trajectory updates only mapped active histories; traces persist and resume exactly',()=>{
  const a=fixture(),b=fixture();a.model.h[1].set([1,0,1,0]);a.model.h[2].set([1,0,1,0]);
  a.memory.observeTrajectory();assert(a.memory.gains[0]<1);assert.equal(a.memory.gains[1],1);
  b.memory.restore(JSON.parse(JSON.stringify(a.memory.snapshot())));
  a.model.h[1].fill(0);a.model.h[2].fill(0);
  assert.deepEqual(a.memory.observeTrajectory(),b.memory.observeTrajectory());
  assert.deepEqual(a.memory.snapshot(),b.memory.snapshot());
  assert.deepEqual(a.model.params.magnitude,b.model.params.magnitude);
  assert.deepEqual([...a.model.graph.sign],[1,1]);
});
test('disabled processing freezes gains and every trace; malformed late frame cannot partially update',()=>{
  const {model,memory}=fixture();const initial=memory.snapshot(),magnitudes=model.params.magnitude.slice();
  model.h[1].set([1,0,1,0]);model.h[2].set([1,0,1,0]);
  memory.observeTrajectory({plasticityEnabled:false});assert.deepEqual(memory.snapshot(),initial);
  model.h[2][2]=NaN;assert.throws(()=>memory.observeTrajectory(),/Nonfinite/);
  assert.deepEqual(memory.snapshot(),initial);assert.deepEqual(model.params.magnitude,magnitudes);
  assert.throws(()=>memory.restore({...initial,short:[NaN,0]}),/Incompatible/);
  assert.deepEqual(memory.snapshot(),initial);
  assert.throws(()=>memory.observe(),/observeTrajectory/);
});
test('scope and timing are required; fixed reference is part of checkpoint identity',()=>{
  const {model,mapping,config,memory}=fixture();
  assert.throws(()=>new RateTimingMemory(model,{...mapping,groups:[{...mapping.groups[0],kcTypes:["KCa'b'-m",'KCg-m']}]},new Float32Array(4),config));
  const reference=Float32Array.from([0.1,0,0,0]);
  const changed=new RateTimingMemory(model,mapping,reference,config);
  assert.throws(()=>changed.restore(memory.snapshot()),/Incompatible/);
});
