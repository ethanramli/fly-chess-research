# Memory v5 proposal: does the fly's episodic memory learn? (PROPOSAL rev 3, 2026-11-05 01:00)

Status: revision 3 after strict review rounds 1 ([review](../../../research/reports/mistake-diagnosis-2026-11-04/peer-review-v5-round1.md), items R1-R9) and 2 ([review](../../../research/reports/mistake-diagnosis-2026-11-04/peer-review-v5-round2.md), changes 1-5). Round 2 allows building once its four BUILD changes are in the spec; they are (marked [r2-1] to [r2-5]). Nothing built or run. Follows the [memory goal](../research-goals/memory-goal-2026-11-04.md).

**Disclosure of timing.** Rev 1 was written before any v4 result existed. Rev 2 was written after partial v4 results were seen (seed 6101 and part of 6102: graph 9.1-9.3, graph-sparse 11.4-12.5, graph-centred 13.0, shuffled about 7-9, none 7.2, raw 37.2, random 36.4 of 184). Rev 2 changes come from the review, plus one simplification: **K4 (the ridge-weighted key) is removed**, because it caused review items R3-R5 and adds the most build risk. It may come back in v6. No threshold, key, or dataset was changed because of v4 scores.

**Serves:** Volume 2, chapter 3 (To Learn) and chapter 5 (Evidence for Learning). **Status: exploratory** (declared now, R7).

## 1. Question

Does the fly model's content-addressed episodic memory learn? The memory is engineered and disclosed; its key is built from the fly's Kenyon-cell (KC) activity. Learning means: (a) stored verified experiences make choices on new positions better than no memory and than the same memories with shuffled outcomes; (b) more stored experience gives better choices; (c) early memories are still recalled after later ones are added.

Not tested: own-choice exploration (fixed schedule, as v4), brain-only learning, transfer between concepts, reasoning.

## 2. Reused from v4 (unchanged)

Task, Eyes v2, the read-only 8-step brain pass, certificates and category mapping (`engineered-memory-v4-ledger.mjs`), the committed 4-moves-per-position schedule rule (`buildSchedules`), ledgers, `permuteKnownValues`, `NearestEpisodeMemory` (k 3, 1/distance), s / c scoring with `frozenScores`, `numericPairGate`, guard and pacing. v4's cache supplies the KC rows of its 21,053 keys; its SHA-256 (`699ec93b...a20e5`) and its manifest pins are pinned in the v5 registration.

## 3. Data (R1)

1. Source: `runs/restart-data-2026-11-04/capture-choice-positions-max50-v1/` (same generator and 300 games as v4, `--max-per-game 50`; positions.jsonl SHA-256 `4483226c...fa36`). The 572 v4 positions are an exact subset (checked).
2. **Eligibility is label-conditioned, as in v3 and v4:** a position qualifies only if it has at least one safe and one unsafe capture (`capture-choice-positions-v1.mjs:39-54`). This is the predefined task, not label-independent selection.
3. **Practice:** the 388 v4 practice positions plus the 362 further positions from the same 198 practice games: 750 positions. **Practice order [r2-1]:** all 750 sorted by the v3 game-hash rank (`splitPositions`' key `sha256('engineered-memory-v3-split:' + gameId)`), then ply. Folds keep this order. The ordered id lists are saved in `partition.json`.
4. **Fresh test:** the 150 positions from the 99 held-out v4 test games whose ids and boards were never in the 572-position set (68 games, 4,585 moves). These are **new positions from reused held-out games**, not untouched games. They are disjoint from all practice games.
5. Board repeats: any fresh-test position whose board (FEN piece field) equals any of the 750 practice boards is dropped by this rule before any brain pass; the count is reported. Repeats between the two development folds are counted and reported.
6. The partition (practice ids, fold A ids, fold B ids, fresh-test ids) is written to `partition.json` and hashed before any brain pass.
7. New brain passes: every legal move of the 362 extra practice and 150 fresh-test positions (16,324 if no board is dropped), after v4 ends. They are written to a v5 cache in the v4 format. Old rows are read from the pinned v4 cache.

## 4. Keys and the frozen key pipeline (R2, R3, R5)

| Key | Transform (Float64 arithmetic on Float32 rows) |
|---|---|
| K1 graph | KC row |
| K2 graph-sparse | v4 `sparse(row, blank, 259)` |
| K3 graph-pc | KC row minus the mean of the KC rows of all legal moves of the same position, summed in sorted-UCI order and divided by the move count. A missing row stops the run. This is label-free information the fly has when it chooses. |

Pipeline for every key: transform, then the pinned `rmsScaler`, then the zero-RMS mask (coordinates that are 0 in every calibration vector become 0). There is no further normalization.

**Calibration set (label-free) [r2-1]:** the first sorted legal move of each of the first `floor(N/4)` positions (N = the source's practice positions, in practice order: 187 for the 750 positions; `floor(N_fold/4)` in development). In each seed, one pipeline is fitted on that set. It is then used unchanged for the quarter, half, full and shuffled stores, and for scoring. Adding experiences never changes the key.

## 5. Development screen: practice games only, selects one key (R2)

1. Folds: sort the 198 practice games by SHA-256 of `memory-v5-fold:${gameId}`; the first 99 games are fold A, the rest are fold B.
2. Seed 6101 schedule restricted to each fold's positions. For direction A→B: calibration from fold A's first-quarter positions; store from fold A's ledger; score every fold-B position (s / c over all legal moves). A shuffled store gets fold A's outcomes permuted (`permuteKnownValues(ledgerA, 6101)`), with the same key pipeline. Then repeat for B→A.
3. Dev margin per key = sum over both directions of (store score − shuffled score). Select the key with the largest margin. It must be > 0; otherwise v5 stops with "no learning key found in development". Ties go to the lower K number. Both directions' results are saved; the selection runs once.
4. The fresh-test set and the 184 v4 test positions are never read during development.

## 6. Confirmation (fresh test set, selected key, seeds 6101-6103)

Per seed: schedule over the 750 practice positions (v4 rule), ledger, permutation. Stores (capacity 4,096, no capacity eviction): **quarter** (the first `floor(N_slots/4)` ledger slots, unknown slots included, [r2-1]), **half** (the first `floor(N_slots/2)` slots), **full**, **shuffled** (full slots with `permuteKnownValues` outcomes), **none**. Secondary, not gating: raw-pc and random-pc full stores (position-centring on raw and random features, same pipeline).

Exposure stop: if any seed's full ledger has fewer than 80 verified +1 events, or its quarter has fewer than 20, stop with "insufficient experience".

## 7. Retention probes (R6)

Probes: every known slot of the quarter store, with its key vector and original verified value, kept immutable. Recall = share of probes where the sign of `memory.score(probe)` equals the original value (a score of 0 counts as not recalled). Measured on the quarter store and again on the full store. Reported per seed: probe count, both recalls, lost associations (recalled in the quarter store but not in the full store), identical-key writes (consistent and conflicting), replacements, evictions. **Criterion [r2-2]:** lost associations / probes recalled in the quarter store ≤ 0.02; an empty denominator is not a pass. Net recall is reported as well. Disclosed: with exact-match recall and no capacity eviction, loss is possible only through conflicting identical keys, so this mostly measures overwriting.

## 8. Gate: `judgeV5`, fixed now (R7)

Selected key only. In **every** seed:

1. full − none: margin ≥ 7 positions and game-bootstrap .025 lower quantile > 0;
2. full − shuffled: margin ≥ 7 and lower quantile > 0;
3. full − quarter: margin > 0 and lower quantile > 0;
4. the retention criterion (§7).

Exact adapter [r2-3]: per seed, one call `numericPairGate({ arms, games, primary: 'full', comparators: ['none', 'shuffled', 'quarter'], minCorrect: 0, minMargin: 0, resamples: 10000, seed: 20261105, lowerQuantile: 0.025 })` (comparator order fixed; it sets the bootstrap draws). Then require explicitly: margin(none) ≥ 7, margin(shuffled) ≥ 7, margin(quarter) > 0, all three lower bounds > 0, and the retention criterion. Conjoin over seeds. The full verdict (every call result) is saved. Otherwise "does not pass". No absolute accuracy bar. Precision is reported for the worst within-game correlation case (SE = sqrt(Σ n_g²)) and for independent positions (SE = sqrt(0.5 × n)). Both are marginal and describe one contrast, not the compound gate.

## 9. Parallel scoring and resources (R9)

1. Jobs [r2-4]: identity `(phase, key, direction, seed, arm)`, with explicit placeholder values for unused fields (for example `direction: '-'` in confirmation). The launcher builds the exact expected job set first, rejects duplicate or missing outputs, and merges in that tuple's sort order. A test runs jobs in shuffled completion order. A job holds one whole store. It reads only the cache rows it needs, from the files, by row offset, and keeps at most one Float32 row block in memory.
2. Launcher: at most 3 workers at once. **Admission [r2-5]:** one supervisor reserves 1,536 MiB for every outstanding worker and starts another only if (free system memory − reserved headroom of workers not yet at steady state) ≥ 2,560 MiB. Each worker runs with `--max-old-space-size=256` and a guard of RSS ≤ 1,536 MiB and free memory ≥ 1,024 MiB. If any worker fails, the run fails; there is no retry. Outputs are merged deterministically, sorted by (phase, seed, arm).
3. Equality check before launch: the dry run with 1 worker and with 3 workers must produce byte-identical records, fingerprints and verdict.
4. A benchmark of the real workload sets the expected time before launch.

## 10. Audit (R8)

A versioned independent auditor (`audit-engineered-memory-test-v5.mjs`) does not import the v5 runner or task code. It rechecks: dataset and partition provenance (source hash, subset check, board-repeat rule, fold hashing), certificates (with verifier source hashes), schedules, ledgers, permutations, calibration sets, every key pipeline (K1-K3 and raw-pc and random-pc), every store and score (all arms, including raw and random), retention probes, development selection, and **the full numeric verdict** (every margin and bound). Corruption tests cover comparator scores, a split leak, unknown slots, a changed calibration set, and reported bounds.
