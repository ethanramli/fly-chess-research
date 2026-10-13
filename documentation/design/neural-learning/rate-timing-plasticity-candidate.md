# Integrated local rate-timing candidate

2026-10-09. Disconnected mathematical candidate; no graph dynamics or training. [Code](../../../.codebase/src/neural-learning/rate-timing-plasticity-candidate.mjs), [tests](../../../.codebase/tests/neural-learning/rate-timing-plasticity-candidate.test.mjs).

## Static feedback-path result

The [complete direct/two-edge scan](../../../research/reports/plasticity-timing-candidate-2026-10-09/feedback-paths.json) over the pinned sparse graph found eight direct MBON12-to-PPL103 edges, all positive, and 129 two-edge paths, 84 with negative sign products. Existing inhibitory relay paths therefore warrant investigation, but path signs do not establish net inhibition in the recurrent dynamics. The source timing model's direct `-MBON` feedback cannot be copied into this graph. No paths, signs or magnitudes were changed. The audit read annotations and sparse arrays, not model activity; observed peak RSS was 78.54 MiB for this static task only, not a runtime performance claim.

## Rate-to-gain contract

The [two response components](dopamine-response-components.md) are driven by a nonnegative local DAN rate. KC credit e follows `de/dt=(k-e)/tauKC`, with k and e bounded in [0,1]. Rates must come from a declared local activity normalization; no teacher label, target gain or board enters the function. Gain obeys the previously declared engineering branch:

`dg/dt = eta*e*[max(delta,0)*(gmax-g) - max(-delta,0)*(g-gmin)]`

Here delta=long-short. The response filters are source-motivated; this gain equation and KC credit filter are engineering hypotheses, not the Gkanias source weight rule or a measured receptor mechanism. Time constants, eta and gain limits must all be explicitly configured and pinned. This module does not calibrate biological time or select parameters from chess answers.

For constant k and DAN rate r over an interval, delta(t) is a difference of exponentials and e(t) is a constant plus an exponential. Delta has at most one interior zero. Split at that zero, analytically integrate e(t)*delta(t), and use the exact bounded gain update separately for each sign. This accounts for potentiation and depression within one interval instead of applying an endpoint sign to its entire duration. All four states—gain, KC trace, short response and long response—are returned and must be checkpointed with configuration and episode identity.

Numerical checks compare an interval against 2, 10, 100 and 1,000 subdivisions, including an internal sign reversal, with state and integrated-dose tolerances of 1e-11. Other checks cover onset depression, offset-tail potentiation, unchanged gain without KC history, escape from the lower bound and JSON continuation without input mutation. These validate piecewise-constant scalar integration only. Interpolating actual recurrent samples, physiological signal interpretation and graph persistence are not thereby validated.

## What this does not solve

Residual KC credit can still associate later DAN activity with an earlier cue. The positive response tail is not automatically useful feedback, and may undo acquisition or affect another cue. With nonzero basal KC activity, normalization matters. No learned expectation or endogenous stopping/error computation is supplied. There is no stabilization mechanism or evidence of acquired all-legal choices, coexistence, reversal or transfer.

Next: bind the existing sparse rate trajectory to this integrator with explicit reference/baseline, per-cell component states, interval duration, reset semantics, and disabled-plasticity behavior. Preserve direct positive feedback and existing indirect paths. Then prepare the matched rule/input-pool conditions; only an authorized experiment can establish dynamic feedback, retention and behavior. The no-training instruction remains active.

2026-10-09 full-waveform qualification: [complete-pulse arithmetic](../../../research/reports/plasticity-timing-candidate-2026-10-09/complete-pulses.json) shows timing-sensitive net direction and timing-dependent repeated-pulse equilibria. Isolated tail potentiation is insufficient to certify a teaching schedule or an accuracy-sensitive stopping rule.
