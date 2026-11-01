// Software checks for local-slow-v1 on the memory-assay fixture. No acquisition or retention pass mark is asserted here, except the q=0 margin check.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCircuit, registerRule, DAN_REST } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { makeRule, register } from '../../src/neural-learning/memory-assay-rule-local-slow.mjs';
import { buildFixture, buildSchedule } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { runTrajectory, runCellSeed } from '../../src/neural-learning/memory-assay-run.mjs';

register(registerRule);
const RULE = 'local-slow-v1-rho0.25';
const CFG = { rho: 0.25 };
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

test('S5 snapshot: JSON round trip reproduces later frames exactly, slow state included', () => {
  const f = fx(), seq = frames(f, 24);
  const X = makeRule(RULE, f, CFG);
  seq.slice(0, 12).forEach(fr => X.frame(fr));
  const Y = makeRule(RULE, f, CFG);
  Y.restore(roundTrip(X.snapshot()));
  assert.deepStrictEqual(Y.snapshot(), X.snapshot());
  assert.deepStrictEqual(Y.fastSlow(), X.fastSlow());
  seq.slice(12).forEach(fr => { X.frame(fr); Y.frame(fr); });
  assert.deepStrictEqual(Y.snapshot(), X.snapshot());
  assert.deepStrictEqual(Y.fastSlow(), X.fastSlow());
  assert.deepStrictEqual([...Y.memory.model.params.magnitude], [...X.memory.model.params.magnitude]);
  assert.equal(Y.stateHash(), X.stateHash());
  assert.ok(X.fastSlow().slow.some(v => v !== 1)); // the slow state moved, so the match is not vacuous
  assert.ok(X.gains().P.some(g => g < 1));
});

test('S5 snapshot taken mid-trace restores the trace and the slow state', () => {
  const f = fx(), img = f.images['A+'].h, X = makeRule(RULE, f, CFG), Y = makeRule(RULE, f, CFG);
  X.frame({ kcH: img, danP: DAN_REST, danR: DAN_REST, dt: 1 }); // active image, no pulse: trace is high
  assert.ok(X.snapshot().traces.some(t => t > 0));
  Y.restore(roundTrip(X.snapshot()));
  assert.deepStrictEqual(Y.memory.traces, X.memory.traces);
  const pulse = { kcH: img, danP: 1.5, danR: DAN_REST, dt: 1 };
  X.frame(pulse); Y.frame(pulse);
  assert.deepStrictEqual(Y.snapshot(), X.snapshot());
  assert.ok(X.fastSlow().slow.some(v => v !== 1));
});

test('S5 restore rejects bad snapshots and leaves the state hash unchanged', () => {
  const f = fx(), X = makeRule(RULE, f, CFG), Y = makeRule(RULE, f, CFG);
  frames(f, 12).forEach(fr => X.frame(fr));
  Y.restore(roundTrip(X.snapshot()));
  const h = Y.stateHash();
  const corrupt = [
    s => { s.identity = 'other'; },
    s => { s.schema = 'other'; },
    s => { s.slow[0] = 0.1; }, // below minGain 0.2
    s => { s.slow[0] = 1.5; }, // above maxGain 1
    s => { s.slow[0] = NaN; },
    s => { s.slow.pop(); }, // wrong length
    s => { s.gains[0] = 1.5; },
    s => { s.traces[0] = 1.5; },
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

test('S7 isolation: two rules from one fixture share no mutable state, slow included', () => {
  const f = fx(), X = makeRule(RULE, f, CFG), Y = makeRule(RULE, f, CFG), hY = Y.stateHash();
  const arrays = o => [o.memory.gains, o.memory.traces, o.memory.slow, o.memory.base, o.memory.model.params.magnitude, o.memory.model.graph.col, o.memory.model.graph.sign, ...o.memory.model.h];
  for (const a of arrays(X)) for (const b of arrays(Y)) assert.notStrictEqual(a, b);
  assert.notStrictEqual(X.memory.model, Y.memory.model);
  frames(f, 24).forEach(fr => X.frame(fr));
  assert.equal(Y.stateHash(), hY);
  assert.notEqual(X.stateHash(), hY);
});

test('S8 rest frames: neither fast nor slow gain changes on an active image; a pulse on the same state does', () => {
  const f = fx(), X = makeRule(RULE, f, CFG), img = f.images['A+'].h;
  X.frame({ kcH: img, danP: DAN_REST, danR: DAN_REST, dt: 1 }); // builds a trace on an active image
  const before = X.gains(), fsBefore = X.fastSlow();
  X.frame({ kcH: img, danP: DAN_REST, danR: DAN_REST, dt: 4 });
  X.frame({ kcH: img, danP: DAN_REST, danR: DAN_REST, dt: 1 });
  assert.deepStrictEqual(X.fastSlow(), fsBefore);
  assert.deepStrictEqual(X.gains(), before);
  X.frame({ kcH: img, danP: 1.5, danR: DAN_REST, dt: 1 }); // control: a pulse on the same state moves both
  assert.notDeepStrictEqual(X.fastSlow(), fsBefore);
  assert.notDeepStrictEqual(X.gains(), before);
});

test('S9 signs: after an informative trajectory only mapped edges changed; magnitude = fround(base * (fast + slow) / 2)', () => {
  let held = null;
  registerRule('capture-local-slow-v1', fixture => (held = makeRule(RULE, fixture, CFG))); // keeps the rule that runTrajectory builds
  const f = fx(), schedule = buildSchedule({ seed: f.seed });
  runTrajectory({ ruleName: 'capture-local-slow-v1', fixture: f, schedule, arm: 'informative' });
  const { memory } = held, { model } = memory, n = f.nKC, mag = model.params.magnitude, fresh = makeCircuit(f).model;
  assert.ok(model.graph.sign.every(s => s === 1));
  assert.deepStrictEqual(model.graph.col, fresh.graph.col);
  assert.equal(mag[2 * n], 1); // dummy edge is not mapped and never written
  assert.ok(memory.gains.some(g => g !== 1)); // non-vacuous: some fast gain changed
  assert.ok(memory.slow.some(s => s !== 1)); // non-vacuous: some slow state changed
  memory.edges.forEach((e, i) => assert.equal(mag[e], Math.fround(memory.base[i] * ((memory.gains[i] + memory.slow[i]) / 2))));
});

test('determinism: same fixture and schedule give deep-equal records', () => {
  const f = fx(), schedule = buildSchedule({ seed: f.seed });
  const run = () => runTrajectory({ ruleName: RULE, fixture: f, schedule, arm: 'informative' });
  assert.deepStrictEqual(run(), run());
});

test('constructor without rho throws', () => {
  const f = fx();
  assert.throws(() => makeRule(RULE, f, {}), /Invalid slow rate/);
  assert.throws(() => makeRule(RULE, f), /Invalid slow rate/);
});

test('inactive protection: q=0 w=0 bg=0, seed 1001: A margin at T2 equals T1 within 1e-3', () => {
  const [inf] = runCellSeed({ ruleName: RULE, cell: { q: 0, relation: 'congruent', w: 0, bg: 0 }, seed: 1001 });
  const m1 = inf.tests.T1.A.m, m2 = inf.tests.T2.A.m;
  console.log(`q=0 A margin: T1=${m1} T2=${m2} |T2-T1|=${Math.abs(m2 - m1)}`);
  assert.ok(Math.abs(m2 - m1) < 1e-3, `A margin T1=${m1} T2=${m2}`);
});
