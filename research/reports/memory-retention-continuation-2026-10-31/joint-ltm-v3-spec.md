# Joint long-term-memory test v3

2026-10-31, written before v3 code or data. It fixes v1's design flaw, and it asks whether all the wanted properties hold in one run. Marks are v1's marks, carried over unchanged, plus two new ones. No graph, chess or sealed seeds. Frozen rule: `prediction-supralinear-v1`. Comparison: `prediction-reservoir-v1.1`.

## Why these sizes

v2 shows that loss follows coverage. So v3 runs at coverage .4, chosen from development data before these seeds are seen. Size (400, 20), N=8 is 5% active, the low end of the 5-10% reported for real Kenyon cells (Lin et al. 2014). Size (800, 20), N=16 is the same coverage at 2.5% active. New seeds 3101-3124, never used before.

## Sequence, one trajectory per seed

1. Train N items in order, 24 trials each. Test after each item.
2. Delay 6400 units with noise `e=.1`, 10% active KCs. Test.
3. Save the state to JSON, restore into a fresh rule, and continue with the restored rule. Compare against an uninterrupted copy at the end. They must match exactly.
4. Reverse item 1, 24 trials. Test.
5. Delay 1600 units with the same noise. Test.
6. Train two new items, 24 trials each. Test.

Arms for the frozen rule: informative, absent, shuffled and disabled, as defined in v1. Disabled sends no frames. Comparison rule: informative only.

## Pass marks, informative arm, medians across seeds

| Id | Requirement |
|---|---|
| C1 | Each of the N items at its own test: margin at least .40 and greedy in at least 90% of seeds |
| C2 | After all N: oldest half, median per-seed share correct at least .90 |
| C3 | After all N: oldest half, median margin ratio to own test at least .50 |
| C4 | After delay: all items, share correct at least .90 and margin ratio to pre-delay at least .70 |
| C5 | After reversal: item 1 margin at least .40 and greedy in at least 90% of seeds |
| C6 | After reversal: other items, median margin ratio to post-delay at least .90 |
| C7 | Controls: absent and disabled gains unchanged before the delay. Shuffled share correct after all N below .75, and informative at least .25 above it |
| C8 | New: after step 5, the reversed item 1 margin at least .30 and greedy in at least 90% of seeds. .30 is an engineering choice |
| C9 | New: the two new items at their own test, margin at least .40 and greedy in at least 90% of seeds. Tests learning after a noisy delay |
| C10 | New: exact match between restored and uninterrupted trajectories on all 24 seeds |

Margins here use `mNorm = (v(good) - v(bad)) / 1.6`.

## Predictions, written before data

1. Frozen rule passes C2-C7 and C10 at both sizes.
2. C1 is at risk at the last items. v2 shows newest-quarter acquisition near .63 raw (.40 normalized) at this coverage.
3. C9 is the most uncertain. If the noise-hardening hypothesis holds, C9 fails or falls well below C1.
4. Comparison rule fails C4 and C8.

## Limits

A pass is a synthetic-fixture result at a chosen coverage and noise level, with random patterns. It would not establish memory on the real graph, a fly retention time, or capacity on overlapping chess patterns, and the 28-cell failures remain.
