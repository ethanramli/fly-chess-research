// Family 2 candidate (local-slow-v1), not validated biology. Fixture use only.
// Fast gain follows local-gated-v1. One slow state per edge follows the fast gain during eligible pulses.
// Benna and Fusi motivate a coupled hidden state; this one-way mix is a simpler engineering approximation.
// Spec: research/reports/overnight-memory-plasticity-2026-10-31/acceptance-plan.md addendum v1.4
import { digest } from './mushroom-body.mjs';
import { LocalGatedMemory, stepLocalGated } from './local-gated-memory.mjs';

const SCHEMA = 'local-slow-memory-v1';

// `rate` is the fast step's e*(a+b); zero when the edge is not eligible or no DAN deviates from rest.
export const stepSlow = ({ slow, fast, rate, dt }, rho) => fast + (slow - fast) * Math.exp(-rho * rate * dt);

export class LocalSlowMemory extends LocalGatedMemory {
  constructor(model, mapping, { rho, ...config } = {}) {
    super(model, mapping, config);
    if (!Number.isFinite(rho) || rho <= 0) throw Error('Invalid slow rate');
    this.rho = rho;
    this.slow = new Float64Array(this.edges.length).fill(1);
    this.identity = digest({ schema: SCHEMA, parent: this.identity, rho });
  }
  // `gains` holds the fast state; the edge carries the mean of fast and slow.
  observe(rest, dt = 1) {
    const h = this.model.h[this.model.steps], { activityScale: scale, eta } = this.config;
    if (rest.length !== this.model.n || !Number.isFinite(dt) || dt <= 0) throw Error('Invalid observation interval');
    for (const g of this.mapping.groups) for (const i of [...g.kc, ...g.dan.map(d => d.index)]) if (!Number.isFinite(h[i]) || !Number.isFinite(rest[i])) throw Error('Nonfinite local activity');
    let offset = 0, changed = 0, pulsed = false;
    for (const g of this.mapping.groups) {
      let excess = 0, deficit = 0;
      for (const { index } of g.dan) { excess += Math.max(0, h[index] - rest[index]) / scale; deficit += Math.max(0, rest[index] - h[index]) / scale; }
      excess /= g.dan.length; deficit /= g.dan.length;
      pulsed ||= excess + deficit > 0;
      for (let i = 0; i < g.edges.length; i++, offset++) {
        const k = Math.min(1, Math.max(0, h[g.kc[i]] - rest[g.kc[i]]) / scale), before = this.gains[offset];
        const next = stepLocalGated({ gain: before, trace: this.traces[offset], k, excess, deficit, dt }, this.config);
        this.traces[offset] = next.trace;
        const rate = next.trace * eta * (excess + deficit);
        if (rate > 0) {
          this.gains[offset] = next.gain;
          this.slow[offset] = stepSlow({ slow: this.slow[offset], fast: next.gain, rate, dt }, this.rho);
          this.model.setMagnitude(this.edges[offset], this.base[offset] * this.effective(offset));
          changed++;
        }
      }
    }
    this.time += dt; if (pulsed) this.pulses++;
    return { changedEdges: changed, time: this.time, pulses: this.pulses, scope: 'Fixture candidate; mean of fast and slow gain on the edge' };
  }
  effective(i) { return (this.gains[i] + this.slow[i]) / 2; }
  apply() { for (let i = 0; i < this.edges.length; i++) this.model.setMagnitude(this.edges[i], this.base[i] * this.effective(i)); }
  snapshot() { return { ...super.snapshot(), schema: SCHEMA, slow: [...this.slow] }; }
  restore(s) {
    const { minGain, maxGain } = this.config;
    if (s?.schema !== SCHEMA || s.identity !== this.identity || !Array.isArray(s.slow) || s.slow.length !== this.edges.length
      || !s.slow.every(v => Number.isFinite(v) && v >= minGain && v <= maxGain)) throw Error('Incompatible candidate state');
    // The parent validates its own fields and calls apply(), so slow must be in place first; undo on failure.
    const previous = Float64Array.from(this.slow);
    this.slow.set(s.slow);
    try { super.restore({ ...s, schema: 'local-gated-memory-v1', identity: this.identity }); }
    catch (error) { this.slow.set(previous); throw error; }
  }
}
