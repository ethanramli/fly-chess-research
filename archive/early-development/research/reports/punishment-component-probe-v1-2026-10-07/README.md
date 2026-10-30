# Punishment component diagnostic

[Frozen protocol](../../data/punishment-component-probe-v1/README.md) compares before, full punishment, decreases-only and increases-only memories on the original trained puzzle. The isolated component states are artificial diagnostic interventions and must never be reported as learned checkpoints or successful training.

2026-10-07 live observation: session 77647/PID3500 confirmed active. First panel reproduces correct c4g8 at rank1 before punishment. Remaining panels and terminal artifact audit are pending. Recheck the same session/process; do not restart on observation timeout.

Terminal correction: session exited zero. Artifact/certificate audit passed four panels, 128 candidates/certificate checks, zero feedback and four unchanged memory panels. Before chooses correct c4g8 at rank1. Full punishment, decreases-only and increases-only each choose failing c4b5 with solution rank4. Both isolated components are sufficient to lose the choice under these artificial interventions; neither component is individually necessary because removing either leaves failure. This does not establish identical score changes or a universal mechanism. Suppressing recovery alone is insufficient in this fixture.

Resources: 122.1455 seconds measured evaluation wall time, 54.016 CPU seconds, 109.418 MiB peak RSS, 128 presentations, duty0.5. [Report](run/report.json) · [Audit](run/audit.json) · [Publication hashes](run/AUDITED.json). The audit does not independently rerun neural evocations.

Separate [construction audit](../../data/punishment-component-probe-v1/construction-audit.json) verifies all 870 gain entries, exact 104 decreases and 46 increases, original memory identity, pre-event event count and diagnostic labeling. It does not rerun neural evocations.

Command: `node --max-old-space-size=256 .codebase/scripts/puzzle-learning/evaluate-near-transfer-repair-transfer.mjs --protocol research/data/punishment-component-probe-v1/protocol.json --out research/reports/punishment-component-probe-v1-2026-10-07/run --cpu-duty 0.5`.

After terminal completion audit with `node .codebase/scripts/puzzle-learning/audit-near-transfer-repair-transfer-v2.mjs --run research/reports/punishment-component-probe-v1-2026-10-07/run --protocol research/data/punishment-component-probe-v1/protocol.json --audit-protocol research/data/punishment-component-probe-v1/audit-protocol.json`.
