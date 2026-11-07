import assert from 'node:assert/strict';
import test from 'node:test';
import { memoryBackedScore, policyChoice } from '../../src/neural-learning/memory-backed-policy-v1.mjs';
import { EpisodicConsequenceMemory } from '../../src/neural-learning/episodic-consequence-memory.mjs';

test('fixed arbitration uses known evidence, neural fallback and explicit ablations', () => {
  const unknown = { known: false, value: 0 }, known = { known: true, value: -1 };
  assert.equal(memoryBackedScore('fly-memory', .16, unknown), .5);
  assert.equal(memoryBackedScore('fly-memory', .16, known), -1);
  assert.equal(memoryBackedScore('memory-only', .16, unknown), 0);
  assert.equal(memoryBackedScore('memory-only', .16, known), -1);
  assert.equal(memoryBackedScore('fly-only', .16, known), .5);
  assert.equal(memoryBackedScore('fly-only', 20, unknown), 1);
  assert.equal(policyChoice([0, 0], .49), 0); assert.equal(policyChoice([0, 0], .5), 1);
  assert.equal(policyChoice([-1, 1], .5), 1);
  assert.throws(() => memoryBackedScore('fly-memory', NaN, unknown));
  assert.throws(() => memoryBackedScore('fly-memory', 0, { known: true, value: 0 }));
  assert.throws(() => policyChoice([0, 0], 1));
});

test('closed-loop chosen feedback changes subsequent choices and survives a boundary restore', () => {
  const memory = new EpisodicConsequenceMemory(), cues = [[{ index: 1, current: 1 }], [{ index: 2, current: 1 }]];
  const choose = () => policyChoice(cues.map(c => memoryBackedScore('fly-memory', 0, memory.query(c))), .4);
  assert.equal(choose(), 0);
  memory.commit(cues[0], { status: 'verified', sequence: 1, value: -1, evidenceHash: '1'.repeat(64) });
  assert.equal(choose(), 1, 'new evidence changes the live next action');
  const checkpoint = { memory: memory.snapshot(), pendingReceipt: { sequence: 1, value: -1 } };
  const restored = new EpisodicConsequenceMemory(); restored.restore(JSON.parse(JSON.stringify(checkpoint.memory)));
  assert.equal(restored.commit(cues[0], { status: 'verified', sequence: 1, value: -1, evidenceHash: '1'.repeat(64) }).reason, 'duplicate');
  assert.deepEqual(restored.snapshot(), memory.snapshot());
});
