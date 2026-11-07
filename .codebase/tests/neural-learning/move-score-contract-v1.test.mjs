import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The training move score decided on 2026-11-03: MBON05 at -1, the other four types 0, not yet switched on.
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const contract = read('../../src/neural-learning/move-score-contract-v1.json');
const roster = read('../../src/neural-learning/neuron-reader-cells.json');

test('move-score contract matches the decision and the pinned MBON05 cells', () => {
  assert.equal(contract.schema, 'neuron-reader-score-v1');
  assert.equal(contract.scope, roster.scope);
  assert.deepEqual(Object.keys(contract.coefficients).sort(), ['MBON05', 'MBON06', 'MBON07', 'MBON09', 'MBON27']);
  for (const [type, entry] of Object.entries(contract.coefficients)) assert.equal(entry.value, type === 'MBON05' ? -1 : 0);
  const roots = roster.cells.filter(cell => cell.type === 'MBON05').map(cell => cell.rootId).sort();
  assert.deepEqual([...contract.coefficients.MBON05.evidence.targets].sort(), roots);
  assert.match(contract.coefficients.MBON05.evidence.source, /^https:\/\//);
});

test('move-score contract stays switched off until memory compatibility is recorded', () => {
  // scoreNeurons (neuron-reader.mjs) refuses any contract whose review is not "reviewed" with both SHA256 values.
  assert.notEqual(contract.review.status, 'reviewed');
  assert.equal(contract.review.compatibilitySha256, null);
  assert.equal(contract.manifestIdentity, null);
});
