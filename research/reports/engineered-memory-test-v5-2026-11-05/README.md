# Engineered memory test v5: result (2026-11-05)

**Outcome: does not pass** (frozen `judgeV5`). It fails only the "improves with experience" condition (full − quarter), plus one seed's shuffled bound. It is the first result in which the fly's own Kenyon-cell code supports useful learned memory on new positions. **Serves:** Volume 2, chapters 3 (To Learn) and 5 (Evidence for Learning). Goal: [memory goal](../../../documentation/design/research-goals/memory-goal-2026-11-04.md).

Run folder: `runs/engineered-memory-test-2026-11-05/engineered-memory-test-v5/` (`manifest.json` `complete`, 2026-11-04 18:11-20:37 UTC; SHA-256 prefix `afe7cc06`; `summary.json` `f26d10da`). Design: [proposal rev 3](../../../documentation/design/neural-learning/memory-v5-proposal-2026-11-04.md), reviewed in two strict rounds. Run at duty 1, 3 workers. 16,326 new brain passes, brain unchanged. Preflight: 0 input collisions; verified safe-capture experiences 137, 129, 122 per seed (3,000 slots each).

## Development (practice games only; selects the key)

Margin = (store − shuffled), summed over both fold directions, on 374 and 376 practice positions: K1 graph +15.2, K2 graph-sparse +17.8, **K3 graph-pc +79.1 (selected)**. K3 scored 55.7 / 51.1 against shuffled 9.8 / 17.8.

## Confirmation (150 fresh positions from held-out games; expected safe-choice score)

| Arm | 6101 | 6102 | 6103 |
|---|---|---|---|
| full (3,000 experiences) | 20.6 | 18.0 | 22.8 |
| half | 23.9 | 11.5 | 22.7 |
| quarter | 16.9 | 15.3 | 15.0 |
| shuffled outcomes | 6.5 | 9.5 | 3.4 |
| none | 6.8 | 6.8 | 6.8 |
| raw-pc (secondary) | 30.4 | 23.5 | 28.7 |
| random-pc (secondary) | 21.8 | 17.6 | 15.0 |

| Gate condition | 6101 | 6102 | 6103 |
|---|---|---|---|
| full − none ≥ 7, bound > 0 | +13.8 (6.3) yes | +11.3 (3.7) yes | +16.1 (7.0) yes |
| full − shuffled ≥ 7, bound > 0 | +14.0 (4.9) yes | +8.6 (−0.7) **no** | +19.4 (9.2) yes |
| full − quarter > 0, bound > 0 | +3.7 (−4.9) **no** | +2.7 (−7.5) **no** | +7.8 (−1.3) **no** |
| retention lost / recalled ≤ 0.02 | 0 / 749 yes | 0 / 749 yes | 0 / 749 yes |

## What this shows

1. **With the position-centred key, stored verified experiences make the fly model's choices on new positions about 3 times better than no memory, in every seed.** Real outcomes matter: shuffling them removes the gain (6.5, 9.5, 3.4). This is learning by the [Volume 2 definition](../../../documentation/design/research-goals/five-volume-series.md): an improvement on held-out positions that are not memorized, against matched controls. It is achieved by the fly's Kenyon-cell code plus a disclosed engineered memory.
2. Memories are kept: 0 of 749 early memories were lost after 2,250 later experiences.
3. Most of the gain comes from the first quarter of experience. Whether more experience keeps helping is **not established**: the differences are +3 to +8, with bounds below 0.
4. Position-centring was the key change: K3's development margin was 4-5 times K1's and K2's. In v4, the uncentred KC keys barely beat no memory.
5. Raw eye input with the same centring is still better (23.5-30.4). The fly's code is not yet the best key for this memory.

## What this does not show

Not brain-only learning, not own-choice exploration (fixed schedule), not reasoning or transfer. The fresh positions come from held-out games that were reused (v3, v4 test games), with only 150 positions. Not a plateau: a non-significant full − quarter difference does not prove that learning stops. The independent full audit is pending.

## Next

[Memory v6](../../../documentation/design/neural-learning/memory-v6-proposal-2026-11-05.md): a frozen replication with the same memory and gate on 574 positions from 300 never-used games.

## Addendum 2026-11-08: full audit interrupted, not rerun

The second full audit started on 2026-11-07 at 09:33:09 in the detached chain `runs/python-actions/detached/v8audit-first-20261107T0510/`. Its log holds only the start line, and no `audit.json` exists. No audit process is live, so the audit was interrupted (cause not recorded; likely the session or laptop stopped). **v5 stays unaudited.** It is not rerun now: v5 is a failed engineered-store result that does not bear on the Properties 1–3 goal, and a 6–7 h audit would delay the serial graph work for that goal. It can be rerun later with the same command from `chain.py`.

## Clarification 2026-11-18: score, gate and result

This report serves Volume 2, chapters 3 (To Learn) and 5 (Evidence for Learning). The confirmation score is an expected safe-choice count: on each of 150 fresh positions, divide the number of safe moves tied for the top memory score by the number of tied top moves, then add those fractions. Thus 20.6 means about 20.6 safe choices across 150 positions, counting ties fractionally. Across the three seeds, the full-store mean was 20.47/150 and the no-memory control was 6.8/150, a ratio of about 3.01. This is the basis for “about 3 times better”; it is not a threefold increase in chess strength.

The frozen `judgeV5` rule required, in every seed, the full store to exceed both no memory and shuffled outcomes by at least 7 expected safe choices, with each contrast's game-bootstrap 2.5th-percentile lower bound above zero. It also required full to exceed quarter by more than zero with that lower bound above zero, and no more than 2% of quarter-store recalled associations to be lost after later experiences. The game bootstrap resamples held-out games to account for positions from the same game being related. Retention was 0/749 lost in each seed. Full exceeded no memory by 11.3–16.1 and shuffled outcomes by 8.6–19.4; however, the shuffled lower bound was −0.7 for seed 6102. Full exceeded quarter by 2.7–7.8, but all three lower bounds were below zero (−4.9, −7.5, −1.3). Therefore the all-seed gate fails on full versus quarter, and also on the shuffled lower bound for seed 6102. A positive observed difference alone did not meet the rule.

No memory makes all legal moves tie; shuffled outcomes retain the stored memories but permute their known outcomes; quarter uses only the first quarter of scheduled experience slots. The test supports a result about this fixed, externally scheduled engineered-memory assay on fresh positions from reused held-out games. It does not show brain-only learning, own-choice exploration, reasoning, or transfer. The independent full audit remains interrupted and pending as recorded in the 2026-11-08 addendum; these results have not received that audit.
