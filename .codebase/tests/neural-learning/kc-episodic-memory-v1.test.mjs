import test from 'node:test';
import assert from 'node:assert/strict';
import { KcEpisodicMemory, randomProjection } from '../../src/neural-learning/kc-episodic-memory-v1.mjs';
import { frozenScores } from '../../src/neural-learning/transfer-evaluation-v1.mjs';

test('score returns the stored value of the most similar pattern', () => {
  const m = new KcEpisodicMemory();
  m.write(Float64Array.from([1, 0, 0]), 1, 'a');
  m.write(Float64Array.from([0, 1, 0]), -1, 'b');
  assert.equal(m.score(Float64Array.from([0.9, 0.1, 0])), 1);
  assert.equal(m.score(Float64Array.from([0, 1, 0.1])), -1);
});

test('empty store scores 0', () => {
  assert.equal(new KcEpisodicMemory().score(Float64Array.from([1, 2, 3])), 0);
});

test('capacity drops the oldest entry', () => {
  const m = new KcEpisodicMemory({ capacity: 2 });
  m.write(Float64Array.from([1, 0, 0]), 1, 'a');
  m.write(Float64Array.from([0, 1, 0]), -1, 'b');
  m.write(Float64Array.from([0, 0, 1]), 1, 'c');
  assert.equal(m.size, 2);
  assert.deepEqual(m.entries.map(e => e.evidenceHash), ['b', 'c']);
  // The dropped pattern no longer matches anything, so it scores 0.
  assert.equal(m.score(Float64Array.from([1, 0, 0])), 0);
});

test('invalid value throws', () => {
  const m = new KcEpisodicMemory();
  assert.throws(() => m.write(Float64Array.from([1]), 0, 'h'), /-1 or \+1/);
  assert.throws(() => m.write(Float64Array.from([1]), 2, 'h'), /-1 or \+1/);
  assert.equal(m.size, 0);
});

test('fingerprint changes after a write and not after a score', () => {
  const m = new KcEpisodicMemory();
  const empty = m.fingerprint();
  m.write(Float64Array.from([1, 0]), 1, 'a');
  const afterWrite = m.fingerprint();
  assert.notEqual(afterWrite, empty);
  m.score(Float64Array.from([1, 0]));
  assert.equal(m.fingerprint(), afterWrite);
});

test('randomProjection is deterministic and has the requested length', () => {
  const f = Float64Array.from([0.5, -1, 0, 2]);
  const a = randomProjection(f), b = randomProjection(f);
  assert.equal(a.length, 256);
  assert.deepEqual(a, b);
  assert.equal(randomProjection(f, 8).length, 8);
});

test('frozenScores reads the store without changing it', () => {
  const m = new KcEpisodicMemory();
  m.write(Float64Array.from([1, 0]), 1, 'a');
  m.write(Float64Array.from([0, 1]), -1, 'b');
  const before = m.fingerprint();
  const scores = frozenScores([0, 1], k => m.score(k === 0 ? Float64Array.from([1, 0]) : Float64Array.from([0, 1])), () => m.fingerprint());
  assert.deepEqual(scores, [1, -1]);
  assert.equal(m.fingerprint(), before);
});
