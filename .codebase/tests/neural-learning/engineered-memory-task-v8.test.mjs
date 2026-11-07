import test from 'node:test';
import assert from 'node:assert/strict';
import { partialFisherYates } from '../../src/neural-learning/engineered-memory-v4-ledger.mjs';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { numericPairGate } from '../../src/neural-learning/transfer-evaluation-v2.mjs';
import { marginFor } from '../../src/neural-learning/engineered-memory-task-v6.mjs';
import { captureLedger, judgeV8, GATE_SEED } from '../../src/neural-learning/engineered-memory-task-v8.mjs';

// Ten eligible captures: a1, a3, b1, c1, c3, c4, e1, e2, e3, e4. Unknown captures a2, c2 and d1 get no slot.
const TABLE = {
  p0: { a1: 'safe', a2: 'unknown', a3: 'unsafe' },
  p1: { b1: 'unsafe' },
  p2: { c1: 'safe', c2: 'unknown', c3: 'safe', c4: 'unsafe' },
  p3: { d1: 'unknown' },
  p4: { e1: 'safe', e2: 'unsafe', e3: 'safe', e4: 'unsafe' },
};
const PRACTICE = ['p0', 'p1', 'p2', 'p3', 'p4'];
const VALUE = { safe: 1, unsafe: -1, unknown: null, quiet: 0 };
const certsOf = table => (id, uci) => {
  const category = table[id]?.[uci];
  return category === undefined ? undefined : { category, value: VALUE[category], certificateSha256: `sha-${id}-${uci}` };
};
const ledgerOf = (table, practice = PRACTICE, seed = 6101) => captureLedger({
  practice, capturesOf: id => Object.keys(table[id]), certificateOf: certsOf(table), seed,
});

test('captureLedger numbers eligible captures 0..L-1 after shuffling, once each, in the v5 key order', () => {
  const ledger = ledgerOf(TABLE);
  assert.deepEqual(ledger.map(s => s.slot), [...Array(10).keys()]);
  assert.deepEqual(Object.keys(ledger[0]), ['slot', 'id', 'uci', 'category', 'value', 'certificateSha256']);
  assert.deepEqual(ledger.map(s => `${s.id}:${s.uci}`).sort(), ['p0:a1', 'p0:a3', 'p1:b1', 'p2:c1', 'p2:c3', 'p2:c4', 'p4:e1', 'p4:e2', 'p4:e3', 'p4:e4']);
  for (const s of ledger) {
    assert.equal(s.value, VALUE[s.category]);
    assert.equal(s.certificateSha256, `sha-${s.id}-${s.uci}`);
  }
});

test('captureLedger order matches an inline recomputation of the shuffle', () => {
  const base = [['p0', 'a1'], ['p0', 'a3'], ['p1', 'b1'], ['p2', 'c1'], ['p2', 'c3'], ['p2', 'c4'], ['p4', 'e1'], ['p4', 'e2'], ['p4', 'e3'], ['p4', 'e4']];
  const seed = 6101;
  const order = partialFisherYates(base.map((_, i) => i), base.length, mulberry32((seed ^ 0x1ed8) >>> 0));
  assert.notDeepEqual(order, base.map((_, i) => i)); // the fixture really is shuffled
  assert.deepEqual(ledgerOf(TABLE, PRACTICE, seed).map(s => [s.id, s.uci]), order.map(i => base[i]));
});

test('captureLedger is deterministic for a seed and changes with the seed', () => {
  assert.deepEqual(ledgerOf(TABLE, PRACTICE, 6101), ledgerOf(TABLE, PRACTICE, 6101));
  const order = seed => ledgerOf(TABLE, PRACTICE, seed).map(s => `${s.id}:${s.uci}`);
  assert.notDeepEqual(order(6101), order(6102));
});

test('captureLedger base order is practice order, then sorted UCI within each position', () => {
  // Practice order is not alphabetical, and capturesOf returns UCIs unsorted.
  const table = { p2: { c2: 'safe', a1: 'unsafe', b3: 'safe' }, p0: { z9: 'safe', x1: 'unsafe' } };
  const capturesOf = id => Object.keys(table[id]).reverse();
  const base = [['p2', 'a1'], ['p2', 'b3'], ['p2', 'c2'], ['p0', 'x1'], ['p0', 'z9']];
  const seed = 6102;
  const order = partialFisherYates(base.map((_, i) => i), base.length, mulberry32((seed ^ 0x1ed8) >>> 0));
  const ledger = captureLedger({ practice: ['p2', 'p0'], capturesOf, certificateOf: certsOf(table), seed });
  assert.deepEqual(ledger.map(s => [s.id, s.uci]), order.map(i => base[i]));
});

test('captureLedger throws on quiet, bad value, missing certificate, repeated practice id or capture, and empty result', () => {
  assert.throws(() => ledgerOf({ p0: { a1: 'quiet' } }, ['p0']), /has category quiet/);
  assert.throws(() => captureLedger({
    practice: ['p0'], capturesOf: () => ['a1'], seed: 6101,
    certificateOf: () => ({ category: 'safe', value: -1, certificateSha256: 'x' }),
  }), /is safe with value -1/);
  assert.throws(() => captureLedger({
    practice: ['p0'], capturesOf: () => ['a1'], certificateOf: () => undefined, seed: 6101,
  }), /no certificate for p0 a1/);
  assert.throws(() => ledgerOf(TABLE, ['p0', 'p0']), /practice ids must be unique/);
  assert.throws(() => captureLedger({
    practice: ['p0'], capturesOf: () => ['a1', 'a1'], certificateOf: certsOf({ p0: { a1: 'safe' } }), seed: 6101,
  }), /repeated capture at p0/);
  assert.throws(() => ledgerOf({ p0: { a2: 'unknown' } }, ['p0']), /no eligible captures/);
  assert.throws(() => ledgerOf(TABLE, []), /no eligible captures/);
});

// 12 positions in 6 games of two. M = marginFor(12) = 1.
const GAMES = ['g0', 'g0', 'g1', 'g1', 'g2', 'g2', 'g3', 'g3', 'g4', 'g4', 'g5', 'g5'];
const N = GAMES.length;
const FULL = [0.9, 0.8, 0.75, 0.7, 0.85, 0.6, 0.95, 0.5, 0.8, 0.7, 0.9, 0.65];
// Every comparator sits below full at every position, so every bootstrap resample has a positive sum.
const NONE = FULL.map((x, i) => x - (0.1 + 0.05 * ((i * 7) % 11) / 10));
const SHUFFLED = FULL.map((x, i) => x - (0.1 + 0.05 * ((i * 5) % 7) / 6));
const QUARTER = FULL.map((x, i) => x - (0.003 + 0.013 * ((i * 3) % 5) / 4));
const ARMS = { full: FULL, none: NONE, shuffled: SHUFFLED, quarter: QUARTER };
const judge = rows => judgeV8(rows, { games: GAMES, n: N, resamples: 500 });
const row = (seed, over = {}) => ({ seed, scores: ARMS, retention: { lost: 0, previouslyRecalled: 10 }, ...over });

test('judgeV8 gate numbers equal numericPairGate with seed 20261108, and the fixture passes', () => {
  const res = judge([row(6101)]);
  const args = { arms: ARMS, games: GAMES, primary: 'full', comparators: ['none', 'shuffled', 'quarter'], minCorrect: 0, minMargin: 0, resamples: 500, lowerQuantile: 0.025 };
  assert.deepEqual(res.perSeed[0].gate, numericPairGate({ ...args, seed: GATE_SEED }));
  assert.equal(GATE_SEED, 20261108);
  assert.notDeepEqual(res.perSeed[0].gate.comparators, numericPairGate({ ...args, seed: 20261107 }).comparators);
  assert.equal(res.rule.gateSeed, 20261108);
  assert.equal(res.rule.margin, marginFor(N));
  assert.equal(res.pass, true);
  assert.equal(res.outcome, 'passes');
});

test('judgeV8 fails a seed whose lost share exceeds 0.02, or that has no recalled probes', () => {
  assert.equal(judge([row(6101, { retention: { lost: 0, previouslyRecalled: 10 } })]).pass, true);
  assert.equal(judge([row(6101, { retention: { lost: 1, previouslyRecalled: 10 } })]).pass, false); // 0.1 > 0.02
  assert.equal(judge([row(6101, { retention: { lost: 0, previouslyRecalled: 0 } })]).pass, false);
});
