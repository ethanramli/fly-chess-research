# Delayed-fixture solvability audit

All 71 legal root moves were independently certified within the three-ply task: original 2 successes/32 failures; support-shifted 1 success/36 failures; no unknown outcomes. The separate checker replays all certificates, binds actor/task/history, checks every legal move appears exactly once and reconstructs summary counts. [Audit](audit.json), [report](report.json), [raw certificates](certificates.jsonl).

The original successful moves are `h5h7` and `f1f8`. The first is immediate mate, so successful selection on this position cannot establish learning of delayed sacrifice. The changed position's sole successful root move is `h5e8`; the old sacrifice fails. Both positions have already been inspected and remain development diagnostics. They cannot be promoted into untouched final-test families.

Commands (repository root):

```powershell
node --max-old-space-size=256 .codebase/scripts/audit-delayed-transfer-fixtures.mjs --out research/reports/delayed-transfer-solvability-2026-10-07
node --max-old-space-size=256 .codebase/scripts/check-delayed-transfer-records.mjs
```

The teacher-only construction invocation took 17.66 s and peaked at 59.67 MiB RSS. It checked memory guards but did not implement CPU-duty pacing; preserve this limitation and do not treat this invocation as a compliant paced neural-training measurement. No full graph, neural feedback or persistent learning ran.
