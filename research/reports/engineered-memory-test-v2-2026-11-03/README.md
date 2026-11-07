# Engineered memory test v2 result, 2026-11-03

**Result: does not pass.** The store remembers seen boards, but the fly's Kenyon-cell pattern does not help on new boards. Graph 20 to 22 of 38 new-board pairs (chance 19). Raw eyes and random features did better, partly through a brightness shortcut in how the twin boards were made.

Researcher approval for this run, in the researcher's own words: "run teh memory test" (2026-11-03). One run, read-only brain passes, brain connections unchanged (hash checked).

## What ran

- Design and pass rule fixed before the run: [engineered-memory-test-v2.md](../../../documentation/design/neural-learning/engineered-memory-test-v2.md).
- Command: `.\fly.cmd --config "python actions/engineered-memory-test-v2-step.json" start engineered-v2` (process 17704).
- Raw output: [summary.json](../../../runs/engineered-memory-test-2026-11-03/engineered-memory-test-v2/summary.json), [records.jsonl](../../../runs/engineered-memory-test-2026-11-03/engineered-memory-test-v2/records.jsonl), [manifest.json](../../../runs/engineered-memory-test-2026-11-03/engineered-memory-test-v2/manifest.json).
- 273 brain passes; 193.6 s elapsed; 96.9 s CPU; peak RSS 330.5 MiB. All 272 certificates rechecked: 0 hash mismatches, 0 unknown, 0 label mismatches. 2 new-board pairs removed as exact repeats (`ms4Ria7N`, `xYc9EMWh`).

## Results

| Arm | Seen pairs (of 96), seeds 5101/5102/5103 | New-board pairs (of 38) |
|---|---|---|
| graph (Kenyon cells) | 90 / 91 / 92 | 22 / 22 / 20 |
| raw eyes | 88 / 92 / 92 | 23 / 23 / 25 |
| random features | 93 / 92 / 92 | 26 / 26 / 29 |
| mismatched outcomes | 32 / 28 / 32 | 9 / 12 / 18 |
| no memory | 0 / 0 / 0 | 0 / 0 / 0 |

| Rule | Result | Met? |
|---|---|---|
| Store check: graph seen ≥ 77/96 | 90, 91, 92 | yes |
| New boards: graph ≥ 25/38 | 22, 22, 20 | **no** |
| Beat raw by ≥ 4, lower bound > 0 | margins −1, −1, −5 | **no** |
| Beat random by ≥ 4, lower bound > 0 | margins −4, −4, −9 | **no** |
| Beat mismatched | margins 13, 10, 2 (lower bounds 6, 3, −6) | seeds 1–2 only |
| Beat none | margins 22, 22, 20 | yes |

Flags: raw shortcut yes (raw 25/38 in seed 5103). Random features used the full layer: the graph Kenyon-cell vectors had no zero entries (`keepFraction` 1), so the "sparse" random control was in fact dense.

## Where it fails (first findings, more in the pathway trace)

1. **Not the store.** Seen boards 90 to 92 of 96 in every seed; the no-memory arm stayed empty; no test changed the store.
2. **The fly's pattern does not generalize.** On new boards the graph arm is at chance.
3. **The comparison arms used a shortcut.** Brain-free check: "the board with more total eye input is the safe one" gets 64 of 96 practice pairs and 23 of 38 new pairs. The twin edit usually swaps or adds a piece of a given colour, and Eyes v2 draws colours at different brightness. Raw eyes (23 to 25) sit at this level; random features (26 to 29) are a little above. So raw and random beating the graph is not evidence that they understand captures.
4. **Mismatched below chance** (9 to 18): a tie counts as wrong, and wrong outcomes often give both twins the same score. Not a software fault.
5. **The Kenyon-cell code is dense:** every Kenyon cell had a non-zero value on every board. Real Kenyon cells fire sparsely. This is a hypothesis for the failure, tested in the pathway trace.

## What this does and does not show

It shows that this store on the fly's Kenyon-cell activity, with this practice, does not pick safe captures on new twin boards above chance. It does not show that the fly cannot see (the seeing test says it can), that no memory could work, or anything about a living fly.

Next: a read-only pathway trace to find the stage where the safe/unsafe difference is lost, then a fix chosen on practice pairs only. See the [journal](../../journal/experiments/2026-11-03-peer-review-fixes.md).

## Pathway trace (read-only diagnostic, same day)

Question fixed before launch (journal item 19): at which stage does the twin difference stop being useful? Same 273 read-only passes, every neuron's activity saved, analysis without the brain. Command: `.\fly.cmd --config "python actions/pathway-trace-v1-step.json" start trace` (process 18416); 71 s; peak RSS 275 MiB; brain unchanged. Raw: [summary](../../../runs/engineered-memory-test-2026-11-03/pathway-trace-v1/summary.json), [analysis](../../../runs/engineered-memory-test-2026-11-03/pathway-trace-v1/analysis.json). Scripts: `run-pathway-trace-v1.mjs`, `analyze-pathway-trace-v1.mjs` (13 tests pass).

"Ratio" = median distance between the two twin boards divided by the median distance between different games' boards (practice pairs). "Oracle" = every practice board stored with its true answer, then the 38 new pairs scored (3 nearest). "Leave-one-out" = each practice pair scored from the other 95.

| Stage | Neurons | Ratio | Oracle new /38 (none, rms, z-score) | Leave-one-out /96 (none, rms, z-score) |
|---|---|---|---|---|
| photoreceptors | 5,543 | 0.116 | 24, 27, 27 | 68, 61, 72 |
| optic lobe | 77,202 | 0.105 | 22, 23, 23 | 62, 59, 67 |
| visual projection | 8,046 | 0.033 | 22, 26, 24 | 63, 66, 64 |
| visual centrifugal | 519 | 0.019 | 23, 21, 25 | 64, 62, 61 |
| central brain | 27,026 | 0.023 | 25, 28, 26 | 64, 64, 66 |
| Kenyon cells | 5,177 | 0.0024 | 22, 23, 18 | 68, 60, 65 |
| MBONs | 96 | 0.0021 | 18, 19, 23 | 63, 61, 56 |

Reference: the brightness rule alone gives 23/38 and 64/96. Chance is 19/38 and 48/96.

1. **The brain shrinks the deciding difference 48 times** between eyes (0.116) and Kenyon cells (0.0024). Biggest drops: optic lobe to projection neurons (3×) and central brain to Kenyon cells (10×).
2. **Every stage is fully active** (no zero values), including Kenyon cells, which are sparse in a real fly. Keeping only the top 5% or 10% of Kenyon cells did not help: oracle 19 to 23/38.
3. **The Kenyon-cell difference arrives at step 4 and is still growing at step 8.**
4. **The retrieval rule fails even at the eyes.** With perfect labels for all practice boards, no stage beats about 28/38, and the eye-level results are near the brightness rule. Whole-board similarity across different games does not express "a piece now attacks the landing square".

So the failure has two places: the brain's code squeezes the one-piece difference, and the similarity rule could not use it even unsqueezed. These are measurements on 96 + 38 pairs from one graph, not general laws.
