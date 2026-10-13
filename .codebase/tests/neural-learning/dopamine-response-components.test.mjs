import test from 'node:test';
import assert from 'node:assert/strict';
import { stepDopamineComponents as step } from '../../src/neural-learning/dopamine-response-components.mjs';
const config={tauShort:0.6,tauLong:1}; // Numerical choices, not calibrated biological seconds.
test('positive rate produces onset depression and an opposite offset tail',()=>{
  const onset=step({short:0,long:0},{rate:1,dt:0.6},config);
  assert(onset.factor<0);
  const offset=step(onset.state,{rate:0,dt:2},config);
  assert(offset.factor>0);
  assert(offset.state.short>=0 && offset.state.long>=0);
  const equilibrium=step({short:1,long:1},{rate:1,dt:100},config);
  assert.equal(equilibrium.factor,0);
});
test('constant-rate interval partition and JSON continuation agree',()=>{
  const initial=Object.freeze({short:0.2,long:0.7});
  const whole=step(initial,{rate:0.9,dt:1},config);
  for(const n of [2,10,100,1000]){
    let state=initial;
    for(let i=0;i<n;i++)state=step(state,{rate:0.9,dt:1/n},config).state;
    assert(Math.abs(state.short-whole.state.short)<1e-13);
    assert(Math.abs(state.long-whole.state.long)<1e-13);
  }
  assert.deepEqual(step(whole.state,{rate:0,dt:0.4},config),
    step(JSON.parse(JSON.stringify(whole.state)),{rate:0,dt:0.4},config));
});
test('bounded nonnegative components and invalid input preserve caller state',()=>{
  const state=Object.freeze({short:0.2,long:0.7});
  for(const rate of [0,0.5,10])for(const dt of [0,1e-10,1,1e6]){
    const next=step(state,{rate,dt},config).state;
    for(const key of ['short','long'])assert(next[key]>=Math.min(rate,state[key])-1e-15 && next[key]<=Math.max(rate,state[key])+1e-15);
  }
  assert.throws(()=>step(state,{rate:-1,dt:1},config));
  assert.throws(()=>step(state,{rate:1,dt:1},{tauShort:1,tauLong:1}));
  assert.deepEqual(state,{short:0.2,long:0.7});
});
