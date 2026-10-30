# Adaptive current-error feedback: direction and margin pass, choice fails

Registered before training. Each from-scratch arm first ranked every legal action without feedback. In all four arms, Qg8 was the unique top move and an independently replayed mate-deadline certificate classified it as a failure. The schedule then taught that measured mistake and the verified Qh7 success, with equal timing/exposure in informative, fully swapped, absent and disabled controls.

| Condition | Qh7 minus Qg8 margin change | Final all-legal choice |
|---|---:|---|
| Informative | +0.0003201417 | Qg8, failure |
| Swapped | -0.0003152117 | Qg8, failure |
| Absent | 0 | Qg8, failure |
| Disabled | 0 | Qg8, failure |

The independent auditor rechecked source pins, plan and certificate, pre-feedback all-legal ranking, and replayed all 152 recorded updates. Informative local plasticity depressed Qg8 cue gains (-0.0215295 mean) and potentiated Qh7 (+0.0101386). Swapped feedback reversed those changes; disabled memory stayed identical. The pair-margin specificity gate passes. The correct move still trails Qg8 by 0.00455950 and the model still selects Qg8. Useful acquisition fails.

This run directly tested whether the old schedule's stale Qe6 review explained the remaining choice failure. Targeting the current top error improved its pairwise margin more than v2, but did not fix the decision. Thus stale targeting contributed to weakly targeted feedback, but cannot explain the whole failure by itself. The tested plasticity stores a selective association; the association's effect remains small against the fixed all-legal readout and the other actions. This does not prove a universal readout failure or that extra repetition would help.

Protocol reused v2 model, encoder, readout, timing and local gain law with a fresh registered schedule. Top-error selection was fixed to the initial unique all-legal choice and required an independently verified failure; the contrast was fixed to certified Qh7. One seed and one two-lesson pass are insufficient for reliability. No retention, coexistence, contingency reversal, disjoint transfer or biological validity was tested. No weights were frozen; no teacher-computed parameter update or external chess search was used.

Training peak RSS 190.11 MiB; elapsed 487.35 s; one serial graph per arm, heap256, cpu-duty0.5 and the registered 768 MiB RSS/256 MiB free-memory guards. Auditor numerical replay shares the declared integrator and does not reproduce the full post-training graph forward passes. Its source, as pinned before training, is preserved with raw receipts.

[Protocol](../../data/gamma2-adaptive-target-v1/protocol.json), [raw result and receipts](../../../runs/gamma2-adaptive-target-v1/result.json), [audit](../../../runs/gamma2-adaptive-target-v1/audit.json), [auditor snapshot](../../../runs/gamma2-adaptive-target-v1/auditor.mjs), [v2 results](../gamma2-temporal-hypothesis-v2-2026-10-09/README.md).

The next blocker is now sharper: correct local association and measured-error targeting both shift the intended pair margin, yet the fixed score still ranks a wrong move first. Continue from this evidence by testing the action-value/readout relationship or the scope of mapped plasticity under a predeclared informative feedback condition with controls. Do not fit a readout on this test position or claim that more updates solve it. The frozen v4 retention/reversal assay's missing certificate and biological-feasibility blockers remain intact.

Retrospective cue check from the authenticated lesson-start receipts: both action cues stimulate eight unique mapped gamma KCs and share zero directly stimulated identities. This is an input-set overlap check, not full recurrent trace independence. The fixed output-margin failure therefore remains despite cue separation and adaptive current-error selection.

## Biological interpretation boundary

Aso et al. 2014 reports that the MBON ensemble encodes valence and biases memory-based action selection, while the exact MBON12-minus-MBON01 score remains an engineered chess comparator. This gives a plausible place for learned value without proving that the decoded score is a natural choice policy. Direct full-text pages returned challenges on this access; see existing source limits in the register. [Primary Aso article](https://elifesciences.org/articles/04580); downstream MBON/lateral-horn convergence connectome, [Eschbach et al. 2021](https://elifesciences.org/articles/62567). Do not fit a new score on this run; preregister any decoder/representation test with informative feedback and matched controls on held-out puzzle families.
