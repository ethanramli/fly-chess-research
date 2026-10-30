# G0 reversal-history replication on projection seed 20261012

2026-10-20. The [wait-capable audit](2026-10-19-g0-audit-memory-guard.md) of the first history diagnostic completed: retained memory failed reversal specificity on projection seed 20261011 while complete-memory reset passed the original descriptive thresholds, with strong shuffle-seed variability (retained 7/4/4; reset 5/5/3). This is one seed and a whole-memory intervention; it does not identify a component, pass G0 or authorize C01.

## Registered experiment

[Frozen protocol](../../../archive/early-development/research/data/g0-reversal-history-replication-v1/protocol.json) and [README](../../../archive/early-development/research/data/g0-reversal-history-replication-v1/README.md). The schedule, model, memory, timing, encoder, readout, three pre-frozen shuffles, conditions, exposure and gates are copied unchanged. Only the effective projection seed changes to 20261012, the second predetermined seed in the original G0 protocol. New plan/runner/auditor copies avoid mutating the first diagnostic's pinned sources. Plan hash `d8b23f92d9384f922948a93ece809ae53f91bf06231d15c72d2ef8a2837e0629`; protocol SHA256 `5943dc8fcb68d2dd6a92ec5fd5ae3e4985daf37e2a9c2afe58b012b19a3f025d`; runner `0101bb57...`; auditor `53af15cd...`.

The plan module reproduces the first diagnostic's 24-stage plan exactly for seed 20261011 except its schema string, checked locally. All 30 source hashes, dependency hashes, graph/annotation identities and the plan hash verified before launch. Python action tests passed 17/17. `fly.cmd plan train` reported no blockers and `fly.cmd start train` launched PID17100 into `runs/g0-history-replication-20261012-v1` under heap256/duty0.5.

## Predicted outcomes

- Reset passes and retained fails as on seed 20261011: supports a replicable history-dependent limitation for this configuration.
- Both branches fail: limits generalisation of the reset rescue; preserve and interpret as such.
- Retained passes: the first-seed failure is projection-specific; no cure is inferred.
- Any other pattern is reported without selecting a branch.

All arms receive informative, absent, disabled and three pre-frozen shuffled histories at matched exposure. This is synthetic association and one projection; it cannot pass G0 or authorize C01. Final families stay sealed.

## Completed result and independent audit

2026-10-20. The registered babysitter resumed the same lineage from published checkpoint 003213 into fresh sibling run runs/g0-history-replication-20261012-v1-resume-0003. Training completed all 24 stages and 672 lessons in 2h51m. The independent audit passed full neural replay: 14,161 receipts, 15,481 presentations and 12,768 frames. Audit elapsed time was 5,621.46s and peak RSS 181.71 MiB. Result SHA256 55361a633112bebf3c137e334de02340c33d8e07c00f695a081580351bbfbfa5; audit SHA256 508e79254a4e16e75582b89ded8bb167928875b9212082b9952cf21b0e4119ea. Raw artifacts remain in the run directory.

The reset branch passed all registered descriptive gates; informative reversal choice was 8/8. The retained branch reached the minimum-choice and context-advantage thresholds but failed margin advantage: informative reversal was 7/8 with mean margin 0.00010604, below shuffled-20261011 at 5/8 with mean margin 0.00030735. Overall G0Passed is false. This reproduces the predeclared reset-passes/retained-fails pattern from projection seed 20261011 and supports a history-dependent limitation in this configuration. It does not identify which memory component causes it, establish biological forgetting, pass G0, or authorize chess/C01.

The report's 100% acquisition, 100% interference retention, 87.5% retained reversal and 100% reset reversal are independently verified outcomes for this synthetic association assay. They are not chess measurements. The different projection seed is not treated as a before/after learning comparison.

The remaining effective projection seed 20261013 has not yet been registered or launched. The babysitter stopped after this audit as configured; no later curriculum or chess stage started.

## Operations interpretation correction

During live status checks, the stdout-derived progress.stage field was once described as the current stage even though it lagged the newer checkpoint stage/lesson cursor. Use the latest checkpoint fields for current position; progress.stage is the most recently logged stage event. The command also displayed configChanged=true because the tracked runtime config intentionally substitutes run/checkpoint paths and has a different hash from the base step file. The campaign hash still matched the base registration, and babysitter's own base/runtime-file checks remained intact. These status-display issues did not alter training or the independent audit; correct the status presentation before relying on those fields again.
