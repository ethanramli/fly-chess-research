# Memory v8 proposal: practise on the captures (PROPOSAL rev 2, 2026-11-07)

Status: rev 2 after strict review round 1 ([review](../../../research/reports/mistake-diagnosis-2026-11-04/peer-review-v8-round1.md): approve with required changes; building allowed). Written **after** reading the v7 result: an openly outcome-informed redesign, frozen before any v8 evaluation. Follows the [memory goal](../research-goals/memory-goal-2026-11-04.md) and [memory v7](memory-v7-proposal-2026-11-05.md).

**Serves:** Volume 2, chapters 3 (To Learn) and 5 (Evidence for Learning). **Status: exploratory** ([r1-5]): this is the eighth memory version, and its design was informed by earlier outcomes. Its bounds are per-comparison, not simultaneous, and give no protection against redesigning until success. A confirmatory claim needs an untouched, registered replication.

## 0. Why v8 exists

v7 ([report](../../../research/reports/engineered-memory-test-v7-2026-11-06/README.md)) asked whether the memory chooses the safe capture among known-certificate captures. It passed in seeds 6102 and 6103 and failed in 6101. The store held 3,000 practice slots per seed, but only 297, 321 and 288 were known-certificate captures; the rest were quiet moves (−1). The learning curve was noisy (6101: eighth 257.8, half 233.0, full 258.1).

**Hypothesis, one of several ([r1-1]):** too little task-relevant experience. v7 does not identify this as the cause: seed 6103 had fewer capture slots than 6101 and still passed, and key quality, k, quiet neighbours and test difficulty are other explanations. The same 750 practice positions hold **2,509** known-certificate captures (991 safe, 1,518 unsafe; 21 unknown king captures excluded), all certified and already in the v4/v5 caches.

## 1. The joint curriculum change ([r1-1])

Per seed, the ledger becomes **every known-certificate capture of the 750 v5 practice positions, once**, in a seeded order. This changes several things at once: capture coverage (about 8 times more), no quiet neighbours in the store, the safe/unsafe balance (39% safe), and every full store holding the same 2,509 examples. A pass would show that this curriculum makes the memory useful; it would **not** explain why v7 failed. The scope stays a label-conditioned fixture with externally filtered candidates.

Ledger rule ([r1-2]), applied **after** the practice certificates are rechecked:

1. Base list: for each practice id in `partition.practice` order, its legal captures on the replayed board (`move.captured`, en passant included), sorted by UCI, kept when the rechecked certificate category is `safe` (value +1) or `unsafe` (value −1). Unknown captures and quiet moves produce no slot. Every eligible `(id, uci)` appears exactly once.
2. Order: `indices = partialFisherYates([0..L-1], L, mulberry32((seed ^ 0x1ed8) >>> 0))`; slot t holds base entry `indices[t]`.
3. Slots are numbered 0..L−1 **after** shuffling, in the v5 format (`slot`, `id`, `uci`, `category`, `value`, `certificateSha256`, the hash copied from the rechecked certificate), and written to `ledger-<seed>.jsonl` before any brain pass or score.

The teacher presents both verified outcomes and selects moves by type and certificate *status* only, never by value. Reviewer answer: this is a fair teacher-selected curriculum for this conditional assay.

Unchanged from v7: key K3 (centred over all legal moves), v5 calibration (first sorted legal move of the first `floor(750/4)` practice positions), the nearest-episode memory (k = 3, 1/distance, capacity 4,096), the candidate set (known-certificate captures), s / c ties, seeds 6101-6103. **The v7 worker is reused unchanged:** it reads the run's `ledger-<seed>.jsonl` and `permutation-capture-<seed>.json`, takes prefixes from the ledger length, and keeps all-legal K3 centring and calibration.

## 2. Arms

Per seed: **full** (2,509 slots), **half** (1,254), **quarter** (627), **eighth** (313, descriptive), **shuffled** (every slot is a capture, so the v7 capture shuffle permutes every value: `partialFisherYates([0..L-1], L, mulberry32((seed ^ 0x7ca7) >>> 0))`, `values[t] = ledger[indices[t]].value`), **none** (random capture), and the secondary **raw-pc** and **random-pc** (full store). 24 jobs.

**What seeds, growth and retention mean ([r1-3]):** every full store gets the same 2,509 examples. Seeds vary the order, the prefixes and the shuffled assignment; they are not independent training samples. Order can still matter through identical-vector overwrites and distance ties. Full > quarter means that adding the remaining examples to these prefixes improves choices; it does not show monotonic improvement or improvement from new practice positions. Retention is **exact-key sign recall** (a stored key at distance 0 returns its stored value), not evidence about retrieval limits or biological forgetting. Per arm the summary reports the store counts: writes, unique entries (writes − replacements), consistent and conflicting replacements, evictions.

## 3. Data ([r1-4])

1. New games: training-bucket games ranked 901-1200 (`fetch_restart_game_pgns.py --skip 900`, same rule; `runs/restart-data-2026-11-06/games-train-901-1200/`, `selection.json` `109685de...457d`, `games.pgn` `ab1f8f58...56b2`). The runner and the auditor check 0 overlap with **all three** earlier selections (games 1-300 `5c212e69...4bdd`, 301-600 `af0ce4c7...7101`, 601-900 `54f70ed4...fa7b`), each pinned by exact SHA-256, and that every new position's game is in the new selection.
2. Positions: `capture-choice-positions-901-1200-v1/positions.jsonl` (`be6abf39...6059`): the same generator (`minPly 10`, `minGap 10`, `maxPerGame 2`), generator order, no topping up. Inspected before freezing: only the fetch and generator counts (300 games, 0 overlap; 565 positions, 292 games; outcome counts). No brain pass and no score.
3. Exclusion before any brain pass: a board (FEN piece field) equal to any board of the 750 practice positions, the 184 v4, 150 v5, 573 v6 (`engineered-memory-test-v6-r4/partition.json`) or 567 v7 (`engineered-memory-test-v7-r2/partition.json`) test positions, both partitions pinned by SHA-256. Retained ids in generator order go to `partition.json` (`freshTest`), hashed before any brain pass. N = number retained.
4. Brain passes only for the new test keys (all legal moves). Practice keys come from the v4 and v5 caches.
5. From v5 only `partition.json` (practice ids) and the practice certificate lines are used. v5's schedules, ledgers and permutations are not copied.

## 4. Gate: `judgeV8` ([r1-5])

`judgeV7` with gate seed **20261108**. M = ceil(7 × N / 150). Per seed: `numericPairGate({ arms, games, primary: 'full', comparators: ['none', 'shuffled', 'quarter'], minCorrect: 0, minMargin: 0, resamples: 10000, seed: 20261108, lowerQuantile: 0.025 })`, a bootstrap that resamples whole games; then margin(none) ≥ M, margin(shuffled) ≥ M, margin(quarter) > 0, all three lower bounds > 0 (strict), and retention lost / previouslyRecalled ≤ 0.02 with previouslyRecalled > 0. Pass only if every seed passes.

## 5. Descriptive only

The piece-value rule (maximise captured value − capturing value; P 1, N 3, B 3, R 5, Q 9; ties s / c), the all-legal score, raw-pc and random-pc, the curve eighth / quarter / half / full, and the store counts. Declined optional suggestion: matched comparisons with the old mixed ledger and its capture-only subset on the same test. They would separate the causes, but they need a changed worker; they can be a later version if v8's result calls for it.

## 6. Build contract

1. `.codebase/src/neural-learning/engineered-memory-task-v8.mjs`: `captureLedger` (section 1) and `judgeV8` (section 4); the shuffle reuses v7 `permuteCaptureValues(ledger, () => true, seed)` (section 2), with tests (order, exactly-once, quiet and unknown excluded, value/category agreement, determinism, seed dependence, slot numbering, judge seed).
2. `.codebase/scripts/neural-learning/run-engineered-memory-test-v8.mjs`: a copy of the v7 runner (12-h wall, `--resume-from`) that builds ledgers and permutations after the practice certificate recheck, extends the earlier-game and earlier-board sets, records store counts, and calls `judgeV8`. The v7 worker is pinned and reused.
3. `.codebase/scripts/neural-learning/audit-engineered-memory-test-v8.mjs`: a copy of the v7 auditor that rebuilds the expected ledgers independently from the rechecked certificates, compares them with every run ledger, and scores from the verified content; checks three pinned earlier selections and the v6/v7 exclusions. Corruption tests: a missing eligible capture, a duplicated one, a quiet move, an unknown capture, a wrong certificate hash, a wrong order or seed, a wrong permutation, an omitted v7 exclusion board.
4. Codex code review, a dry run on 5 test positions and its audit, then the real run (detached), then the audit.
