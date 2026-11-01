# 2026-10-31: neuron-reader naming and design review

**Researcher request:** ask a GPT-6.1 Sol agent for weaknesses in the proposed Readout v1 design and name the component `neuron-reader`. The first provider attempt stopped at a rate limit before a review ran. The resumed session obtained a completed GPT-6.1 Sol review; no replacement provider or model was used.

**Artifacts:** [complete nine-finding review](../../reports/neuron-reader-design-review-2026-10-31/README.md), [before: approved restart proposal, sections 5 and 7](../../../documentation/design/research-goals/restart-plan-2026-10-30.md), [unchanged Eyes v1](../../../documentation/design/chess-input/eyes-v1.md).

## Mistakes and recommendation pivot

1. **Comparator omitted MBON07.** Earlier explanations described the old reader as MBON12/01/14. Later v4/v5 readers already include MBON07. The parent re-read the v5 equation and the wiring output: MBON07+14 represents 1903/3793 counted positive KCab-p-to-MBON synapses. The earlier “86% versus 6%” comparison therefore misdescribed that legacy comparator. Fix: identify the exact legacy version before comparing; retain original sources and messages as history.
2. **Anatomical coverage was overstated as functional benefit.** The 76.6%/85.9% totals are fractions of counted positive visual-KC-to-MBON synapses, not measured activity, all outgoing visual-KC synapses, candidate discrimination or improved choices. Earlier near-random-choice and false-failure assurances were untested inferences. Fix: describe anatomical motivation and leave functional benefit unresolved. Next functional check, when separately authorized: matched inputs, snapshots, computation, margins, ties and saturation.
3. **A scalar chooser was proposed before its contracts were resolved.** Cell-type labels do not pin the individual population. Several behavioral signs remain unresolved in inspected evidence, and the observable, pooling, initialization and complete persistent-state boundary were unspecified. Observation and memory targets may differ. These are design gaps and untested compatibility risks, not demonstrated learner defects. Pivot in recommendation: specify passive recording first; keep the scalar score unresolved until source, measurement and memory contracts are complete. This changes no approved experimental protocol.
4. **Existing eye-gate limitations remain.** The decoder-sign intervention at 0.2/1.8 gains can test an engineered accessibility bound; the inspected old rules starting at 1 cannot reach the upper corner. The existing correction draft is still unapplied. This review neither repairs the other session's files nor uses that intervention as evidence of learning.
5. **Review execution limits.** The reviewer reported one shell-quoting metadata query failure, corrected by stdin, and a timed-out initial PDF screenshot. Selected primary text and legends were inspected; figure panels were not visually audited. No simulation, training, graph recount or test ran. These lookup failures do not establish a biological limitation.

## State and next test

`neuron-reader` is the researcher-chosen name; no implementation was created. All nine findings and source links are retained in the report. The recommendation is ready for a recording-only specification, not a move-scoring release. The next design check is a pinned roster/observable/state-preservation contract. A later implementation must verify state fingerprints and candidate-order invariance. Memory ownership, frozen sources, evidence, gates and final-test boundaries remain intact. No memory rule is selected by this review.

Documentation check: the first link/format check found extra blank lines at the ends of this session's additions. Those additions were corrected. Three pre-existing trailing-whitespace rows in the shared decision log were left untouched. All 43 local links introduced or retained in the review records resolve; all nine findings are present. No simulation test was needed for these documentation-only changes.

## 2026-10-31 addendum: researcher directed the actual plan update

**Workflow mistake:** the previous response saved the review and described a solution but left the actual restart plan unchanged. The researcher explicitly corrected this: “wait so update the goddamn plan”. The work now updates the authoritative document, not only the task checklist.

**Before:** [byte-identical plan snapshot](../../reports/neuron-reader-design-review-2026-10-31/restart-plan-before-neuron-reader-update.md), SHA-256 `5a61c183cd98b2f152d227b5b8716b47ff6f0c776e2da4c92ea04b391f64d834`. The snapshot preserves original relative links as bytes; their original base is `documentation/design/research-goals/`. **After:** [revised restart plan, section 4A](../../../documentation/design/research-goals/restart-plan-2026-10-30.md#4a-neuron-reader-observation-first-then-a-justified-move-score).

**Changes:** five-step reader build order; exact-cell manifest requirement; endpoint model-rate measurement and equal within-type means; complete persistent-state/board preservation; output/identity/error contract; fixture verification; unresolved fixed coefficient/choice contract; later matched functional comparison. Corrected the legacy MBON07 omission in the plan itself. Added the existing F04 limitation beside its original gate without changing the numbers. Choices introduced here are prospective engineering choices, not measured biological results.

**Drafting correction:** requiring a finalized memory-compatible chooser before the eye diagnostic would create a circular dependency, because final memory selection follows that diagnostic. The final sequence permits recording/diagnostic decoding first, with F03/F04 resolved separately; final score selection and real-route memory testing follow the eye pass. No data or run occurred under the discarded ordering.

**Next:** implement the specified passive recorder from a pinned roster. This update performs no implementation, graph run, training, coefficient fitting, gate replacement or memory-file change. The other session's development assays remain its responsibility. Documentation links and preservation of the numerical gates are checked separately from simulation evidence.

## 2026-10-31 addendum: focus the fixes on neuron-reader itself

**Scope mistake:** the researcher wanted the specific fixes to the reviewed reader, while the previous answer emphasized the wider restart sequence. Clarification: “no like specificlaly for neuron-reader. you got teh critique back, how are you gonna fix it”.

**Correction:** created the dedicated [neuron-reader repair plan](../../../documentation/design/neural-learning/neuron-reader.md), linked from section 4A and the neural-learning navigation. All nine findings have a specific design change and a check. The plan defines two pure sampling/scoring functions in one module; copies the exact 14-cell roster from existing static evidence with original input hashes; fixes endpoint measurement, type-mean pooling, state/identity/error handling; distinguishes possible negative coefficients from unknown cells; and states the contract/review/causal evidence still required before a scalar chooser. No new graph recount or source reading was represented as having occurred.

**Open scientific decisions:** nonzero coefficients and memory/readout compatibility remain unresolved. A citation field or valid software schema cannot establish biological correctness; the plan explicitly distinguishes documentary validation from source/causal evidence. This is a focused module plan, not a claim that the review's scientific questions are solved. No implementation, simulation or owned-memory-file edit occurred.
