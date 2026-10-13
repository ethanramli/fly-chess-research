# Verified positive-channel puzzle pilot: complete, useful-choice gates failed

Report SHA-256: `01a7ab038b03474283580e0dd5f8cb821512dbac4f6833eb45192925dbe5445b`. Both useful-choice and repair-above-absent/disabled gates fail. Exact repeat/reset/restoration and fixed-state gates pass. This retains every earlier failed result and the separate passing association prerequisite; no threshold was changed.

| Condition | KQK unaided after | KRK unaided after |
|---|---|---|
| Informative two-channel | Qb3, failure | Rb1, success already present before |
| Punishment-only | Qb3, failure | Rb1, success already present before |
| Absent | Qf5, failure | Rb1, success already present before |
| Shuffled | Qf5, failure | Ke8, failure (prior Rd1 succeeded) |
| Disabled plasticity | Qf5, failure | Rb1, success already present before |

Informative, punishment-only, absent and disabled conditions all have verified successful searched choices before and after teaching. Shuffled searched choices fail after teaching on both fixtures. Successful external search is therefore not evidence that informative training improved strength. The single-seed matched comparison does not establish statistical specificity or transfer.

All conditions replay the same eight informative board/action/proof experiences: 40 event receipts, 32 enabled local updates. Known-success PAM02 and known-failure PPL103 exposure are population-count matched to the recorded nonidentical shuffle. Unknown consequences are omitted rather than taught. All legal moves remain available; inference receives no certificates or diagnostic labels. Memory stays frozen during bounded separate-board investigation and measurement.

`audit.json` and `audit-prefix.json` pass 80 independently replayed certificate uses and all 32 local recurrences, channel population/stimulation checks, full legal-set coverage, memory continuity and gate arithmetic. `audit-traces.json` passes nine informative trajectories, eight explanations and two defense diagnostics. These audits do not independently rerun neural inference or validate biological dynamics. All source/input/model/graph/annotation identities and exact commands are in `report.json`; frozen code/protocol and auditors are archived under `source/`.

```powershell
node --max-old-space-size=256 .codebase/scripts/train-positive-puzzle-pipeline.mjs --out research/reports/positive-puzzle-pipeline-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-positive-puzzle-pipeline.mjs --run research/reports/positive-puzzle-pipeline-v1-2026-10-06 --out research/reports/positive-puzzle-pipeline-v1-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/audit-pipeline-traces.mjs --run research/reports/positive-puzzle-pipeline-v1-2026-10-06
node --max-old-space-size=256 .codebase/scripts/train-positive-puzzle-pipeline.mjs --out research/reports/positive-puzzle-pipeline-prefix-2026-10-06 --resume research/reports/positive-puzzle-pipeline-v1-2026-10-06/checkpoint-00004/state.json --max-events 1 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-positive-puzzle-pipeline.mjs --run research/reports/positive-puzzle-pipeline-v1-2026-10-06 --prefix research/reports/positive-puzzle-pipeline-prefix-2026-10-06 --out research/reports/positive-puzzle-pipeline-v1-2026-10-06/audit-prefix.json
```

Complete uninterrupted invocation: 109.5078125 MiB peak RSS, 916.0918095 seconds elapsed, 432.437 seconds CPU and 1,692 neural presentations. Prefix recovery: 97.5703125 MiB peak RSS, 2.7063593 seconds elapsed, 2.016 seconds CPU, zero neural presentations. Exact replay acknowledges the already persisted update once. CPU duty 0.5 is pacing, not an OS CPU cap. These workload measurements are not a resource-improvement claim.

Training-only diagnostics identify unreviewed leading failures and sparse positive eligibility, without assigning a unique cause. See `../positive-puzzle-ranking-diagnostic-2026-10-06/` and `../positive-puzzle-ranking-local-diagnostic-2026-10-06/`. A separate read-only saved-memory intervention probe is the next diagnostic. No useful familiar acquisition, unfamiliar/counterfactual reasoning, learned strategic leaf value, delayed eligibility or natural visual/reward reconstruction is established.
