import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  V4_ARMS, centred, sparse, sparseDensity, runArmV4, judgeV4,
} from '../../src/neural-learning/engineered-memory-task-v4.mjs';

const sha256 = text => createHash('sha256').update(text).digest('hex');

// Synthetic 6-dim features. Equal (id, uci) keys give equal vectors; different keys differ.
const feat = (id, uci) => {
  const h = sha256(`${id}|${uci}`);
  return Float64Array.from({ length: 6 }, (_, j) => parseInt(h.slice(2 * j, 2 * j + 2), 16) / 255);
};

// Known values in order: 1, -1, 1, -1. Slot 2 is unknown.
const LEDGER = [
  { slot: 0, id: 'a', uci: 'x', value: 1 },
  { slot: 1, id: 'b', uci: 'x', value: -1 },
  { slot: 2, id: 'c', uci: 'x', value: null },
  { slot: 3, id: 'd', uci: 'x', value: 1 },
  { slot: 4, id: 'e', uci: 'x', value: -1 },
];
// Same +1/-1 counts as the known values, every known position changed.
const PERM = [-1, 1, -1, 1];

const run = (arm, extra = {}) => runArmV4({
  arm, ledger: LEDGER, permutedValues: PERM, test: [], featureOf: feat,
  categoryOf: () => 'unknown', capacity: 2048, ...extra,
});

const writesOf = (arm, extra = {}) => {
  const log = [];
  const r = run(arm, { ...extra, log: e => { if (e.kind === 'write') log.push(e); } });
  return { r, log };
};

test('none arm: expected success is safe moves over legal moves, exactly', () => {
  const cat = {
    'p1|a1a2': 'safe', 'p1|b1b2': 'unsafe', 'p1|c1c2': 'quiet', 'p1|d1d2': 'safe',
    'p2|e1e2': 'unknown', 'p2|f1f2': 'unsafe',
  };
  const positions = [
    { id: 'p1', moves: ['d1d2', 'c1c2', 'a1a2', 'b1b2'] },
    { id: 'p2', moves: ['f1f2', 'e1e2'] },
  ];
  const r = run('none', { test: positions, categoryOf: (id, uci) => cat[`${id}|${uci}`] });
  assert.deepEqual(r.test, [2 / 4, 0 / 2]);
  assert.equal(r.ties, 2);
  assert.equal(r.writes, 0);
  assert.equal(r.stored, 0);
});

test('tie scoring: 3 tied moves with 1 safe score 1/3', () => {
  const cat = { a2a3: 'safe', b2b3: 'unsafe', c2c3: 'quiet' };
  const r = runArmV4({
    arm: 'random',
    ledger: [{ slot: 0, id: 'z', uci: 'x', value: null }], // empty store: every move scores 0
    permutedValues: [],
    test: [{ id: 'p1', moves: ['c2c3', 'a2a3', 'b2b3'] }],
    featureOf: feat,
    categoryOf: (id, uci) => cat[uci],
    capacity: 2048,
  });
  assert.equal(r.test[0], 1 / 3);
  assert.equal(r.ties, 1);
});

test('matched arms write the same slots in the same order; mismatched arms write the permuted values', () => {
  for (const [real, control] of [['graph', 'graph-mismatched'], ['graph-sparse', 'graph-sparse-mismatched']]) {
    const a = writesOf(real);
    const b = writesOf(control);
    assert.equal(b.r.writes, a.r.writes);
    assert.equal(a.r.writes, 4);
    assert.deepEqual(b.log.map(({ slot, id, uci }) => [slot, id, uci]), a.log.map(({ slot, id, uci }) => [slot, id, uci]));
    assert.deepEqual(a.log.map(w => w.value), [1, -1, 1, -1]);
    assert.deepEqual(b.log.map(w => w.value), PERM);
    for (const w of b.log) {
      assert.equal(w.evidenceHash, sha256(JSON.stringify({ arm: control, slot: w.slot, id: w.id, uci: w.uci, value: w.value })));
    }
  }
});

test('mismatched arm rejects permutations with the wrong length or different outcome counts', () => {
  for (const bad of [PERM.slice(1), [...PERM, 1], [1, 1, 1, -1]]) {
    assert.throws(() => run('graph-mismatched', { permutedValues: bad }), /permuted values/);
  }
});

test('unknown slots write nothing in every arm; unknown arm throws', () => {
  for (const arm of V4_ARMS) {
    const written = [];
    const r = run(arm, { log: e => { if (e.kind === 'write') written.push(e.slot); } });
    assert.equal(r.unknown, 1, arm);
    assert.ok(!written.includes(2), arm);
    assert.equal(r.writes, arm === 'none' ? 0 : 4, arm);
  }
  assert.throws(() => run('nope'), /Unknown arm/);
});

test('capacity: a new pattern over capacity is an eviction; an identical pattern is a replacement', () => {
  const slots = ids => ids.map((id, i) => ({ slot: i, id, uci: 'x', value: i % 2 === 0 ? 1 : -1 }));
  const go = ids => runArmV4({
    arm: 'graph', ledger: slots(ids), permutedValues: [], test: [], featureOf: feat,
    categoryOf: () => 'unknown', capacity: 2,
  });
  const distinct = go(['a', 'b', 'c']);
  assert.equal(distinct.evictions, 1);
  assert.equal(distinct.replacements, 0);
  assert.equal(distinct.stored, 2);
  assert.equal(distinct.writes, 3);

  const rewrite = go(['a', 'b', 'a']);
  assert.equal(rewrite.replacements, 1);
  assert.equal(rewrite.evictions, 0);
  assert.equal(rewrite.stored, 2);
});

test('centred subtracts in Float64; sparse keeps the largest positive residuals, lower index first on ties', () => {
  const c = centred(Float32Array.from([1.5, 0.25]), Float32Array.from([0.5, 1]));
  assert.ok(c instanceof Float64Array);
  assert.deepEqual([...c], [1, -0.75]);
  assert.throws(() => centred([1], [1, 2]));

  // residuals kc - blank = [1, 5, 3, -2, -2, 4]; r = max(0, .) = [1, 5, 3, 0, 0, 4]
  const kc = Float32Array.from([2, 5, 3, 1, 0, 4]);
  const blank = Float32Array.from([1, 0, 0, 3, 2, 0]);
  const top2 = sparse(kc, blank, 2);
  assert.ok(top2 instanceof Float64Array);
  assert.deepEqual([...top2], [0, 5, 0, 0, 0, 4]);
  const all = sparse(kc, blank, 10);
  assert.deepEqual([...all], [1, 5, 3, 0, 0, 4]); // negatives and zeros are never kept
  assert.equal(sparseDensity(all), 4 / 6);

  // equal residuals at the cut: lower index kept first
  const tied = sparse(Float32Array.from([7, 7, 7, 0]), Float32Array.from([0, 0, 0, 0]), 2);
  assert.deepEqual([...tied], [7, 7, 0, 0]);
});

const GAMES = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
const ONES = [1, 1, 1, 1, 1, 1];
const ZEROS = [0, 0, 0, 0, 0, 0];
const rowsForSeed = (seed, passing = {}) => V4_ARMS.map(arm => ({ seed, arm, test: passing[arm] || ZEROS }));
const judge = rows => judgeV4(rows, { seeds: [1, 2], testGames: GAMES, minCorrect: 5, minMargin: 5, resamples: 500 });

test('judgeV4: a candidate that passes seed 1 and fails seed 2 does not pass', () => {
  const res = judge([...rowsForSeed(1, { graph: ONES }), ...rowsForSeed(2)]);
  assert.equal(res.perCandidate.graph.perSeed[0].pass, true);
  assert.equal(res.perCandidate.graph.perSeed[1].pass, false);
  assert.equal(res.perCandidate.graph.pass, false);
  assert.deepEqual(res.winners, []);
  assert.equal(res.pass, false);
  assert.equal(res.outcome, 'does not pass');
});

test('judgeV4: a candidate passing every seed wins; graph-centred is never a candidate', () => {
  const res = judge([...rowsForSeed(1, { graph: ONES }), ...rowsForSeed(2, { graph: ONES })]);
  assert.deepEqual(res.winners, ['graph']);
  assert.equal(res.pass, true);
  assert.equal(res.outcome, 'passes');
  assert.deepEqual(Object.keys(res.perCandidate), ['graph', 'graph-sparse']);
});
