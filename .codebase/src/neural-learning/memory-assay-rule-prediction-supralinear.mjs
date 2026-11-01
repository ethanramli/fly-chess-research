// prediction-reservoir-v1.1 with quadratic reservoir exit (supralinear-exit-proposal.md). Fixture candidate only, not validated biology.
import { createHash } from 'node:crypto';
import { makeCircuit, DAN_REST } from './memory-assay-adapters.mjs';
import { LocalSupralinearReservoirMemory } from './local-supralinear-reservoir-memory.mjs';
import { predictionScale } from './memory-assay-rule-prediction-scaled.mjs';

export const FROZEN = Object.freeze({ eta: 2, V0: 1.2 });
const ACTIVITY_SCALE = 1.5; // same constant as memory-assay-adapters.mjs, which does not export it
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function makeRule(name, fixture, config = FROZEN) {
  const c = makeCircuit(fixture), { model, rest, n } = c, mag = model.params.magnitude;
  const memory = new LocalSupralinearReservoirMemory(model, c.mapReversal, config);
  const value = (_imageId, kcH) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += kcH[i] / ACTIVITY_SCALE * (mag[i] - mag[n + i]);
    return sum / fixture.s;
  };
  const write = (kcH, danP, danR, dt) => {
    if (kcH.length !== n) throw Error('Invalid activity vector');
    const h = model.h[model.steps];
    h.fill(0); h.set(kcH); h[n] = danP; h[n + 1] = danR;
    memory.observe(rest, dt);
  };
  return {
    name, memory, value,
    frame({ kcH, danP, danR, dt }) {
      if (danP === DAN_REST && danR === DAN_REST) return write(kcH, danP, danR, dt);
      const f = predictionScale(value(null, kcH), danR > DAN_REST ? 1 : -1, config.V0);
      write(kcH, DAN_REST + (danP - DAN_REST) * f, DAN_REST + (danR - DAN_REST) * f, dt);
    },
    noteEvent() {},
    gains: () => ({ P: memory.gains.slice(0, n), R: memory.gains.slice(n, 2 * n) }),
    stateHash: () => digest({ snapshot: memory.snapshot(), magnitude: [...mag] }),
    snapshot: () => memory.snapshot(),
    restore: s => memory.restore(s),
  };
}

export function register(registerRule) {
  registerRule('prediction-supralinear-v1', fixture => makeRule('prediction-supralinear-v1', fixture));
}
