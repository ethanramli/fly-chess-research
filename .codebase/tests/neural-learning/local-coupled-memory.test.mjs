import test from 'node:test';
import assert from 'node:assert/strict';
import { stepCoupled, LocalCoupledMemory, COUPLED_DEFAULTS as K } from '../../src/neural-learning/local-coupled-memory.mjs';
import { stepLocalGated, LOCAL_GATED_DEFAULTS as C } from '../../src/neural-learning/local-gated-memory.mjs';
import { buildFixture } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { makeCircuit, registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { makeRule, register } from '../../src/neural-learning/memory-assay-rule-local-coupled.mjs';
import { makeRule as localRule } from '../../src/neural-learning/memory-assay-rule-local-gated.mjs';
import { runCellSeed } from '../../src/neural-learning/memory-assay-recorded.mjs';
import { auditRecordedEvents } from '../../src/neural-learning/memory-assay-record-audit.mjs';
register(registerRule);

const input = { gain: .7, slow: .4, trace: .8, k: .9, excess: .5, deficit: 0, dt: 1 };
const fixture = () => buildFixture({ seed: 1001, nKC: 200, s: 20, q: .25, relation: 'conflicting', w: 0, bg: 0 });

test('coupled closed form matches an independent small-step integration', () => {
  for (const o of [input, { ...input, gain: .2, slow: 1, excess: 0, deficit: .5, dt: 4 }, { ...input, gain: 1, slow: .2, excess: .3, deficit: .2 }]) {
    const E = Math.min(1, Math.max(0, (o.k-C.theta)/(1-C.theta)));
    const trace = E + (o.trace-E)*Math.exp(-o.dt/C.tauE);
    const a=C.eta*o.excess, b=C.eta*o.deficit, z=trace*(a+b)*o.dt, target=(a*C.minGain+b*C.maxGain)/(a+b);
    let u=o.gain, s=o.slow;
    const steps=200000, dz=z/steps;
    for(let i=0;i<steps;i++) { const du=target-u+K.kappa*(s-u), ds=K.kappa/K.capacity*(u-s); u+=dz*du; s+=dz*ds; }
    const actual=stepCoupled(o,C,K);
    assert.ok(Math.abs(actual.gain-u)<2e-6); assert.ok(Math.abs(actual.slow-s)<2e-6);
  }
});

test('zero coupling matches original fast step exactly, with hidden state inert', () => {
  for(const dt of [1e-12,.5,1,1000]) for(const [excess,deficit] of [[0,0],[.5,0],[0,.5],[.3,.2]]) {
    const o={...input,dt,excess,deficit};
    const actual=stepCoupled(o,C,{...K,kappa:0});
    assert.deepEqual(actual,{...stepLocalGated(o,C),slow:o.slow});
  }
});

test('coupling obeys semigroup, bounds and finite large/tiny event intervals', () => {
  const settled={...input,trace:1,k:1};
  const whole=stepCoupled(settled,C,K), first=stepCoupled({...settled,dt:.5},C,K);
  const second=stepCoupled({...settled,...first,dt:.5},C,K);
  assert.ok(Math.abs(whole.gain-second.gain)<1e-14); assert.ok(Math.abs(whole.slow-second.slow)<1e-14);
  for(const gain of [.2,.6,1]) for(const slow of [.2,.6,1]) for(const dt of [1e-300,1e-12,1,1e6])
    for(const [excess,deficit] of [[0,0],[.5,0],[0,.5],[1e6,1e6]]) {
      const r=stepCoupled({...input,gain,slow,dt,excess,deficit},C,K);
      for(const v of [r.gain,r.slow]) assert.ok(Number.isFinite(v)&&v>=.2&&v<=1);
    }
});

test('hidden state affects visible gain and no-event/settled-inactive frames freeze gains', () => {
  assert.ok(stepCoupled({...input,slow:1},C,K).gain>stepCoupled({...input,slow:.2},C,K).gain);
  for(const o of [{...input,excess:0,deficit:0},{...input,k:0,trace:0}]) {
    const r=stepCoupled(o,C,K); assert.equal(r.gain,o.gain); assert.equal(r.slow,o.slow);
  }
});

test('snapshots restore all state exactly; invalid restore is atomic and identities are enforced', () => {
  const f=fixture(), a=makeRule('coupled',f), b=makeRule('coupled',f);
  const frame={kcH:f.images['A+'].h,danP:1.5,danR:0,dt:1};
  for(let i=0;i<5;i++) a.frame(frame);
  const state=a.snapshot(); b.restore(state); assert.equal(a.stateHash(),b.stateHash());
  a.frame({...frame,danP:0,danR:1.5}); b.frame({...frame,danP:0,danR:1.5});
  assert.equal(a.stateHash(),b.stateHash());
  for(const bad of [{...state,slow:[NaN]},{...state,time:-1},{...state,identity:'other'}]) {
    const before=b.stateHash(); assert.throws(()=>b.restore(bad)); assert.equal(b.stateHash(),before);
  }
  assert.throws(()=>makeRule('other',f,{kappa:0}).restore(state));
  const c=makeCircuit(f), wiring=[...c.model.graph.sign];
  const memory=new LocalCoupledMemory(c.model,c.mapReversal); memory.restore(new LocalCoupledMemory(c.model,c.mapReversal).snapshot());
  assert.deepEqual([...c.model.graph.sign],wiring);
});

test('zero-coupling adapter reproduces original visible states/choices; invalid observations do not mutate', () => {
  const f=fixture(), a=makeRule('zero',f,{kappa:0}), b=localRule('local',f);
  for(let i=0;i<24;i++) {
    const frame={kcH:f.images[i%2?'A+':'B-'].h,danP:i%3?1.5:0,danR:i%3?0:1.5,dt:1};
    a.frame(frame); b.frame(frame); assert.deepEqual(a.gains(),b.gains());
    for(const image of ['A+','A-','B+','B-']) assert.equal(a.value(image,f.images[image].h),b.value(image,f.images[image].h));
  }
  const before=a.snapshot(), h=new Float64Array(200); h[199]=NaN;
  assert.throws(()=>a.frame({kcH:h,danP:1.5,danR:0,dt:1})); assert.deepEqual(a.snapshot(),before);
  for(const config of [{kappa:-1},{capacity:0},{kappa:NaN}]) assert.throws(()=>makeRule('bad',f,config));
});

test('both coupled conditions replay own-choice feedback and all four causal controls', () => {
  for(const ruleName of ['local-coupled-v1','local-coupled-v1-kappa0']) {
    const expected={ruleName,seeds:[1001],nKC:200,s:20,cell:{q:.25,relation:'conflicting',w:0,bg:0},temperature:.1,danDip:0};
    const rows=[], summaries=runCellSeed({...expected,seed:1001,writeRecord:r=>rows.push(r)});
    let i=0; const audit=auditRecordedEvents(()=>rows[i++]??null,expected);
    assert.deepEqual(audit.summaries,summaries); assert.equal(audit.checkedTrials,576); assert.equal(audit.unknownTrials,72);
    assert.ok(summaries.every(r=>r.certsRejected===0 && r.eventsDuringTests===0));
    assert.ok(summaries.filter(r=>['absent','disabled'].includes(r.arm)).every(r=>r.initialGainsHash===r.finalGainsHash));
  }
});
