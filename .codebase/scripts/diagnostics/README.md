# Diagnostics scripts

[Scripts guide](../README.md) · [Code guide](../../README.md)

[Design and scientific boundaries](../../../documentation/design/diagnostics/README.md)

- [ablate-chess-memory.mjs](ablate-chess-memory.mjs)
- [audit-chess-memory-ablation.mjs](audit-chess-memory-ablation.mjs)
- [audit-chess-memory-envelope.mjs](audit-chess-memory-envelope.mjs)
- [audit-gf-memory.mjs](audit-gf-memory.mjs)
- [audit-graph-cost.mjs](audit-graph-cost.mjs)
- [audit-instinct-anatomy.mjs](audit-instinct-anatomy.mjs)
- [audit-positive-puzzle-memory.mjs](audit-positive-puzzle-memory.mjs)
- [audit-recovery-causal.mjs](audit-recovery-causal.mjs)
- [audit-recovery.mjs](audit-recovery.mjs)
- [audit-relay-probe.mjs](audit-relay-probe.mjs)
- [compare-recovery.mjs](compare-recovery.mjs)
- [diagnose-adaptive-review.mjs](diagnose-adaptive-review.mjs)
- [diagnose-chess-cue-learning.mjs](diagnose-chess-cue-learning.mjs)
- [diagnose-mbon-recovery.mjs](diagnose-mbon-recovery.mjs)
- [diagnose-positive-puzzle-ranking.mjs](diagnose-positive-puzzle-ranking.mjs)
- [diagnose-reversal.mjs](diagnose-reversal.mjs)
- [diagnose-signal.mjs](diagnose-signal.mjs)
- [probe-chess-memory-envelope.mjs](probe-chess-memory-envelope.mjs)
- [probe-gf-memory.mjs](probe-gf-memory.mjs)
- [probe-learning-relay.mjs](probe-learning-relay.mjs)
- [probe-positive-puzzle-memory.mjs](probe-positive-puzzle-memory.mjs)
- [probe-recovery-causal.mjs](probe-recovery-causal.mjs)

Run from the repository root. Use the documented resource guards for experiments. Frozen protocols pin old source identities; use their archived sources for historical reproduction.

- [Retrospective timing feedback margin audit](audit-feedback-quality-timing.mjs): reads saved receipts without graph inference.

- [Checked lesson example from saved evidence](prepare-checked-lesson-example.mjs): no graph inference or new teaching.

- [Correction-plus-preservation schedules](prepare-correction-preservation-schedules.mjs): rechecks audited training-only evidence and writes balanced targeted/uniform schedules; no graph inference.

- [Bound-ray development synthesis](summarize-bound-ray-feedback-development.mjs), [recovery fixture](prepare-bound-ray-recovery-fixture.mjs), [pending-recovery audit](audit-bound-ray-pending-recovery.mjs), and [curriculum example](prepare-correction-preservation-example.mjs).

- [Correction-plus-preservation schedules v2](prepare-correction-preservation-schedules-v2.mjs): preserves v1 and matches move/outcome/order/context counts in the score-blind comparator.

- Correction-preservation v2 [pending-prefix fixture](prepare-correction-preservation-v2-recovery.mjs) and [exact continuation auditor](audit-correction-preservation-v2-recovery.mjs).
