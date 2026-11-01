import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { replayFrame } from '../../scripts/neural-learning/audit-eye-memory.mjs';
import { LocalCubicReservoirMemory } from '../../src/neural-learning/local-cubic-reservoir-memory.mjs';
import { makeCircuit } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { buildFixture, mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
const hash = s => { const h = createHash('sha256'); for (const key of ['gains', 'traces', 'states']) h.update(Buffer.from(Float64Array.from(s[key]).buffer)); return h.update(JSON.stringify([s.time, s.pulses])).digest('hex'); };

test('independent replay follows actual local observations and rejects altered evidence', () => {
  const f = buildFixture({ seed: 9511, nKC: 200, s: 20, q: .25, relation: 'conflicting', w: 0, bg: 0 });
  const c = makeCircuit(f), m = new LocalCubicReservoirMemory(c.model, c.mapReversal, { eta: 2, V0: 1.2 });
  const replay = structuredClone(m.snapshot()), rng = mulberry32(9512);
  for (let t = 0; t < 30; t++) {
    const h = c.model.h[c.model.steps], config = m.config;
    for (let i = 0; i < h.length; i++) h[i] = rng() * 1.5;
    const ks = [...new Set(m.mapping.groups.flatMap(g => g.kc))].map(i => [i, Math.min(1, Math.max(0, h[i] - c.rest[i]) / config.activityScale)]).filter(([, k]) => k > config.theta);
    const ds = m.mapping.groups.map(g => ({ excess: g.dan.reduce((s, d) => s + Math.max(0, h[d.index] - c.rest[d.index]) / config.activityScale, 0) / g.dan.length, deficit: g.dan.reduce((s, d) => s + Math.max(0, c.rest[d.index] - h[d.index]) / config.activityScale, 0) / g.dan.length }));
    const before = structuredClone(replay), frame = { before: hash(before), dt: t % 2 ? 4 : 1, ks, ds };
    m.observe(c.rest, frame.dt); frame.after = hash(m.snapshot());
    replayFrame(replay, config, m.mapping, frame); assert.deepEqual(replay, m.snapshot());
    assert.throws(() => replayFrame(structuredClone(before), config, m.mapping, { ...frame, dt: frame.dt + 1 }));
    assert.throws(() => replayFrame(structuredClone(before), config, m.mapping, { ...frame, ds: [{ excess: NaN, deficit: 0 }, ...ds.slice(1)] }));
  }
});
