// Two-state computational hypothesis; not measured visual-KC physiology or approved graph learning.
// Spec: research/reports/memory-retention-continuation-2026-10-31/coupled-memory-proposal.md
import { digest } from './mushroom-body.mjs';
import { LocalGatedMemory, stepLocalGated } from './local-gated-memory.mjs';

const SCHEMA = 'local-coupled-memory-v1';
export const COUPLED_DEFAULTS = Object.freeze({ kappa: 0.125, capacity: 2 });

// Exact affine 2x2 transition in local event time z; stable divided difference for tiny z.
export function stepCoupled({ gain, slow, trace, k, excess, deficit, dt }, config, { kappa, capacity }) {
  const local = stepLocalGated({ gain, trace, k, excess, deficit, dt }, config);
  const z = local.trace * config.eta * (excess + deficit) * dt;
  if (kappa === 0 || z === 0) return { ...local, slow };
  const T = 1 + kappa + kappa / capacity, det = kappa / capacity;
  const D = Math.sqrt(T * T - 4 * det), minus = -(T + D) / 2, plus = -2 * det / (T + D);
  const ep = Math.exp(plus * z), em = Math.exp(minus * z);
  const F = ep * -Math.expm1(-D * z) / D;
  const x = gain - local.target, y = slow - local.target;
  const nextGain = local.target + (em + F * (-1 - kappa - minus)) * x + F * kappa * y;
  const nextSlow = local.target + F * kappa / capacity * x + (em + F * (-kappa / capacity - minus)) * y;
  // Only roundoff-sized boundary excursions are repaired; larger errors fail rather than hide bad math.
  const bounded = value => {
    if (!Number.isFinite(value) || value < config.minGain - 1e-14 || value > config.maxGain + 1e-14) throw Error('Coupled transition outside bounds');
    return Math.max(config.minGain, Math.min(config.maxGain, value));
  };
  return { ...local, gain: bounded(nextGain), slow: bounded(nextSlow) };
}

export class LocalCoupledMemory extends LocalGatedMemory {
  constructor(model, mapping, { kappa = 0.125, capacity = 2, ...config } = {}) {
    super(model, mapping, config);
    if (!Number.isFinite(kappa) || kappa < 0 || !Number.isFinite(capacity) || capacity < 1) throw Error('Invalid coupling configuration');
    this.coupling = Object.freeze({ kappa, capacity });
    this.slow = new Float64Array(this.edges.length).fill(1);
    this.identity = digest({ schema: SCHEMA, parent: this.identity, coupling: this.coupling });
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
        const next = stepCoupled({ gain: before, slow: this.slow[offset], trace: this.traces[offset], k, excess, deficit, dt }, this.config, this.coupling);
        this.traces[offset] = next.trace; this.slow[offset] = next.slow;
        if (next.gain !== before) { this.gains[offset] = next.gain; this.model.setMagnitude(this.edges[offset], this.base[offset] * next.gain); changed++; }
      }
    }
    this.time += dt; if (pulsed) this.pulses++;
    return { changedEdges: changed, time: this.time, pulses: this.pulses, scope: 'Computational coupled-memory fixture; visible fast gain, event-gated hidden exchange' };
  }
  snapshot() { return { ...super.snapshot(), schema: SCHEMA, slow: [...this.slow] }; }
  restore(s) {
    const { minGain, maxGain } = this.config;
    if (s?.schema !== SCHEMA || s.identity !== this.identity || !Array.isArray(s.slow) || s.slow.length !== this.edges.length
      || !s.slow.every(v => Number.isFinite(v) && v >= minGain && v <= maxGain)) throw Error('Incompatible coupled state');
    // Parent validation is atomic and apply() expresses only the visible fast gain.
    super.restore({ ...s, schema: 'local-gated-memory-v1' });
    this.slow.set(s.slow);
  }
}
