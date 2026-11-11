# Engineered memory test v8: result (2026-11-07)

**Outcome: passes** (frozen `judgeV8`): all three seeds pass every condition. **Independent audit: PASS, pinned** (10/10 checks, 2026-11-07 06:13; `engineered-memory-test-v8/audit.json` `5aed2d23...bb56`): ledgers equal the independently rebuilt ledgers slot by slot, all 24 jobs rebuilt exactly, the gate recomputed; the verdict "passes" is confirmed. **Serves:** Volume 2, chapters 3 (To Learn) and 5 (Evidence for Learning). Goal: [memory goal](../../../documentation/design/research-goals/memory-goal-2026-11-04.md). Design: [v8 proposal rev 2](../../../documentation/design/neural-learning/memory-v8-proposal-2026-11-07.md). **Status: exploratory and outcome-informed** (eighth memory version; its design was written after reading v7's result).

> **Read first (addendum 2026-11-07, after the researcher's questions).** v8 meets the 2026-11-04 goal but **not** the memory the researcher's claims need ([memory handoff](../../../documentation/design/research-goals/memory-handoff-2026-11-07.md)):
> 1. **The choice is filtered (a clue).** The fly chooses only among captures whose safety is known, and each test position contains both a safe and an unsafe capture. Over **all legal moves**, v8 scores 30.6 of 560 against 21.9 for random.
> 2. **It does not address overwriting.** No connection changes; each experience has its own slot. Overwriting in the fly's own connections is measured and unsolved (2026-10-31 to 11-02).
> 3. **The fly adds nothing measurable:** raw input 383, random features 363, fly key 349, with the same store.
> 4. **Retention is trivial** (store never full; exact-key recall), and feedback is written into the store, not delivered through the fly's teaching pathway.
> 5. **Case recall, not lessons;** no Volume 3 or Volume 4 evidence. It is only a lookup-only baseline and a ceiling.

**Question:** if the memory stores every known-certificate capture of the 750 practice positions once (2,509 experiences, 991 safe), does it choose the safe capture on new positions more often than chance, shuffled outcomes and a quarter store?

The position-centred Kenyon-cell key is named K3 in the run records.

## How the run was made (disclosure)

- Run folder: `runs/engineered-memory-test-2026-11-07/engineered-memory-test-v8/` (`manifest.json` `complete`; 02:44-04:54 local, 2026-11-07; 24/24 jobs, 0 copied, no resume). Detached chain `runs/python-actions/detached/v8-chain-20261107T0135/`, after the dry run on 5 positions and its audit (PASS 10/10).
- 560 test positions from 300 never-used games (901-1200; 565 generated, 5 excluded because their board equals an earlier practice or test board). On average 3.56 known-certificate capture candidates per position. M = ceil(7 × 560 / 150) = 27. 20,743 brain passes; peak RSS 245 MiB; 2.16 h.
- Key K3, the v5 calibration, the nearest-episode memory (k = 3, 1/distance, capacity 4,096) and the v7 worker are unchanged. The ledger and the curriculum changed jointly (proposal section 1).

## Results (expected safe-capture score over 560 positions; captures only)

| Arm | 6101 | 6102 | 6103 |
|---|---|---|---|
| full (2,509 slots) | 349.3 | 349.3 | 349.3 |
| half (1,254) | 322.2 | 343.7 | 325.6 |
| quarter (627) | 317.7 | 318.3 | 318.7 |
| eighth (313, descriptive) | 289.0 | 283.0 | 299.6 |
| shuffled (all values permuted) | 223.0 | 208.2 | 242.4 |
| none (random capture) | 233.8 | 233.8 | 233.8 |
| raw-pc (secondary) | 383.2 | 383.2 | 383.2 |
| random-pc (secondary) | 362.6 | 362.6 | 362.6 |

Descriptive: the piece-value rule (maximise captured value − capturing value) scores 294.7. All-legal score (every legal move a candidate): full 30.6, none 21.9.

| Gate condition: margin (bootstrap lower bound) | 6101 | 6102 | 6103 |
|---|---|---|---|
| full − none ≥ 27, bound > 0 | +115.6 (93.6) yes | +115.6 (93.6) yes | +115.6 (93.6) yes |
| full − shuffled ≥ 27, bound > 0 | +126.3 (97.6) yes | +141.1 (110.3) yes | +106.9 (78.5) yes |
| full − quarter > 0, bound > 0 | +31.7 (6.4) yes | +31.0 (4.7) yes | +30.7 (4.3) yes |
| retention lost / recalled ≤ 0.02 | 0 / 627 yes | 0 / 627 yes | 0 / 627 yes |

Store counts (full, every seed): 2,509 writes, 2 replacements (both identical keys with the same value), 0 evictions. Shuffled: 2 replacements, 1-2 of them with a conflicting value. No unknown writes.

## What this shows (against the memory goal)

1. **Useful on new positions:** in every seed the full store beats no memory by 116 and shuffled outcomes by 107-141, with bounds far above 0. Test games were never used in practice.
2. **Improves with experience:** full beats quarter by about 31 in every seed (bounds 4.3-6.4, small but above 0). The curve rises in every seed (eighth 283-300, quarter 318-319, half 322-344, full 349).
3. **Kept:** 0 of 627 earlier memories lost (exact-key sign recall); 0 evictions.
4. **Fair:** all arms use the same ledger; certificates were rechecked before the ledger was built; ties s / c; RSS 245 MiB, with free-memory and RSS guards in the runner; the independent audit reproduces every score (PASS, pinned).
5. **Scope:** fly code plus a disclosed engineered memory. The memory now also beats the simple piece-value rule (349 v 295), which v7 did not.

So v8 meets all five conditions of the written memory goal in one registered, independently audited run.

## What this does not show

1. **Not that the fly's key is good.** Raw input (383) and random features (363) beat the fly's Kenyon-cell key K3 (349) with the same memory. The gain comes from storing verified outcomes; the fly's representation adds no advantage here. Beating them is a separate claim (goal condition 5), not part of done.
2. **Seeds are not independent samples.** Every full store holds the same 2,509 experiences, so full scores 349.3 in every seed. Seeds vary only the order, the prefixes (quarter, half) and the shuffle.
3. **Not why v7 failed.** v8 changes coverage, quiet entries and class balance together (proposal section 1).
4. Not brain-only learning (connections never change, no neural feedback), not own-choice exploration, not all-legal choice (the fixture filters candidates to known-certificate captures), not reasoning or transfer. Exploratory: a confirmatory claim needs an untouched, registered replication.

## Next step

The written memory goal is met by v8, with the limits above. Stronger claims are separate later work: a confirmatory, untouched replication; a fly key that beats random features; all-legal choice without the capture filter. The v6-r4 and v5 audits continue in the same detached chain.
