# Verified consequence lessons with selective memory credit

2026-10-08. Researcher-requested design; training remains paused. This is an implementable architecture proposal, not evidence of effective learning or a frozen experiment. It supersedes the suggestion that adding two feedback slots is itself a solution to forgetting. Preserve all previous failures and scientific gates.

## Problem being solved

The teacher must establish exactly what an action causes, and the neural receiver must learn that distinction without damaging earlier useful distinctions. Better prose, higher pulse frequency and broader engine scores do not meet that requirement.

Current evidence is narrower than a claim that training frequency is generally harmful. The dose experiments change exposure count; they do not isolate a biological frequency or spacing effect. Some additional updates damage retained choices. The original retention-localization event changes 150/870 eligible gains before the original solution falls from rank 1 to rank 4. Removing recovery in earlier single-event interventions rescued no task choices. Both facts constrain the design: broad updates are a candidate cause, and removing recovery alone is insufficient.

The current implementation has three gaps: the counterfactual teaching record is not a semantic neural input; the MBON preference balance is not a calibrated consequence value; and the local rule is not guaranteed to improve the teacher-defined ranking. A two-pulse interface fixes none of these by itself.

## One explicit question per lesson

Begin with a bounded question such as: does this capture retain the capturing piece against every legal immediate reply? This is a narrow task, not a universal definition of a good chess move. Subsequent task families add verified material outcomes at longer horizons, bounded mate, quiet preparation and sacrifice. Each needs its own verifier and public task input.

The learner receives only the current board/history, candidate action and public task criterion/horizon before prediction. A task-conditioned fixed MBON balance supplies an ordinal prediction/ranking. It is not called a probability, centipawn score or full-game value. A zero threshold, if used for a binary report, must be declared before training; ties are unresolved. Freeze the readout and record all legal scores before teacher review.

Keep full-game Stockfish value teaching separate. Its target has already tied multiple mate-deadline failures with successful moves. Stockfish may propose a move or defensive line; an independent verifier certifies the task claim. Engine estimates do not replace that certificate. Do not combine incompatible objectives into two sequential rewards merely to satisfy a software contract.

## Lesson contents and neural delivery

Every lesson is a bound record of (board, history, task, learner prediction and memory identity, committed action, checked defensive reply or defense tree, resulting board, verified consequence, surviving alternative, changed-context counterexample, previously learned sentinel).

Use the same candidate action in two closely matched training contexts: in one, a defender has an open legal recapture; in the other, a changed blocker prevents it. Verify both from scratch. The changed relation is a teacher-side explanation, not a privileged safety feature at inference. A counterexample demonstrates sensitivity to that intervention under the verifier's scope; it does not establish a unique causal explanation for chess in general.

The receiver must consume actual structured experiences, not just a JSON explanation:

1. Present the pre-action board/action/task through a versioned, answer-free encoder. Record the learner's prediction and the local activity associated with the attempted action.
2. Present a bounded legal continuation as ordered board/action frames. Record all examined defensive coverage separately: one illustrative refutation must not be presented as a complete best-defense proof.
3. At the certified endpoint, deliver the consequence through the declared experimental pathway, with credit assigned to the earlier action activity.
4. Repeat for the independently verified alternative and changed-context example within the fixed lesson budget. Include a previously learned context as a separate, explicitly certified rehearsal experience.

The current kernel resets activity at each forward call, and the current replay rule has no delayed eligibility state. Therefore merely calling the existing encoder on several boards does not implement this design. A sequence receiver must explicitly persist bounded transient neural/eligibility state within an episode, reset it at episode boundaries, and checkpoint it if an episode can be resumed. It must not store teacher-computed parameter changes. Demonstrate that the relation survives encoding; if the projected cues alias, repair the encoder before spending graph time. Geometry and occupancy are permitted; certified safety or the teacher's chosen move is not an inference input.

## Candidate mechanism for action-specific credit

Proposed replacement class: compartment-local, eligibility-dependent KC-to-MBON plasticity. A recent presynaptic activity trace tags eligible existing synapses; measured local DAN activity acts on those tags when feedback arrives. The teacher chooses an experience and a bounded stimulus only. All gain changes are computed from local simulated states.

A concrete initial candidate for the depression branch is:

`e_i(t + dt) = exp(-dt/tau_e) * e_i(t) + (1-exp(-dt/tau_e)) * k_i(t)`

`g_ij(t + dt) = g_min + (g_ij(t)-g_min) * exp(-eta * e_i(t) * d_c(t) * dt)`

Here k is measured normalized nonnegative cue activity, e is an eligibility state, and d is measured nonnegative local reinforcement activity. The equation gives zero feedback-driven change for zero eligibility and preserves the fixed positive sign of an eligible synapse. Its bounded exponential form and constants are engineering hypotheses, not equations measured in a fly. Correct and failed consequences use separately justified opponent compartments; do not introduce negative DAN rates to force the output direction.

This is a candidate, not an approved transplant onto the present PAM02/PPL103 mask. Input-specific KC-to-MBON plasticity is supported experimentally, but compartment, subtype, receptor and timing applicability must be checked against released identities before use. Hige et al. motivates specificity; Handler et al. motivates temporal/receptor dependence. Neither validates the proposed equation or this chess mapping. The original gamma4 trace implementations failed and must remain explicit comparators: a new eligibility variable is not automatically a new solution.

Depression alone has a capacity/saturation problem and does not establish reversal or consolidation. A complete receiver must separately specify source-supported recovery/potentiation and demonstrate acquisition, retained coexistence and contingency reversal. Do not freeze a convenient gate that excludes reversal, silently suppress all recovery, or declare checkpoint restoration to be biological retention. Earlier recovery-removal interventions found no task rescue. If the candidate cannot pass these prerequisites, it is rejected before broader puzzle runs.

Preserve graph topology/signs and initialization from scratch. A lasting eligibility or receptor state must be declared and counted as memory; numerical state steps and CPU pauses are not calibrated biological time. Trace the mapped KC/DAN rates, eligibility, local gain changes and relevant output margins for each teaching event. Activity images alone do not establish which edge change caused a choice.

## Retention and checkpoint use

Use one incumbent memory and one candidate memory snapshot, evaluated serially on one sparse graph. The candidate receives one bounded lesson block. Keep the incumbent as the working checkpoint until the candidate passes every predeclared validation criterion. This prevents deploying a measured regression; it does not demonstrate that the candidate retained biological memory.

Choose lessons and rehearsal examples from training only. Prioritize an actual failed prediction, its discriminating counterexample, and a learned training sentinel; do not simply repeat the same failure until it flips. Validation selects among a small predeclared set of checkpoints; no event is trained on a validation or final-test answer. Cap selection attempts to avoid progressively fitting validation. Report rejected candidates and all training/audit compute.

Required measurements: target repair, per-sentinel non-regression, all-legal useful choices, retention after intervening lessons, reset/removal and restoration of acquired effects, and frozen evaluation on disjoint families and consequence-changing counterfactuals. Unchanged gains through a pause measure serialization/persistence only. No rollback or synapse editing may be counted as successful endogenous correction.

## Small experiment before scale

First validate the specified physiological candidate's association/retention/reversal prerequisites on the declared mapping. Then run one fixed chess lesson block with informative, no-channel, matched-shuffled and disabled-plasticity conditions. Controls receive identical board/frame exposure and timing. Shuffle complete signed teaching events by a frozen permutation preserving their counts/magnitudes; a sign reversal is an anti-correlated control, not a matched shuffle. Never inspect or hand-select an error after observing a favorable result.

Freeze the total presentation budget before launch from the actual legal-action counts, including baseline/post-assessment, traces, controls, retention and audit. One initial proposal is eight certified teaching events per condition with at most 1,024 graph presentations per condition; these are proposed bounds, not quality guarantees. Reuse teacher certificates after rechecking context, and stream the records. Preserve heap 256 MiB, duty 0.5, RSS 768 MiB and free-memory 256 MiB guards, atomic pending receipts and exact resumed publication.

A correct same-board retry is repair only. To advance, require the informative receiver to repair the target, preserve the trained sentinel, improve over matched controls, and reverse its prediction on the predeclared changed-relation examples. Only after selection may untouched final families be opened. Replication and the original disjoint/counterfactual gates remain mandatory; the existing 8/10 shorthand cannot override them.

## Sources and scope

- [Hige et al., 2015](https://pubmed.ncbi.nlm.nih.gov/26637800/): primary indexed abstract/search coverage refreshed 2026-10-08; PMC full-text request was challenged. Supports input-specific mushroom-body output plasticity, not the exact candidate equation or mappings.
- [Handler et al., 2019](https://pubmed.ncbi.nlm.nih.gov/31230716/): primary indexed abstract/search coverage refreshed 2026-10-08; PMC full-text request was challenged. Supports timing/receptor dependence; transferring the mechanism between compartments is unvalidated.
- [Gkanias et al., 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8975552/): primary article introduction inspected, together with the locally pinned IncentiveCircuit source. Its complete circuit includes interacting memory roles; the existing local gain approximation is not a replication of that circuit.
- [Existing deep review](../../../research/literature/feedback-quality-deep-review-2026-10-08/review.md): MiMo/SCoRe supports independently verified attempt/revision as an analogy; Capablanca motivates economical task selection, not a fixed candidate cap. No external pretrained learner is introduced.
- [Recovery-intervention failure](../../../research/reports/recovery-causal-v1-2026-10-06/README.md), [retention localization](../../../research/reports/retention-event-localization-v1-2026-10-07/README.md), and [Stockfish target mismatch](../../../research/reports/stockfish-target-feasibility-v1-2026-10-07/README.md) constrain the proposal.

This architecture can provide substantially more informative, criterion-correct lessons and protect incumbent checkpoint selection. Whether its endogenous receiver learns useful transferable distinctions is an empirical requirement, not a promised consequence of the design. Training remains paused; no receiver replacement, new graph experiment or 8/10 result is claimed.
