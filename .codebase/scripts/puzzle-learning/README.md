# Puzzle Learning scripts

[Scripts guide](../README.md) Â· [Code guide](../../README.md)

[Design and scientific boundaries](../../../documentation/design/puzzle-learning/README.md)

- [adaptive-review.mjs](adaptive-review.mjs)
- [audit-adaptive-coverage.mjs](audit-adaptive-coverage.mjs)
- [audit-adaptive-review.mjs](audit-adaptive-review.mjs)
- [audit-compartment-puzzle-pipeline.mjs](audit-compartment-puzzle-pipeline.mjs)
- [audit-delayed-transfer-fixtures.mjs](audit-delayed-transfer-fixtures.mjs)
- [audit-pipeline-fixtures.mjs](audit-pipeline-fixtures.mjs)
- [audit-positive-puzzle-pipeline.mjs](audit-positive-puzzle-pipeline.mjs)
- [audit-puzzle-neural.mjs](audit-puzzle-neural.mjs)
- [audit-puzzle-pipeline.mjs](audit-puzzle-pipeline.mjs)
- [audit-training-volume.mjs](audit-training-volume.mjs)
- [check-delayed-transfer-records.mjs](check-delayed-transfer-records.mjs)
- [diagnose-near-transfer-margin.mjs](diagnose-near-transfer-margin.mjs)
- [preflight-compartment-puzzles.mjs](preflight-compartment-puzzles.mjs)
- [prepare-adaptive-audit.mjs](prepare-adaptive-audit.mjs)
- [prepare-adaptive-coverage.mjs](prepare-adaptive-coverage.mjs)
- [prepare-smothered-mate-fixture.mjs](prepare-smothered-mate-fixture.mjs)
- [puzzle-neural.mjs](puzzle-neural.mjs)
- [puzzle-round.mjs](puzzle-round.mjs)
- [run-compartment-puzzle-comparison.ps1](run-compartment-puzzle-comparison.ps1)
- [train-adaptive-coverage.mjs](train-adaptive-coverage.mjs)
- [train-compartment-puzzle-pipeline.mjs](train-compartment-puzzle-pipeline.mjs)
- [train-contrastive-feedback-screen.mjs](train-contrastive-feedback-screen.mjs)
- [audit-contrastive-feedback-screen.mjs](audit-contrastive-feedback-screen.mjs)
- [train-contrastive-feedback-screen-v2.mjs](train-contrastive-feedback-screen-v2.mjs)
- [audit-contrastive-feedback-screen-v2.mjs](audit-contrastive-feedback-screen-v2.mjs)
- [audit-contrastive-feedback-screen-v2-json-zero.mjs](audit-contrastive-feedback-screen-v2-json-zero.mjs)
- [train-positive-puzzle-pipeline.mjs](train-positive-puzzle-pipeline.mjs)
- [train-puzzle-pipeline.mjs](train-puzzle-pipeline.mjs)
- [train-smothered-acquisition.mjs](train-smothered-acquisition.mjs)
- [train-volume.mjs](train-volume.mjs)
- [train-bidirectional-plasticity-assay.mjs](train-bidirectional-plasticity-assay.mjs): preflight-only; signal/anatomy and resumable graph integration block execution.

Run from the repository root. Use the documented resource guards for experiments. Frozen protocols pin old source identities; use their archived sources for historical reproduction.

- [Adaptive coverage runner](train-contrastive-coverage.mjs) and [independent auditor](audit-contrastive-coverage.mjs)

- [Pending-receipt recovery verifier](audit-contrastive-coverage-recovery.mjs): graph-free exact receipt/ranking/count checks for a one-event resume prefix.

- [Training variation generator](prepare-smothered-training-variations.mjs) · [all-legal certificate auditor](audit-smothered-training-variations.mjs)

- [Stockfish target collector](probe-stockfish-targets.mjs) and [independent auditor](audit-stockfish-targets.mjs): [record-only protocol](../../../archive/early-development/research/data/stockfish-target-feasibility-v1/README.md).

- [Adaptive near-transfer protocol freezer](freeze-adaptive-near-transfer.mjs), [runner](evaluate-adaptive-near-transfer.mjs), [auditor](audit-adaptive-near-transfer.mjs), and [audit-correction freezer](freeze-adaptive-near-transfer-audit-correction.mjs).
- [Stockfish target auditor serialization correction](audit-stockfish-targets-json-zero.mjs): preserves original pinned auditor failure and independently checks completed records.

- [Warm-start runner v2](train-near-transfer-repair-v2.mjs) and [auditor](audit-near-transfer-repair-v2.mjs)
- [Sibling evaluator](evaluate-near-transfer-repair-transfer.mjs) and [corrective auditor](audit-near-transfer-repair-transfer-v2.mjs)

- Capture-retention protocol freezer: [freeze-capture-retention-assay.mjs](freeze-capture-retention-assay.mjs), [runner](train-capture-retention-assay.mjs), [independent auditor](audit-capture-retention-assay.mjs), and [frozen aggregate analyzer](analyze-capture-retention-assay.mjs).
- Post-run effective-seed audit: [audit-capture-retention-seed-independence.mjs](audit-capture-retention-seed-independence.mjs); this is read-only and was not part of the frozen v3 gate.
- Capture-retention projection-seed static audit: [audit-capture-retention-projection-seeds.mjs](audit-capture-retention-projection-seeds.mjs); reads training and validation only and does not run the graph.
- [audit-bound-ray-relational-cue.mjs](audit-bound-ray-relational-cue.mjs) runs a static train/validation-only projection check; it does not open final positions or run the graph.


- Correction-preservation v2: [freezer](freeze-correction-preservation-v2.mjs), [runner](train-correction-preservation-v2.mjs), [independent auditor](audit-correction-preservation-v2.mjs); [frozen protocol](../../../archive/early-development/research/data/correction-preservation-v2/README.md).

- [train-bidirectional-plasticity-assay.mjs](train-bidirectional-plasticity-assay.mjs): identity/certificate/anatomy preflight; run mode requires the same complete preflight and a separately reviewed adapter.

- The v3 protocol includes no-teaching retention probes and is blocked by local-signal, model-identity, adapter and certified-reversal prerequisites.

- [audit-bidirectional-plasticity-assay.mjs](audit-bidirectional-plasticity-assay.mjs): independent read-only certificate, signal, exposure, checkpoint, and gate audit; protocol v3 remains blocked so no audit was run.

## 2026-10-24 fix goal additions (Stage 1)

- [stage1-retention-probe.mjs](stage1-retention-probe.mjs) and [stage1-retention-probe-v2.mjs](stage1-retention-probe-v2.mjs): training-only retention probe (teach board A, then 10 other boards, track A's certified-move rank) for `ReversalMemory` eta; v2 takes the teaching condition from its protocol. Python actions `python actions/stage1-retention-probe-*-step.json`; results in [the probe report](../../../archive/early-development/research/reports/stage1-retention-probe-2026-10-24/README.md).
- [lichess-stage1-runtime-factory-v2.mjs](lichess-stage1-runtime-factory-v2.mjs): registration revision 7+ (action-relative cue v2, coupled brain v3); otherwise identical to the pinned v1 factory.
- [run-lichess-curriculum-matrix-v2.mjs](run-lichess-curriculum-matrix-v2.mjs): registration revision 8+; registered rehearsal planner v2 and informative-arm early stop, and a cooperative block-boundary pause that writes `paused.json` for `fly pause`. Older registrations keep the v1 runner.
