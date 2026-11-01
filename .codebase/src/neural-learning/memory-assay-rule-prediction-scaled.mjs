// Prediction-scaled teaching on existing stores (prediction-reservoir-proposal.md). Fixture microcircuit stand-in, not validated biology.
import { makeRule as reservoirRule } from './memory-assay-rule-local-reservoir.mjs';
import { makeRule as gatedRule } from './memory-assay-rule-local-gated.mjs';
import { DAN_REST } from './memory-assay-adapters.mjs';

// Fraction of the DAN range used by this pulse: large for a confident error, small for an expected outcome.
export function predictionScale(v, sigma, V0) {
  return Math.min(1, Math.max(0, (V0 - sigma * v) / (2 * V0)));
}

export function makePredictionRule(name, fixture, { store, eta, V0 }) {
  const inner = (store === 'reservoir' ? reservoirRule : gatedRule)(name, fixture, { eta });
  return {
    ...inner,
    frame({ kcH, danP, danR, dt }) {
      if (danP === DAN_REST && danR === DAN_REST) return inner.frame({ kcH, danP, danR, dt });
      const f = predictionScale(inner.value(null, kcH), danR > DAN_REST ? 1 : -1, V0);
      inner.frame({ kcH, danP: DAN_REST + (danP - DAN_REST) * f, danR: DAN_REST + (danR - DAN_REST) * f, dt });
    },
  };
}
