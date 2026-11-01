// Places local-gated-v1 on the memory-assay fixture circuit (acceptance plan section 1). Candidate only: fixture use, not validated biology.
import { createHash } from 'node:crypto';
import { makeCircuit } from './memory-assay-adapters.mjs';
import { LocalGatedMemory } from './local-gated-memory.mjs';

const ACTIVITY_SCALE = 1.5; // same constant as memory-assay-adapters.mjs, which does not export it
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function makeRule(name, fixture, config = {}) {
  const c = makeCircuit(fixture), { model, rest, n } = c, mag = model.params.magnitude;
  const memory = new LocalGatedMemory(model, c.mapReversal, config);
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
    gains: () => ({ P: memory.gains.slice(0, n), R: memory.gains.slice(n, 2 * n) }),
    stateHash: () => digest({ snapshot: memory.snapshot(), magnitude: [...mag] }),
    snapshot: () => memory.snapshot(),
    restore: s => memory.restore(s),
  };
}

export function register(registerRule) {
  const configs = { 'local-gated-v1': {}, 'local-gated-v1-eta0.25': { eta: 0.25 }, 'local-gated-v1-theta0.1': { theta: 0.1 }, 'local-gated-v1-theta0.3': { theta: 0.3 } };
  for (const [name, config] of Object.entries(configs)) registerRule(name, fixture => makeRule(name, fixture, config));
}
