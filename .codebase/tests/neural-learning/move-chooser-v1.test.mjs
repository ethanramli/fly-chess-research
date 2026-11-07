import test from 'node:test';
import assert from 'node:assert/strict';
import { choiceTemperature, chooseMove } from '../../src/neural-learning/move-chooser-v1.mjs';

const flat = { fingerprint: () => 0 };

test('choiceTemperature is 0.1 times the population sd and rejects bad input', () => {
  assert.equal(choiceTemperature([1, 3]), 0.1);
  for (const bad of [[], [NaN]]) assert.throws(() => choiceTemperature(bad), { message: 'Invalid activities' });
  assert.throws(() => choiceTemperature([2, 2]), { message: 'Zero activity spread' });
});

test('chooseMove sorts moves and keeps scores aligned with them', () => {
  const table = { e2e4: 0.2, a2a3: 0.5, d2d4: 0.9 };
  const r = chooseMove({ ...flat, moves: ['e2e4', 'a2a3', 'd2d4'], score: m => table[m], temperature: 1, seed: 1, trial: 1 });
  assert.deepEqual(r.moves, ['a2a3', 'd2d4', 'e2e4']);
  assert.deepEqual(r.scores, [0.5, 0.9, 0.2]);
});

test('probabilities sum to 1 and a clearly better move dominates at low temperature', () => {
  const table = { e2e4: 1, d2d4: 0 };
  const r = chooseMove({ ...flat, moves: ['e2e4', 'd2d4'], score: m => table[m], temperature: 0.01, seed: 1, trial: 1 });
  const total = r.probabilities.reduce((sum, p) => sum + p, 0);
  assert.ok(Math.abs(total - 1) <= 1e-12, `sum was ${total}`);
  assert.ok(r.probabilities[r.moves.indexOf('e2e4')] > 0.99);
});

test('same seed and trial give the same move; equal scores are both chosen across trials', () => {
  const args = { ...flat, moves: ['e2e4', 'd2d4'], score: () => 0, temperature: 1, seed: 42 };
  assert.equal(chooseMove({ ...args, trial: 7 }).move, chooseMove({ ...args, trial: 7 }).move);
  const counts = { d2d4: 0, e2e4: 0 };
  for (let trial = 1; trial <= 200; trial++) counts[chooseMove({ ...args, trial }).move]++;
  assert.ok(counts.d2d4 >= 60 && counts.e2e4 >= 60, JSON.stringify(counts));
});

test('scoring rejects memory changes and call-order dependence', () => {
  let memory = 0;
  assert.throws(() => chooseMove({
    moves: ['e2e4', 'd2d4'], score: () => { memory++; return 0; }, fingerprint: () => memory, temperature: 1, seed: 1, trial: 1,
  }), { message: 'Memory changed during scoring' });
  let calls = 0;
  assert.throws(() => chooseMove({
    ...flat, moves: ['e2e4', 'd2d4'], score: () => ++calls, temperature: 1, seed: 1, trial: 1,
  }), { message: 'Candidate order changed a score' });
});

test('invalid inputs throw', () => {
  const ok = { ...flat, moves: ['a2a3', 'd2d4'], score: () => 0, temperature: 1, seed: 1, trial: 1 };
  assert.throws(() => chooseMove({ ...ok, moves: [] }), { message: 'Invalid moves' });
  assert.throws(() => chooseMove({ ...ok, moves: ['e2e4', 'e2e4'] }), { message: 'Invalid moves' });
  assert.throws(() => chooseMove({ ...ok, temperature: 0 }), { message: 'Invalid temperature' });
  assert.throws(() => chooseMove({ ...ok, seed: 1.5 }), { message: 'Invalid seed or trial' });
});
