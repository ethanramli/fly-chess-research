// Gkanias source-rule comparison with engineered action eligibility.
// Retains inactive-edge recovery; therefore interference remains possible.
import { ReversalMemory } from './reversal-memory.mjs';
import { digest } from './mushroom-body.mjs';

export class DelayedReversalMemory extends ReversalMemory {
  constructor(model, mapping, { tau = 4, ...config } = {}) {
    super(model, mapping, config);
    if (!Number.isFinite(tau) || tau <= 0) throw Error('Invalid eligibility lifetime');
    this.config = { ...this.config, tau };
    this.identity = digest({ schema: 'delayed-reversal-memory-v1', mapping, config: this.config,
      model: model.config, base: [...this.base] });
    this.eligibility = new Float64Array(this.edges.length);
    this.active = false; this.elapsed = 0;
  }
  tagAction(rest) {
    if (this.active || rest.length !== this.model.n) throw Error('Invalid action eligibility episode');
    const h = this.model.h[this.model.steps];
    const cells = this.mapping.groups.flatMap(g => g.kc);
    if (cells.some(i => !Number.isFinite(h[i]) || !Number.isFinite(rest[i]))) throw Error('Nonfinite action activity');
    for (let i = 0; i < cells.length; i++)
      this.eligibility[i] = Math.min(1, Math.max(0, h[cells[i]] - rest[cells[i]]) / this.config.activityScale);
    this.active = true; this.elapsed = 0;
  }
  advance(dt) {
    if (!this.active || !Number.isFinite(dt) || dt < 0 || !Number.isFinite(this.elapsed + dt))
      throw Error('Invalid eligibility interval');
    const decay = Math.exp(-dt / this.config.tau);
    for (let i = 0; i < this.eligibility.length; i++) this.eligibility[i] *= decay;
    this.elapsed += dt;
  }
  observe(rest, dt = 1) {
    if (!this.active || rest.length !== this.model.n || !Number.isFinite(dt) || dt <= 0 || dt > 1)
      throw Error('Invalid delayed observation');
    const h = this.model.h[this.model.steps], { eta, activityScale, minGain, maxGain } = this.config;
    const rates = this.mapping.groups.map(g => {
      if (g.dan.some(c => !Number.isFinite(h[c.index]) || !Number.isFinite(rest[c.index])))
        throw Error('Nonfinite local reinforcement activity');
      const rate = g.dan.reduce((sum,c) => sum + Math.max(0,h[c.index]-rest[c.index]) / activityScale,0) / g.dan.length;
      if (!Number.isFinite(rate)) throw Error('Nonfinite reinforcement rate');
      return rate;
    });
    let offset = 0, changed = 0, recovered = 0;
    for (let group = 0; group < this.mapping.groups.length; group++) {
      const multiplier = Math.exp(-eta * rates[group] * dt);
      for (const edge of this.mapping.groups[group].edges) {
        const before = this.gains[offset], equilibrium = 1 - this.eligibility[offset];
        const after = Math.max(minGain,Math.min(maxGain,equilibrium + (before-equilibrium)*multiplier));
        if (after !== before) changed++; if (after > before) recovered++;
        this.gains[offset++] = after;
      }
    }
    this.events++; this.apply();
    return { rates, changedEdges: changed, recoveredEdges: recovered, events: this.events,
      scope: 'Measured local DAN and root activity trace; source-rule computational adaptation, not biological validation' };
  }
  endEpisode() { this.active = false; this.elapsed = 0; this.eligibility.fill(0); }
  snapshot() {
    return { ...super.snapshot(), schema: 'delayed-reversal-memory-v1', active: this.active,
      elapsed: this.elapsed, eligibility: [...this.eligibility] };
  }
  restore(s) {
    if (s.schema !== 'delayed-reversal-memory-v1' || typeof s.active !== 'boolean'
      || !Number.isFinite(s.elapsed) || s.elapsed < 0 || !Array.isArray(s.eligibility)
      || s.eligibility.length !== this.eligibility.length || !s.eligibility.every(e => Number.isFinite(e) && e >= 0 && e <= 1)
      || (!s.active && (s.elapsed !== 0 || s.eligibility.some(e => e !== 0)))) throw Error('Incompatible eligibility checkpoint');
    super.restore(s); this.active = s.active; this.elapsed = s.elapsed; this.eligibility.set(s.eligibility);
  }
}
