# Frozen training-volume V1: completed failure

The final [report](report.json) completes eight jobs: two encoders, four feedback conditions, 128 presentations per job. Both informative conditions fail dose-rescue, persistent-success and final-feedback-specificity gates. All legal choices remain available. Absolute informative selects Kf5 at 8/32/128; relational informative selects Qf5 at every budget. Reviewed margins improve but plateau without repairing full-root choice. The longer shuffle is count matched and differs from informative feedback.

This rejects repetition-only repair for the repeated four-experience schedule within the tested budgets and seed. It does not establish universal incapacity, a unique causal bottleneck, failure at every larger dose, or failure of varied training. No unfamiliar-position or reasoning success is demonstrated.

[Independent audit](audit.json) checks 1,024 recorded transitions and 1,056 certificate uses, fixed physical input budgets, curves, local recurrence and repeat/reset/restoration. These include disabled transitions with no plastic update. [Prefix audit](audit-prefix.json) also passes exact scientific-state comparison after resuming a pending receipt: zero new neural evaluations in the bounded prefix. Paths and elapsed times are excluded; neural state and counters agree. Report SHA-256: `9c9377a923a668dba55ed1a82814152d57b435362db06ffd3176c334c06d0123`.

## Invocations and resources

Preserve all three directories. Receipts/checkpoints remain in their original locations and are hash-linked. Frozen source and protocol identities are in report.json; no learning equation, seed or gate was changed during recovery.

1. Original: `node --max-old-space-size=256 .codebase/scripts/train-volume.mjs --out research/reports/training-volume-v1-2026-10-06 --cpu-duty 0.5`. Verified stall at checkpoint 1050, controlled termination. [Native counters and reason](../training-volume-v1-2026-10-06/controlled-recovery.json): peak working set 129.9296875 MiB, CPU 461.71875 s. These are Windows counters, not completed Node metrics; underlying wait cause remains unknown.
2. First resume: `node --max-old-space-size=256 .codebase/scripts/train-volume.mjs --out research/reports/training-volume-resumed-2026-10-06 --resume research/reports/training-volume-v1-2026-10-06/checkpoint-01050/state.json --cpu-duty 0.5`. [Publication interruption](../training-volume-resumed-2026-10-06/interruption.json): 114.19921875 MiB peak RSS, 541.3600668 s elapsed, 286.094 s CPU, 543 evaluations. Windows denied checkpoint-01423.partial rename; last published checkpoint 1422 retained pending receipt and updated memory.
3. Final resume: `node --max-old-space-size=256 .codebase/scripts/train-volume.mjs --out research/reports/training-volume-resumed2-2026-10-06 --resume research/reports/training-volume-resumed-2026-10-06/checkpoint-01422/state.json --cpu-duty 0.5`. Completed: 120.88671875 MiB peak RSS, 1130.131795 s elapsed, 569.687 s CPU, 801 evaluations **in this invocation only**.

No whole-run completed Node resource measurement exists; do not present the final segment as one. Checkpoint 1423.partial is not acknowledged and persisted updates were not replayed on resume.

Commands for audits and pending-receipt replay:

```powershell
node --max-old-space-size=256 .codebase/scripts/audit-training-volume.mjs --run research/reports/training-volume-resumed2-2026-10-06 --out research/reports/training-volume-resumed2-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/train-volume.mjs --out research/reports/training-volume-prefix-2026-10-06 --resume research/reports/training-volume-v1-2026-10-06/checkpoint-00004/state.json --max-events 1 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-training-volume.mjs --run research/reports/training-volume-resumed2-2026-10-06 --prefix research/reports/training-volume-prefix-2026-10-06 --origin research/reports/training-volume-v1-2026-10-06 --out research/reports/training-volume-resumed2-2026-10-06/audit-prefix.json
```

Outputs already exist; audit commands deliberately require fresh output paths. [Hypothesis and limits](../../../documentation/design/puzzle-learning/training-volume.md).
