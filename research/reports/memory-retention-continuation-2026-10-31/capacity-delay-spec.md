# Many associations and delay: capacity-delay assay v1

2026-10-31, written before any code or result of this assay. It adds a new question. It does not change G1-G6 or any old result. No graph or chess. It uses its own new seeds, so the sealed H1 and H2 seeds stay closed.

## Why this test is needed

The original assay stores three items. Restart plan section 5.5 asks how many associations the rule holds, with interference, reversal and retention over many lessons. The learner also has no loss over time in the original assay, because no KC or DAN activity changes during a gap. So a delay there would pass by construction, which measures nothing.

## Fixed design

**Patterns.** `nKC = 200`, `s = 20`. There are 16 items, each with a pair `X+`, `X-`. Inside a pair the focal sets are disjoint. Across items the focal sets are independent random draws, so overlap is whatever chance gives (about 10% on average). No item is built to conflict. Focal activity `h` is uniform in [0.9, 1.5]. Base weights are uniform in [0.5, 1.5], as in the original fixture.

**Schedule.** Train items in order, 24 trials per item, with the original trial structure: score both images (frame then 4-unit gap), own choice at temperature 0.1, chosen image frame, pulse frame, 4-unit gap. Every eighth trial overall is unknown and gets no pulse. `X+` is good for every item in this stage. After the last item comes a delay, then one reversal block of 24 trials on item 1, and a final test.

**Tests.** No frames and no pulses during a test. The test is read only. Margin `mNorm = (v(good) - v(bad)) / 1.6` and `greedy = margin > 0`.

- `Ti`: right after training item i, all items 1..i.
- `D`: after each delay level, all 16 items.
- `Rev`: after reversal, all 16 items.

**Delay.** Four cumulative levels of 0, 400, 1600 and 6400 time units, run on one trajectory. One trial block takes about 384 units (16 per trial, 24 trials), so 6400 is about 17 blocks. Each delay step lasts 4 units and has two parts:

1. KC activity: 10% of cells, drawn fresh on each step from a seeded generator, at `h` uniform in [0.9, 1.5]. All other cells at 0. This is spontaneous-activity noise [choice].
2. DAN activity: each DAN at `0.75 * (1 + e)`, with `e` drawn independently per DAN and per step, uniform in [-0.1, 0.1] [choice].

No teacher, no replay and no task identity enter this period. The activity is unrelated to any stored pattern except by chance. This is a stand-in for ongoing activity. It is not measured fly physiology, and its time units are not hours.

## Rules compared

All run through the same frames, on the same seeds:

1. `prediction-reservoir-v1`, eta 2, V0 1.2 (frozen).
2. `local-reservoir-v1`, eta .5.
3. `local-reservoir-rate-v1`, eta 1.
4. `local-gated-v1`, eta .5 (ablation of the store).
5. Prediction scale on the gated store, eta 2, V0 1.2 (ablation of the store with the signal kept).
6. `SeparateTable`, instrument only. Its frames do nothing, so it cannot show interference.

Arms for rule 1: informative, absent (no pulses), matched shuffled and disabled, as defined in the original runner. Other rules: informative only, because this is a comparison and they are not candidates.

Seeds: 3001 to 3012. Not H1 or H2. These seeds are development data from the first run onward.

## Pass marks, fixed now

Medians are across seeds. A candidate needs all of these in the informative arm:

| Id | Requirement | Reason |
|---|---|---|
| C1 | Each item i: margin at `Ti` at least .40 and greedy in at least 90% of seeds | Learning does not stop as the store fills |
| C2 | At `T16`, items 1 to 8: median of the per-seed share with greedy correct at least .90 | Older items stay usable after 8 more are learned |
| C3 | At `T16`, items 1 to 8: median of (margin at `T16` / margin at `Ti`) at least .50 | Usable, not just above zero |
| C4 | At the 6400 delay: median of the per-seed share of all 16 items correct at least .90, and median margin ratio to `T16` at least .70 | Survives noise during a delay |
| C5 | Reversal: item 1 at `Rev` has margin at least .40 and greedy in at least 90% of seeds | Old memory can still be revised |
| C6 | Reversal: other 15 items at `Rev`: median margin ratio to the last delay level at least .90 | Revision does not damage other items |
| C7 | Controls: absent and disabled gains unchanged. Shuffled arm's median share correct at `T16` below .75 and informative at least .25 above it | Learning comes from true feedback |

C2 and C3 use a fraction .50 and C4 uses .70 by engineering choice, not from a source. Failure of any mark stays a failure, and any change would need a new version.

## Predictions, written before results

1. Rules with a reservoir beat their no-store versions on C3 and C4.
2. `prediction-reservoir-v1` passes C1. Its tail on reward leaves room for later items.
3. C2 passes for rule 1 but C3 is uncertain, because 16 items at 40 cells each cover 3.2 times the 200 cells, so each cell serves several items.
4. C6 is the likeliest failure, because item 1 reversal writes into cells that other items use.

## Limits

This is a synthetic fixture. Patterns are random and not visual-KC responses. The noise model is a choice. A pass does not establish biological long-term memory or memory on the real graph. A fail with these numbers says nothing general about flies.

## Clarification, same day, before any code ran

C7's "absent gains unchanged" is checked at `T16`, before the delay, because the delay's DAN noise is meant to reach every arm except disabled. The absent arm therefore has no teaching, but it may change during the delay, and that change is reported.
