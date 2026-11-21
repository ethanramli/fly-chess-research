// Stage 0 checks for the replay diary (design section 7.1). No fly graph is loaded.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ReplayDiary, Stream } from '../../src/neural-learning/replay-diary-v1.mjs';

const lesson = (i, kind = 'reward') => ({ stimulus: [[i, 1]], teaching: { kind, current: 0.75 }, lessonIndex: i, receiptHash: `r${i}` });

test('uniform integers stay in range; a stream repeats for its seed and label, and differs by label', () => {
  const a = new Stream(7, 'tape');
  const b = new Stream(7, 'tape');
  const c = new Stream(7, 'replay');
  const xs = Array.from({ length: 50 }, () => a.uniformInt(9));
  assert.deepEqual(xs, Array.from({ length: 50 }, () => b.uniformInt(9)));
  assert.ok(xs.every(x => x >= 0 && x < 9));
  assert.notDeepEqual(xs, Array.from({ length: 50 }, () => c.uniformInt(9)));
});

test('admit refuses a lesson without a teaching pulse and leaves the diary unchanged', () => {
  const d = new ReplayDiary({ capacity: 4, runSeed: 1 });
  d.admit(lesson(1));
  const before = d.state();
  assert.throws(() => d.admit({ ...lesson(2), teaching: null }), /not a lesson/);
  assert.throws(() => d.admit({ ...lesson(2), teaching: { kind: 'unknown' } }), /not a lesson/);
  assert.equal(d.state(), before);
});

test('the same input replaces its older entry, whatever its pulse (correction)', () => {
  const d = new ReplayDiary({ capacity: 4, runSeed: 1 });
  d.admit(lesson(1, 'reward'));
  d.admit(lesson(2));
  d.admit({ ...lesson(3, 'punish'), stimulus: [[1, 1]] });
  assert.equal(d.entries.length, 2);
  assert.deepEqual(d.entries.map(e => e.lessonIndex).sort(), [2, 3]);
});

test('capacity is never exceeded', () => {
  const d = new ReplayDiary({ capacity: 5, runSeed: 2 });
  for (let i = 1; i <= 500; i++) {
    d.admit(lesson(i));
    assert.ok(d.entries.length <= 5);
  }
  assert.equal(d.entries.length, 5);
});

test('a replay is never the current lesson or a later one, and none exists before any earlier entry', () => {
  const d = new ReplayDiary({ capacity: 10, runSeed: 3 });
  assert.equal(d.nextReplay(1), null);
  for (let i = 1; i <= 60; i++) {
    d.admit(lesson(i));
    const r = d.nextReplay(i);
    if (i === 1) assert.equal(r, null);
    else assert.ok(r.lessonIndex < i);
  }
});

test('verdict blindness: flipping every pulse changes no kept entry and no replay order', () => {
  const run = kind => {
    const d = new ReplayDiary({ capacity: 8, runSeed: 4 });
    const replays = [];
    for (let i = 1; i <= 300; i++) {
      d.admit(lesson(i, kind(i)));
      const r = d.nextReplay(i);
      replays.push(r && JSON.stringify(r.stimulus));
    }
    return { kept: d.entries.map(e => e.lessonIndex), replays };
  };
  const a = run(i => (i % 2 ? 'reward' : 'punish'));
  const b = run(i => (i % 2 ? 'punish' : 'reward'));
  assert.deepEqual(a.kept, b.kept);
  assert.deepEqual(a.replays, b.replays);
});

test('resume equals an uninterrupted run (persistence)', () => {
  const log = (d, from, to) => {
    const out = [];
    for (let i = from; i <= to; i++) {
      d.admit(lesson(i));
      out.push(JSON.stringify(d.nextReplay(i)));
    }
    return out;
  };
  const whole = new ReplayDiary({ capacity: 6, runSeed: 5 });
  const wholeLog = log(whole, 1, 200);
  const first = new ReplayDiary({ capacity: 6, runSeed: 5 });
  const firstLog = log(first, 1, 100);
  const resumed = ReplayDiary.restore(first.state());
  const resumedLog = log(resumed, 101, 200);
  assert.deepEqual([...firstLog, ...resumedLog], wholeLog);
  assert.equal(resumed.state(), whole.state());
});

test('reservoir keeps each lesson position with equal chance (reduced chi-square, design check 5)', () => {
  const seeds = 300, lessons = 1000, capacity = 10, bins = 10, perBin = lessons / bins;
  const counts = new Array(lessons).fill(0);
  for (let s = 1; s <= seeds; s++) {
    const d = new ReplayDiary({ capacity, runSeed: `chi-${s}` });
    for (let i = 1; i <= lessons; i++) d.admit(lesson(i));
    for (const e of d.entries) counts[e.lessonIndex - 1] += 1;
  }
  const expected = seeds * capacity / lessons * perBin; // per bin
  let chi = 0;
  for (let b = 0; b < bins; b++) {
    let observed = 0;
    for (let p = b * perBin; p < (b + 1) * perBin; p++) observed += counts[p];
    chi += (observed - expected) ** 2 / expected;
  }
  // Chi-square, 9 degrees of freedom, 1% critical value 21.67.
  assert.ok(chi < 21.67, `chi-square ${chi.toFixed(2)} above 21.67`);
});

test('separation: the module imports only Node built-ins and has no chess or certificate code', () => {
  const src = readFileSync(new URL('../../src/neural-learning/replay-diary-v1.mjs', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(imports, ['node:crypto']);
  assert.doesNotMatch(src, /chess|certif|checker|score\(/i);
});
