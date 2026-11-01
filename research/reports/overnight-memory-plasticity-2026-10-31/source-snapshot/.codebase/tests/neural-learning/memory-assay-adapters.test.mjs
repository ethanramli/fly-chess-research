import test from 'node:test';
import assert from 'node:assert/strict';
import { createRule, makeCircuit, registerRule, DAN_REST } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { ReversalMemory } from '../../src/neural-learning/reversal-memory.mjs';
import { AlphaLobeMemory } from '../../src/neural-learning/alpha-lobe-memory.mjs';

// Hand-built fixture (nKC=6, s=2); deliberately not the fixture module.
const IDS = ['A+', 'A-', 'B+', 'B-', 'C+', 'C-', 'E+', 'E-'];
function fixture() {
  const h = Float64Array.from([1.5, 0, 0.75, 0, 0, 0]);
  return {
    id: 'hand-1', seed: 1, nKC: 6, s: 2, q: 0, relation: 'congruent', w: 0, bg: 0,
    baseP: Float64Array.from([1, 1.2, 1, 1, 1, 1]), baseR: Float64Array.from([0.5, 1, 0.9, 1, 1, 1]),
    images: Object.fromEntries(IDS.map(id => [id, { id, focal: Int32Array.of(0, 2), h: h.slice() }])),
    flip: false,
    actual: { qFocal: 0, wFocal: { A: 0, B: 0, C: 0 }, cosineSrcPlus: 0, cosineSrcMinus: 0, bcFocalOverlap: 0, acFocalOverlap: 0 },
  };
}
const act = i => Float64Array.from({ length: 6 }, (_, k) => (k === i ? 1.5 : 0));
const pulse = (rule, kcH, danP = 1.5, danR = DAN_REST) => rule.frame({ kcH, danP, danR, dt: 1 });

test('ReversalMemory: P pulse depresses active KC 0 to 0.75; inactive pulse recovers it to 0.8125', () => {
  const rule = createRule('ReversalMemory', fixture());
  pulse(rule, act(0));
  const g = rule.gains();
  assert.equal(g.P[0], 0.75); // 1 + 0.5 * (-0.5) * (1 + 1 - 1)
  assert.equal(g.P[1], 1); // inactive KC stays 1
  assert.ok(g.R.every(v => v === 1));
  pulse(rule, act(1));
  assert.equal(rule.gains().P[0], 0.8125); // 0.75 + 0.25 * (1 - 0.75)
});

test('AlphaLobeMemory: same first pulse; inactive pulse does not recover', () => {
  const rule = createRule('AlphaLobeMemory', fixture());
  pulse(rule, act(0));
  assert.equal(rule.gains().P[0], 0.75);
  pulse(rule, act(1));
  assert.equal(rule.gains().P[0], 0.75);
});

test('repeated active pulses fall to the 0.2 floor and never rise', () => {
  const run = name => {
    const rule = createRule(name, fixture()), seen = [];
    for (let i = 0; i < 7; i++) { pulse(rule, act(0)); seen.push(rule.gains().P[0]); }
    return seen;
  };
  assert.deepEqual(run('ReversalMemory'), [0.75, 0.5625, 0.421875, 0.31640625, 0.2373046875, 0.2, 0.2]);
  assert.deepEqual(run('AlphaLobeMemory'), [0.75, 0.5, 0.25, 0.2, 0.2, 0.2, 0.2]);
});

test('DAN below rest changes no gain or value for either old rule', () => {
  const allActive = Float64Array.from({ length: 6 }, () => 1.5);
  for (const name of ['ReversalMemory', 'AlphaLobeMemory']) {
    const rule = createRule(name, fixture());
    pulse(rule, act(0));
    const gains = rule.gains(), value = rule.value('A+', allActive);
    rule.frame({ kcH: allActive, danP: 0.5, danR: 0.5, dt: 1 });
    assert.deepEqual(rule.gains(), gains);
    assert.equal(rule.value('A+', allActive), value);
  }
});

test('value is (1/s) sum (kcH/1.5)(P - R) and follows the real magnitudes', () => {
  const rule = createRule('ReversalMemory', fixture());
  const kcH = Float64Array.from([1.5, 0, 0.75, 0, 0, 0]);
  // (1 * (1 - 0.5) + 0.5 * (1 - 0.9)) / 2
  assert.ok(Math.abs(rule.value('A+', kcH) - 0.275) < 1e-6);
  pulse(rule, act(0)); // P0 becomes 0.75
  // (1 * (0.75 - 0.5) + 0.5 * 0.1) / 2
  assert.ok(Math.abs(rule.value('A+', kcH) - 0.15) < 1e-6);
});

test('SeparateTable: noteEvent moves the image value by 0.25 (r - v); frame is a no-op; value keyed by image', () => {
  const rule = createRule('SeparateTable', fixture());
  const kcA = act(0), kcB = act(3);
  assert.equal(rule.value('A+', kcA), 0);
  rule.noteEvent('A+', 'reward');
  assert.ok(Math.abs(rule.value('A+', kcA) - 0.2) < 1e-12);
  rule.noteEvent('B+', 'punish');
  assert.ok(Math.abs(rule.value('B+', kcA) + 0.2) < 1e-12);
  const h0 = rule.stateHash();
  rule.frame({ kcH: kcB, danP: 1.5, danR: DAN_REST, dt: 1 });
  assert.equal(rule.stateHash(), h0);
  assert.equal(rule.value('A+', kcB), rule.value('A+', kcA));
  assert.ok(rule.gains().P.every(v => v === 1) && rule.gains().R.every(v => v === 1));
});

test('stateHash: moves on a real update, returns on restore; a rest frame moves only the event count', () => {
  for (const name of ['ReversalMemory', 'AlphaLobeMemory']) {
    const rule = createRule(name, fixture()), h0 = rule.stateHash(), s0 = rule.snapshot();
    pulse(rule, act(0));
    assert.notEqual(rule.stateHash(), h0);
    rule.restore(s0);
    assert.equal(rule.stateHash(), h0);
    // A rest frame leaves gains unchanged; observe() still counts an event, so the hash moves.
    pulse(rule, act(0), DAN_REST, DAN_REST);
    const s1 = rule.snapshot(), h2 = rule.stateHash();
    assert.deepEqual(s1.gains, s0.gains);
    assert.equal(s1.events, s0.events + 1);
    assert.notEqual(h2, h0);
    rule.restore({ ...s0, events: s1.events });
    assert.equal(rule.stateHash(), h2);
  }
  const t = createRule('SeparateTable', fixture()), ts0 = t.snapshot(), th0 = t.stateHash();
  t.noteEvent('A+', 'punish');
  assert.notEqual(t.stateHash(), th0);
  t.restore(ts0);
  assert.equal(t.stateHash(), th0);
});

test('rules built from one fixture share no mutable state', () => {
  const fx = fixture(), a = createRule('ReversalMemory', fx), b = createRule('ReversalMemory', fx), hb = b.stateHash();
  pulse(a, act(0));
  assert.equal(a.gains().P[0], 0.75);
  assert.equal(b.gains().P[0], 1);
  assert.equal(b.stateHash(), hb);
  assert.deepEqual(fx.baseP, fixture().baseP);
  assert.deepEqual(fx.baseR, fixture().baseR);
});

test('graph signs stay +1 and base magnitudes stay in the fixture', () => {
  const fx = fixture();
  for (const [Memory, key] of [[ReversalMemory, 'mapReversal'], [AlphaLobeMemory, 'mapAlpha']]) {
    const c = makeCircuit(fx), { model, rest, n } = c, h = model.h[model.steps];
    assert.deepEqual(model.params.magnitude.slice(0, n), Float32Array.from(fx.baseP));
    assert.equal(model.graph.col[2 * n], n + 4);
    assert.throws(() => model.setMagnitude(0, 0), /Invalid magnitude/);
    const memory = new Memory(model, c[key]);
    for (const kc of [0, 0, 1]) {
      h.fill(0); h.set(act(kc)); h[n] = 1.5; h[n + 1] = DAN_REST;
      memory.observe(rest, 1);
    }
    assert.ok(model.graph.sign.every(s => s === 1));
  }
  assert.deepEqual(fx.baseP, fixture().baseP);
  assert.deepEqual(fx.baseR, fixture().baseR);
});

test('registerRule adds a factory; createRule rejects unknown names and duplicates', () => {
  registerRule('Candidate', fx => ({ ...createRule('SeparateTable', fx), name: 'Candidate' }));
  assert.equal(createRule('Candidate', fixture()).name, 'Candidate');
  assert.throws(() => registerRule('ReversalMemory', () => ({})), /duplicate/);
  assert.throws(() => createRule('NoSuchRule', fixture()), /Unknown rule/);
});
