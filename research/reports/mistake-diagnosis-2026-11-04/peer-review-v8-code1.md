# Peer review: memory v8 code, round 1 (Codex gpt-6.1-sol, effort high, 2026-11-07)

**Required fixes**

1. **Bind the v5 references independently.** [auditor:897](C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/audit-engineered-memory-test-v8.mjs:897) can report `pinned:true` without requiring the registered v5 partition or v5 cache digest. [auditor:583](C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/audit-engineered-memory-test-v8.mjs:583) merely compares the partition with the caller's config. Reordering practice IDs and updating that config hash changes calibration and ledger order while remaining eligible for "pinned" acceptance.

   **Fix:** independently anchor the registered v5 partition and cache digest, and bind the v4/v5 `keys.json` row maps to their cache bytes. Require actual files to match. Fixture overrides must make the report unpinned. Add corruption tests. Deviation **(b) is insufficient**; this is an inherited gap.

2. **Audit the reported summary and practice list.** [auditor:838](C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/audit-engineered-memory-test-v8.mjs:838) checks outcome and verdict but explicitly discards `verdict.rule`; it never checks `summary.storeCounts` or `summary.margin`. The "clean" fixture has no `storeCounts` and a different rule schema, yet passes all ten checks. Consequently, reported overwrite counts or gate thresholds can be wrong while the audit passes. The test-set check also omits comparison of the run's `partition.practice` with the frozen practice list.

    **Fix:** compare `partition.practice` exactly; reconstruct `storeCounts` from independently rebuilt jobs, preserving the runner's omission of `none`; verify the complete numeric rule and top-level margin. Add tests that alter each independently. Keep the fixture's summary layout identical to the runner's actual layout. ([runner:479](C:/Users/ethan/Documents/fly-chess-research/.codebase/scripts/neural-learning/run-engineered-memory-test-v8.mjs:479), [fixture:484](C:/Users/ethan/Documents/fly-chess-research/.codebase/tests/neural-learning/audit-engineered-memory-test-v8.test.mjs:484))

3. **Restore an isolated margin-floor test.** [test:694](C:/Users/ethan/Documents/fly-chess-research/.codebase/tests/neural-learning/audit-engineered-memory-test-v8.test.mjs:694) is not equivalent to the omitted test: flipping a failing seed's recorded verdict proves comparison works, not that the margin floor controls the decision. Printing `M=1` also does not establish enforcement.

   **Fix:** inject synthetic job results into a gate test. For three distinct games, use `full=[1,1,1]`, `none=shuffled=[0.8,0.8,0.8]`, `quarter=[0.9,0.9,0.9]`, with passing retention. Every bootstrap bound is positive, but the 0.6 margins fail `M=1`; a floor of zero would wrongly pass. Add a corresponding passing case. Deviation **(a) leaves this requirement unresolved**.

**Optional notes**

1. The ledger implementations agree: practice order followed by sorted UCI, including capture promotions and en passant; king captures remain unknown and are excluded. Both shuffle streams match. The unchanged worker correctly handles prefixes, aligned shuffled values, 627 retention probes and capacity 4,096. Ledgers are written after certificate recheck and before brain passes. Deviation **(c) is acceptable**: pinned game disjointness already implies disjoint game/ply/action keys from v7.

2. The resume loop retains the approved atomic-copy behaviour, but compares only partition/cache hashes. Before any v8 recovery, also compare the already-recorded ledger/permutation hashes and relevant code pins. The current fresh registrations do not invoke resume.

Unit checks: **7/7 task tests and 29/29 non-CLI auditor tests passed**. The CLI test remains unverified because sandbox child-process spawning returned `EPERM`.

DO NOT LAUNCH: reference binding, summary verification and the margin-floor test require fixes.
