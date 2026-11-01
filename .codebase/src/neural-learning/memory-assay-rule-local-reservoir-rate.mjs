// Prospective two-stage latency comparison; equations unchanged, eta=1. Not calibrated fly physiology.
import { makeRule } from './memory-assay-rule-local-reservoir.mjs';
import { makeRule as localRule } from './memory-assay-rule-local-gated.mjs';
export function register(registerRule) {
  registerRule('local-reservoir-rate-v1',fixture=>makeRule('local-reservoir-rate-v1',fixture,{eta:1}));
  registerRule('local-reservoir-rate-v1-off',fixture=>localRule('local-reservoir-rate-v1-off',fixture));
}
