# Peer review: v6 resume and wall-limit fix, round 1 (Codex gpt-6.1-sol, effort high, 2026-11-05 23:30)

No required code changes.

The resume path is sound for this registered recovery: r4 rebuilds the partition and cache before checking their hashes against the failed r3 run ([runner](.codebase/scripts/neural-learning/run-engineered-memory-test-v6.mjs:137)); it copies only completed `.json` outputs, writes them atomically, and does not reuse r3’s `.steady` markers. Worker outputs are also written atomically ([worker](.codebase/scripts/neural-learning/memory-v6-worker.mjs:138)). The auditor checks the exact job set and independently rebuilds every score and the gate ([auditor](.codebase/scripts/neural-learning/audit-engineered-memory-test-v6.mjs:630), [auditor](.codebase/scripts/neural-learning/audit-engineered-memory-test-v6.mjs:647)). It accepts r4’s layout; the extra `resumedFrom` manifest field does not interfere.

The 12-hour limit is set in both the v6 guard and manifest, and in both corresponding v7 locations. It leaves the other resource limits unchanged. **Disclose in the eventual report** that r3 failed at the wall limit, r4 resumed by copying 21 completed jobs and running three, and the independent audit rebuilt all 24. Treat r3 as a failed attempt, not a separate result. The partial outputs were not used for a gate statistic.

LAUNCH OK