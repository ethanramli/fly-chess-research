# Learning blockers: training-fixture diagnosis on 2026-10-06

2026-10-06. Researcher requested the specific problems and possible replacements so they can propose a fix. This is a diagnosis, not a selected replacement or a uniquely established cause.

Subsequent researcher proposal: [a new fixed MBON-choice condition](../neural-learning/mbon-choice.md) is now implemented and running with fresh seeds, preserving the existing encoder, plasticity and dynamics. Statements below about no selected replacement describe the initial diagnosis. Old GF failures and the unresolved biological/credit/transfer requirements remain intact.

Completed addendum: the new MBON condition passes all computational gates, including strict acquisition/reversal and ranking switches in 6/6 new seeds and effects above controls. This repairs the tested memory-to-choice bottleneck for this engineered condition. It does not repair absent puzzle neural delivery, establish natural downstream action control or satisfy delayed credit, broader adaptation or transfer. Original diagnoses/failures below remain historical evidence.

## Two different failures

The target remains experience-driven puzzle investigation, independently verified consequences, supported persistent neural adaptation and improved unfamiliar/counterfactual decisions. More turns, stored gains or successful external search do not prove this.

**The puzzle loop has no neural feedback delivery.** `FeedbackRecorder.receive` in [puzzle-round.mjs](../../../.codebase/src/lowram/puzzle-round.mjs) records an event and returns `appliedToNeurons: false`, `learningApplied: false`. The verifier checks bounded mate consequences, but the receiver cannot learn from them. This is missing integration, not a connected learner failing chess.

**The isolated association learner changes memory but not its GF choices on board/action cues.** The [frozen experiment](../chess-input/board-action-association.md) changes existing KC-to-MBON efficacy; reset/restoration changes responses causally. Acquisition and reversal nevertheless each yield only 3/6 correct choices. None of the six informative seeds changes its choice from baseline. These are counterbalanced experimental punishment contingencies, not verified chess consequences; six encoder seeds are not six different puzzle families.

The required path is:

`board + candidate -> activity -> choice -> verified consequence -> identified neural feedback -> lasting local state -> improved later choice`.

The puzzle path stops at a recorded consequence. The association path reaches persistent state but fails useful choice adaptation under the tested output. Connecting them now would not repair either problem.

## Which mechanisms may need replacement

| Component | Current implementation | Diagnosis and repair question |
|---|---|---|
| Puzzle feedback receiver | Record an event without neural delivery. | **Must be replaced for learning**, after mechanism prerequisites pass. What neural experience does a verified consequence deliver, through which identified pathway? |
| GF action readout | Two giant-fiber rates, fixed naive normalization, clipping, max aggregation, lower score preferred. | **Strongest redesign candidate.** Can this output carry sufficient memory-dependent action information to change rankings? No replacement is selected. |
| Activity dynamics | Restart at zero; eight signed, row-normalized, leaky rate updates. | **Unvalidated timing/physiology assumption.** Is the readout too early, or does the kernel suppress relevant propagation? Longer-horizon replay is proposed, not completed. |
| Board/action representation | Fixed token hashing directly stimulates a bounded eligible KC pool. | **Experimental sensory substitute.** Does it distinguish actions and preserve relationships needed for transfer? Overlap is measured, but not established as the cause. |
| Local plasticity | Source-inspired, endpoint-activity gain update on 870 existing KC-to-MBON edges. | **Provisional, not proven sole culprit.** It can learn synthetic preferences with an engineered MBON readout; mapping and kinetics remain biologically unvalidated. |
| Delayed neural credit | No implemented eligibility mechanism connecting an earlier choice to later feedback. | **Missing.** How is the appropriate earlier activity retained and reinforced without crediting unrelated actions? |
| Whole-model adaptation | Only these selected local efficacy gains adapt. | **Broader requirement unimplemented.** Which additional persistent physiological states may change through supported mechanisms and pathways? |

## The readout problem in exact terms

[gf-readout.mjs](../../../.codebase/src/lowram/gf-readout.mjs) calculates, for each GF cell i:

`normalized_i = (rate_i - naive_panel_min_i) / naive_panel_range_i`

`score(candidate) = max_i clip(normalized_i, 0, 1)`.

The association driver chooses A when `score(A) <= score(B)`, otherwise B. Calibration is frozen from a label-free naive input panel. The score and its lower-is-preferred convention are engineering assumptions, not measured danger probabilities.

A memory-induced rate change changes behavior only if it reverses the candidates' score ordering. Clipping can erase changes outside the panel range; max aggregation can ignore a change in the non-maximal cell. A response can also change without either issue and still retain its original ordering. Nonzero neural effects therefore do not establish adapted choice.

Unclipped diagnostics still yield 3/6 correct acquisition and reversal choices in this experiment. A diagnostic MBON contrast yields 6/6 acquisition and 5/6 reversal. That suggests an upstream signal worth investigating, but does not prove an adequate policy or authorize silently replacing the failed frozen GF condition. A different output requires a justified new condition, new seeds and frozen gates.

## What the memory rule actually does

[reversal-memory.mjs](../../../.codebase/src/lowram/reversal-memory.mjs) stores a gain g on each selected existing edge. Effective magnitude is `initial_magnitude * g`; neuron identities, topology and signs remain fixed. Coarse groups use MBON12/PPL103 and MBON01/PAM02 annotations, without exact synapse-coordinate compartment/receptor masks.

The current approximation uses endpoint excess activity relative to a resting probe:

`k = max(0, KC_activity - KC_rest) / 1.5`

`D = -mean(max(0, DAN_activity - DAN_rest) / 1.5)` within the mapped group

`g_next = clip(g + 0.5 * dt * D * (k + g - 1), 0.2, 1.8)`.

Numerical stability is checked; persistent gains and event count are checkpointed. This is an unfitted approximation of a published computational rule, not established receptor kinetics. Negative D is the selected modulatory polarity, not negative reward or negative firing. The [evidence card](../neural-learning/reversal-mechanism.md) links the pinned source and mapping limitations.

From g=1, k>0 and D<0 depress efficacy. When g<1 and k is small, appropriate nonzero modulation can recover efficacy. When D=0, nothing changes. Omitting punishment cannot therefore be assumed to erase an old memory; the network must supply the appropriate modulation. An unsupported negative update on omission would change the hypothesis rather than explain it.

The [synthetic recovery comparison](../neural-learning/recovery-comparison.md) passes computational association/reversal gates with an engineered MBON readout. This is evidence against calling this rule universally incapable of adaptation. It does not establish biological validity, a working GF choice interface, delayed credit or transferable chess learning. Replacing the rule solely because the combined system fails would be premature.

## What the neural dynamics assume

[trainer.mjs](../../../.codebase/src/lowram/trainer.mjs) uses:

`h[t+1] = (1-alpha) * h[t] + alpha * positive_saturated(W_signed * h[t] + drive)`.

The candidate uses float32, initial alpha 0.5, initial bias 0.01, row-normalized anatomical magnitudes with recurrent scale 0.9, and eight updates from zero on each presentation. Stimulation is held during the presentation. These are engineering constants, not fitted biological conductances/time constants. Eight updates have no established biological duration.

The anatomy audit has no annotated direct MBON-to-GF edges, although indirect paths exist. Reachability does not establish sufficient functional control. A short transient might miss downstream effects, or longer propagation might retain the wrong ordering. Neither explanation is established. Longer-horizon replay was proposed before this clarification, but has not run.

## What existing interventions establish

- Saved efficacy affects responses causally: reset/restoration reproduce changes. The failure is not simply failure to save/load memory.
- Removing clipping alone does not rescue the board/action choices.
- [Sixty post-training memory-subset replays](memory-ablation.md) change no choices. Removing shared stored changes after learning is insufficient; interference during acquisition remains possible.
- [Thirty-two nonempty unilateral efficacy-floor profiles](efficacy-floor.md) also change no clipped or signed choices. Four additional profiles have empty masks and are controls. These profiles do not cover every possible configuration or supported mechanism.

The evidence does not identify one defective equation. The unresolved issue is the composition of input representation, local memory, dynamics and output. The record-only receiver is definitely missing learning; the plasticity rule is not definitely the sole cause of the separate choice failure.

## What would make a proposed fix testable

Name the component, exact change, observations it explains and a new prediction distinguishing it from competing explanations. Separate sensory/readout engineering changes from changes to the neural learning mechanism.

A timing proposal can replay identical naive/acquired/reversed gains under prespecified horizons, requiring exact original eight-step reproduction without learning or calibration fitting. An output proposal needs identified cells, primary-source justification and a new frozen choice condition. A plasticity proposal needs local equations, compartment/modulatory mapping, eligibility timing, persistent fields and independent omission/reversal predictions. Preserve all completed failed gates.

Require informative feedback to cause reliably adapted choices compared with absent/shuffled/disabled controls, with causal reset/restoration, resumability and graph/sign/nonplastic invariants. After candidate association/reversal prerequisites, connect verified puzzle consequences with explicit delayed credit. Then test unaided and fixed-search-budget choices on disjoint unfamiliar families and counterexamples. Whole-model adaptation remains outstanding throughout.

Retain second-board search, independently checked bounded mate certificates and atomic infrastructure. Current teacher coverage still lacks complete exchange/compensation/sacrifice feedback and detailed attribution of missed defenses. Unknown verification must supply no fabricated failure or reinforcement.
