# First-puzzle retention after second-puzzle learning

Invocation: `node --max-old-space-size=256 .codebase/scripts/puzzle-learning/evaluate-near-transfer-repair-transfer.mjs --protocol research/data/original-puzzle-retention-v1/protocol.json --out research/reports/original-puzzle-retention-v1-2026-10-07/run --cpu-duty 0.5`.

Preflight passed pinned inputs/sources/runtime and prerequisite audit identities. All legal moves remain available; learning is frozen. [Protocol](../../data/original-puzzle-retention-v1/README.md).

2026-10-07 terminal result: session 86367 exited zero; PID 10580 is absent. Independent artifact/certificate audit passed four panels, 128 candidates/certificate checks and four unchanged memory panels. No feedback occurred.

| Condition | Choice | Bounded consequence | Solution rank |
|---|---|---|---:|
| Informative | c4b5 | Failure | 4 |
| Absent | c4g8 | Success | 1 |
| Shuffled | c4b5 | Failure | 20 |
| Disabled plasticity | c4g8 | Success | 1 |

Together with the audited second-puzzle repair, this establishes interference in this sequential development trial: the new informative teaching repairs one position while losing the original correct unaided choice. It does not establish universal forgetting, its circuit cause, biological retention, or transferable reasoning. The audit checks recorded arithmetic, coverage, hashes, proofs and unchanged memories; it does not independently rerun neural evocations.

Resources: 95.1849 seconds measured evaluation wall time, 44.547 CPU seconds, 109.7148 MiB peak RSS, 128 presentations at duty 0.5. Setup time is outside this reported elapsed interval. [Report](run/report.json) · [Audit](run/audit.json) · [Publication hashes](run/AUDITED.json).

Audit command after terminal completion: `node .codebase/scripts/puzzle-learning/audit-near-transfer-repair-transfer-v2.mjs --run research/reports/original-puzzle-retention-v1-2026-10-07/run --protocol research/data/original-puzzle-retention-v1/protocol.json --audit-protocol research/data/original-puzzle-retention-audit-v1/protocol.json`.
