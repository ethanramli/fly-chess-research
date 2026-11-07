import assert from 'node:assert/strict';
import { EpisodicConsequenceMemory } from '../../../../.codebase/src/neural-learning/episodic-consequence-memory.mjs';
import { memoryBackedScore } from '../../../../.codebase/src/neural-learning/memory-backed-policy-v1.mjs';
import { stepCubicReservoir } from '../../../../.codebase/src/neural-learning/local-cubic-reservoir-memory.mjs';
import { LOCAL_GATED_DEFAULTS } from '../../../../.codebase/src/neural-learning/local-gated-memory.mjs';
const m = new EpisodicConsequenceMemory();
m.commit([{index:1,current:1}], {status:'verified',sequence:1,value:1,evidenceHash:'a'.repeat(64)});
assert.equal(m.query([{index:1,current:1}]).known,true);
assert.equal(m.query([{index:1,current:1.000001}]).known,false);
assert.equal(memoryBackedScore('fly-memory',-100,m.query([{index:1,current:1}])),1);
const config={...LOCAL_GATED_DEFAULTS,eta:2};
const initial={gain:1,trace:0,k:1,excess:.1,deficit:0,dt:1};
const next=stepCubicReservoir(initial,[1,0,0,0],config);
assert(next.gain<1); assert(next.trace>0);
console.log(JSON.stringify({status:'passed',exactAmplitudeMiss:true,knownRecallMasksNeural:true,
  firstCandidateGain:1,secondCandidateGain:next.gain,traceAfterFirst:next.trace,
  scope:'pure arithmetic counterexample; no graph propagation or biological inference'}));
