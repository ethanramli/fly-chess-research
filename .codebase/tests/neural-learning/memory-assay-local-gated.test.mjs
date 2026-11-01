import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCircuit, registerRule, DAN_REST } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { makeRule, register } from '../../src/neural-learning/memory-assay-rule-local-gated.mjs';
import { buildFixture, buildSchedule } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { runTrajectory, runCellSeed } from '../../src/neural-learning/memory-assay-run.mjs';

register(registerRule);
const RULE = 'local-gated-v1';
const fx = () => buildFixture({ seed: 1001, nKC: 200, s: 20, q: 0.25, relation: 'conflicting', w: 0.5, bg: 0.1 });
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
  const X = makeRule(RULE, f);
  seq.slice(0, 12).forEach(fr => X.frame(fr));
  const Y = makeRule(RULE, f);
  Y.restore(roundTrip(X.snapshot()));
  assert.deepStrictEqual(Y.snapshot(), X.snapshot());
  seq.slice(12).forEach(fr => { X.frame(fr); Y.frame(fr); });
  assert.deepStrictEqual(Y.snapshot(), X.snapshot());
  assert.deepStrictEqual([...Y.memory.model.params.magnitude], [...X.memory.model.params.magnitude]);
  assert.equal(Y.stateHash(), X.stateHash());
  assert.ok(X.gains().P.some(g => g < 1)); // the trajectory moved gains, so the match is not vacuous
});

test('S5 snapshot taken mid-trace restores the trace', () => {
  const f = fx(), img = f.images['A+'].h, X = makeRule(RULE, f), Y = makeRule(RULE, f);
  X.frame({ kcH: img, danP: DAN_REST, danR: DAN_REST, dt: 1 }); // active image, no pulse: trace is high
  assert.ok(X.snapshot().traces.some(t => t > 0));
  Y.restore(roundTrip(X.snapshot()));
  assert.deepStrictEqual(Y.memory.traces, X.memory.traces);
  const pulse = { kcH: img, danP: 1.5, danR: DAN_REST, dt: 1 };
  X.frame(pulse); Y.frame(pulse);
  assert.deepStrictEqual(Y.snapshot(), X.snapshot());
});

test('S5 restore rejects bad snapshots and leaves the state hash unchanged', () => {
  const f = fx(), X = makeRule(RULE, f), Y = makeRule(RULE, f);
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
  ];
  for (const mutate of corrupt) {
    const s = roundTrip(X.snapshot());
    mutate(s); // after the JSON round trip, so NaN survives
    assert.throws(() => Y.restore(s), /Incompatible candidate state/);
    assert.equal(Y.stateHash(), h);
  }
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
  const f = fx(), X = makeRule(RULE, f), Y = makeRule(RULE, f), hY = Y.stateHash();
  const arrays = o => [o.memory.gains, o.memory.traces, o.memory.base, o.memory.model.params.magnitude, o.memory.model.graph.col, o.memory.model.graph.sign, ...o.memory.model.h];
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
  const X = makeRule(RULE, f), img = f.images['A+'].h;
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
  registerRule('capture-local-gated-v1', fixture => (held = makeRule(RULE, fixture))); // keeps the rule that runTrajectory builds
  const f = fx(), schedule = buildSchedule({ seed: f.seed });
  runTrajectory({ ruleName: 'capture-local-gated-v1', fixture: f, schedule, arm: 'informative' });
  const { memory } = held, { model } = memory, n = f.nKC, mag = model.params.magnitude, fresh = makeCircuit(f).model;
  assert.ok(model.graph.sign.every(s => s === 1));
  assert.deepStrictEqual(model.graph.col, fresh.graph.col);
  assert.equal(mag[2 * n], 1); // dummy edge is not mapped and never written
  assert.ok(memory.gains.some(g => g !== 1)); // non-vacuous: some mapped edge changed
  memory.edges.forEach((e, i) => assert.equal(mag[e], Math.fround(memory.base[i] * memory.gains[i])));
});

test('determinism: same fixture and schedule give deep-equal records', () => {
  const f = fx(), schedule = buildSchedule({ seed: f.seed });
  const run = () => runTrajectory({ ruleName: RULE, fixture: f, schedule, arm: 'informative' });
  assert.deepStrictEqual(run(), run());
});

test('inactive protection: q=0 w=0 bg=0, seed 1001, ACQ_BC drift on inactive KCs and A margin', () => {
  const [inf] = runCellSeed({ ruleName: RULE, cell: { q: 0, relation: 'congruent', w: 0, bg: 0 }, seed: 1001 });
  const { P, R } = inf.inactiveDrift.ACQ_BC; // max |change in gain| over KCs with no activity in the whole phase
  console.log(`inactiveDrift ACQ_BC: P=${P} R=${R}`);
  assert.ok(P < 1e-3 && R < 1e-3, `drift P=${P} R=${R}`);
  const m1 = inf.tests.T1.A.m, m2 = inf.tests.T2.A.m;
  assert.ok(Math.abs(m2 - m1) < 1e-3, `A margin T1=${m1} T2=${m2}`);
  assert.ok(Math.abs(inf.R - 1) < 1e-3, `R=${inf.R}`);
});
