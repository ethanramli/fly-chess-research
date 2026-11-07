import test from 'node:test';
import assert from 'node:assert/strict';
import { NearestEpisodeMemory, rmsScaler, makeRandomExpansion } from '../../src/neural-learning/kc-episodic-memory-v2.mjs';

const v = (...xs) => Float64Array.from(xs);

test('exact match returns its stored value', () => {
  const m = new NearestEpisodeMemory({ k: 3 });
  m.write(v(1, 0), 1, 'p');
  m.write(v(0, 1), -1, 'n');
  assert.equal(m.score(v(1, 0)), 1);
  assert.equal(m.score(v(0, 1)), -1);
});

test('rewriting the same vector keeps the latest evidence', () => {
  const m = new NearestEpisodeMemory();
  m.write(v(1, 2), 1, 'first');
  m.write(v(1, 2), -1, 'second');
  assert.equal(m.size, 1);
  assert.equal(m.score(v(1, 2)), -1);
  assert.equal(m.writes, 2);
});

test('score is the inverse-distance weighted mean of the k nearest', () => {
  const m = new NearestEpisodeMemory({ k: 2 });
  m.write(v(0, 0), 1, 'a');
  m.write(v(3, 0), -1, 'b');
  m.write(v(10, 0), 1, 'c');
  const s = m.score(v(1, 0));
  assert.ok(Math.abs(s - 1 / 3) < 1e-12);
});

test('empty store, bad input and failed writes are handled', () => {
  const m = new NearestEpisodeMemory();
  assert.equal(m.score(v(1, 2)), 0);
  m.write(v(1, 2), 1, 'x');
  assert.throws(() => m.write(v(1, 2, 3), 1, 'y'));
  assert.throws(() => m.score(v(1, 2, 3)));
  assert.throws(() => m.write(v(1, 2), 0, 'y'));
  assert.throws(() => m.write(v(1, 2), 2, 'y'));
  assert.throws(() => m.write(v(NaN, 2), 1, 'y'));
  assert.throws(() => m.write([1, 2], 1, 'y'));
  assert.throws(() => m.write(v(1, 2), 1, ''));
  assert.equal(m.size, 1);
  assert.equal(m.writes, 1);
});

test('capacity evicts the least recently updated entry', () => {
  const m = new NearestEpisodeMemory({ capacity: 2 });
  m.write(v(1, 0, 0), 1, 'a');
  m.write(v(0, 1, 0), 1, 'b');
  m.write(v(1, 0, 0), -1, 'a2');
  m.write(v(0, 0, 1), 1, 'c');
  assert.deepEqual(m.entries.map((e) => e.evidenceHash), ['a2', 'c']);
});

test('score changes nothing', () => {
  const m = new NearestEpisodeMemory({ k: 2 });
  m.write(v(1, 0), 1, 'a');
  m.write(v(0, 1), -1, 'b');
  const fp = m.fingerprint();
  const order = JSON.stringify(m.entries.map((e) => e.evidenceHash));
  for (let i = 0; i < 3; i++) m.score(v(0.5, 0.5));
  assert.equal(m.fingerprint(), fp);
  assert.equal(JSON.stringify(m.entries.map((e) => e.evidenceHash)), order);
});

test('fingerprint changes after a write and matches for identical writes', () => {
  const build = () => {
    const m = new NearestEpisodeMemory({ k: 2 });
    m.write(v(1, 0), 1, 'a');
    return m;
  };
  const a = build();
  const b = build();
  assert.equal(a.fingerprint(), b.fingerprint());
  const before = a.fingerprint();
  a.write(v(0, 1), -1, 'b');
  assert.notEqual(a.fingerprint(), before);
});

test('distance ties prefer the more recent entry', () => {
  const m = new NearestEpisodeMemory({ k: 1 });
  m.write(v(1, 0), 1, 'a');
  m.write(v(-1, 0), -1, 'b');
  assert.equal(m.score(v(0, 0)), -1);
  m.write(v(1, 0), 1, 'a2');
  assert.equal(m.score(v(0, 0)), 1);
});

test('rmsScaler scales by root mean square and validates input', () => {
  const scale = rmsScaler([v(1, 2), v(3, 2)]);
  const out = scale(v(1, 2));
  assert.ok(Math.abs(out[0] - 1 / Math.sqrt(5)) < 1e-5);
  assert.ok(Math.abs(out[1] - 1) < 1e-5);
  assert.match(scale.rmsSha256, /^[0-9a-f]{64}$/);
  assert.throws(() => rmsScaler([]));
  assert.throws(() => rmsScaler([v(1, 2), v(1, 2, 3)]));
});

test('makeRandomExpansion is reproducible and respects keepFraction', () => {
  const a = makeRandomExpansion({ inputs: 20, units: 8, fanIn: 4, seed: 7 });
  const b = makeRandomExpansion({ inputs: 20, units: 8, fanIn: 4, seed: 7 });
  assert.equal(a.wiringSha256, b.wiringSha256);
  const raw = Float64Array.from({ length: 20 }, (_, i) => i + 1);
  const outA = a(raw);
  assert.deepEqual(outA, b(raw));
  assert.equal(outA.length, 8);

  const ones = new Float64Array(20).fill(1);
  for (const x of a(ones)) assert.equal(x, 4);

  const sparse = a(raw, 0.25);
  assert.equal(sparse.filter((x) => x !== 0).length, 2);

  assert.throws(() => makeRandomExpansion({ inputs: 3, units: 2, fanIn: 4 }));
  assert.throws(() => a(new Float64Array(19)));
});
