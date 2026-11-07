# Memory v7 proposal: does the memory judge which capture is safe? (PROPOSAL rev 2, 2026-11-05 16:00)

Status: rev 2 after strict review round 1 ([review](../../../research/reports/mistake-diagnosis-2026-11-04/peer-review-v7-round1.md): approve with required changes; building allowed with changes [r1-1] and [r1-2]; launch conditional on [r1-3]). An openly outcome-informed redesign, frozen before any v7 evaluation and reported as such; it cannot validate v3-v6 retrospectively. Follows the [memory goal](../research-goals/memory-goal-2026-11-04.md) and [memory v6](memory-v6-proposal-2026-11-05.md).

**Serves:** Volume 2, chapters 3 (To Learn) and 5 (Evidence for Learning). **Status: exploratory, written after seeing v5 and the stopped v6 partial.**

## 0. Why v7 exists (the mistake it repairs)

v3-v6 score the choice over **all legal moves**. The stored experience holds +1 only for safe captures and −1 for every other move, quiet moves included, and Eyes v2 draws a capture differently from a quiet move. So "full beats none" and "full beats shuffled" can be met by learning *capture versus quiet move* alone. On the 573 v6 test positions, a random legal move scores 23.4 (the none arm) and a **random capture scores 250.1**; the stopped v6 seed-6101 full arm scored 130.9 ([journal, 2026-11-05](../../../research/journal/experiments/2026-11-05-memory-v4-v5.md)). Shuffled outcomes also erase the capture-versus-quiet signal, so the shuffled control did not catch this.

v7 asks the question v3-v6 meant to ask: **among the captures of a position, do the stored experiences make the model choose the safe one more often?**

## 1. The one change

The **candidate set** for scoring becomes the position's legal captures whose certificate is known (`safe` or `unsafe`). Quiet moves and `unknown` captures (king captures and exhausted checks) are not candidates: unknown verification produces no event. Every test position qualifies with at least one safe and one unsafe capture (generator rule `qualifies`), so the set always holds both.

**[r1-1] Candidates are separate from the key.** `legalOf` still returns **all** legal moves, for K3 centring and calibration. A separate sorted list, `candidatesOf(id)`, gives the scoring set. Membership comes from the replayed board's capture status (`move.captured`) **and** the rechecked certificate category (`safe` or `unsafe`). Each test position must keep at least one safe and one unsafe candidate, or the run stops. En passant counts as a capture. Ties are scored s / c over the candidates. Practice keys and store fingerprints are unchanged from v6.

Everything else is v6 unchanged: key K3 (position-centred Kenyon-cell row, centred over **all** legal moves as before, so the key is unchanged), v5 calibration, store, ledgers (quiet −1 entries kept), permutations, schedules, k = 3, capacity, ties scored s / c, retention probes, seeds 6101-6103.

With this set, the **none arm equals the random-capture rule**, so "full beats none" is now "full beats a random capture".

## 2. Data

1. New games: training-bucket games ranked 601-900 (`python actions/fetch_restart_game_pgns.py --skip 600`, same selection rule; 0 overlap with games 1-600 checked).
2. Positions: same generator, `--max-per-game 2`.
3. Exclusion before any brain pass: a position whose board (FEN piece field) equals a board of the 750 v5 practice positions, the 184 v4 tests, the 150 v5 fresh tests or the 573 v6 tests. Retained ids in generator order go to `partition.json` (`freshTest`), hashed before any brain pass. N = number retained; no topping up.
4. v6's test set is not reused: its all-legal results are already seen.

## 3. Arms

Per seed: **full**, **half**, **quarter**, **eighth** (descriptive), **shuffled** ([r1-2]: full slots with the +1/−1 values **permuted only among known capture slots** of the ledger, by forward Fisher-Yates over the subset indices: `partialFisherYates([0..K-1], K, mulberry32((seed ^ 0x7ca7) >>> 0))`, the same algorithm as `permuteKnownValues` but called directly, with no extra `^ 0x5eed` (clarified 2026-11-05 before any v7 run, after the code review); quiet slots keep −1, unknown slots stay null, every exposure unchanged; saved as `permutation-capture-<seed>.json`), **none**, and the secondary comparators **raw-pc** and **random-pc** (full store). 8 arms × 3 seeds = 24 jobs, as in v6.

## 4. Gate: `judgeV7`

M = ceil(7 × N / 150). Per seed, over the capture candidate set: `numericPairGate({ arms, games, primary: 'full', comparators: ['none', 'shuffled', 'quarter'], minCorrect: 0, minMargin: 0, resamples: 10000, seed: 20261107, lowerQuantile: 0.025 })`, then margin(none) ≥ M, margin(shuffled) ≥ M, margin(quarter) > 0, all three lower bounds > 0 (strict), and retention lost / previouslyRecalled ≤ 0.02 with previouslyRecalled > 0. Pass only if every seed passes.

## 5. Descriptive only (reported, not gated)

1. The v6-style all-legal score for every arm, for continuity.
2. A fixed piece-value rule as a non-learning reference: choose the capture that maximises (value of captured piece − value of capturing piece), P 1, N 3, B 3, R 5, Q 9, ties s / c. If the memory loses to this rule, the report says so.
3. The share of `unknown` captures excluded per position.

## 6. Build contract (small)

1. `engineered-memory-task-v7.mjs`: `judgeV7` (as `judgeV6`, new gate seed) and `captureCandidates(moves)` (known-certificate captures, sorted UCI). Reuses v5 functions by import.
2. `run-engineered-memory-test-v7.mjs` and `memory-v7-worker.mjs`: copies of v6 with the candidate set from §1 and the three caches plus the new v7 cache. Brain passes only for the new test keys (all legal moves, because K3 centres over them). v5 and v6 files stay unchanged.
3. `audit-engineered-memory-test-v7.mjs`: independent, as the v6 auditor, plus a corruption test that puts a quiet move into the candidate set.
4. Dry run on 5 test positions, then the real run, then the audit.

## 7. Reviewer answers (round 1)

1. Quiet entries stay in the store, and all-legal centring stays (it uses no safety labels, though legal-move context is external help).
2. The piece-value rule stays descriptive, not a gate. It cannot rule out every piece-based shortcut, because Eyes v2 shows the captured piece's identity.
3. M = ceil(7N/150) stays: an engineering threshold of 4.67 percentage points, not a power guarantee.

## 8. Provenance and claim wording ([r1-3], launch)

Pinned selection and source hashes, explicit game-set intersections (with games 1-300 and 301-600), the full earlier-board exclusion set, and the ordered retained ids. The result is reported as **selection among externally filtered, known-certificate captures on label-conditioned fixtures**: neither unaided all-legal choice nor relational safety reasoning.

## 9. Original reviewer questions (rev 1, kept)

1. Should the store also drop quiet-move entries (capture slots only)? This draft keeps the store unchanged so that only the scoring set differs from v6.
2. Is the piece-value rule enough as the non-learning reference, or should beating it be part of the goal?
3. Is M = ceil(7N/150) still a fair minimum when chance is about 44 % instead of about 4 %?
