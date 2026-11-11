# Peer review: v7 resume after the shutdown, round 1 (Codex gpt-6.1-sol, effort high, 2026-11-06 21:45)

No required code changes.

- **Resume:** ordering and `copy/continue` are correct. Partition, certificates, capture permutations and cache are rebuilt before `runBatch`; partition/cache hashes must match. Only the runner pin differs from the failed launch's pins. Worker JSON publication is atomic; `.partial` and `.steady` files are not copied. ([runner:139](C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/run-engineered-memory-test-v7.mjs:139), [worker:160](C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/memory-v7-worker.mjs:160))
- **Auditor:** r2's folder, additional manifest field and resume argv are compatible. It independently reconstructs capture permutations, checks all 24 job identities, rebuilds every result except the resource measurement, and recomputes the gate. Full acceptance still requires passing checks and pinned inputs. ([auditor:708](C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/audit-engineered-memory-test-v7.mjs:708), [auditor:748](C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/audit-engineered-memory-test-v7.mjs:748))
- **Disclosure:** same requirement as v6: preserve the failed attempt; describe r2 as its continuation; identify the 12 copied outputs and hashes, 12 recomputed jobs, and eventual full audit. Record that no scores were inspected before deciding to resume. Report r2 elapsed time as recovery time, not total experiment runtime.

LAUNCH OK
