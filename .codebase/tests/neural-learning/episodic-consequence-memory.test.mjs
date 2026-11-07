import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { EpisodicConsequenceMemory } from '../../src/neural-learning/episodic-consequence-memory.mjs';

const cue = (...indices) => indices.map(index => ({ index, current: 1 }));
const event = (sequence, value) => ({ status: 'verified', sequence, value, evidenceHash: String(sequence % 10).repeat(64) });

test('shared neurons do not imply shared episodic addresses; revision preserves unrelated entries', () => {
  const memory = new EpisodicConsequenceMemory(), a = cue(1, 2, 3), b = cue(1, 2, 4);
  memory.commit(a, event(1, 1)); memory.commit(b, event(2, 1));
  const oldB = memory.query(b);
  memory.commit(a, event(3, -1));
  assert.equal(memory.query(a).value, -1);
  assert.deepEqual(memory.query(b), oldB);
  assert.deepEqual(memory.snapshot().entries.at(-1).events.map(x => x.value), [1, -1]);
  const before = memory.snapshot();
  assert.deepEqual(memory.query(cue(1, 2, 5)), { known: false, value: 0 });
  assert.equal(memory.query([...b].reverse()).value, 1);
  assert.deepEqual(memory.snapshot(), before, 'reads are immutable');
});

test('unknown, duplicate, corrupt and stale events cannot partially alter memory', () => {
  const memory = new EpisodicConsequenceMemory(), a = cue(3, 4);
  memory.commit(a, event(1, 1)); const before = memory.snapshot();
  assert.equal(memory.commit(a, event(1, 1)).reason, 'duplicate');
  assert.equal(memory.commit(a, { status: 'unknown' }).reason, 'unknown');
  for (const [features, feedback] of [[a, event(1, -1)], [cue(3, 3), event(2, 1)],
    [cue(-1), event(2, 1)], [[{ index: 1, current: NaN }], event(2, 1)], [[], event(2, 1)],
    [a, { ...event(2, 1), value: 0 }], [a, { ...event(2, 1), evidenceHash: 'unverified' }]]) {
    assert.throws(() => memory.commit(features, feedback));
    assert.deepEqual(memory.snapshot(), before);
  }
});

test('capacity eviction is explicit, and snapshot publication permits exactly-once resume', () => {
  const memory = new EpisodicConsequenceMemory({ capacity: 2 });
  memory.commit(cue(1), event(1, 1)); memory.commit(cue(2), event(2, -1));
  memory.query(cue(1));
  assert.ok(memory.commit(cue(3), event(3, 1)).evicted);
  assert.equal(memory.query(cue(1)).known, false, 'read does not refresh write recency');
  const state = memory.snapshot(), resumed = new EpisodicConsequenceMemory({ capacity: 2 });
  resumed.restore(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(resumed.snapshot(), state);
  assert.equal(resumed.commit(cue(3), event(3, 1)).reason, 'duplicate');
  const broken = structuredClone(state); broken.entries[0].events[0].value *= -1;
  assert.throws(() => resumed.restore(broken));
  const { checksum, ...body } = broken;
  body.entries[0].events[0].sequence = body.sequence + 1;
  assert.throws(() => resumed.restore({ ...body, checksum: createHash('sha256').update(JSON.stringify(body)).digest('hex') }));
  assert.deepEqual(resumed.snapshot(), state);
  memory.commit(cue(2), event(4, 1)); resumed.commit(cue(2), event(4, 1));
  assert.deepEqual(resumed.snapshot(), memory.snapshot());
});
