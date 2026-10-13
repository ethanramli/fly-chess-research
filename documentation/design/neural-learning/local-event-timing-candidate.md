# Local event timing candidate

2026-10-09. Disconnected numerical engineering hypothesis. This implements neither a fly training run nor a validated biochemical receptor model. [Source/mapping evidence and historical cue coverage](../../../research/reports/plasticity-timing-candidate-2026-10-09/README.md).

## Contract

The pure [step function](../../../.codebase/src/neural-learning/timing-plasticity-candidate.mjs) receives gain g, bounded KC/DAN traces x/y, bounded local phasic events k/d, elapsed model time and explicit configuration. No board, move, outcome, target weight, engine score or reward label enters it. It returns a new state without changing its inputs. Deriving phasic events from raw neural activity remains unimplemented: passing each tonic rate sample as another event would be a different and sampling-dependent mechanism.

For one event, first decay preceding traces:

`x0 = x * exp(-elapsed/tauKC); y0 = y * exp(-elapsed/tauDAN)`

Then form bounded traces and local drives:

`x1 = x0 + (1-x0)*k; y1 = y0 + (1-y0)*d`

`depression = d*x1; potentiation = k*y0`

Pass these drives through the existing bounded bidirectional integrator with eligibility=1 and integration interval eta (an event-dose coefficient, not elapsed physiological time). Thus coincidence from empty traces depresses, KC-before-DAN depresses and DAN-before-KC potentiates. Previous DAN trace can still interact with later overlapping events. These equations and their saturating traces are assistant engineering choices, not equations transcribed from Handler or a measured receptor pathway. They are deliberately registered as a hypothesis.

Handler 2019 supports the qualitative ordering in gamma2, with detailed receptor evidence chiefly from gamma4. The proposed map includes only 122 already mapped gamma-KC/MBON12 edges. No source establishes these exact gains, rate constants, saturation law or gamma2 receptor kinetics. Numerical test tau=1, eta=0.5, bounds 0.2/1.8 are software choices; no simulation-step-to-seconds conversion is asserted. This module does not certify the anatomical map or configure a graph adapter.

## What the tests establish

Four deterministic scalar test groups check isolated pairing direction, coincidence, single-event neutrality, delay attenuation, reversible bounds, quiet-trace decay, residual-credit interference, JSON state/config roundtrip and rejection without input mutation. Repeated scalar pairs reset traces explicitly between independent fixture episodes; that assumption is **not** biological retention or learned episode segmentation. Tests expose that a fresh DAN event changes an old gain while its KC trace remains. No permanent learning lock, external protected weight copy or rollback is implemented.

Serializing both state and configuration reproduces the next scalar transition. A production graph checkpoint must additionally bind schema, source/config identity, edge order, raw activity/event-extraction state, current episode and pending receipts; this module alone does not supply that contract.

## Remaining path to the requested solution

1. Define local activity-to-event conversion and an explicit timing model before connection to the graph. The teacher may schedule a declared cue/reinforcement experience, but must not provide k/d as hand-selected plasticity drives.
2. Check whether actual finite-duration neural activity produces the source-supported ordering. Endpoint samples alone cannot establish it. Keep informative feedback and matched controls for authorized graph work.
3. Compare the old versus timing rule under old versus gamma2 input pools on the same mask. The pool analysis found direct-coverage failures in the existing cues, so simultaneous changes would confound the result.
4. Test interleaved cue coexistence, finite-budget reversal and residual-trace interference while learning stays available. Add a source-supported stabilization process only if those failures require one. Slower adaptation alone is not retention, and this event-pair mechanism has no endogenous prediction-error stopping rule.
5. Require useful all-legal choices and untouched counterfactual/family transfer. This scalar module is not evidence that those gates pass.

The explicit no-training instruction remains in force. No prospective learner simulation or graph dynamics were run to implement this module. Frozen v4 sources/protocols remain preserved; no existing learner imports the new module.

2026-10-09 integration correction: naive rate-sample events fail the [sampling counterexample and source follow-up](dopamine-response-components.md). Keep this module disconnected; a rate-compatible signal component is being investigated.
