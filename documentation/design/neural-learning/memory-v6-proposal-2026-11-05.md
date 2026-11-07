# Memory v6 proposal: a frozen replication of memory v5 on new games (PROPOSAL rev 2, 2026-11-05 04:10)

Status: rev 2 after strict review round 1 ([review](../../../research/reports/mistake-diagnosis-2026-11-04/peer-review-v6-round1.md): approve with required changes; building allowed). Follows the [memory goal](../research-goals/memory-goal-2026-11-04.md).

**Honest framing (review item 5):** v6 is a prospectively frozen replication **motivated by the v5 result**, written after reading it. It reuses v5's memory and gate unchanged (only the margins are rescaled to the test size), so no v5 test outcome selects a key, threshold, or test. Both outcomes are reported, whatever they are. A failure to detect full > quarter would not establish a plateau.

**Serves:** Volume 2, chapters 3 (To Learn) and 5 (Evidence for Learning). **Status: exploratory replication.**

## 1. Frozen inputs (pinned by SHA-256)

1. v5 run folder `runs/engineered-memory-test-2026-11-05/engineered-memory-test-v5/`: `partition.json` (the 750 practice ids, in order), `schedules.json`, `ledger-<seed>.jsonl`, `permutation-<seed>.json`, the certificates of the practice moves, and the v5 cache. The v4 cache is pinned too. The key is **K3**: v5's development selection, made on practice games only.
2. New games: `runs/restart-data-2026-11-05/games-train-301-600/` (training-bucket games ranked 301-600 by `fetch_restart_game_pgns.py --skip 300`; `selection.json` `af0ce4c7...7101`, `games.pgn` `58288149...0ae4`; 0 overlap with the first 300, checked).
3. New positions: `runs/restart-data-2026-11-05/capture-choice-positions-301-600-v1/positions.jsonl` (`e78cbb24...0128`; same generator, `--max-per-game 2`; 574 positions, 297 games, 21,230 moves). Eligibility is label-conditioned, as in v3-v5.

## 2. Test set, frozen before any brain pass (review item 4)

Board = the FEN piece-placement field. A new position is **excluded** if its board equals any board of: the 750 v5 practice positions, the 184 v4 test positions, or the 150 v5 fresh positions. Exclusions are listed. The retained ids, in generator order, are written to `partition.json` (`freshTest`) and hashed before any brain pass. The sample is fixed once; there is no topping up. N = number retained.

## 3. Arms (review item 2)

Per seed 6101-6103, key K3 with v5's frozen pipeline (calibration = first sorted move of the first `floor(750/4)` practice positions): **full**, **half** (`floor(n/2)` slots), **quarter** (`floor(n/4)`), **eighth** (`floor(n/8)`, descriptive), **shuffled** (full slots, v5 permutation), **none**, and the goal's secondary comparators **raw-pc** and **random-pc** on the new test (full store). That is 8 arms × 3 seeds = **24 jobs**.

## 4. Gate: `judgeV6` (review item 1)

M = ceil(7 × N / 150). Per seed: `numericPairGate({ arms, games, primary: 'full', comparators: ['none', 'shuffled', 'quarter'], minCorrect: 0, minMargin: 0, resamples: 10000, seed: 20261106, lowerQuantile: 0.025 })`, then require margin(none) ≥ M, margin(shuffled) ≥ M, margin(quarter) > 0, all three lower bounds > 0 (strict), and retention lost / previouslyRecalled ≤ 0.02 with previouslyRecalled > 0. Pass only if every seed passes. No power claim is made: paired per-position differences lie in [−1, 1] and their cluster variance is unknown in advance. Precision is reported after the run as the observed bootstrap intervals.

## 5. Build contract

1. `.codebase/src/neural-learning/memory-v6-data.mjs`: `buildTestSet({ newPositions, practiceBoards, earlierTestBoards })` → `{ freshTest: [id], excluded: [{id, reason}] }` (generator order kept); `openRowsMany(dirs)` → `{ row(key), blank(), keys() }` over any number of cache folders (v4 format; a key in two folders throws at open; `blank` = first folder's row 0).
2. `.codebase/src/neural-learning/engineered-memory-task-v6.mjs`: `judgeV6(perSeed, { games, n })` as §4; reuses v5 `transformFor`, `fitPipeline`, `calibrationKeys`, `buildStore`, `retention`, `scorePositions` by import.
3. `.codebase/scripts/neural-learning/run-engineered-memory-test-v6.mjs` and `memory-v6-worker.mjs` (a copy of the v5 worker with: divisor 8 for `eighth`; `openRowsMany([v4Run, v5Run, v6Run])`; a position map from both position files; arms per §3). The v5 worker stays unchanged. The run folder has the v5 layout. Ledgers, permutations and schedules are copied byte for byte from v5 and their hashes checked. `certificates.jsonl` holds the v5 practice lines copied, plus new lines for the test moves (v4 certificate code). Collision check over the test moves plus the practice moves. Brain passes only for the new test keys. Jobs run as in v5 (up to 4 workers; admission rule as in v5; job identity `confirm-K3---<seed>-<arm>`, with raw-pc / random-pc as their own key). Then `judgeV6` and the summary.
4. `.codebase/scripts/neural-learning/audit-engineered-memory-test-v6.mjs`: independent (imports only pinned shared libraries, as the v5 auditor), versioned. It checks: new data hashes and game disjointness; the test-set exclusions; the v5 inputs by hash; all three caches (keys disjoint, the new keys exactly the test moves, blank equal); the certificates of the test moves; all 24 jobs rebuilt exactly; the full v6 verdict. Corruption tests: a substituted extra-cache row, a wrong eighth prefix, a wrong margin M.
