# Rate-compatible dopamine response components

2026-10-09. Source-motivated signal component, disconnected from graph learning. [Implementation](../../../.codebase/src/neural-learning/dopamine-response-components.mjs). It is not a solved retention rule or validated receptor model.

## Evidence and correction

The initial local event candidate cannot be connected by treating every firing-rate sample as an event. A [deliberate misuse counterexample](../../../archive/early-development/research/reports/plasticity-timing-candidate-2026-10-09/event-sampling.json) starts gain at 0.3 and supplies the same one-unit constant-rate block as 1, 10 or 100 unit-amplitude events: final gains are 0.26065, 0.95990 and 0.99600. Even update direction changes. This does not violate its discrete-event contract, but rejects the naive rate adapter. Preserve the event candidate as an unintegrated comparator; do not claim its tests established sustained-rate behavior.

Further source inspection recovered Gkanias's [primary article XML](https://raw.githubusercontent.com/elifesciences/elife-article-xml/master/articles/elife-75611-v1.xml) and [authors' timing implementation](https://github.com/InsectRobotics/IncentiveCircuit/blob/1610c80072fe8bb59bd397e7a61f716393a509b9/src/incentive/handler.py). Local raw copies are in the [research report](../../../archive/early-development/research/reports/plasticity-timing-candidate-2026-10-09/README.md). The code uses separate short/long relaxation coefficients and their difference in the plasticity rule. Unlike the previously cached generic models_base.py, this is the timing-specific implementation. The article treats the components as abstract local signals, not proven receptor concentrations. It also says backward conditioning in that model requires inhibitory MBON-to-DAN feedback. Its reduced circuit cannot be imported as the released graph.

There is an unresolved text/code distinction: displayed equations 35/36 in the retrieved MathML use a shared decay coefficient, whereas handler.py uses distinct component coefficients. The implementation here follows the separate-filter structure in the code as a **continuous-time approximation**, not a verbatim transcription or claimed reproduction of every published equation. The timing code has an MIT header while the repository-level cached license is GPLv3+; no source body was copied into the production module. Downloaded source is preserved for inspection with attribution.

## Minimal component and assumptions

For one local nonnegative model rate r, let s and l be short/long response states:

`ds/dt=(r-s)/tauShort; dl/dt=(r-l)/tauLong; factor=l-s`

Each relaxation has the exact constant-input update `xNext = x + (r-x)*(1-exp(-dt/tau))`. Short time constant must be positive and less than long. The source code uses discrete coefficients `1-1/tau`; using physical continuous time is a declared adaptation. A source coefficient can be matched at a specified reference interval via `tauContinuous=-dtReference/log(1-1/tauDiscrete)` when tauDiscrete>1. Current fly time is uncalibrated, so no source sample count is silently called seconds.

At pulse onset the short component leads, giving a negative factor; after offset it decays faster and the remaining long component can give a positive factor. Both component states remain nonnegative. The sign belongs to an abstract local plasticity signal, not negative dopamine concentration and not a chess label. At constant steady input the factor is zero. This adaptation is numerical and mechanistic motivation only, not measured receptor kinetics or evidence of prediction-error learning.

Tests establish exact constant-input partition agreement within numerical tolerance, pulse onset/offset sign, bounded components, zero factor at equilibrium, JSON state continuation and invalid-input rejection. They do not establish partition invariance of a future synaptic integration loop, which must integrate the varying factor instead of repeatedly treating endpoints as whole events.

## Required integration work

Use actual modeled local DAN activity and define the rate/baseline interpretation. Do not substitute a teacher valence sign or append the source's `-MBON` term to the released graph. Check existing signed pathways and whether their dynamics provide the feedback required by the source model. Abstract component polarity remains a compartment hypothesis, not a claim that every mapped DAN shares it.

Define KC credit and integrate gain with time resolution checks. A long positive tail alone does not establish selective potentiation; it can interact with other cues, and the source weight rule retains inactive recovery/saturation. The bounded alternative is a distinct engineering condition, not the source rule. Evaluate cue overlap and interleaved retention, with original failures preserved and learning always revisable. Neither this component nor resetting traces is a solution to the stability/plasticity tradeoff.

No model/graph run, training, teacher-derived neural delta, weight freeze or trained readout was introduced. Next work is static feedback-path feasibility followed by a reviewed, bounded integration contract; empirical validation remains essential under the user's no-training boundary.
