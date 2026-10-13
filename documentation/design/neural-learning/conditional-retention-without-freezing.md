# Conditional retention and revisability without freezing

2026-10-09. Analytical consequences of the existing candidate, not graph or biological validation. [Reproducible arithmetic](../../../research/reports/plasticity-timing-candidate-2026-10-09/derive-retention-reversal.mjs) and [output](../../../research/reports/plasticity-timing-candidate-2026-10-09/retention-reversal-bounds.json).

## Correction to the preceding interpretation

The complete-pulse analysis showed timing-dependent direction and fixed points. It did **not** prove the candidate requires an accuracy-sensitive stopping signal before any association assay is meaningful. Bounded associative rules can converge while remaining revisable. An endogenous prediction-error circuit may help, but its absence is not an additional universal prerequisite. Calling the 1.2-to-0.6 model-time shift simply a small timing change also overstated the result: it halves the lead and crosses the tested timing window. Preserve the observations; qualify their interpretation. Actual waveform robustness remains necessary.

## A sufficient inactive-cue protection bound

The candidate's KC eligibility e obeys `de/dt=(k-e)/tauKC`. When local KC input k remains zero, `e(t)=e0*exp(-t/tauKC)`. If the local DAN rate and its two filter states are bounded in [0,R], then `abs(delta)<=R`. For the bounded gain rule, both distances from the gain bounds are no greater than `gmax-gmin`, so:

`abs(dg/dt) <= (gmax-gmin)*eta*R*e0*exp(-t/tauKC)`

Integrating over the entire future gives:

`total future absolute gain variation <= (gmax-gmin)*eta*R*e0*tauKC`.

This holds for any subsequent DAN waveform satisfying that rate bound while k stays zero, including repeatedly reinforced unrelated cues. It requires no frozen weights and no periodic snapshot restoration. A prior quiet model-time gap reduces e0 exponentially. With the current numerical tauKC=0.4, eta=0.5 and gain range 1.6, the bound after a four-unit quiet gap is 0.00009686 if R=10/1.5. Those numbers use the existing model saturation/activity scale as a possible bound; they are not measured biological time, rates or retention. Quiet CPU time does not reduce a modeled trace.

The invariant survives reactivation: k>0 raises eligibility again, allowing later local feedback to change the same gain. Thus this mechanism can be selectively stable during inactivity and remain plastic on recurrence. It does not permanently classify a synapse as protected.

The crucial limit is shared or recurrently driven KC activity. If another cue activates the same KC, k is not zero and this guarantee no longer applies. The real candidate's static encoder has up to three shared stimulated cells between legal actions; recurrent activation can further change overlap. Input-set separation alone cannot establish the premise. The next graph assay must measure actual per-cue KC activity, eligibility and all-legal behavioral interference.

## Finite scalar reversibility

For isolated complete-pulse maps, the gain transition is affine, `gNext=a*g+b`, with 0<a<1. Hence `gAfterN=gStar+(gStart-gStar)*a^N`. The stored simultaneous-pulse map crosses from 1.8 to below 1 in 27 repetitions. The stored 1.2-unit DAN-lead map crosses from 0.2 to above 1 in 63 repetitions. These are closed-form calculations from already stored maps; no new learner was trained and no timing/parameter was selected to match a chess answer.

Assumptions include the exact scalar rates, unchanged pulse shape, and negligible traces between pulses. Gain crossing is not a correct move, useful margin or behavioral reversal. Do not translate these counts into a promised graph-training budget. They show that numerical stability has not made either direction inaccessible under these assumptions. The old frozen 28-slot protocol and thresholds stay unchanged; any distinct mechanism protocol must be separately declared before experimental outcomes exist.

## Next decision

Proceed with a reviewed controlled assay once its remaining integration is ready. Measure whether the actual dynamics meet these conditional premises and whether retained, reversible gains support useful choices. Add a separate source-supported stabilization mechanism only if relevant coexistence tests fail. Do not keep adding untested components solely because no biological guarantee exists. Keep the no-training instruction until the user explicitly authorizes execution; software preparation and these analytical results do not satisfy the full goal.
