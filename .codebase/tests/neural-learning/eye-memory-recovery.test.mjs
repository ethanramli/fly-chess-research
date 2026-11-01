import test from 'node:test';
import assert from 'node:assert/strict';
import { phasePrefix, validOverlap, hashState } from '../../scripts/neural-learning/eye-memory-recovery.mjs';
import { LocalCubicReservoirMemory } from '../../src/neural-learning/local-cubic-reservoir-memory.mjs';
import { makeCircuit } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { buildFixture } from '../../src/neural-learning/memory-assay-fixture.mjs';

function fixture() {
  const f = buildFixture({ seed: 4102, nKC: 200, s: 20, q: .25, relation: 'conflicting', w: 0, bg: 0 });
  const make = () => { const c = makeCircuit(f); return { c, m: new LocalCubicReservoirMemory(c.model, c.mapReversal, { eta: 2, V0: 1.2 }) }; };
  const a = make(), { c, m } = a, lines = [], log = r => lines.push(JSON.stringify(r));
  log({ kind: 'start', seed: 4102, arm: 'absent', initial: m.snapshot(), mapping: m.mapping, config: m.config, localHash: hashState(m.snapshot()) });
  let frame = 0, saved;
  const observe = (dt, context) => {
    const h = c.model.h[c.model.steps]; h.fill(0);
    for (let i = 0; i < 20; i++) h[i] = dt === 1 ? 1.2 : 0;
    h[c.n] = .77; h[c.n + 1] = .73;
    const before = hashState(m.snapshot());
    const ks = [...new Set(m.mapping.groups.flatMap(g => g.kc))].map(i => [i, Math.min(1, Math.max(0, h[i] - c.rest[i]) / m.config.activityScale)]).filter(([, k]) => k > m.config.theta);
    const ds = m.mapping.groups.map(g => ({ excess: g.dan.reduce((s, d) => s + Math.max(0, h[d.index] - c.rest[d.index]) / m.config.activityScale, 0) / g.dan.length,
      deficit: g.dan.reduce((s, d) => s + Math.max(0, c.rest[d.index] - h[d.index]) / m.config.activityScale, 0) / g.dan.length }));
    m.observe(c.rest, dt);
    const receipt = { kind: 'frame', frame: frame++, context, dt, ks, ds, before, after: hashState(m.snapshot()) }; log(receipt); return receipt;
  };
  for (let trial = 1; trial <= 48; trial++) {
    const item = Math.floor((trial - 1) / 24), context = { phase: `B${item}`, trial, item };
    for (const dt of [1, 4, 1, 4, 1]) observe(dt, context);
    log({ kind: 'trial', context, valence: null, unknown: trial % 8 === 0, scale: 0, level: .75 });
    for (const dt of [1, 4]) observe(dt, context);
    if (trial % 24 === 0) {
      const phase = `T${item}`, results = Array.from({ length: 4 }, () => ({ mNorm: 0, greedy: false }));
      saved = { seed: 4102, arm: 'absent', phase, snapshot: m.snapshot(), tests: results };
      log({ kind: 'test', name: phase, results, localHash: hashState(m.snapshot()) });
    }
  }
  const prefix = Buffer.from(lines.join('\n') + '\n'), next = observe(1, { phase: 'B2', trial: 49, item: 2 });
  return { prefix, saved, next, make, c, m };
}

test('phase recovery validates every prefix update and ignores only the unacknowledged NUL suffix', () => {
  const f = fixture(), bytes = Buffer.concat([f.prefix, Buffer.from(JSON.stringify(f.next) + '\n'), Buffer.alloc(200)]);
  const r = phasePrefix(bytes, f.saved);
  assert.equal(r.frames, 336); assert.equal(r.trials, 48); assert.deepEqual(r.prefix, f.prefix); assert.deepEqual(r.snapshot, f.saved.snapshot);
  assert.deepEqual(r.pulses, { B0: { reward: 0, punish: 0, none: 24 }, B1: { reward: 0, punish: 0, none: 24 } });
  const overlap = validOverlap(bytes.subarray(r.prefix.length));
  assert.equal(overlap.byFrame.size, 1); assert.equal(overlap.invalidNulBytes, 200);
});

test('altered prefix state, wrong checkpoint and a missing complete phase are rejected', () => {
  const f = fixture(), lines = f.prefix.toString().trim().split('\n').map(JSON.parse);
  lines[1].after = '0'.repeat(64);
  assert.throws(() => phasePrefix(Buffer.from(lines.map(JSON.stringify).join('\n') + '\n'), f.saved));
  assert.throws(() => phasePrefix(f.prefix, { ...f.saved, snapshot: { ...f.saved.snapshot, time: f.saved.snapshot.time + 1 } }));
  assert.throws(() => phasePrefix(f.prefix.subarray(0, f.prefix.lastIndexOf(10, f.prefix.length - 2) + 1), f.saved));
  assert.throws(() => validOverlap(Buffer.from('{"kind":"frame"')));
});

test('the first resumed update exactly matches uninterrupted local state', () => {
  const f = fixture(), r = phasePrefix(f.prefix, f.saved), restored = f.make();
  restored.m.restore(r.snapshot);
  restored.c.model.h[restored.c.model.steps].set(f.c.model.h[f.c.model.steps]);
  assert.equal(hashState(restored.m.snapshot()), f.next.before);
  restored.m.observe(restored.c.rest, f.next.dt);
  assert.deepEqual(restored.m.snapshot(), f.m.snapshot()); assert.equal(hashState(restored.m.snapshot()), f.next.after);
});
