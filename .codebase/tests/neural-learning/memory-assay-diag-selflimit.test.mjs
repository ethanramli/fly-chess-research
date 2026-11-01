import test from 'node:test';
import assert from 'node:assert/strict';
import { registerRule, createRule, DAN_REST } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { makeRule } from '../../src/neural-learning/memory-assay-rule-local-gated.mjs';
import { register } from '../../src/neural-learning/memory-assay-rule-diag-selflimit.mjs';
import { buildFixture, buildSchedule } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { runTrajectory } from '../../src/neural-learning/memory-assay-run.mjs';

const DIAG = 'diag-selflimit-local-gated-v1', PLAIN = 'local-gated-v1';
register(registerRule);
const base = buildFixture({ seed: 1001, nKC: 200, s: 20, q: 0, relation: 'congruent', w: 0, bg: 0 });
// Same fixture with baseR = baseP: P and R magnitudes match, so the readout value is exactly 0 at naive gains.
const flat = { ...base, baseR: base.baseP };
const gainsOf = rule => { const g = rule.gains(); return [...g.P, ...g.R]; };
const maxDelta = (a, b) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));
const PRE = kcH => ({ kcH, danP: DAN_REST, danR: DAN_REST, dt: 1 }); // active image, no pulse: builds the trace
const REWARD = kcH => ({ kcH, danP: 0, danR: 1.5, dt: 1 }); // reward pulse: DAN P suppressed, DAN R raised

test('v=0 at naive gains: a reward frame moves gains exactly as local-gated-v1', () => {
  const kcH = flat.images['A+'].h, diag = createRule(DIAG, flat), plain = makeRule(PLAIN, flat);
  for (const r of [diag, plain]) r.frame(PRE(kcH));
  const d0 = gainsOf(diag), p0 = gainsOf(plain);
  diag.frame(REWARD(kcH)); plain.frame(REWARD(kcH));
  const dd = gainsOf(diag).map((g, i) => g - d0[i]), dp = gainsOf(plain).map((g, i) => g - p0[i]);
  assert.ok(dp.some(x => Math.abs(x) > 1e-6), 'the pulse must move plain gains'); // non-vacuous
  assert.ok(maxDelta(dd, dp) < 1e-12, `diag vs plain ${maxDelta(dd, dp)}`);
});

test('reward pulses on one image: per-pulse gain change is smaller once its value is large', () => {
  const kcH = flat.images['A+'].h, rule = createRule(DIAG, flat), changes = [];
  let v = rule.value(null, kcH);
  // 0.5 is "large": under reward-only pulses the value levels off near 0.59, below V0 = 0.64.
  for (let i = 0; v < 0.5 && i < 400; i++) {
    rule.frame(PRE(kcH));
    const before = gainsOf(rule);
    rule.frame(REWARD(kcH));
    changes.push(maxDelta(gainsOf(rule), before));
    v = rule.value(null, kcH);
  }
  assert.ok(v >= 0.5, `value ${v} after ${changes.length} pulses`);
  assert.ok(changes.length > 1, 'the first pulse alone cannot show a change');
  assert.ok(changes.at(-1) < changes[0], `first ${changes[0]} last ${changes.at(-1)}`);
});

test('rest frame: gains unchanged and equal to local-gated-v1', () => {
  const kcH = base.images['A+'].h, diag = createRule(DIAG, base), plain = makeRule(PLAIN, base);
  for (const r of [diag, plain]) r.frame(PRE(kcH));
  assert.notEqual(diag.value(null, kcH), 0); // non-vacuous: the readout is not zero on this fixture
  const before = gainsOf(diag), rest = { kcH, danP: DAN_REST, danR: DAN_REST, dt: 4 };
  diag.frame(rest); plain.frame(rest);
  assert.deepStrictEqual(gainsOf(diag), before);
  assert.deepStrictEqual(gainsOf(diag), gainsOf(plain));
});

test('runTrajectory informative completes and repeats exactly', () => {
  const schedule = buildSchedule({ seed: base.seed });
  const run = () => runTrajectory({ ruleName: DIAG, fixture: base, schedule, arm: 'informative' });
  const r = run();
  assert.equal(r.rule, DIAG);
  assert.equal(r.certsRejected, 0);
  assert.notEqual(r.finalGainsHash, r.initialGainsHash); // non-vacuous: the informative arm learns
  assert.deepStrictEqual(run(), r);
});

test('inactive edges: ACQ_BC drift below 1e-3 (q=0, w=0, bg=0, seed 1001)', () => {
  const r = runTrajectory({ ruleName: DIAG, fixture: base, schedule: buildSchedule({ seed: base.seed }), arm: 'informative' });
  assert.ok(r.inactiveDrift.ACQ_BC, 'no inactive KCs in ACQ_BC, so the check is vacuous');
  const { P, R } = r.inactiveDrift.ACQ_BC; // max |change in gain| over KCs with no activity in the whole phase
  assert.ok(P < 1e-3 && R < 1e-3, `drift P=${P} R=${R}`);
});
