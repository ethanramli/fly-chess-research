// Checks for the stage 1 replay arm transforms (design section 7.2): each arm changes only old-lesson replays.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planArm } from '../../src/neural-learning/replay-arms-v1.mjs';
import { Stream } from '../../src/neural-learning/replay-diary-v1.mjs';

// Two blocks. Block 'A' replays only its own lessons; block 'B' replays A's lessons (old) and its own (current).
const blocks = [
  { name: 'A', events: [
    { block: 'A', entry: null },
    { block: 'A', entry: { block: 'A', code: 'a1', valence: 'reward' } },
    { block: 'A', entry: { block: 'A', code: 'a2', valence: 'punish' } },
  ] },
  { name: 'B', events: [
    { block: 'B', entry: { block: 'A', code: 'a1', valence: 'reward' } },
    { block: 'B', entry: { block: 'B', code: 'b1', valence: 'punish' } },
    { block: 'B', entry: { block: 'A', code: 'a2', valence: 'punish' } },
    { block: 'B', entry: { block: 'A', code: 'a1', valence: 'reward' } },
  ] },
];
const streamRng = (() => { const s = new Stream(7, 'shuffle'); return m => s.uniformInt(m); })();

test('diary arm replays every event as recorded, skipping only the empty first step', () => {
  const { now, afterTest } = planArm('diary', blocks, streamRng);
  assert.deepEqual(now[0], [{ kind: 'skip' }, { kind: 'replay', code: 'a1', valence: 'reward' }, { kind: 'replay', code: 'a2', valence: 'punish' }]);
  assert.equal(now[1].length, 4);
  assert.ok(afterTest.every(x => x.length === 0));
});

test('no old replays: the current block is exactly the diary arm, and old-lesson steps are skipped', () => {
  const diary = planArm('diary', blocks, streamRng);
  const none = planArm('nooldreplays', blocks, streamRng);
  assert.deepEqual(none.now[0], diary.now[0]); // block A has no old lessons
  assert.deepEqual(none.now[1][1], diary.now[1][1]); // the current-block replay is unchanged
  assert.ok(none.now[1].filter((a, i) => blocks[1].events[i].entry.block === 'A').every(a => a.kind === 'skip'));
});

test('no pulse: old-lesson replays keep their input and time but carry no pulse', () => {
  const { now } = planArm('nopulse', blocks, streamRng);
  assert.deepEqual(now[1][0], { kind: 'replay', code: 'a1', valence: null });
  assert.deepEqual(now[1][1], { kind: 'replay', code: 'b1', valence: 'punish' }); // current block unchanged
});

test('event-shuffled: old pulses are permuted within the block; inputs, times and the current block are unchanged', () => {
  const { now } = planArm('eventshuffle', blocks, streamRng);
  const codes = now[1].map(a => a.code);
  assert.deepEqual(codes, ['a1', 'b1', 'a2', 'a1']);
  const oldBefore = ['reward', 'punish', 'reward'].sort();
  const oldAfter = [now[1][0].valence, now[1][2].valence, now[1][3].valence].sort();
  assert.deepEqual(oldAfter, oldBefore);
  assert.equal(now[1][1].valence, 'punish');
});

test('filler: each old-lesson replay becomes one filler step; the current block is unchanged', () => {
  const { now } = planArm('filler', blocks, streamRng);
  assert.equal(now[1].filter(a => a.kind === 'filler').length, 3);
  assert.deepEqual(now[1][1], { kind: 'replay', code: 'b1', valence: 'punish' });
  assert.ok(now[1].filter(a => a.kind === 'filler').every(a => a.valence === 'reward' || a.valence === 'punish'));
});

test('moved timing: old-lesson replays run after the previous block test, with the same inputs and pulses', () => {
  const diary = planArm('diary', blocks, streamRng);
  const moved = planArm('moved', blocks, streamRng);
  assert.ok(moved.now[1].filter((a, i) => blocks[1].events[i].entry.block === 'A').every(a => a.kind === 'skip'));
  assert.deepEqual(moved.afterTest[0], [
    { kind: 'replay', code: 'a1', valence: 'reward' },
    { kind: 'replay', code: 'a2', valence: 'punish' },
    { kind: 'replay', code: 'a1', valence: 'reward' },
  ]);
  assert.deepEqual(moved.now[1][1], diary.now[1][1]);
  const count = x => [...x.now, ...x.afterTest].flat().filter(a => a.kind === 'replay' || a.kind === 'filler').length;
  assert.equal(count(moved), count(diary));
});

test('unknown arm names are refused', () => {
  assert.throws(() => planArm('mixed', blocks, streamRng), /Unknown replay arm/);
});
