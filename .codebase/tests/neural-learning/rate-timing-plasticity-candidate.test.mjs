import test from 'node:test';
import assert from 'node:assert/strict';
import { stepRateTimingPlasticity as step } from '../../src/neural-learning/rate-timing-plasticity-candidate.mjs';
const c={tauKC:0.4,tauShort:0.6,tauLong:1,eta:0.5,minGain:0.2,maxGain:1.8};
test('whole interval equals subdivisions including an internal signal reversal',()=>{
  for(const state of [{gain:1,kcTrace:0,short:0,long:0},{gain:0.3,kcTrace:0.8,short:0.6,long:0.4}])
    for(const rates of [{kcRate:1,danRate:1},{kcRate:0,danRate:0},{kcRate:0.4,danRate:0.1}]){
      const whole=step(state,{...rates,dt:3},c);
      for(const n of [2,10,100,1000]){
        let next=state,dep=0,pot=0;
        for(let i=0;i<n;i++){const r=step(next,{...rates,dt:3/n},c);next=r.state;dep+=r.depressionDose;pot+=r.potentiationDose;}
        for(const key of Object.keys(next))assert(Math.abs(next[key]-whole.state[key])<1e-11,key);
        assert(Math.abs(dep-whole.depressionDose)<1e-11);assert(Math.abs(pot-whole.potentiationDose)<1e-11);
      }
    }
});
test('local onset/offset can move gain both ways, and no KC history prevents change',()=>{
  const initial={gain:1,kcTrace:0,short:0,long:0};
  assert(step(initial,{kcRate:1,danRate:1,dt:0.6},c).state.gain<1);
  const prepared=step(initial,{kcRate:0,danRate:1,dt:0.6},c).state;
  assert.equal(prepared.gain,1);
  const quiet=step(prepared,{kcRate:0,danRate:0,dt:2},c).state;
  assert.equal(quiet.gain,1);
  assert(step(quiet,{kcRate:1,danRate:0,dt:0.5},c).state.gain>1);
  assert(step({...quiet,gain:c.minGain},{kcRate:1,danRate:0,dt:0.5},c).state.gain>c.minGain);
});
test('checkpoint continuation preserves all local state and inputs remain unchanged',()=>{
  const state=Object.freeze({gain:0.7,kcTrace:0.4,short:0.1,long:0.2});
  const event={kcRate:0.6,danRate:0.8,dt:0.1};
  assert.deepEqual(step(state,event,c),step(JSON.parse(JSON.stringify(state)),event,c));
  assert.throws(()=>step(state,{...event,kcRate:2},c));
  assert.deepEqual(state,{gain:0.7,kcTrace:0.4,short:0.1,long:0.2});
});
