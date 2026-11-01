// Diagnostic only (addendum v1.5): not a candidate, cannot earn READY. A numerical stand-in for MBON-to-DAN feedback; no such wiring is modelled.
import { makeRule } from './memory-assay-rule-local-gated.mjs';
import { DAN_REST } from './memory-assay-adapters.mjs';

const NAME = 'diag-selflimit-local-gated-v1';
const V0 = 0.64; // addendum v1.5: largest value reachable at mean activity 0.8
const clamp = x => Math.min(1, Math.max(0, x));

export function register(registerRule) {
  registerRule(NAME, fixture => {
    const inner = makeRule(NAME, fixture);
    return {
      ...inner,
      frame({ kcH, danP, danR, dt }) {
        const v = inner.value(null, kcH);
        const f = danR > DAN_REST ? clamp(1 - v / V0) : danP > DAN_REST ? clamp(1 + v / V0) : 1;
        if (f === 1) inner.frame({ kcH, danP, danR, dt }); // no pulse, or full strength: unchanged
        else inner.frame({ kcH, danP: DAN_REST + (danP - DAN_REST) * f, danR: DAN_REST + (danR - DAN_REST) * f, dt });
      },
    };
  });
}
