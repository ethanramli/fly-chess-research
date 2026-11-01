// Reservoir exit quadratic in DAN drive (supralinear-exit-proposal.md). Engineering hypothesis, not measured fly physiology.
import { digest } from './mushroom-body.mjs';
import { stepLocalGated } from './local-gated-memory.mjs';
import { LocalReservoirMemory } from './local-reservoir-memory.mjs';

export const EXIT_D0 = 0.25; // drive of a pulse at prediction scale .5, so exit equals the linear rule there
const SCHEMA = 'local-supralinear-reservoir-memory-v1';

export function stepSupralinearReservoir(input, states, config) {
  const local = stepLocalGated(input, config), drive = input.excess + input.deficit;
  if (drive === 0 || local.trace === 0) return { gain: input.gain, trace: local.trace, states };
  const base = local.trace * config.eta * drive * input.dt;
  const p = -Math.expm1(-base), px = -Math.expm1(-base * (drive / EXIT_D0));
  const pd = p * input.excess / drive, pu = p * input.deficit / drive, xd = px * input.excess / drive, xu = px * input.deficit / drive;
  const [s0, s1, w0, w1] = states, remain = 1 - p;
  const next = [remain * s0 + xd * s1, (1 - xd) * s1 + pu * (s0 + w0), remain * w0 + xu * w1, (1 - xu) * w1 + pd * (w0 + s0)];
  const total = next.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total) || Math.abs(total - 1) > 1e-12 || next.some(x => !Number.isFinite(x) || x < 0)) throw Error('Invalid reservoir probability mass');
  for (let i = 0; i < 4; i++) next[i] /= total; // rounding drift only; the transfers conserve mass analytically
  return { gain: config.minGain + (config.maxGain - config.minGain) * (next[0] + next[1]), trace: local.trace, states: next };
}

export class LocalSupralinearReservoirMemory extends LocalReservoirMemory {
  constructor(model, mapping, config = {}) {
    super(model, mapping, config);
    this.identity = digest({ schema: SCHEMA, parent: this.identity, exitD0: EXIT_D0 });
  }
  observe(rest, dt = 1) {
    const h = this.model.h[this.model.steps], { activityScale: scale } = this.config;
    if (rest.length !== this.model.n || !Number.isFinite(dt) || dt <= 0) throw Error('Invalid observation interval');
    for (const g of this.mapping.groups) for (const i of [...g.kc, ...g.dan.map(d => d.index)]) if (!Number.isFinite(h[i]) || !Number.isFinite(rest[i])) throw Error('Nonfinite local activity');
    let offset = 0, changed = 0, pulsed = false;
    for (const g of this.mapping.groups) {
      let excess = 0, deficit = 0;
      for (const { index } of g.dan) { excess += Math.max(0, h[index] - rest[index]) / scale; deficit += Math.max(0, rest[index] - h[index]) / scale; }
      excess /= g.dan.length; deficit /= g.dan.length; pulsed ||= excess + deficit > 0;
      for (let i = 0; i < g.edges.length; i++, offset++) {
        const k = Math.min(1, Math.max(0, h[g.kc[i]] - rest[g.kc[i]]) / scale), before = this.gains[offset];
        const next = stepSupralinearReservoir({ gain: before, trace: this.traces[offset], k, excess, deficit, dt }, this.states.subarray(4 * offset, 4 * offset + 4), this.config);
        this.states.set(next.states, 4 * offset); this.traces[offset] = next.trace;
        if (next.gain !== before) { this.gains[offset] = next.gain; this.model.setMagnitude(this.edges[offset], this.base[offset] * next.gain); changed++; }
      }
    }
    this.time += dt; if (pulsed) this.pulses++;
    return { changedEdges: changed, time: this.time, pulses: this.pulses, scope: 'Local mean-field reservoir fixture with quadratic exit' };
  }
}
