# Engineered memory test v6: result (2026-11-06)

**Outcome: passes** its frozen gate (`judgeV6`) in all three seeds. **The independent audit is pending** (queued after v7). It is not yet an audited result. **Serves:** Volume 2, chapters 3 (To Learn) and 5 (Evidence for Learning). Goal: [memory goal](../../../documentation/design/research-goals/memory-goal-2026-11-04.md). Design: [v6 proposal rev 2](../../../documentation/design/neural-learning/memory-v6-proposal-2026-11-05.md).

**Main limit, found before this run ended:** the memory scores far below a "pick any capture" rule (250.1 of 573). So v6 shows that stored experience helps and grows with experience, but not yet that the memory tells a safe capture from an unsafe one. [Memory v7](../../../documentation/design/neural-learning/memory-v7-proposal-2026-11-05.md) tests that directly (running).

## How the run was made (disclosure)

- Run folder: `runs/engineered-memory-test-2026-11-05/engineered-memory-test-v6-r4/` (`manifest.json` `complete`; 08:50-13:18 local, 2026-11-06).
- Launch 1 was stopped for a shutdown. Launch 2 (`-r2`) died at 7/24 jobs on a session exit. Launch 3 (`-r3`) **failed** at 21/24 jobs on the runner's 5-hour wall guard, which was copied from v5 (150 test positions, not 573).
- Launch 4 (`-r4`) **resumed** r3: it rebuilt the partition, certificates and brain-pass cache from scratch, checked that their SHA-256 equal r3's, copied the 21 finished job outputs byte for byte (`manifest.resumedFrom`), and ran the 3 missing jobs (6103 shuffled, raw-pc, random-pc). The fix was reviewed by Codex: LAUNCH OK ([review](../mistake-diagnosis-2026-11-04/peer-review-v6-resume-r1.md)). The independent audit rebuilds all 24 jobs. r3 is a failed attempt, not a separate result. No gate statistic was computed from r3.
- Same memory, key (K3) and gate as v5; margins rescaled: N = 573 new positions (300 never-used games), M = ceil(7 × 573 / 150) = 27.

## Results (expected safe-choice score over 573 new positions)

| Arm | 6101 | 6102 | 6103 |
|---|---|---|---|
| full (3,000 experiences) | 130.9 | 145.1 | 134.5 |
| half | 98.2 | 121.6 | 101.0 |
| quarter | 83.0 | 102.1 | 82.2 |
| eighth (descriptive) | 86.9 | 82.0 | 64.5 |
| shuffled outcomes | 19.2 | 39.1 | 12.0 |
| none | 23.4 | 23.4 | 23.4 |
| raw-pc (secondary) | 189.9 | 189.1 | 187.7 |
| random-pc (secondary) | 114.3 | 107.7 | 119.3 |

| Gate condition: margin (bootstrap lower bound) | 6101 | 6102 | 6103 |
|---|---|---|---|
| full − none ≥ 27, bound > 0 | +107.5 (88.4) yes | +121.7 (102.6) yes | +111.2 (92.1) yes |
| full − shuffled ≥ 27, bound > 0 | +111.7 (91.6) yes | +106.0 (83.9) yes | +122.6 (103.4) yes |
| full − quarter > 0, bound > 0 | +47.9 (28.4) yes | +43.0 (22.7) yes | +52.3 (33.5) yes |
| retention lost / recalled ≤ 0.02 | 0 / 749 yes | 0 / 749 yes | 0 / 749 yes |

Descriptive comparison (post hoc, not part of the gate; computed from the position labels): random legal move 23.4; **random capture 250.1**.

## What this shows

1. **Stored verified experience makes the model's choices on new positions about 6 times better than no memory, in every seed, and real outcomes matter** (shuffled outcomes remove the gain).
2. **More experience helps.** This is the condition v5 could not establish: full beats quarter by 43-52 with bounds well above 0, and the curve rises from quarter to half to full in every seed.
3. **Memories are kept:** 0 of 749 early memories lost after 2,250 later experiences.
4. The fly's Kenyon-cell key (K3) is still worse than the raw eye input with the same centring (raw-pc 188-190).

## What this does not show

1. **Not safe-capture judgement.** The memory is far below "pick any capture" (250.1). The ledger stores almost all quiet moves as −1, so most of the gain can come from learning *capture versus quiet move*. v7 asks whether the memory chooses the safe capture among captures.
2. Not brain-only learning: an engineered nearest-episode memory stores the verified labels; the brain's connections never change.
3. Not own-choice exploration (fixed schedule), reasoning, or transfer beyond this task.
4. Not audited yet.

## Addendum 2026-11-08: independent audit PASS

The full independent audit of v6-r4 finished on 2026-11-07 at 09:33: **AUDIT PASS, pinned**, 8 of 8 checks (data, test set, v5 inputs, certificates, cache, jobs, scores, gate). It rebuilt all 24 jobs exactly. Raw: `runs/engineered-memory-test-2026-11-05/engineered-memory-test-v6-r4/audit.json`; log `runs/python-actions/detached/v8audit-first-20261107T0510/v6-audit.stdout.txt`. Item 4 of "What this does not show" no longer applies. The other limits stand: this is an engineered store, below the random-capture rule (250.1), and the fly's connections never change.
