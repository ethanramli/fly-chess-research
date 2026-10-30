// Outcome-only coupled receiver (2026-10-27, researcher decision: Stockfish teaching set
// aside for Stage 1; research/journal/experiments/2026-10-27-stockfish-teaching-set-aside.md).
// CoupledStockfishBrainV5 with the informative arm taught exactly as its outcome-only mode:
// the verified task pulse, then the third (former Stockfish) frame with no channel. The
// three-frame session, the prepared engine estimate in each receipt and every control mode
// are unchanged; the matched-Stockfish-shuffle mode is refused. No engine signal changes
// memory under this protocol. The disabled control (plasticity off) still presents its third
// frame as in every earlier registration, which stores nothing.
import assert from 'node:assert/strict';
import { CoupledStockfishBrainV5 } from './coupled-stockfish-brain-v5.mjs';
import { digest } from '../neural-learning/mushroom-body.mjs';

export const OUTCOME_ONLY_PROTOCOL = 'verified-outcome-only-v1';
// Session mode delivered for each session mode requested by a registered arm.
export function deliveredMode(condition) {
  assert.notEqual(condition, 'shuffled', 'The outcome-only protocol has no Stockfish-error shuffle');
  return condition === 'informative' ? 'outcome-only' : condition;
}

export class CoupledOutcomeOnlyBrain extends CoupledStockfishBrainV5 {
  constructor(options, valueOptions) {
    super(options, valueOptions);
    this.coupledIdentity = digest({ schema: OUTCOME_ONLY_PROTOCOL, parent: this.coupledIdentity });
  }
  async replayCoupledFrame(review, prepared, options) {
    const pulse = await super.replayCoupledFrame(review, prepared, { ...options, condition: deliveredMode(options.condition) });
    return { ...pulse, requestedCondition: options.condition, feedbackProtocol: OUTCOME_ONLY_PROTOCOL };
  }
}
