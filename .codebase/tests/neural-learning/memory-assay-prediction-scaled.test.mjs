import test from 'node:test';
import assert from 'node:assert/strict';
import { predictionScale, makePredictionRule } from '../../src/neural-learning/memory-assay-rule-prediction-scaled.mjs';
import { makeRule as reservoirRule } from '../../src/neural-learning/memory-assay-rule-local-reservoir.mjs';
import { buildFixture } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { registerRule, DAN_REST } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { runCellSeed } from '../../src/neural-learning/memory-assay-phase-recorded.mjs';
import { auditRecordedEvents } from '../../src/neural-learning/memory-assay-phase-audit.mjs';

const REWARD = [0, 1.5], PUNISH = [1.5, 0]; // [danP, danR] as delivered by the recorded protocol
const fixture = () => buildFixture({ seed: 1001, q: .25, relation: 'conflicting', w: 0, bg: 0 });
// Mirrors the recorded protocol: a rest frame on the chosen activity, then the DAN pulse on the same activity.
const teach = (rule, kcH, [danP, danR]) => {
  rule.frame({ kcH, danP: DAN_REST, danR: DAN_REST, dt: 1 });
  rule.frame({ kcH, danP, danR, dt: 1 });
};

test('predictionScale is 0.5 at zero prediction and follows the signed error', () => {
  assert.equal(predictionScale(0, 1, .8), .5);
  assert.equal(predictionScale(0, -1, .8), .5);
  assert.ok(Math.abs(predictionScale(.64, -1, .8) - .9) < 1e-12); // confident punish
  assert.ok(Math.abs(predictionScale(.64, 1, .8) - .1) < 1e-12); // confident reward
  for (const [v, sigma, want] of [[5, 1, 0], [5, -1, 1], [-5, 1, 1], [-5, -1, 0]]) assert.equal(predictionScale(v, sigma, .8), want);
});

test('V0 at 1e9 halves each DAN deviation, so it matches the reservoir rule at half eta', () => {
  const f = fixture(), kcH = f.images['A+'].h, n = f.nKC;
  const scaled = makePredictionRule('scaled', f, { store: 'reservoir', eta: 1, V0: 1e9 });
  const plain = reservoirRule('plain', f, { eta: .5 });
  teach(scaled, kcH, REWARD);
  teach(plain, kcH, REWARD);
  const a = scaled.gains(), b = plain.gains();
  let worst = 0, moved = 0;
  for (const c of ['P', 'R']) for (let i = 0; i < n; i++) { worst = Math.max(worst, Math.abs(a[c][i] - b[c][i])); moved += b[c][i] !== 1; }
  assert.ok(moved > 0);
  assert.ok(worst <= 1e-6, `max gain difference ${worst}`);
});

test('a rest frame leaves the state identical to the plain reservoir rule at the same eta', () => {
  const f = fixture(), scaled = makePredictionRule('scaled', f, { store: 'reservoir', eta: 2, V0: .8 });
  const plain = reservoirRule('plain', f, { eta: 2 });
  for (const [image, dt] of [['A+', 1], ['B+', 4], ['A-', 1], ['A+', 2]]) {
    for (const rule of [scaled, plain]) rule.frame({ kcH: f.images[image].h, danP: DAN_REST, danR: DAN_REST, dt });
  }
  assert.deepStrictEqual(scaled.snapshot(), plain.snapshot());
  assert.equal(scaled.stateHash(), plain.stateHash());
});

test('a punish pulse after confident reward training moves A+ more than at V0 1e9 from the same state', () => {
  const f = fixture(), kcH = f.images['A+'].h;
  const A = makePredictionRule('A', f, { store: 'reservoir', eta: 2, V0: .8 });
  for (let i = 0; i < 4; i++) teach(A, kcH, REWARD);
  // B starts from A's trained state, so the only difference in the punish pulse is the prediction scale (1e9 gives 0.5 at every v).
  const B = makePredictionRule('B', f, { store: 'reservoir', eta: 2, V0: 1e9 });
  B.restore(structuredClone(A.snapshot()));
  const a0 = A.value(null, kcH), b0 = B.value(null, kcH);
  assert.ok(a0 > 0, 'A+ must be confidently predicted as rewarded before the punish pulse');
  teach(A, kcH, PUNISH);
  teach(B, kcH, PUNISH);
  const dA = A.value(null, kcH) - a0, dB = B.value(null, kcH) - b0;
  assert.ok(dA < 0 && dB < 0, `punish must lower A+ value (dA ${dA}, dB ${dB})`);
  assert.ok(Math.abs(dA) > Math.abs(dB), `confident error ${dA} not larger than control ${dB}`);
});

test('a prediction-scaled rule replays through the recorded audit with no-event controls inert', () => {
  registerRule('prediction-test', fixture => makePredictionRule('prediction-test', fixture, { store: 'reservoir', eta: 2, V0: .8 }));
  const profile = { ruleName: 'prediction-test', seeds: [1001], nKC: 200, s: 20, cell: { q: .25, relation: 'conflicting', w: 0, bg: 0 }, temperature: .1, danDip: 0 };
  const rows = [], records = runCellSeed({ ...profile, seed: 1001, writeRecord: r => rows.push(r) });
  let i = 0;
  const replay = auditRecordedEvents(() => rows[i++] ?? null, profile);
  assert.deepEqual(replay.summaries, records);
  assert.notEqual(records[0].finalGainsHash, records[0].initialGainsHash); // informative arm must actually learn
  assert.ok(records.filter(r => ['absent', 'disabled'].includes(r.arm)).every(r => r.initialGainsHash === r.finalGainsHash));
});
