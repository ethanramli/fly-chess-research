import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCapacityFixture, runCapacityArm, runCapacitySeed, evaluateCapacity } from '../../src/neural-learning/capacity-delay-assay.mjs';
import { createRule, registerRule } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { register } from '../../src/neural-learning/memory-assay-rule-prediction-reservoir.mjs';

register(registerRule);
const RULE = 'prediction-reservoir-v1', SEED = 3001, ITEMS = 3;
const fixture = () => buildCapacityFixture({ seed: SEED, items: ITEMS });
const run = (arm, extra = {}) => runCapacityArm({ ruleName: RULE, fixture: fixture(), seed: SEED, arm, ...extra });

test('same seed gives an identical record', () => {
  assert.deepStrictEqual(run('informative'), run('informative'));
});

test('pair focal sets are disjoint, 20 cells each, with h in range on focal cells only', () => {
  const f = fixture();
  for (let i = 0; i < ITEMS; i++) {
    const plus = f.images[`X${i}+`], minus = f.images[`X${i}-`];
    assert.equal(plus.focal.length, 20);
    assert.equal(minus.focal.length, 20);
    assert.equal(new Set([...plus.focal, ...minus.focal]).size, 40);
    assert.equal(plus.h.filter(x => x !== 0).length, 20);
    for (const k of plus.focal) assert.ok(plus.h[k] >= 0.9 && plus.h[k] <= 1.5);
  }
});

test('every eighth trial is unknown and sends no pulse', () => {
  const rec = run('informative');
  for (let b = 0; b <= ITEMS; b++) {
    const name = b < ITEMS ? `B${b + 1}` : 'REV';
    const unknownInBlock = Array.from({ length: 24 }, (_, k) => 24 * b + k).filter(g => (g + 1) % 8 === 0).length;
    assert.equal(rec.pulses[name].none, unknownInBlock, name);
  }
});

test('value reads leave rule state unchanged', () => {
  const f = fixture(), rule = createRule(RULE, f);
  for (const id of Object.keys(f.images)) rule.frame({ kcH: f.images[id].h, danP: 0, danR: 1.5, dt: 1 });
  const before = JSON.stringify(rule.snapshot());
  for (const id of Object.keys(f.images)) rule.value(id, f.images[id].h);
  assert.equal(JSON.stringify(rule.snapshot()), before);
});

test('disabled sends no pulses and leaves the state hash unchanged', () => {
  const rec = run('disabled');
  assert.equal(rec.initialStateHash, rec.finalStateHash);
  assert.ok(Object.values(rec.pulses).every(c => c.reward === 0 && c.punish === 0));
});

test('absent with noise off leaves gains unchanged (no DAN pulse, no delay noise)', () => {
  const rec = run('absent', { noise: false });
  assert.equal(rec.finalGainsHash, rec.initialGainsHash);
});

test('delay noise changes nothing before the delay stage', () => {
  const on = run('informative'), off = run('informative', { noise: false });
  for (let i = 1; i <= ITEMS; i++) assert.deepStrictEqual(on.tests[`T${i}`], off.tests[`T${i}`]);
  assert.equal(on.gainsT16Hash, off.gainsT16Hash);
  for (let b = 1; b <= ITEMS; b++) assert.deepStrictEqual(on.pulses[`B${b}`], off.pulses[`B${b}`]);
});

test('item 0 has its good image flipped in the reversal test only', () => {
  const rec = run('informative');
  assert.equal(rec.tests.D6400[0].good, 'X0+');
  assert.equal(rec.tests.Rev[0].good, 'X0-');
  assert.equal(rec.tests.Rev[1].good, 'X1+');
});

test('runCapacitySeed returns the four arms only when controls are requested', () => {
  assert.deepEqual(runCapacitySeed({ ruleName: RULE, seed: SEED, withControls: true, items: ITEMS }).map(r => r.arm), ['informative', 'absent', 'shuffled', 'disabled']);
  assert.deepEqual(runCapacitySeed({ ruleName: RULE, seed: SEED, withControls: false, items: ITEMS }).map(r => r.arm), ['informative']);
});

// Hand-made records: 10 seeds, 16 items, every mark met with margin to spare.
const setM = (rec, t, j, m) => { (rec.tests[t] ??= {})[j] = { margin: 1.6 * m, mNorm: m, greedy: m > 0 }; };
const each = (rs, arm, fn) => rs.filter(r => r.arm === arm).forEach(fn);
function handRecords() {
  const out = [];
  for (let seed = 1; seed <= 10; seed++) for (const arm of ['informative', 'absent', 'shuffled', 'disabled']) {
    const rec = { rule: 'hand', arm, seed, items: 16, tests: {}, initialGainsHash: `g${seed}`, gainsT16Hash: `g${seed}` };
    for (let i = 1; i <= 16; i++) for (let j = 0; j < i; j++) setM(rec, `T${i}`, j, 0.8);
    for (const t of ['D0', 'D400', 'D1600', 'D6400', 'Rev']) for (let j = 0; j < 16; j++) setM(rec, t, j, 0.8);
    if (arm === 'shuffled') for (let j = 0; j < 16; j++) setM(rec, 'T16', j, -0.2);
    out.push(rec);
  }
  return out;
}

test('evaluateCapacity passes hand-made records that meet every mark', () => {
  const c = evaluateCapacity(handRecords());
  for (const k of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']) assert.equal(c[k].pass, true, k);
});

const VIOLATIONS = {
  C1margin: rs => each(rs, 'informative', r => setM(r, 'T1', 0, 0.3)),
  C1greedy: rs => each(rs, 'informative', r => { if (r.seed <= 2) setM(r, 'T1', 0, -0.3); }),
  C2: rs => each(rs, 'informative', r => { if (r.seed <= 6) setM(r, 'T16', 0, -0.2); }),
  C3: rs => each(rs, 'informative', r => { for (let j = 0; j < 8; j++) setM(r, 'T16', j, 0.2); }),
  C4share: rs => each(rs, 'informative', r => { setM(r, 'D6400', 14, -0.2); setM(r, 'D6400', 15, -0.2); }),
  C4ratio: rs => each(rs, 'informative', r => { for (let j = 0; j < 16; j++) setM(r, 'D6400', j, 0.4); }),
  C5: rs => each(rs, 'informative', r => setM(r, 'Rev', 0, 0.3)),
  C6: rs => each(rs, 'informative', r => { for (let j = 1; j < 16; j++) setM(r, 'Rev', j, 0.6); }),
  C7absent: rs => each(rs, 'absent', r => { if (r.seed === 1) r.gainsT16Hash = 'changed'; }),
  C7share: rs => each(rs, 'shuffled', r => { for (let j = 0; j < 13; j++) setM(r, 'T16', j, 0.8); }),
  C7gap: rs => {
    each(rs, 'shuffled', r => { for (let j = 0; j < 11; j++) setM(r, 'T16', j, 0.8); });
    each(rs, 'informative', r => { setM(r, 'T16', 14, -0.2); setM(r, 'T16', 15, -0.2); });
  },
};

for (const [name, violate] of Object.entries(VIOLATIONS)) {
  test(`evaluateCapacity fails ${name} when that mark is violated`, () => {
    const rs = handRecords();
    violate(rs);
    assert.equal(evaluateCapacity(rs)[name.slice(0, 2)].pass, false);
  });
}
