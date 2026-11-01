import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCapacityFixture } from '../../src/neural-learning/capacity-delay-assay.mjs';
import { createRule, registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { register as registerSupralinear } from '../../src/neural-learning/memory-assay-rule-prediction-supralinear.mjs';
import { register as registerReservoirV11 } from '../../src/neural-learning/memory-assay-rule-prediction-reservoir-v1-1.mjs';
import { evaluateJoint, runJointArm } from '../../src/neural-learning/joint-ltm-assay-v3.mjs';

registerSupralinear(registerRule);
registerReservoirV11(registerRule);
const FROZEN = 'prediction-supralinear-v1', COMPARISON = 'prediction-reservoir-v1.1', SPY = 'joint-spy';
const N = 3, SEED = 7, DELAY = 40, LATER = 16, TRIALS = (N + 3) * 24; // N blocks, REV, two new blocks
const FIX = buildCapacityFixture({ seed: SEED, nKC: 200, s: 20, items: N + 2 });

// Spy rule: logs frames, restores and noteEvent ids. It forwards every call unchanged.
const spy = { frames: 0, restores: 0, events: [] };
const resetSpy = () => { spy.frames = 0; spy.restores = 0; spy.events.length = 0; };
registerRule(SPY, fixture => {
  const inner = createRule(FROZEN, fixture);
  return {
    ...inner,
    frame(args) { spy.frames++; inner.frame(args); },
    noteEvent(id, valence) { spy.events.push([id, valence]); inner.noteEvent(id, valence); },
    restore(s) { spy.restores++; inner.restore(s); },
  };
});

const run = opts => runJointArm({ ruleName: SPY, fixture: FIX, seed: SEED, delay: DELAY, laterDelay: LATER, ...opts });
// Pulse ids per block, read from the spy log in block order (pulses are recorded in the same order).
function pulseIdsByBlock(record) {
  let at = 0;
  return Object.fromEntries(Object.entries(record.pulses).map(([name, p]) => {
    const k = p.reward + p.punish, ids = spy.events.slice(at, at + k).map(([id]) => id);
    at += k;
    return [name, ids];
  }));
}

test('value reads never change state: frames are only the trial and delay frames', () => {
  resetSpy();
  run({ arm: 'informative' });
  // 7 frames per trial, and one frame per delay step of 4 units: 40/4 and 16/4.
  assert.equal(spy.frames, TRIALS * 7 + DELAY / 4 + LATER / 4);
});

test('same seed gives an identical trajectory', () => {
  assert.deepStrictEqual(run({ arm: 'informative' }), run({ arm: 'informative' }));
});

test('restored and uninterrupted trajectories match exactly', () => {
  resetSpy();
  run({ arm: 'informative', interruptRestore: true });
  assert.equal(spy.restores, 1);
  resetSpy();
  run({ arm: 'informative', interruptRestore: false });
  assert.equal(spy.restores, 0);
  for (const ruleName of [FROZEN, COMPARISON]) {
    const restored = runJointArm({ ruleName, fixture: FIX, seed: SEED, arm: 'informative', interruptRestore: true, delay: DELAY, laterDelay: LATER });
    const plain = runJointArm({ ruleName, fixture: FIX, seed: SEED, arm: 'informative', interruptRestore: false, delay: DELAY, laterDelay: LATER });
    assert.equal(restored.interruptRestore, true);
    const { interruptRestore: _a, ...restoredRest } = restored, { interruptRestore: _b, ...plainRest } = plain;
    assert.deepStrictEqual(restoredRest, plainRest, ruleName);
  }
});

test('every eighth trial gets no pulse', () => {
  resetSpy();
  const r = run({ arm: 'informative' });
  for (const [name, p] of Object.entries(r.pulses)) assert.equal(p.none, 3, name); // 24-trial blocks hold 3 unknown trials each
  const pulsed = Object.values(r.pulses).reduce((a, p) => a + p.reward + p.punish, 0);
  assert.equal(pulsed, TRIALS - Math.floor(TRIALS / 8));
  assert.equal(spy.events.length, pulsed);
});

test('new items get no teaching before step 6', () => {
  resetSpy();
  const ids = pulseIdsByBlock(run({ arm: 'informative' }));
  const newIds = [`X${N}+`, `X${N}-`, `X${N + 1}+`, `X${N + 1}-`];
  for (const name of [...Array.from({ length: N }, (_, i) => `B${i + 1}`), 'REV']) {
    for (const id of ids[name]) assert.ok(!newIds.includes(id), `${name} taught ${id}`);
  }
  assert.ok(ids.NEW1.length > 0 && ids.NEW1.every(id => newIds.slice(0, 2).includes(id)));
  assert.ok(ids.NEW2.length > 0 && ids.NEW2.every(id => newIds.slice(2).includes(id)));
});

test('reversal teaches only item 1', () => {
  resetSpy();
  const ids = pulseIdsByBlock(run({ arm: 'informative' }));
  assert.ok(ids.REV.length > 0 && ids.REV.every(id => id === 'X0+' || id === 'X0-'));
  for (let i = 0; i < N; i++) assert.ok(ids[`B${i + 1}`].every(id => id === `X${i}+` || id === `X${i}-`), `B${i + 1}`);
});

test('disabled changes nothing and sends no frames', () => {
  resetSpy();
  const r = run({ arm: 'disabled' });
  assert.equal(spy.frames, 0);
  assert.equal(spy.events.length, 0);
  assert.equal(r.gainsBeforeDelayHash, r.initialGainsHash);
  assert.equal(r.finalGainsHash, r.initialGainsHash);
  assert.equal(r.finalStateHash, createRule(FROZEN, FIX).stateHash());
  for (const p of Object.values(r.pulses)) assert.equal(p.reward + p.punish, 0);
});

// Hand-made records for N=3, seeds 1-3. Entries are built from mNorm, with greedy = mNorm > 0.
const entry = mNorm => ({ vGood: 0.5, vBad: 0.5 - 1.6 * mNorm, mNorm, greedy: mNorm > 0 });
function trajectory(seed, arm, interruptRestore = false) {
  const tests = {}, value = arm === 'shuffled' ? -0.1 : 0.8;
  for (let k = 1; k <= N + 2; k++) tests[`T${k}`] = Array.from({ length: k }, () => entry(value));
  for (const name of ['Delay', 'Rev', 'Later']) tests[name] = Array.from({ length: N }, () => entry(value));
  return { rule: 'hand', arm, seed, interruptRestore, nKC: 200, s: 20, items: N, tests, pulses: {}, realized: {},
    gainsBeforeDelayHash: 'g0', initialGainsHash: 'g0', finalStateHash: 'f', finalGainsHash: 'g1' };
}
const goodSet = () => [1, 2, 3].flatMap(seed => [
  trajectory(seed, 'informative', true), trajectory(seed, 'informative', false), trajectory(seed, 'absent'),
  trajectory(seed, 'shuffled'), trajectory(seed, 'disabled')]);

test('evaluateJoint passes hand-made good records and fails each mark when violated in turn', () => {
  const good = evaluateJoint(goodSet());
  for (let k = 1; k <= 10; k++) assert.equal(good[`C${k}`].pass, true, `C${k} on good records`);
  const informative = rs => rs.filter(r => r.arm === 'informative');
  const violations = {
    C1: rs => informative(rs).forEach(r => { r.tests.T2[1] = entry(0.2); }),
    C2: rs => informative(rs).forEach(r => { r.tests.T3[0] = entry(-0.1); }),
    C3: rs => informative(rs).forEach(r => { r.tests.T3[0] = entry(0.1); }),
    C4: rs => informative(rs).forEach(r => { r.tests.Delay[0] = entry(-0.1); }),
    C5: rs => informative(rs).forEach(r => { r.tests.Rev[0] = entry(0.2); }),
    C6: rs => informative(rs).forEach(r => { r.tests.Rev[1] = entry(0.1); }),
    C7: rs => rs.filter(r => r.arm === 'absent').forEach(r => { r.gainsBeforeDelayHash = 'changed'; }),
    C8: rs => informative(rs).forEach(r => { r.tests.Later[0] = entry(0.2); }),
    C9: rs => informative(rs).forEach(r => { r.tests.T5[4] = entry(-0.1); }),
    C10: rs => rs.filter(r => r.arm === 'informative' && !r.interruptRestore).forEach(r => { r.finalStateHash = 'changed'; }),
  };
  for (const [mark, violate] of Object.entries(violations)) {
    const bad = JSON.parse(JSON.stringify(goodSet()));
    violate(bad);
    assert.equal(evaluateJoint(bad)[mark].pass, false, mark);
  }
});
