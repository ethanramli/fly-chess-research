// Places local-slow-v1 on the memory-assay fixture circuit (acceptance plan addendum v1.4). Candidate only: fixture use, not validated biology.
import { createHash } from 'node:crypto';
import { makeCircuit } from './memory-assay-adapters.mjs';
import { LocalSlowMemory } from './local-slow-memory.mjs';

const ACTIVITY_SCALE = 1.5; // same constant as memory-assay-adapters.mjs, which does not export it
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function makeRule(name, fixture, config) {
  const c = makeCircuit(fixture), { model, rest, n } = c, mag = model.params.magnitude;
  const memory = new LocalSlowMemory(model, c.mapReversal, config);
  // The edge carries the effective gain (fast + slow) / 2, so gains() reports that, not the fast state alone.
  const effective = () => Float64Array.from(memory.edges, (_, i) => memory.effective(i));
  return {
    name, memory,
    frame({ kcH, danP, danR, dt }) {
      if (kcH.length !== n) throw Error('Invalid activity vector');
      const h = model.h[model.steps];
      h.fill(0); h.set(kcH); h[n] = danP; h[n + 1] = danR;
      memory.observe(rest, dt);
    },
    value: (_imageId, kcH) => {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += kcH[i] / ACTIVITY_SCALE * (mag[i] - mag[n + i]);
      return sum / fixture.s;
    },
    noteEvent() {},
    gains: () => { const e = effective(); return { P: e.slice(0, n), R: e.slice(n, 2 * n) }; },
    fastSlow: () => ({ gains: Float64Array.from(memory.gains), slow: Float64Array.from(memory.slow) }),
    stateHash: () => digest({ snapshot: memory.snapshot(), magnitude: [...mag] }),
    snapshot: () => memory.snapshot(),
    restore: s => memory.restore(s),
  };
}

export function register(registerRule) {
  const configs = { 'local-slow-v1-rho0.25': { rho: 0.25 }, 'local-slow-v1-rho0.5': { rho: 0.5 } };
  for (const [name, config] of Object.entries(configs)) registerRule(name, fixture => makeRule(name, fixture, config));
}
