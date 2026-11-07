# Methodology blueprint: persistent, selective and revisable memory

2026-11-01. Phase 1 design, pending researcher scope confirmation and fresh literature verification. All future experiments require a separate frozen protocol and launch authorization. No experiments were run to prepare this blueprint.

## Question and research paradigm

Can a source-supported, compartment-specific plasticity and stabilization mechanism on the existing FlyChess graph acquire new associations, preserve useful earlier associations during further learning and modeled delays, and selectively reverse changed associations better than matched controls?

Use a quantitative causal computational study. The intervention is the declared physiological mechanism; the outcome is memory expressed as unaided behavior under fixed measurement conditions. Biological plausibility, software correctness and computational performance are separate claims. A source-supported mechanism can fail here; a computational pass can still be biologically unsupported.

## Evidence baseline and competing explanations

The [October 30 recommendation](../../../literature/memory-interference-2026-10-30/recommendation-and-test-plan.md) already proposes selective local updates, slower revisable storage, and useful inhibitory separation. It also identifies inactive-synapse recovery in an older ReversalMemory implementation. The newer [local-gated rule](../../../../.codebase/src/neural-learning/local-gated-memory.mjs) uses a local activity-derived eligibility trace; when its effective rate is zero, gain does not change. Therefore the older inactive-recovery defect must not be attributed to every current implementation. A residual eligibility trace after activity also differs from arbitrary global writing.

The [cubic reservoir rule](../../../../.codebase/src/neural-learning/local-cubic-reservoir-memory.mjs) changes the release of stabilized local state under weak versus strong drive. It tests a specific retention hypothesis. Calling it wholly redundant because it does not separate representations is unsupported. Conversely, its computational gates cannot establish a biological long-term-memory mechanism. The four reservoir masses are not identified with Orb2 molecular variables.

The [current diagnostic design](../../memory-retention-continuation-2026-11-01/readout-interference-diagnostic.md) lists three live explanations: incompatible representation/readout, actual loss of a useful synaptic contrast, and a changing resting-response offset that alters the score. Shared KC activation is evidence of overlap, not a demonstrated causal explanation of loss. The static direct-input surrogate does not certify the recurrent graph's capacity.

The [capacity correction](../../overnight-memory-plasticity-2026-10-31/assay-correction-proposal.md) proves incompatibility only for particular bounded fixture/readout cells. Some lower-overlap cells have oracle existence witnesses. Those witnesses cannot enter learner memory, teacher updates or checkpoint selection, and do not demonstrate finite-exposure learnability.

## Stage A: decide what needs repair

First audit existing completed evidence; retain every original gate and failure. If separately authorized later, use the already registered frozen-memory current-rest diagnostic to distinguish a readout contribution from a persistent storage failure. This proposal does not start that audit or diagnostic.

Record both raw MBON responses and the original frozen scores. Any alternative score is a separate measurement condition, fixed before new evaluation, with all original failures still visible. Recovery of a ranking under one alternative readout does not prove that all memory was retained or that a biologically justified decoder has been built. Failure to recover under that readout does not prove total erasure: other retrieval/representation explanations remain.

Measure overlap in the actual KC activities and eligible synapses, not only membership in a list of selected input cells. Relate new-learning changes to old-association responses. Observational overlap/change correlations generate hypotheses; a matched intervention is needed for causality.

## Stage B: select a mechanism through evidence

Fresh investigation compares these candidates without assuming any one succeeds:

| Candidate | Targeted failure | Required support before selection | Rejection condition |
|---|---|---|---|
| Local receptor-mediated control of plasticity; mAChR-B is an existing lead | Inappropriate modification of neighboring/unreinforced representations | Receptor localization, released-cell crosswalk, local signal and update direction applicable to the selected visual route | The supported physiology cannot distinguish the relevant co-active synapses, or the mapping is unsupported |
| Representation control through existing inhibitory circuitry; APL locality is a lead | Distinct experiences yield conflicting eligible activity | Supported local inhibition and activity dynamics on preserved topology; measurable task-relevant distinctions | Suppression silences the weak input or cannot improve distinctions; whole-cell scalar treatment cannot represent required locality |
| Reversible consolidation/stabilization; Orb2 and fast/slow interactions are leads | Useful local changes disappear during later learning or delay | Explicit synaptic site, write/read/revision pathways, source equations, variable bounds and time mapping | No justified revision mechanism; protection prevents acquisition; only permanently frozen weights explain retention |

Do not assemble all three at once. Select the smallest justified intervention at the diagnosed bottleneck. If both selectivity and consolidation remain plausible, compare single components and their combination with matched exposure. A source-supported representation change is a distinct condition; it cannot quietly replace the frozen encoder. If no candidate meets the biological mapping contract, deliver a no-go plus the missing evidence rather than install an arbitrary equation.

The researcher has authorized proposal preparation, not these future interventions. Existing failed coupled/cascade/reservoir variants remain negative comparators; any new variant must specify its mechanistic difference before running.

## Stage C: causal memory assay

Use non-chess patterns first, with fixed inputs and no answer-bearing task IDs or privileged context. Learn A unaided with independently verified consequence feedback, then learn B/C and further associations, test A/B/C without reminders, impose declared modeled delay and distractors, and reverse A's consequence while testing whether B/C remain useful. Include low and high activity-overlap strata and conflicting consequences. Compatible, incompatible and unresolved cells must be reported distinctly.

Expand the number of stored associations through a development-only capacity curve. Choose the primary load, exposure, delays, overlap strata and required margins from a prospective design/power or precision analysis before opening new confirmation data. Do not demand unlimited capacity or perfect indefinite retention. Report capacity and retention duration at a stated learning/reversal cost.

For each selected candidate include informative, absent-feedback, matched-shuffled and disabled-plasticity arms at identical input exposure and timing. Include a consolidation-specific ablation if consolidation is selected: disable the proposed process only during the declared post-learning interval, plus a duration-matched later intervention. A local-modulation candidate needs its own matched modulation ablation. A permanently frozen store is a diagnostic comparator and must fail new acquisition/reversal if that is its behavior.

The teacher provides verified consequences, not synaptic deltas. Unknown/rejected certificates generate no teaching event. Plasticity is frozen during tests and investigation. During a modeled delay, declared consolidation/forgetting dynamics continue; a separate frozen-state control measures serialization rather than consolidation. Endogenous post-learning dynamics must be explicitly modeled; wall-clock waiting or CPU pacing cannot advance biological time. Any rehearsal condition is separately declared, uses training data only, and counts every replay toward matched exposure. No oracle reminder or per-task memory bank supplies the missing distinction.

## Analysis and decision rules

Use paired initializations and fixed schedules across arms, with seeds and pattern families as declared units; do not count repeated presentations as independent replications. Split development, validation and sealed confirmation families before selection. Select on development/validation evidence only. Determine replication count with an explicit precision/power rationale in the executable protocol, without inspecting sealed cases. If precision is inadequate under resource limits, report the study as exploratory.

Report acquisition, per-association correctness and margins after intervening learning, delay retention, selective reversal and unrelated-memory damage together. Show each seed/item alongside cohort summaries. Estimate paired differences and uncertainty at the replication/family level. Predeclare the joint success rule and multiple-comparison treatment; median success cannot erase important item failures. Report representations and traces alongside behavior, but changed coefficients or favorable activity alone are not learning success.

Select and freeze the mechanism, all parameters and one checkpoint using development/validation evidence only, requiring the prospectively declared acquisition, retention, control separation and selective-reversal criteria jointly. Then evaluate that exact frozen candidate once on sealed confirmation families. A confirmation failure is preserved; do not tune or choose a different checkpoint on those families. Any later development cycle requires a newly separated confirmation set and a new registration. Preserve original gates separately from any stricter new protocol. A restored checkpoint tests software persistence; post-delay unaided behavior tests modeled retention. Neither alone proves biological consolidation.

## Integrity, resources and implementation contract

Maintain sparse existing graph topology, released identities and fixed fast-edge signs. Any receptor-mediated effect needs a distinct justified modulatory interpretation; it cannot flip transmitter signs or add arbitrary anatomical edges. Store bounded local state on declared permitted sites. Additional local variables require a byte-count estimate and measured RSS under an authorized profile; no dense adjacency, batch tensors, unbounded replay or hidden task state.

Use serial graph execution, heap 256 MiB, duty 0.5, RSS at most 2048 MiB and at least 256 MiB free system memory for new work; frozen runs retain their old limits. Specify hard bounds, stop behavior and resumability before launch. Stream board/input/certificate/unaided-choice/teaching/state receipts, checkpoint atomically and independently replay accepted updates. Pin graph, annotations, input, model, memory, readout, policy, seeds and protocol identities. Teacher quality and the limited neural signal delivered are reported separately.

Register any newly selected external solution and exact source-read coverage in the source-to-solution register before experimental use. This scoping document relies on existing project notes; it does not reverify their primary papers. No new equations, rates, physiological clock or evidence-backed efficacy claim is supplied here.

## Boundaries and preregistration declaration

This study covers a connectome-constrained computational memory prerequisite. Visual input and the current external KC rank relay remain explicit approximations. It does not establish biological hours/days, living-fly cognition, useful chess transfer, or the overarching reasoning claim. Finite useful memory under stated load and interference is the target; every-neuron immutability is not a criterion.

Plan a versioned local preregistration before confirmatory execution. Completed preregistration declaration: **not_provided**. Companion handle: **none**. The dispatcher must produce the prescribed builder-owned handoff receipt if/when handing these materials downstream; this document does not mint a preregistration sidecar or claim that prospective decisions are frozen.

No human subjects or live animals are involved in this proposed computational stage. Native same-provider AI assistance is disclosed in the report README. Literature verification, mechanism selection, numerical freezing and experiment authorization remain open.
