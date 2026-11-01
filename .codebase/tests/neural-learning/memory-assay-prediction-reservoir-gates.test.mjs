import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCircuit, registerRule, createRule, DAN_REST } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { predictionScale } from '../../src/neural-learning/memory-assay-rule-prediction-scaled.mjs';
import { FROZEN, register, makeFrozenRule } from '../../src/neural-learning/memory-assay-rule-prediction-reservoir-v1-1.mjs';
import { buildFixture, buildSchedule } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { runTrajectory } from '../../src/neural-learning/memory-assay-run.mjs';

register(registerRule);
const RULE = 'prediction-reservoir-v1.1';
const fx = (seed = 1001) => buildFixture({ seed, nKC: 200, s: 20, q: 0.25, relation: 'conflicting', w: 0.5, bg: 0.1 });
const IDS = ['A+', 'B-', 'C+', 'A-', 'B+', 'C-'];
// Three frames per step: image at rest, image with a pulse (reward: P 0, R 1.5; punish: P 1.5, R 0.75), gap.
function frames(f, count) {
  const gap = new Float64Array(f.nKC).fill(1.5 * f.bg), out = [];
  for (let i = 0; out.length < count; i++) {
    const kcH = f.images[IDS[i % IDS.length]].h;
    const [danP, danR] = [[0, 1.5], [1.5, DAN_REST], [DAN_REST, DAN_REST]][i % 3];
    out.push({ kcH, danP: DAN_REST, danR: DAN_REST, dt: 1 }, { kcH, danP, danR, dt: 1 }, { kcH: gap, danP: DAN_REST, danR: DAN_REST, dt: 4 });
  }
  return out.slice(0, count);
}
const roundTrip = v => JSON.parse(JSON.stringify(v));

test('S5 snapshot: JSON round trip mid-trajectory reproduces the rest bit-exactly', () => {
  const f = fx(), seq = frames(f, 24);
  const X = createRule(RULE, f);
  seq.slice(0, 12).forEach(fr => X.frame(fr));
  const Y = createRule(RULE, f);
  Y.restore(roundTrip(X.snapshot()));
  assert.deepStrictEqual(Y.snapshot(), X.snapshot());
  seq.slice(12).forEach(fr => { X.frame(fr); Y.frame(fr); }); // includes pulse frames after the restore
  assert.deepStrictEqual(Y.snapshot(), X.snapshot());
  assert.deepStrictEqual([...Y.memory.model.params.magnitude], [...X.memory.model.params.magnitude]);
  assert.equal(Y.stateHash(), X.stateHash());
  assert.ok(X.gains().P.some(g => g < 1)); // the trajectory moved gains, so the match is not vacuous
});

test('S5 snapshot taken mid-trace restores the trace', () => {
  const f = fx(), img = f.images['A+'].h, X = createRule(RULE, f), Y = createRule(RULE, f);
  X.frame({ kcH: img, danP: DAN_REST, danR: DAN_REST, dt: 1 }); // active image, no pulse: trace is high
  assert.ok(X.snapshot().traces.some(t => t > 0));
  Y.restore(roundTrip(X.snapshot()));
  assert.deepStrictEqual(Y.memory.traces, X.memory.traces);
  const pulse = { kcH: img, danP: 1.5, danR: DAN_REST, dt: 1 };
  X.frame(pulse); Y.frame(pulse);
  assert.deepStrictEqual(Y.snapshot(), X.snapshot());
});

test('S5 restore rejects corrupt snapshots and leaves the state hash unchanged', () => {
  const f = fx(), X = createRule(RULE, f), Y = createRule(RULE, f);
  frames(f, 12).forEach(fr => X.frame(fr));
  Y.restore(roundTrip(X.snapshot()));
  const h = Y.stateHash();
  const corrupt = [
    s => { s.identity = 'other'; },
    s => { s.schema = 'other'; },
    s => { s.gains[0] = 0.1; },
    s => { s.gains[0] = 1.5; },
    s => { s.gains[0] = NaN; },
    s => { s.traces[0] = 1.5; },
    s => { s.gains.pop(); },
    s => { s.time = -1; },
    s => { s.states[0] = NaN; },
    s => { s.states[0] += 0.1; }, // hidden mass no longer sums to 1
  ];
  for (const mutate of corrupt) {
    const s = roundTrip(X.snapshot());
    mutate(s); // after the JSON round trip, so NaN survives
    assert.throws(() => Y.restore(s), /Incompatible|mismatch/);
    assert.equal(Y.stateHash(), h);
  }
});

test('S5 restore rejects a snapshot from a different-identity rule or fixture before any change', () => {
  const f = fx(), Y = createRule(RULE, f), h = Y.stateHash();
  const g = fx(1002);
  const others = [
    [makeFrozenRule('other-eta', f, { ...FROZEN, eta: 0.5 }), f],
    [createRule(RULE, g), g],
  ];
  for (const [other, fixture] of others) {
    frames(fixture, 12).forEach(fr => other.frame(fr));
    assert.throws(() => Y.restore(roundTrip(other.snapshot())), /Incompatible/);
    assert.equal(Y.stateHash(), h);
  }
});

test('S5 identity covers the frozen prediction scale: a snapshot with another V0 is rejected', () => {
  const f = fx(), Y = createRule(RULE, f), other = makeFrozenRule('other-v0', f, { ...FROZEN, V0: 0.64 });
  frames(f, 12).forEach(fr => other.frame(fr));
  assert.throws(() => Y.restore(roundTrip(other.snapshot())), /Incompatible/);
});

test('S6 disabled: plasticity off leaves state and gains hashes unchanged', () => {
  const f = fx(), schedule = buildSchedule({ seed: f.seed });
  const off = runTrajectory({ ruleName: RULE, fixture: f, schedule, arm: 'disabled' });
  assert.equal(off.finalStateHash, off.initialStateHash);
  assert.equal(off.finalGainsHash, off.initialGainsHash);
  const on = runTrajectory({ ruleName: RULE, fixture: f, schedule, arm: 'informative' });
  assert.notEqual(on.finalGainsHash, on.initialGainsHash); // same check on the arm that learns
});

test('absent arm: gains hash unchanged (trace and time may still move, since frames are applied with no pulse)', () => {
  const f = fx(), schedule = buildSchedule({ seed: f.seed });
  const r = runTrajectory({ ruleName: RULE, fixture: f, schedule, arm: 'absent' });
  assert.equal(r.finalGainsHash, r.initialGainsHash);
});

test('S7 isolation: two rules from one fixture share no mutable state', () => {
  const f = fx(), X = createRule(RULE, f), Y = createRule(RULE, f), hY = Y.stateHash();
  const arrays = o => [o.memory.gains, o.memory.traces, o.memory.states, o.memory.base, o.memory.model.params.magnitude, o.memory.model.graph.col, o.memory.model.graph.sign, ...o.memory.model.h];
  for (const a of arrays(X)) for (const b of arrays(Y)) assert.notStrictEqual(a, b);
  assert.notStrictEqual(X.memory.model, Y.memory.model);
  frames(f, 24).forEach(fr => X.frame(fr));
  assert.equal(Y.stateHash(), hY);
  assert.notEqual(X.stateHash(), hY);
});

test('S8 unknown: pulses plus unknown trials equal trials per phase; a rest frame changes no gain', () => {
  const f = fx(), schedule = buildSchedule({ seed: f.seed });
  const r = runTrajectory({ ruleName: RULE, fixture: f, schedule, arm: 'informative' });
  assert.equal(r.certsRejected, 0);
  for (const phase of schedule.phases) {
    const unknown = phase.trials.filter(t => t.unknown).length, p = r.pulses[phase.name];
    assert.equal(p.reward + p.punish + unknown, phase.trials.length, phase.name);
    assert.equal(p.none, unknown, phase.name);
  }
  const X = createRule(RULE, f), img = f.images['A+'].h;
  X.frame({ kcH: img, danP: DAN_REST, danR: DAN_REST, dt: 1 }); // builds a trace on an active image
  const before = X.gains();
  X.frame({ kcH: img, danP: DAN_REST, danR: DAN_REST, dt: 4 });
  X.frame({ kcH: img, danP: DAN_REST, danR: DAN_REST, dt: 1 });
  assert.deepStrictEqual(X.gains(), before);
  X.frame({ kcH: img, danP: 1.5, danR: DAN_REST, dt: 1 }); // control: a pulse on the same state does move gains
  assert.notDeepStrictEqual(X.gains(), before);
});

test('S9 signs: after an informative trajectory only mapped edges changed magnitude', () => {
  let held = null;
  registerRule('capture-prediction-reservoir-v1-1', fixture => (held = makeFrozenRule('capture-prediction-reservoir-v1-1', fixture)));
  const f = fx(), schedule = buildSchedule({ seed: f.seed });
  runTrajectory({ ruleName: 'capture-prediction-reservoir-v1-1', fixture: f, schedule, arm: 'informative' });
  const { memory } = held, { model } = memory, n = f.nKC, mag = model.params.magnitude, fresh = makeCircuit(f).model;
  assert.ok(model.graph.sign.every(s => s === 1));
  assert.deepStrictEqual(model.graph.sign, fresh.graph.sign);
  assert.deepStrictEqual(model.graph.col, fresh.graph.col);
  assert.equal(mag[2 * n], fresh.params.magnitude[2 * n]); // dummy edge is not mapped and never written
  const mapped = new Set(memory.edges);
  for (let e = 0; e < mag.length; e++) if (!mapped.has(e)) assert.equal(mag[e], fresh.params.magnitude[e], `unmapped edge ${e}`);
  assert.ok(memory.gains.some(g => g !== 1)); // non-vacuous: some mapped edge changed
  memory.edges.forEach((e, i) => assert.equal(mag[e], Math.fround(memory.base[i] * memory.gains[i])));
});

test('predictionScale: f in [0, 1] for v in [-5, 5] and any larger size; scaled DAN lies between pulse and rest', () => {
  const values = [...Array.from({ length: 1001 }, (_, i) => -5 + i * 0.01), -1e9, 1e9];
  for (const sigma of [1, -1]) for (const v of values) {
    const f = predictionScale(v, sigma, FROZEN.V0);
    assert.ok(f >= 0 && f <= 1, `f=${f} v=${v} sigma=${sigma}`);
    for (const pulse of [0, 1.5]) {
      const dan = DAN_REST + (pulse - DAN_REST) * f;
      assert.ok(dan >= 0 && dan <= 1.5, `dan=${dan} v=${v}`);
      assert.ok(dan >= Math.min(pulse, DAN_REST) && dan <= Math.max(pulse, DAN_REST), `dan=${dan} pulse=${pulse} v=${v}`);
    }
  }
});

test('DAN values reaching the inner rule stay in [0, 1.5] on pulse frames, for activity of any size', () => {
  const f = fx();
  for (const level of [0, 1e-3, 1, 1e3, 1e9]) for (const [danP, danR] of [[0, 1.5], [1.5, 0]]) {
    const rule = createRule(RULE, f), { model } = rule.memory;
    rule.frame({ kcH: new Float64Array(f.nKC).fill(level), danP, danR, dt: 1 });
    const h = model.h[model.steps];
    for (const x of [h[f.nKC], h[f.nKC + 1]]) assert.ok(x >= 0 && x <= 1.5, `level=${level} dan=${x}`);
  }
});
