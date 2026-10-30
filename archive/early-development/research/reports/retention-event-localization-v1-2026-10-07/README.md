# Retention event localization

Command: `node --max-old-space-size=256 .codebase/scripts/puzzle-learning/evaluate-near-transfer-repair-transfer.mjs --protocol research/data/retention-event-localization-v1/protocol.json --out research/reports/retention-event-localization-v1-2026-10-07/run --cpu-duty 0.5`.

Preflight passed. Session 30827/PID 18388 confirmed live on 2026-10-07. The first panel reproduces the original correct c4g8 choice at rank1 before new feedback. Intermediate punishment and final reward panels are pending. Preserve this historical observation and verify terminal state before interpretation.

Terminal correction, 2026-10-07: session exited zero. Independent artifact/certificate audit passed three panels, 96 legal candidates/certificate checks, no feedback and unchanged memories. Before feedback chooses c4g8 (success, rank1); after punishment chooses c4b5 (failure, solution rank4); after reward also chooses c4b5 (failure, solution rank4). Thus the first decision-boundary loss is already present after punishment. This does not identify its gain component or circuit cause. The audit does not independently rerun neural evocations.

Measured evaluation: 45.1513 seconds wall, 23.156 CPU seconds, 110.1289 MiB peak RSS, 96 presentations. [Report](run/report.json) · [Audit](run/audit.json) · [Hashes](run/AUDITED.json).

[Protocol](../../data/retention-event-localization-v1/README.md). Audit command after completion: `node .codebase/scripts/puzzle-learning/audit-near-transfer-repair-transfer-v2.mjs --run research/reports/retention-event-localization-v1-2026-10-07/run --protocol research/data/retention-event-localization-v1/protocol.json --audit-protocol research/data/retention-event-localization-v1/audit-protocol.json`.
