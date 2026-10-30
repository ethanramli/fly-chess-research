# Full-frame rate timing memory adapter

2026-10-09. [Implementation](../../../.codebase/src/neural-learning/rate-timing-memory.mjs) and [inert checks](../../../.codebase/tests/neural-learning/rate-timing-memory.test.mjs). This is an unintegrated engineering branch, not a reviewed assay adapter or a validated plasticity solution.

## Concrete integration contract

The constructor reuses the existing ReversalMemory checks for positive anatomical edges and KC presynaptic indices. It additionally requires a declared gamma2 mapping with MBON12/PPL103 groups, one identified DAN per group and gamma-KC type metadata for every edge. Maximum memory size is 2,048 edges; the candidate identified by the separate static report has 122. These checks enforce the supplied mapping's scope and shape; they cannot authenticate caller-supplied annotations. Actual map construction and independent graph/annotation hash verification remain required before execution.

Input is the model's full `h[0..steps]` trajectory. Each right-endpoint local rate is held for an explicit numerical interval. KC and DAN rates are rectified above a pinned fixed unstimulated-model reference and divided by activityScale; KC input is capped at one. This normalization is an engineered interpretation, not a biological tonic baseline or dopamine-release measurement. It does not subtract an engine value or teacher label. Reference values on all relevant cells enter memory identity.

Local states are gain, KC credit, short response and long response per edge. There is one DAN per group, so no DAN population averaging is introduced. Duplicate per-edge response states are small and preserve a simple local checkpoint contract. Traces continue between consumed frames; no episode reset or protected weight snapshot is provided. Assessment trajectories are **not** automatically consumed. A future runner must declare which presentations advance these states and keep that accounting identical across arms. Never imply that skipped evaluation time supplies modeled physiological rest.

Integration uses the [analytic scalar candidate](rate-timing-plasticity-candidate.md) for every interval. It checks the entire trajectory before calculation and computes prospective state in bounded temporary arrays before changing persistent memory. Gain changes are applied through the existing magnitude setter after the frame, keeping graph topology and signs fixed. Effective magnitudes must remain representable as positive Float32 values. This is frame-held learning: the current waveform was calculated with pre-update gains. Coupled within-step plasticity is unimplemented and any frame-length approximation requires an independent convergence check.

The inherited endpoint-only `observe` method is rejected explicitly. Existing delayed/dual-valence brains therefore cannot accidentally use this object as their old memory implementation. It has no teacher feedback or consequence-verification interface; a reviewed new runner must verify every teachable experience before presenting the declared learning sequence.

## Persistence and disabled behavior

Snapshots bind algorithm schema/identity, gains, event count and all three trace arrays. Identity includes model configuration, mapped edge order, original magnitudes, explicit numerical timing and local reference values. Restore validates all traces and effective magnitudes before changing state; the inherited check binds gains, event count and identity. JSON continuation reproduces the next inert full-frame transition.

Disabled processing validates the supplied trajectory but holds every memory and response state fixed. This is an experimental disabled-learning control and predefined measurement behavior, not a solution to online retention. Graph neuronal transient state and exact-once publication belong to the outer adapter/coordinator, which is not connected here. These memory checks do not replace the existing pending-receipt checkpoint contract.

## Evidence and remaining work

Tests manually supply four-cell rate arrays through an inert magnitude setter; no SparseTrainer, graph dynamics or prospective learner simulation runs. They check selective mapped changes, fixed signs, trace persistence, next-update equivalence, disabled-state preservation, invalid late-frame rejection, invalid checkpoint rejection, reference identity and mask restrictions. This is software evidence only. Existing assays import no new memory implementation.

Before any training: construct and independently verify the actual gamma2 map and model/reference identity, provide a teacher-certified temporal presentation schedule, account for all probe/cue/rest frames, wire the memory snapshot to the existing coordinator, and freeze new conditions/protocols without changing v4. Demonstrate finite-budget association, coexistence and two-direction reversal against exposure-matched controls while learning stays available. Useful chess choices and transfer remain the requested outcome. No current evidence establishes those gates.

2026-10-09 mapping addendum: [the actual source-authenticated map](../../../archive/early-development/research/reports/plasticity-timing-candidate-2026-10-09/rate-timing-map.json) is now generated by a reproducible static CSR/annotation check. Model/reference initialization, dynamics, and assay integration remain unexecuted.
