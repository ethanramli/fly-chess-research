# Neural Learning scripts

[Scripts guide](../README.md) · [Code guide](../../README.md)

[Design and scientific boundaries](../../../documentation/design/neural-learning/README.md)

- [audit-learning.mjs](audit-learning.mjs)
- [audit-positive-channel-v2.mjs](audit-positive-channel-v2.mjs)
- [audit-positive-channel.mjs](audit-positive-channel.mjs)
- [condition-fly.mjs](condition-fly.mjs)
- [map-reversal-memory.mjs](map-reversal-memory.mjs)
- [validate-learning.mjs](validate-learning.mjs)
- [run-g0-history-with-pause.mjs](run-g0-history-with-pause.mjs): [registered operational pause version](../../../archive/early-development/research/data/lesson-pause-control-v1/README.md); frozen canonical sources are preserved.
- [validate-positive-channel-v2.mjs](validate-positive-channel-v2.mjs)
- [validate-positive-channel.mjs](validate-positive-channel.mjs)

Run from the repository root. Use the documented resource guards for experiments. Frozen protocols pin old source identities; use their archived sources for historical reproduction.

- [preflight-curriculum-g0.mjs](preflight-curriculum-g0.mjs): static teacher/control/annotation checks; no graph dynamics or training.

- [register-curriculum-g0.mjs](register-curriculum-g0.mjs), [run-curriculum-g0.mjs](run-curriculum-g0.mjs), [audit-curriculum-g0.mjs](audit-curriculum-g0.mjs): [frozen G0 assay](../../../archive/early-development/research/data/curriculum-g0-assay-v1/README.md), serial feedback and archived-source full replay.
- [run-memory-assay-recorded.mjs](run-memory-assay-recorded.mjs): fresh synthetic development recording or separate replay audit with source/config/event identities and resource guards. [Completed V3 registration](../../../python%20actions/memory-assay-v12-step.json); do not rerun its completed output paths. It changes evidence, not the memory rule.
- [check-memory-feasibility-witness.mjs](check-memory-feasibility-witness.mjs): oracle mathematical readout-state witness for the lower-overlap cell; no learner, feedback, checkpoint or weight export. [Scope](../../../research/reports/overnight-memory-plasticity-2026-10-31/low-overlap-feasibility-spec.md).

- [Coupled](run-memory-assay-coupled.mjs), [cascade](run-memory-assay-metaplastic.mjs), [reservoir](run-memory-assay-reservoir.mjs) and [fixed reservoir latency](run-memory-assay-reservoir-rate.mjs) CLIs: completed synthetic memory runs and audits. [Continuation status](../../../research/reports/memory-retention-continuation-2026-10-31/README.md); never rerun completed output paths.
- [inspect-memory-coupled.mjs](inspect-memory-coupled.mjs) and [analyse-memory-phase-states.mjs](analyse-memory-phase-states.mjs): diagnostic reconstruction, not additional independent learning evidence.
- [check-neuron-reader.mjs](check-neuron-reader.mjs): bounded static input/roster/root-ID/annotation validation; writes into a new directory and runs no model or graph dynamics. [Interface](../../../documentation/design/neural-learning/neuron-reader.md).

- [run-eye-graph-memory-cubic.mjs](run-eye-graph-memory-cubic.mjs): pinned arbitrary-association graph-memory development comparison, local-frame receipts and phase snapshots; [protocol](../../../research/reports/memory-retention-continuation-2026-11-01/cubic-exit-spec.md). [Independent full audit](audit-eye-memory.mjs) and [completed-arm audit](audit-eye-memory-arm.mjs) replay local memory updates, not complete graph activity.

- [resume-eye-graph-memory-cubic.mjs](resume-eye-graph-memory-cubic.mjs) and [eye-memory-recovery.mjs](eye-memory-recovery.mjs): exact, separately pinned continuation from the interrupted absent-arm T1 publication. Preserves completed informative arms and compares overlapping actual observations; [recovery specification](../../../research/reports/memory-retention-continuation-2026-11-01/recovery-spec.md).

- [inspect-eye-readout-capacity.mjs](inspect-eye-readout-capacity.mjs): static direct-input surrogate bounds using saved visual KC codes and the existing fixed-readout bound instrument; no neural dynamics, fitted gains or full-graph incapacity claim. [Diagnostic scope](../../../research/reports/memory-retention-continuation-2026-11-01/readout-interference-diagnostic.md).

- [inspect-eye-readout-offset.mjs](inspect-eye-readout-offset.mjs): one preregistered 27-pass diagnostic of exact saved memory, with original-score reproduction and memory/parameter invariance checks. Requires complete controlled-run data and its matching passed audit; no teaching or learned-state change.
