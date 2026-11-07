# Engineered memory test v3: result (2026-11-04)

**Outcome: does not pass.** **Serves:** Volume 2, chapters To Learn and Evidence for Learning (a failed attempt, also Volume 1, Failed Attempts).

Run folder: `runs/engineered-memory-test-2026-11-03/engineered-memory-test-v3-r2/` (`manifest.json` status `complete`, SHA-256 `0a2ee5b0...3571c`; `summary.json` SHA-256 `45e35886...f6ef`). Design: [v3 design](../../../documentation/design/neural-learning/engineered-memory-test-v3.md). Launch history and mistakes: [journal](../../journal/experiments/2026-11-04-memory-v3-run.md). The first launch (`engineered-memory-test-v3/`) ran out of JavaScript heap after 47 s and is preserved.

The researcher approved the run as built on 2026-11-04, with its known defects, to feed the diagnosis. Run at CPU duty 1: 7,927 s wall (2 h 12 min), 7,640 CPU s, 21,054 brain passes, peak RSS 1,058 MiB. Brain connections unchanged (hash checked).

## Results (safe capture chosen on the 184 new positions)

| Arm | 6101 | 6102 | 6103 | Ties at the top (counted wrong), per seed |
|---|---|---|---|---|
| graph (Kenyon cells) | 1 | 2 | 8 | 111, 126, 106 |
| raw (eye input) | 24 | 18 | 11 | 56, 81, 97 |
| random features | 15 | 22 | 16 | 118, 99, 90 |
| mismatched (shuffled outcomes) | 2 | 1 | 4 | 126, 122, 124 |
| none | 0 | 0 | 0 | 184, 184, 184 |

Pass bar: 96 in every seed. Chance on these positions: random move 3.9% (about 7), random capture 42.0% (about 77). Graph minus raw: −23, −16, −3; graph minus random: −14, −20, −8 (bootstrap lower bounds all negative).

Safe-capture experiences during practice (of 388): graph 12, 14, 13; none 11, 14, 12; mismatched 13, 18, 15; raw 32, 35, 34; random 15, 34, 33.

## What this shows

1. With this disclosed similarity store and no hints, the fly's Kenyon-cell code did not help choose safe captures in new positions. It scored below raw eye input and below random features in every seed.
2. **The tie rule decided most of the scores, in every memory arm, not only "none".** About 94% of practice experiences are −1, so many moves get the same top score (often exactly −1 from three −1 neighbours), and each tie counts wrong. The graph arm tied on 58-68% of positions. So these counts mostly measure how often an arm avoids ties. They are not a clean measure of choice quality. This makes diagnosis A02 larger than first stated.
3. **Exposure differed between arms** (diagnosis A03 confirmed): the raw and random arms' own choices found about 2.5 times as many safe captures in practice as the graph arm did. The graph arm explored like the no-memory arm.

## What this does not show

It does not show that the fly's code cannot carry the deciding information. The comparison is confounded by ties and by unequal experience. It is not a brain-only test and not a reasoning test. These test positions are now used; they cannot serve as an untouched transfer test.

## Next

[Memory v4](../../../documentation/design/neural-learning/memory-v4-proposal-2026-11-04.md) removes both confounds (s / c scoring, one identical ledger for every arm). Its settings were fixed before this result was read (cutoff hash in the journal).
