import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCapacityFixture, runCapacityArm } from '../../src/neural-learning/capacity-delay-assay.mjs';
import { CHECKPOINTS, runCapacityArmV2, summarizeCapacityV2 } from '../../src/neural-learning/capacity-delay-assay-v2.mjs';
import { createRule, registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { register as registerLocalReservoir } from '../../src/neural-learning/memory-assay-rule-local-reservoir.mjs';
import { register as registerPredictionReservoirV11 } from '../../src/neural-learning/memory-assay-rule-prediction-reservoir-v1-1.mjs';

registerLocalReservoir(registerRule);
registerPredictionReservoirV11(registerRule);
const SEED = 3001, RULE = 'local-reservoir-v1', PRED = 'prediction-reservoir-v1.1', SPY = 'spy-v2';

// Spy rule: logs noteEvent ids and checks that every value read leaves snapshot() unchanged.
const spy = { events: [], reads: 0, changedReads: 0 };
registerRule(SPY, fixture => {
  const inner = createRule(RULE, fixture);
  return {
    ...inner,
    value(id, kcH) {
      const before = JSON.stringify(inner.snapshot()), v = inner.value(id, kcH);
      spy.reads++;
      if (JSON.stringify(inner.snapshot()) !== before) spy.changedReads++;
      return v;
    },
    noteEvent(id, valence) { spy.events.push(id); inner.noteEvent(id, valence); },
  };
});

const run = ({ ruleName = RULE, items = 3, ...opts } = {}) =>
  runCapacityArmV2({ ruleName, fixture: buildCapacityFixture({ seed: SEED, items }), seed: SEED, checkpoints: [2, 3], ...opts });

test('tests leave rule.snapshot() unchanged', () => {
  spy.reads = 0; spy.changedReads = 0;
  run({ ruleName: SPY, reversalAt: 3, delayLevels: [0, 400], jitter: 0.1 });
  assert.ok(spy.reads > 0);
  assert.equal(spy.changedReads, 0);
});

test('same seed gives an identical record', () => {
  const opts = { reversalAt: 3, delayLevels: [0, 400], jitter: 0.1 };
  assert.deepStrictEqual(run(opts), run(opts));
});

test('vGood minus vBad equals the margin at every item and test', () => {
  const rec = run({ reversalAt: 3, delayLevels: [400], jitter: 0.1 });
  const entries = Object.values(rec.tests).flat();
  assert.ok(entries.length > 0);
  for (const e of entries) {
    assert.equal(e.vGood - e.vBad, e.margin);
    assert.equal(e.greedy, e.margin > 0);
  }
  assert.equal(rec.acq.length, 3);
});

test('jitter 0 leaves gains identical across the delay, and jitter 0.1 does not', () => {
  const still = run({ ruleName: PRED, delayLevels: [0, 400, 1600], jitter: 0 });
  assert.equal(still.finalGainsHash, still.gainsBeforeDelayHash);
  const moving = run({ ruleName: PRED, delayLevels: [400, 1600], jitter: 0.1 });
  assert.notEqual(moving.finalGainsHash, moving.gainsBeforeDelayHash);
});

test('reversal flips item 0 good image and teaches on item 0 only', () => {
  spy.events = [];
  const rec = run({ ruleName: SPY, reversalAt: 3 });
  assert.equal(rec.tests.T3[0].good, 'X0+');
  assert.equal(rec.tests.Rev[0].good, 'X0-');
  assert.equal(rec.tests.Rev[1].good, 'X1+');
  const revEvents = 24 - rec.pulses.REV.none, item0 = ['X0+', 'X0-'];
  assert.ok(revEvents > 0);
  assert.ok(spy.events.slice(0, -revEvents).some(id => !item0.includes(id)));
  assert.ok(spy.events.slice(-revEvents).every(id => item0.includes(id)));
});

test('every eighth trial is unknown and sends no pulse', () => {
  const rec = run({ items: 2 });
  for (const b of ['B1', 'B2']) {
    assert.equal(rec.pulses[b].none, 3, b); // trials 8, 16, 24 of block 1 and 32, 40, 48 of block 2 overall
    assert.equal(rec.pulses[b].reward + rec.pulses[b].punish, 21, b);
  }
});

test('informative trial frames match v1 at the same seed and size', () => {
  const fixture = buildCapacityFixture({ seed: SEED, items: 4 });
  const v1 = runCapacityArm({ ruleName: RULE, fixture, seed: SEED, arm: 'informative', noise: false });
  const v2 = runCapacityArmV2({ ruleName: RULE, fixture, seed: SEED, checkpoints: [4] });
  for (let b = 1; b <= 4; b++) assert.deepStrictEqual(v2.pulses[`B${b}`], v1.pulses[`B${b}`], `B${b}`);
  for (let j = 0; j < 4; j++) {
    assert.ok(Math.abs(v2.tests.T4[j].margin - v1.tests.T4[j].mNorm * 1.6) < 1e-12, `item ${j}`);
    assert.equal(v2.tests.T4[j].greedy, v1.tests.T4[j].greedy, `item ${j}`);
  }
});

test('summary smoke: one seed, small sizes, all three parts', () => {
  const configs = [
    { part: 'A', items: 8, reversalAt: null, jitter: 0, delayLevels: [] },
    { part: 'B', items: 4, reversalAt: 4, jitter: 0, delayLevels: [] },
    { part: 'C', items: 4, reversalAt: null, jitter: 0.1, delayLevels: [0, 400] },
  ];
  const records = [];
  for (const ruleName of [RULE, PRED]) for (const { part, items, ...opts } of configs) {
    const fixture = buildCapacityFixture({ seed: SEED, nKC: 200, s: 20, items });
    records.push({ part, ...runCapacityArmV2({ ruleName, fixture, seed: SEED, checkpoints: CHECKPOINTS, ...opts }) });
  }
  const summary = summarizeCapacityV2(records);
  const a = summary.partA[RULE]['200x20'];
  assert.deepEqual(Object.keys(a), ['T4', 'T8']);
  assert.equal(a.T8.coverage, 0.8);
  for (const bin of ['newestQuarter', 'oldestHalf']) for (const v of Object.values(a.T8[bin])) assert.ok(Number.isFinite(v));
  const b = summary.partB[RULE]['200x20'];
  assert.ok(Number.isFinite(b.item1Margin) && Number.isFinite(b.otherItemRatio));
  const c = summary.partC[RULE]['0.1'];
  assert.ok(Number.isFinite(c.reference.meanMargin) && Number.isFinite(c.levels['400'].meanMargin));
  assert.ok(c.halfLevel === 'not reached' || [0, 400].includes(c.halfLevel));
});
