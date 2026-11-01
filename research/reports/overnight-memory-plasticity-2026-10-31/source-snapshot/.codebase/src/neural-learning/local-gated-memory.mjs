// Family 1 candidate (local-gated-v1), not validated biology. Fixture use only; no graph or training approval.
// Direction: active KC with DAN above rest weakens, with DAN suppressed strengthens: the fitted model rule of
// Huang et al., Nature 2024, not a measured synaptic rule. Threshold, trace and numbers are engineering choices.
// Spec: research/reports/overnight-memory-plasticity-2026-10-31/candidate-spec.md
import { digest } from './mushroom-body.mjs';

export const LOCAL_GATED_DEFAULTS = Object.freeze({ eta: 0.5, minGain: 0.2, maxGain: 1, activityScale: 1.5, theta: 0.2, tauE: 0.5 });
const SCHEMA = 'local-gated-memory-v1';

// Exact for k, excess and deficit held over dt; g is integrated with the end-of-interval trace.
export function stepLocalGated({ gain, trace, k, excess, deficit, dt }, { eta, theta, tauE, minGain, maxGain }) {
  const target = Math.min(1, Math.max(0, (k - theta) / (1 - theta)));
  const nextTrace = target + (trace - target) * Math.exp(-dt / tauE);
  const a = eta * excess, b = eta * deficit, rate = nextTrace * (a + b);
  if (rate === 0) return { gain, trace: nextTrace, target: null };
  const gStar = (a * minGain + b * maxGain) / (a + b);
  return { gain: gStar + (gain - gStar) * Math.exp(-rate * dt), trace: nextTrace, target: gStar };
}

export class LocalGatedMemory {
  constructor(model, mapping, config = {}) {
    const c = { ...LOCAL_GATED_DEFAULTS, ...config };
    if (![c.eta, c.minGain, c.maxGain, c.activityScale, c.theta, c.tauE].every(Number.isFinite) || c.eta <= 0 || c.minGain <= 0
      || c.minGain >= 1 || c.maxGain < 1 || c.activityScale <= 0 || c.theta < 0 || c.theta >= 1 || c.tauE <= 0) throw Error('Invalid candidate configuration');
    this.model = model; this.mapping = mapping; this.config = Object.freeze(c);
    this.edges = mapping.groups.flatMap(g => g.edges);
    if (!this.edges.length || new Set(this.edges).size !== this.edges.length) throw Error('Invalid candidate edge mask');
    for (const g of mapping.groups) {
      if (!g.dan.length || g.edges.length !== g.kc.length) throw Error('Invalid local group');
      for (let i = 0; i < g.edges.length; i++) {
        const e = g.edges[i];
        if (!Number.isSafeInteger(e) || e < 0 || e >= model.graph.col.length || model.graph.sign[e] !== 1 || model.graph.col[e] !== g.kc[i]) throw Error('Invalid existing plastic edge');
      }
      if (g.dan.some(d => !Number.isSafeInteger(d.index) || d.index < 0 || d.index >= model.n)) throw Error('Invalid DAN mapping');
    }
    this.base = Float32Array.from(this.edges, e => model.params.magnitude[e]);
    if (!this.base.every(v => Number.isFinite(v) && v > 0)) throw Error('Invalid base efficacy');
    this.gains = new Float64Array(this.edges.length).fill(1);
    this.traces = new Float64Array(this.edges.length);
    this.time = 0; this.pulses = 0;
    this.identity = digest({ schema: SCHEMA, mapping, config: c, model: model.config, base: [...this.base] });
  }
  // Rates in model.h[model.steps] are held for dt model time units.
  observe(rest, dt = 1) {
    const h = this.model.h[this.model.steps], { activityScale: scale } = this.config;
    if (rest.length !== this.model.n || !Number.isFinite(dt) || dt <= 0) throw Error('Invalid observation interval');
    // Validate the complete local observation before any state mutation.
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
        if (next.gain !== before) { this.gains[offset] = next.gain; this.model.setMagnitude(this.edges[offset], this.base[offset] * next.gain); changed++; }
      }
    }
    this.time += dt; if (pulsed) this.pulses++;
    return { changedEdges: changed, time: this.time, pulses: this.pulses, scope: 'Fixture candidate; DAN deviation from rest; not reconstructed dopamine release' };
  }
  apply() { for (let i = 0; i < this.edges.length; i++) this.model.setMagnitude(this.edges[i], this.base[i] * this.gains[i]); }
  snapshot() { return { schema: SCHEMA, identity: this.identity, time: this.time, pulses: this.pulses, gains: [...this.gains], traces: [...this.traces] }; }
  restore(s) {
    const { minGain, maxGain } = this.config, n = this.edges.length;
    if (s?.schema !== SCHEMA || s.identity !== this.identity || !Number.isFinite(s.time) || s.time < 0 || !Number.isSafeInteger(s.pulses) || s.pulses < 0
      || !Array.isArray(s.gains) || s.gains.length !== n || !s.gains.every(v => Number.isFinite(v) && v >= minGain && v <= maxGain)
      || !Array.isArray(s.traces) || s.traces.length !== n || !s.traces.every(v => Number.isFinite(v) && v >= 0 && v <= 1)) throw Error('Incompatible candidate state');
    this.gains.set(s.gains); this.traces.set(s.traces); this.time = s.time; this.pulses = s.pulses; this.apply();
  }
}
