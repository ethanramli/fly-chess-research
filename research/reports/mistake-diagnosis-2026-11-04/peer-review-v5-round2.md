# Peer review of memory v5 proposal, round 2 (2026-11-05)

Same reviewer and session. Prompt: `peer-review-v5-round2-prompt.txt`.

**APPROVE WITH REQUIRED CHANGES.** Building should wait for the four BUILD clarifications below. The remaining scientific scope is appropriate for the Volume 2 memory goal.

Statuses concern the specification—not implementation validation.

| Item | Status | Reason |
|---|---|---|
| R1 | **RESOLVED** | Label-conditioned eligibility, reused held-out games and the board-repeat rule are disclosed. |
| R2 | **NOT RESOLVED** | Development is isolated, but merged practice order and calibration rounding remain undefined. |
| R3 | **RESOLVED** | Removing K4 eliminates the ridge-weighting normalization conflict. |
| R4 | **RESOLVED** | Removing K4 eliminates the solver-contract problem. |
| R5 | **NOT RESOLVED** | The common frozen pipeline is specified, but its calibration membership remains ambiguous. |
| R6 | **NOT RESOLVED** | Net recall can remain unchanged while previously recalled associations are lost. |
| R7 | **NOT RESOLVED** | Thresholds are stated, but the reused gate cannot directly express their different margins. |
| R8 | **RESOLVED** | Auditor scope now covers all arms, selection, retention and complete numerical verdicts. |
| R9 | **NOT RESOLVED** | Development job identities are incomplete, and admission checks do not reserve outstanding workers’ memory. |

Required changes:

1. **BUILD — Freeze practice order and calibration rounding.**  
   **Evidence:** [proposal:23,39,44,50](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:23).  
   **Problem:** concatenating old/new positions versus re-sorting them changes the calibration set and experience prefixes. “First quarter” permits 187 or 188 calibration positions.  
   **Fix:** sort all practice positions by the existing v3 game-hash rank, then ply; restrict folds while preserving that order. Use exactly `floor(N_source_positions/4)` calibration positions. Separately truncate ledger budgets with `floor(N_slots/4)` and `floor(N_slots/2)`, including unknown slots. Save these membership lists.

2. **BUILD — Gate gross retention loss.**  
   **Evidence:** [proposal:56](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:56).  
   **Problem:** gains on previously incorrect probes can conceal losses on previously correct ones. For example, switching an identical key’s value can preserve 50% recall while losing every previously recalled positive probe.  
   **Fix:** gate `lostAssociations / previouslyRecalledProbeCount ≤ 0.02`; an empty denominator is not a retention pass. Preserve the immutable probes and report both net recall and gross losses.

3. **BUILD — Specify the exact `judgeV5` adapter.**  
   **Evidence:** [proposal:62–67](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:62); [numericPairGate:6,22,33](../../../.codebase/src/neural-learning/transfer-evaluation-v2.mjs:6).  
   **Problem:** `numericPairGate` accepts one shared `minMargin`; omitting `minCorrect` also makes its pass predicate false. Comparator order changes bootstrap draws.  
   **Fix:** call it with `minCorrect:0`, `minMargin:0`, and comparator order `['none','shuffled','quarter']`. Then explicitly require margins `≥7`, `≥7`, and `>0`, respectively, plus all lower bounds positive and the retention criterion. Conjoin across seeds and save the full verdict.

4. **BUILD — Complete worker identities and merge ordering.**  
   **Evidence:** [proposal:71–72](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:71).  
   **Problem:** development jobs also differ by key and direction; the proposed merge tuple omits both.  
   **Fix:** identify jobs by `(phase, key, direction, seed, arm)`, with explicit unused-field values. Require the exact expected job set, reject duplicates/missing jobs, and merge in that total order. Test deliberately shuffled completion order.

5. **LAUNCH — Reserve memory before admitting workers.**  
   **Evidence:** [proposal:72](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md:72).  
   **Problem:** three rapid starts can each observe 2,560 MiB free before their stores allocate.  
   **Fix:** have one supervisor subtract outstanding workers’ reserved headroom before admitting another. Retain the global free-memory guard and verify admission under delayed allocations. Benchmark actual file-backed transforms and scoring before launch.

