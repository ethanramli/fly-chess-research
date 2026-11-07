import test from 'node:test';
import assert from 'node:assert/strict';
import { edgeCategories, hybridState } from '../../scripts/neural-learning/inspect-eye-synaptic-conflict.mjs';

test('activity categories partition every edge and preserve duplicated KC-to-different-MBON sites', () => {
  const mapping = { groups: [{ kc: [10, 11, 12] }, { kc: [10, 13] }] };
  assert.deepEqual(edgeCategories(mapping, new Set([10, 11]), new Set([10, 12])), ['shared', 'oldOnly', 'notOldActive', 'shared', 'notOldActive']);
});

test('counterfactual replacement copies complete local tuples without changing the source states', () => {
  const state = x => ({ identity: 'fixed', time: 4, gains: [x, 1, 1], traces: [.1, .2, .3], states: [x, 0, 1 - x, 0, 1, 0, 0, 0, 1, 0, 0, 0] });
  const after = state(.2), before = state(.8), original = structuredClone(after);
  before.traces[0] = .7;
  const h = hybridState(after, before, ['shared', 'oldOnly', 'notOldActive'], 'shared');
  assert.deepEqual(h.gains, [.8, 1, 1]); assert.equal(h.traces[0], .7); assert.deepEqual(h.states.slice(0, 4), before.states.slice(0, 4));
  assert.deepEqual(after, original); assert.equal(h.time, after.time);
  assert.throws(() => hybridState(after, { ...before, identity: 'wrong' }, ['shared', 'oldOnly', 'notOldActive'], 'shared'));
  assert.throws(() => hybridState(after, before, ['shared'], 'shared'));
  assert.throws(() => hybridState(after, before, ['shared', 'oldOnly', 'notOldActive'], 'oracle'));
});
