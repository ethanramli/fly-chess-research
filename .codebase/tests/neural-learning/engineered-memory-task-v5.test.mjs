import test from 'node:test';
import assert from 'node:assert/strict';
import { NearestEpisodeMemory } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';
import {
  transformFor, calibrationKeys, fitPipeline, buildStore, retention, scorePositions, selectKey, judgeV5,
} from '../../src/neural-learning/engineered-memory-task-v5.mjs';

test('K1 copies the row; K2 keeps the positive residuals in the v4 sparse form; unknown key throws', () => {
  const row = Float32Array.of(3, -1, 2, 0);
  const blank = Float32Array.of(1, 0, 0, 0);
  const deps = { row: () => row, blank: () => blank, legalOf: () => [] };
  assert.deepEqual(Array.from(transformFor('K1', deps)('p', 'a')), [3, -1, 2, 0]);
  // residuals row - blank = [2, -1, 2, 0]; keep positives only = [2, 0, 2, 0]
  assert.deepEqual(Array.from(transformFor('K2', deps)('p', 'a')), [2, 0, 2, 0]);
  assert.throws(() => transformFor('K9', deps), /Unknown key/);
});

test('K3 subtracts the position mean of all legal rows and caches that mean per position', () => {
  const rows = new Map([
    ['p:1|a2a3', Float32Array.of(1, 4, 0, -2)],
    ['p:1|b2b3', Float32Array.of(3, 0, 0, 2)],
    ['p:1|c2c3', Float32Array.of(2, 8, 3, 2)],
  ]);
  let reads = 0;
  let legalCalls = 0;
  const transform = transformFor('K3', {
    row: key => { reads++; return rows.get(key); },
    blank: () => Float32Array.of(0, 0, 0, 0),
    legalOf: () => { legalCalls++; return ['a2a3', 'b2b3', 'c2c3']; },
  });
  const r = [rows.get('p:1|a2a3'), rows.get('p:1|b2b3'), rows.get('p:1|c2c3')];
  const mean = [0, 1, 2, 3].map(i => (r[0][i] + r[1][i] + r[2][i]) / 3);
  const expectedA = Array.from(r[0], (x, i) => x - mean[i]);

  const first = transform('p:1', 'a2a3');
  assert.ok(first instanceof Float64Array);
  assert.deepEqual(Array.from(first), expectedA);
  assert.equal(reads, 4); // three legal rows for the mean, one target row

  transform('p:1', 'b2b3');
  assert.equal(reads, 5); // mean cached: only the target row is read
  assert.equal(legalCalls, 1);
});

test('calibrationKeys uses floor(n/4) positions and each first sorted legal move', () => {
  const legalOf = () => ['b2b3', 'a2a3'];
  const ids = n => Array.from({ length: n }, (_, i) => `g${i}:1`);
  assert.equal(calibrationKeys(ids(750), legalOf).length, 187);
  assert.deepEqual(calibrationKeys(ids(7), legalOf), ['g0:1|a2a3']);
});

test('fitPipeline scales by calibration RMS and masks coordinates that are zero in every calibration vector', () => {
  const transform = (id) => (id === 'p' ? Float64Array.of(1, 1) : Float64Array.of(id === 'c1' ? 2 : 4, 0));
  const pipe = fitPipeline(transform, ['c1|m', 'c2|m']);
  assert.equal(pipe.zeroRmsFeatures, 1);
  assert.deepEqual(pipe.calibrationKeys, ['c1|m', 'c2|m']);
  assert.match(pipe.rmsSha256, /^[0-9a-f]{64}$/);
  const v = pipe.apply('p', 'x');
  assert.equal(v[1], 0); // masked, not 1 / 1e-6
  assert.ok(Math.abs(v[0] - 1 / (Math.sqrt(10) + 1e-6)) < 1e-12); // rms of [2, 4] is sqrt(10)
});

test('buildStore counts replacements, identical consistent and conflicting writes, unknowns and evictions', () => {
  const apply = () => Float64Array.of(1, 0);
  const slots = ['a', 'b', 'c', 'd'].map((uci, slot) => ({ slot, id: 'p', uci, value: [1, null, 1, -1][slot] }));
  const { memory, counts } = buildStore({ slots, values: [1, null, 1, -1], apply, arm: 'test' });
  assert.deepEqual(counts, {
    writes: 3, unknown: 1, replacements: 2, evictions: 0, identicalConsistent: 1, identicalConflicting: 1,
  });
  assert.equal(memory.size, 1);
  assert.equal(memory.entries[0].value, -1);

  const distinct = ['a', 'b', 'c'].map((uci, slot) => ({ slot, id: 'p', uci, value: 1 }));
  const small = buildStore({
    slots: distinct, values: [1, 1, 1], apply: (id, uci) => Float64Array.of(uci.charCodeAt(0)), capacity: 2, arm: 'test',
  });
  assert.deepEqual(small.counts, {
    writes: 3, unknown: 0, replacements: 0, evictions: 1, identicalConsistent: 0, identicalConflicting: 0,
  });
  assert.equal(small.memory.size, 2);
});

test('retention marks a conflicting overwrite of the same key as lost; empty memory recalls nothing', () => {
  const apply = () => Float64Array.of(1, 0);
  const quarter = buildStore({
    slots: [{ slot: 0, id: 'p', uci: 'a', value: 1 }], values: [1], apply, arm: 'quarter',
  }).memory;
  const full = buildStore({
    slots: [{ slot: 0, id: 'p', uci: 'a', value: 1 }, { slot: 1, id: 'p', uci: 'b', value: -1 }],
    values: [1, -1], apply, arm: 'full',
  }).memory;
  const probes = [{ vector: Float64Array.of(1, 0), value: 1 }];
  assert.deepEqual(retention(quarter, probes), [true]);
  assert.deepEqual(retention(full, probes), [false]);
  assert.deepEqual(retention(new NearestEpisodeMemory(), probes), [false]);
});

test('scorePositions with no memory ties every legal move and returns safe over legal', () => {
  const positions = [{ id: 'p1', moves: ['g1f3', 'e2e4', 'd2d4'] }];
  const safe = (id, u) => (u === 'e2e4' || u === 'd2d4' ? 'safe' : 'unsafe');
  assert.deepEqual(
    scorePositions(null, positions, () => Float64Array.of(0), safe),
    [{ id: 'p1', c: 3, s: 2, expected: 2 / 3 }],
  );
});

test('scorePositions with memory keeps only the top-scored moves', () => {
  const positions = [{ id: 'p1', moves: ['g1f3', 'e2e4', 'd2d4'] }];
  const safe = (id, u) => (u === 'e2e4' || u === 'd2d4' ? 'safe' : 'unsafe');
  const apply = (id, u) => Float64Array.of(u === 'd2d4' ? 1 : 0, u === 'e2e4' ? 1 : 0);
  const { memory } = buildStore({
    slots: [{ slot: 0, id: 'p1', uci: 'd2d4', value: 1 }, { slot: 1, id: 'p1', uci: 'e2e4', value: -1 }],
    values: [1, -1], apply, arm: 'test',
  });
  // d2d4 scores +1, e2e4 -1, g1f3 scores 0 (equidistant from both)
  assert.deepEqual(scorePositions(memory, positions, apply, safe), [{ id: 'p1', c: 1, s: 1, expected: 1 }]);
});

test('selectKey picks the largest positive margin, lower K on ties, and null when no margin is positive', () => {
  const cell = (store, shuffled) => ({ store, shuffled });
  const tie = {
    K1: { AB: cell(10, 8), BA: cell(5, 4) },
    K2: { AB: cell(9, 7), BA: cell(6, 5) },
    K3: { AB: cell(3, 3), BA: cell(0, 0) },
  };
  assert.deepEqual(selectKey(tie), { margins: { K1: 3, K2: 3, K3: 0 }, selected: 'K1' });

  const top = {
    K1: { AB: cell(1, 1), BA: cell(0, 0) },
    K2: { AB: cell(0, 0), BA: cell(0, 0) },
    K3: { AB: cell(4, 1), BA: cell(0, 0) },
  };
  assert.equal(selectKey(top).selected, 'K3');

  const none = {
    K1: { AB: cell(1, 2), BA: cell(0, 0) },
    K2: { AB: cell(0, 0), BA: cell(0, 0) },
    K3: { AB: cell(2, 2), BA: cell(0, 1) },
  };
  assert.deepEqual(selectKey(none), { margins: { K1: -1, K2: 0, K3: -1 }, selected: null });
});

// 40 games, one position each. Full scores 36 in total; none 10, shuffled 20, quarter 30.
const GAMES = Array.from({ length: 40 }, (_, i) => `g${i}`);
const fill = x => Array(40).fill(x);
const FULL = Array.from({ length: 40 }, (_, i) => (i % 5 === 0 ? 0.5 : 1));
const seedRow = (seed, over = {}) => ({
  seed,
  scores: { full: FULL, none: fill(0.25), shuffled: fill(0.5), quarter: fill(0.75) },
  retention: { lost: 2, previouslyRecalled: 200 },
  ...over,
});
const judge = rows => judgeV5(rows, { games: GAMES, resamples: 500 });

test('judgeV5 passes a clear result on every seed with fixed comparator order and exact margins', () => {
  const res = judge([seedRow(6101), seedRow(6102)]);
  assert.equal(res.pass, true);
  assert.equal(res.outcome, 'passes');
  assert.deepEqual(Object.keys(res.perSeed[0].gate.comparators), ['none', 'shuffled', 'quarter']);
  const { none, shuffled, quarter } = res.perSeed[0].gate.comparators;
  assert.deepEqual([none.margin, shuffled.margin, quarter.margin], [26, 16, 6]);
});

test('judgeV5 fails when the quarter margin is exactly 0', () => {
  const res = judge([seedRow(6101, { scores: { full: FULL, none: fill(0.25), shuffled: fill(0.5), quarter: FULL } })]);
  assert.equal(res.perSeed[0].pass, false);
  assert.equal(res.outcome, 'does not pass');
});

test('judgeV5 fails when lost / previouslyRecalled is 0.03', () => {
  const res = judge([seedRow(6101, { retention: { lost: 3, previouslyRecalled: 100 } })]);
  assert.equal(res.pass, false);
});

test('judgeV5 fails when no probe was recalled in the quarter store', () => {
  const res = judge([seedRow(6101, { retention: { lost: 0, previouslyRecalled: 0 } })]);
  assert.equal(res.pass, false);
});

test('judgeV5 refuses an empty seed list, which would otherwise pass vacuously', () => {
  assert.throws(() => judge([]), /needs seeds/);
});
