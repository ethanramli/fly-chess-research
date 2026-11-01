import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFixture, buildSchedule, buildConflictSchedule } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { runCellSeed, runConflict } from '../../src/neural-learning/memory-assay-run.mjs';
import { evaluateCell } from '../../src/neural-learning/memory-assay-gates.mjs';

// Validity cell q=0, w=0, bg=0 on one odd and one even seed (odd seeds present X- first).
const CELL = { q: 0, relation: 'congruent', w: 0, bg: 0 };
const ODD = 1001, EVEN = 1002;
const OLD = ['ReversalMemory', 'AlphaLobeMemory'];
const run = (ruleName, seed = ODD, extra = {}) => runCellSeed({ ruleName, cell: CELL, seed, ...extra });

test('same inputs give an identical record', () => {
  assert.deepStrictEqual(run('ReversalMemory', ODD, { captureGains: true }), run('ReversalMemory', ODD, { captureGains: true }));
});

for (const ruleName of OLD) test(`absent arm leaves gains unchanged: ${ruleName}`, () => {
  const [informative, absent] = run(ruleName);
  assert.notEqual(informative.finalGainsHash, informative.initialGainsHash);
  assert.equal(absent.finalGainsHash, absent.initialGainsHash);
});

for (const ruleName of [...OLD, 'SeparateTable']) test(`disabled arm leaves both hashes unchanged: ${ruleName}`, () => {
  const disabled = run(ruleName)[3];
  assert.equal(disabled.finalStateHash, disabled.initialStateHash);
  assert.equal(disabled.finalGainsHash, disabled.initialGainsHash);
});

test('unknown trials produce no pulse', () => {
  const [informative] = run('ReversalMemory');
  for (const phase of buildSchedule({ seed: ODD }).phases) {
    const known = phase.trials.filter(t => !t.unknown).length, p = informative.pulses[phase.name];
    assert.equal(p.reward + p.punish, known, phase.name);
    assert.equal(p.none, phase.trials.length - known, phase.name);
    assert.equal(informative.realized[phase.name].length, known, phase.name);
  }
});

test('no certificate is rejected and every trial is checked', () => {
  for (const r of [...run('ReversalMemory'), ...run('SeparateTable')]) {
    assert.equal(r.certsRejected, 0);
    assert.equal(r.certsChecked, 144);
  }
});

test('shuffled arm: agreement below 1 and per-phase valence counts match the informative run', () => {
  const [informative, , shuffled] = run('ReversalMemory');
  assert.ok(shuffled.agreement < 1);
  assert.equal(typeof shuffled.degenerate, 'boolean');
  for (const [name, list] of Object.entries(informative.realized)) {
    assert.equal(shuffled.pulses[name].reward, list.filter(v => v === 'reward').length, name);
    assert.equal(shuffled.pulses[name].punish, list.filter(v => v === 'punish').length, name);
  }
});

test('SeparateTable acquires A (m > 0 at T1)', () => {
  assert.ok(run('SeparateTable')[0].tests.T1.A.m > 0);
});

test('ReversalMemory: A margin falls from T1 to T2 at q=0', () => {
  const [informative] = run('ReversalMemory');
  assert.ok(informative.tests.T2.A.m < informative.tests.T1.A.m);
});

test('AlphaLobeMemory: no gain rises between tests', () => {
  const [informative] = run('AlphaLobeMemory', ODD, { captureGains: true });
  let prev = { P: Array(200).fill(1), R: Array(200).fill(1) };
  for (const T of ['T1', 'T2', 'T3', 'T4', 'T5']) {
    const cur = informative.capturedGains[T];
    for (const c of ['P', 'R']) cur[c].forEach((g, i) => assert.ok(g <= prev[c][i], `${T} ${c}[${i}]`));
    prev = cur;
  }
});

// Hand-made records: four arms per seed, with only the fields evaluateCell reads that matter here.
const SEEDS10 = Array.from({ length: 10 }, (_, i) => 1001 + i);
const TESTS = ['T1', 'T2', 'T3', 'T4', 'T5'];
function armsFor(seed, o = {}) {
  const item = (mNorm, greedy) => ({ good: '', bad: '', vGood: 0, vBad: 0, m: mNorm, mNorm, greedy });
  const tests = Object.fromEntries(TESTS.map(T => [T, { A: item(0.5, true), B: item(0.5, true), C: item(0.5, true) }]));
  tests.T1.A = item(o.mNormA1 ?? 0.5, o.greedyA1 ?? true);
  tests.T2.A = item(0.5, o.greedyA2 ?? true);
  const floorOcc = Object.fromEntries(TESTS.map(T => [T, { P: 0, R: 0 }]));
  const R = 'R' in o ? o.R : 0.8;
  const base = { rule: 'Hand', q: 0, relation: 'congruent', w: 0, bg: 0, seed, tests, floorOcc, initialGainsHash: 'g', finalGainsHash: 'g', initialStateHash: 'h', finalStateHash: 'h' };
  return ['informative', 'absent', 'shuffled', 'disabled'].map(arm => ({ ...base, arm, R: arm === 'informative' ? R : null, degenerate: arm === 'shuffled' ? false : null }));
}
const grid = opt => SEEDS10.flatMap((seed, i) => armsFor(seed, opt(i)));

test('evaluateCell: G1 at the boundaries (median mNorm 0.40, greedy in 90% of seeds)', () => {
  const g1 = records => evaluateCell(records).gates.G1.pass;
  assert.equal(g1(grid(() => ({ mNormA1: 0.40 }))), true);
  assert.equal(g1(grid(() => ({ mNormA1: 0.39 }))), false);
  assert.equal(g1(grid(i => ({ greedyA1: i < 9 }))), true);
  assert.equal(g1(grid(i => ({ greedyA1: i < 8 }))), false);
});

test('evaluateCell: G3 at the boundaries, and a null R fails', () => {
  const g3 = records => evaluateCell(records).gates.G3.pass;
  assert.equal(g3(grid(() => ({ R: 0.70 }))), true);
  assert.equal(g3(grid(() => ({ R: 0.69 }))), false);
  assert.equal(g3(grid(() => ({ R: null }))), false);
});

for (const ruleName of [...OLD, 'SeparateTable']) for (const seed of [ODD, EVEN]) {
  test(`runConflict accuracy is 0.5: ${ruleName}, seed ${seed}`, () => {
    const fixture = buildFixture({ seed, nKC: 200, s: 20, ...CELL });
    assert.equal(runConflict({ ruleName, fixture, schedule: buildConflictSchedule({ seed }) }).accuracy, 0.5);
  });
}
