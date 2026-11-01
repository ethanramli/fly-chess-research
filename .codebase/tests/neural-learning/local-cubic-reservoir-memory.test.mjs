import test from 'node:test';
import assert from 'node:assert/strict';
import { stepCubicReservoir as step, LocalCubicReservoirMemory } from '../../src/neural-learning/local-cubic-reservoir-memory.mjs';
import { stepSupralinearReservoir as quadratic, LocalSupralinearReservoirMemory, EXIT_D0 } from '../../src/neural-learning/local-supralinear-reservoir-memory.mjs';
import { LOCAL_GATED_DEFAULTS as C } from '../../src/neural-learning/local-gated-memory.mjs';
import { makeCircuit } from '../../src/neural-learning/memory-assay-adapters.mjs';
import { buildFixture, mulberry32 } from '../../src/neural-learning/memory-assay-fixture.mjs';
const base = { gain: .6, trace: 1, k: 1, excess: 0, deficit: 0, dt: 1 };

test('matches quadratic at d0; attenuates weak exit without a deadband', () => {
  for (const o of [{ excess: EXIT_D0 }, { deficit: EXIT_D0 }]) assert.deepEqual(step({ ...base, ...o }, [.1, .2, .3, .4], C), quadratic({ ...base, ...o }, [.1, .2, .3, .4], C));
  const low = { ...base, excess: .025 }, high = { ...base, excess: .5 };
  const q = step(low, [0, 1, 0, 0], C).states[0], old = quadratic(low, [0, 1, 0, 0], C).states[0];
  assert(q > 0 && q < old / 5);
  assert(step(high, [0, 1, 0, 0], C).states[0] > quadratic(high, [0, 1, 0, 0], C).states[0]);
});

test('mass, bounds and no-signal storage survive long randomized input', () => {
  const rng = mulberry32(9501);
  let p = [1, 0, 0, 0], gain = 1, trace = 0;
  for (let i = 0; i < 15000; i++) {
    const r = step({ gain, trace, k: rng(), excess: rng() * .5, deficit: rng() * .5, dt: 1 + 3 * rng() }, p, C);
    p = r.states; gain = r.gain; trace = r.trace;
    assert(p.every(x => x >= 0 && x <= 1)); assert(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12); assert(gain >= .2 && gain <= 1);
  }
  assert.deepEqual(step({ ...base, gain, trace }, p, C).states, p);
});

test('strong evidence can change a stabilized store in both directions', () => {
  let p = [0, 1, 0, 0], gain = 1;
  for (const [excess, deficit, expected] of [[1, 0, .2], [0, 1, 1]]) {
    for (let i = 0; i < 30; i++) { const r = step({ ...base, gain, excess, deficit }, p, { ...C, eta: 2 }); p = r.states; gain = r.gain; }
    assert(Math.abs(gain - expected) < 1e-10);
  }
});

test('fresh-model restore matches continuation and rejects another rule/setting', () => {
  const f = buildFixture({ seed: 9501, nKC: 200, s: 20, q: .25, relation: 'conflicting', w: 0, bg: 0 });
  const make = (config = { eta: 2, V0: 1.2 }) => { const c = makeCircuit(f); return { c, m: new LocalCubicReservoirMemory(c.model, c.mapReversal, config) }; };
  const a = make(), b = make();
  a.c.model.h[a.c.model.steps].fill(1.5); a.m.observe(a.c.rest);
  b.m.restore(JSON.parse(JSON.stringify(a.m.snapshot())));
  a.c.model.h[a.c.model.steps].fill(.9); b.c.model.h[b.c.model.steps].fill(.9);
  a.m.observe(a.c.rest, 4); b.m.observe(b.c.rest, 4);
  assert.deepEqual(a.m.snapshot(), b.m.snapshot()); assert.deepEqual(a.c.model.params.magnitude, b.c.model.params.magnitude);
  assert.throws(() => make({ eta: 2, V0: .8 }).m.restore(a.m.snapshot()));
  const c = makeCircuit(f), old = new LocalSupralinearReservoirMemory(c.model, c.mapReversal, { eta: 2, V0: 1.2 });
  assert.throws(() => old.restore(a.m.snapshot()));
});
