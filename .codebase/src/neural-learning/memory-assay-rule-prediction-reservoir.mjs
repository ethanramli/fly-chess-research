// Frozen setting chosen by the declared grid rule (prediction-reservoir-proposal.md): largest minimum slack. Fixture use only.
import { makePredictionRule } from './memory-assay-rule-prediction-scaled.mjs';
export const FROZEN = Object.freeze({ store: 'reservoir', eta: 2, V0: 1.2 });
export function register(registerRule) {
  registerRule('prediction-reservoir-v1', fixture => makePredictionRule('prediction-reservoir-v1', fixture, FROZEN));
}
