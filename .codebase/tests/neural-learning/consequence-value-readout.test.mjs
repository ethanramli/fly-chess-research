import test from 'node:test';
import assert from 'node:assert/strict';
import { readConsequenceValue } from '../../src/neural-learning/consequence-value-readout.mjs';

test('consequence readout removes unconditioned offsets and preserves learned ordering', () => {
  const base = { MBON12: [1, 3], MBON01: [4, 6] };
  assert.equal(readConsequenceValue(base, base).value, 0);
  const favorable = readConsequenceValue({ MBON12: [2, 4], MBON01: [4, 6] }, base);
  const adverse = readConsequenceValue({ MBON12: [0, 2], MBON01: [4, 6] }, base);
  assert.equal(favorable.learnedChange, 1); assert.equal(adverse.learnedChange, -1);
  assert.ok(favorable.value > 0 && adverse.value < 0);
  assert.equal(readConsequenceValue({ MBON12: [12, 14], MBON01: [4, 6] },
    { MBON12: [11, 13], MBON01: [4, 6] }).value, favorable.value);
  assert.ok(readConsequenceValue({ MBON12: [3, 5], MBON01: [4, 6] }, base).value > favorable.value);
});

test('consequence readout rejects invalid references and scaling without mutating inputs', () => {
  const base = { MBON12: [1], MBON01: [2] }, before = structuredClone(base);
  for (const scale of [0, -1, NaN, Infinity]) assert.throws(() => readConsequenceValue(base, base, scale));
  assert.throws(() => readConsequenceValue(base, { MBON12: [NaN], MBON01: [0] }));
  assert.throws(() => readConsequenceValue(base, { MBON12: [], MBON01: [0] }));
  assert.deepEqual(base, before);
});
