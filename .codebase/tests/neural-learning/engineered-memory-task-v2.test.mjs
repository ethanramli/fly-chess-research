import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
import { ARMS, seededShuffle, splitPairs, makeYoked, runArm, judge } from '../../src/neural-learning/engineered-memory-task-v2.mjs';

function synthetic(nPairs, dim = 12, seed = 7) {
  const rng = mulberry32(seed); const vec = new Map(); const out = new Map(); const pairs = [];
  for (let i = 0; i < nPairs; i++) {
    const base = Float64Array.from({ length: dim }, () => rng() * 0.2);
    const good = Float64Array.from(base); good[0] += 1;   // the safe twin differs along feature 0
    const bad = Float64Array.from(base); bad[0] -= 1;
    vec.set(`g${i}`, good); vec.set(`b${i}`, bad); out.set(`g${i}`, 1); out.set(`b${i}`, -1);
    pairs.push({ id: `game${i}`, good: `g${i}`, bad: `b${i}` });
  }
  return { pairs, featureOf: k => vec.get(k), outcomeOf: k => out.get(k) };
}

const sorted = list => [...list].sort((a, b) => a - b);

test('splitPairs is deterministic, disjoint, sized, and validates input', () => {
  const { pairs } = synthetic(50);
  const a = splitPairs(pairs, 40);
  const b = splitPairs(pairs, 40);
  assert.deepEqual(a, b);
  assert.equal(a.experience.length, 40);
  assert.equal(a.newBoards.length, 10);
  const ids = new Set(a.experience.map(p => p.id));
  assert.ok(a.newBoards.every(p => !ids.has(p.id)));
  assert.throws(() => splitPairs([...pairs, pairs[0]], 40), /Duplicate/);
  assert.throws(() => splitPairs(pairs.slice(0, 40), 40), /Not enough/);
});

test('seededShuffle and makeYoked return deterministic permutations and reject bad input', () => {
  const list = Array.from({ length: 20 }, (_, i) => i);
  const s = seededShuffle(list, 5);
  assert.deepEqual(sorted(s), list);
  assert.deepEqual(seededShuffle(list, 5), s);
  const values = Array.from({ length: 10 }, (_, i) => (i % 2 ? 1 : -1));
  const y = makeYoked(values, 3);
  assert.deepEqual(sorted(y), sorted(values));
  assert.deepEqual(makeYoked(values, 3), y);
  assert.throws(() => makeYoked([], 1), /No outcomes/);
  assert.throws(() => makeYoked([0], 1), /must be/);
});

test('informative arm learns both seen and new boards', () => {
  const { pairs, featureOf, outcomeOf } = synthetic(50);
  const { experience, newBoards } = splitPairs(pairs, 40);
  const row = runArm({ arm: 'graph', seed: 1, experience, newBoards, featureOf, outcomeOf });
  console.log(`graph seed 1: seenCorrect=${row.seenCorrect}, newCorrect=${row.newCorrect}`);
  assert.ok(row.seenCorrect >= 36, `seenCorrect ${row.seenCorrect}`);
  assert.ok(row.newCorrect >= 8, `newCorrect ${row.newCorrect}`);
});

test('slots are balanced within each epoch', () => {
  const { pairs, featureOf, outcomeOf } = synthetic(50);
  const { experience, newBoards } = splitPairs(pairs, 40);
  const logs = [];
  runArm({ arm: 'graph', seed: 1, experience, newBoards, featureOf, outcomeOf, log: r => logs.push(r) });
  for (let e = 0; e < 2; e++) {
    const trials = logs.filter(r => r.kind === 'trial' && r.epoch === e);
    assert.equal(trials.filter(r => r.goodSlot === 'a').length, 20);
    assert.equal(trials.filter(r => r.goodSlot === 'b').length, 20);
  }
});

test('no-memory arm changes nothing', () => {
  const { pairs, featureOf, outcomeOf } = synthetic(50);
  const { experience, newBoards } = splitPairs(pairs, 40);
  const logs = [];
  const row = runArm({ arm: 'none', seed: 1, experience, newBoards, featureOf, outcomeOf, log: r => logs.push(r) });
  assert.equal(row.writes, 0);
  assert.equal(row.stored, 0);
  assert.equal(row.newCorrect, 0);
  assert.equal(row.seenCorrect, 0);
  assert.ok(logs.filter(r => r.kind === 'trial').every(r => r.written === null));
});

test('unknown verification produces no write', () => {
  const { pairs, featureOf } = synthetic(50);
  const { experience, newBoards } = splitPairs(pairs, 40);
  const row = runArm({ arm: 'graph', seed: 1, experience, newBoards, featureOf, outcomeOf: () => null });
  assert.equal(row.writes, 0);
  assert.equal(row.unknown, row.trials);
  assert.equal(row.stored, 0);
});

test('mismatched arm writes the yoked values in order', () => {
  const { pairs, featureOf, outcomeOf } = synthetic(50);
  const { experience, newBoards } = splitPairs(pairs, 40);
  const graphRow = runArm({ arm: 'graph', seed: 1, experience, newBoards, featureOf, outcomeOf });
  const yoked = makeYoked(graphRow.writtenOutcomes, 1);
  const logs = [];
  runArm({ arm: 'mismatched', seed: 1, experience, newBoards, featureOf, outcomeOf, yokedValues: yoked, log: r => logs.push(r) });
  const written = logs.filter(r => r.kind === 'trial' && r.written !== null).map(r => r.written);
  assert.ok(written.length > 0);
  assert.deepEqual(written, written.map((_, i) => yoked[i % yoked.length]));
});

test('judge returns documented fields and flags store faults', () => {
  const { pairs, featureOf, outcomeOf } = synthetic(50);
  const { experience, newBoards } = splitPairs(pairs, 40);
  const newGames = newBoards.map(p => p.id);
  const rows = [];
  for (const seed of [1, 2, 3]) {
    const graph = runArm({ arm: 'graph', seed, experience, newBoards, featureOf, outcomeOf });
    rows.push(graph);
    rows.push(runArm({ arm: 'raw', seed, experience, newBoards, featureOf, outcomeOf }));
    rows.push(runArm({ arm: 'random', seed, experience, newBoards, featureOf, outcomeOf }));
    rows.push(runArm({ arm: 'mismatched', seed, experience, newBoards, featureOf, outcomeOf, yokedValues: makeYoked(graph.writtenOutcomes, seed) }));
    rows.push(runArm({ arm: 'none', seed, experience, newBoards, featureOf, outcomeOf }));
  }
  const result = judge(rows, { seeds: [1, 2, 3], newGames, minSeen: 1, minNew: 1, minMargin: 0 });
  assert.equal(result.perSeed.length, 3);
  for (const s of result.perSeed) {
    for (const field of ['seed', 'seenOk', 'graphSeen', 'graphNew', 'gate', 'pass']) assert.ok(field in s, field);
  }
  assert.equal(typeof result.outcome, 'string');

  const fake = [
    { seed: 1, arm: 'graph', seenCorrect: 5, newCorrect: 0, newBoards: Array(10).fill(false) },
    ...['raw', 'random', 'mismatched', 'none'].map(arm => ({ seed: 1, arm, seenCorrect: 0, newCorrect: 0, newBoards: Array(10).fill(false) })),
  ];
  const fault = judge(fake, { seeds: [1], newGames, minSeen: 30, minNew: 7, minMargin: 1 });
  assert.equal(fault.storeFault, true);
  assert.equal(fault.outcome, 'store fault: result not interpretable');
});

test('runArm rejects an unknown arm and mismatched without yoked values', () => {
  const { pairs, featureOf, outcomeOf } = synthetic(50);
  const { experience, newBoards } = splitPairs(pairs, 40);
  assert.throws(() => runArm({ arm: 'bogus', seed: 1, experience, newBoards, featureOf, outcomeOf }), /Unknown arm/);
  assert.throws(() => runArm({ arm: 'mismatched', seed: 1, experience, newBoards, featureOf, outcomeOf }), /yokedValues/);
});
