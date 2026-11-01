// v1 with V0 inside the memory identity, so a snapshot from another V0 is refused (review defect in v1's S5). Same equations and frames.
import { makeRule as reservoirRule } from './memory-assay-rule-local-reservoir.mjs';
import { predictionScale } from './memory-assay-rule-prediction-scaled.mjs';
import { DAN_REST } from './memory-assay-adapters.mjs';

export const FROZEN = Object.freeze({ eta: 2, V0: 1.2 });

export function makeFrozenRule(name, fixture, config = FROZEN) {
  const inner = reservoirRule(name, fixture, config);
  return {
    ...inner,
    frame({ kcH, danP, danR, dt }) {
      if (danP === DAN_REST && danR === DAN_REST) return inner.frame({ kcH, danP, danR, dt });
      const f = predictionScale(inner.value(null, kcH), danR > DAN_REST ? 1 : -1, config.V0);
      inner.frame({ kcH, danP: DAN_REST + (danP - DAN_REST) * f, danR: DAN_REST + (danR - DAN_REST) * f, dt });
    },
  };
}

export function register(registerRule) {
  registerRule('prediction-reservoir-v1.1', fixture => makeFrozenRule('prediction-reservoir-v1.1', fixture));
}
