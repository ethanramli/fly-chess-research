# Engineered memory test v2 (built 2026-11-03, NOT run)

Status: built and tested on synthetic data only. No brain run, no training, no sealed data. Running it needs the researcher's own approval.

## Why v2 exists

1. The researcher allowed a disclosed engineered memory on 2026-11-01. After memory test v1 failed (the γ4 rule did not pass), the researcher asked to build this condition but not run it.
2. The first build (v1, `run-engineered-memory-test-v1.mjs`, never run) had two faults. See the [journal entry](../../../research/journal/experiments/2026-11-03-peer-review-fixes.md), mistake 11.
   1. It tested only boards the fly had already seen. The task asks for scores on new boards.
   2. When two stored patterns were equally similar, the oldest one always won. The reversal block could never pass, whatever the brain did.
3. v1 is kept unchanged as history. Its step file stays paused.

## What the system is

1. **The fly's part.** One read-only brain pass per board, exactly as in the [seeing test](../../../research/reports/seeing-test-2026-11-03/README.md): Eyes v2 input, 8 steps, no dopamine input. The output is the activity of the 5,177 Kenyon cells. Brain connections never change; the run checks their hash before and after.
2. **The engineered part (disclosed).** An external store, `NearestEpisodeMemory` in `kc-episodic-memory-v2.mjs`:
   1. It keeps one entry per chosen board: the feature vector and the verified outcome (+1 safe capture, −1 unsafe).
   2. The same vector written again keeps only the latest outcome. This is how a reversal would work.
   3. It holds at most 256 entries. When full, it drops the entry updated longest ago.
   4. Score of a board: an exact match gives its stored outcome. Otherwise, take the 3 nearest entries by Euclidean distance and average their outcomes, weighted by 1/distance. Empty store gives 0.
   5. Features are scaled per feature by their root-mean-square over the experience boards only. Outcomes are not used for scaling.
   6. Scoring never changes the store. A test that changes the store stops the run.
3. Results are for **the fly plus this store**. They are never a brain-only result (restart plan revision, problem 7 correction, rule 2).

## The task

1. **Data:** the 136 capture twin pairs in `runs/restart-data-2026-11-03/pairs-train-capture/`. These are training-bucket games only. Each pair has two boards from one real game that differ by one piece: the same capture is safe on the good board and unsafe on the bad board, because only the bad board has a piece that can take back.
2. **Disclosure:** all 48 Eye test v2 pairs are among these 136. That test found the raw eye input carries the answer (38/48), and the brain's Kenyon cells did not (26/48). 13 of those 48 fall in the new-board set here. No settings were tuned on that result.
3. **Teacher check:** before anything else, the run recomputes both certificates for every board. A hash mismatch, an unknown result or a label mismatch makes that board "unknown": choosing it writes nothing.
4. **Split:** 96 experience pairs and 40 new-board pairs, chosen by a hash of the game id. The answers play no part in the split. Each pair is from a different game.
5. **Exact repeats removed:** a new-board pair is dropped if either board's eye input exactly matches an experience board or an earlier new board. A brain-free check on 2026-11-03 found 2 such pairs (games `ms4Ria7N` and `xYc9EMWh`, both common openings reached in other games). So **38 new-board pairs** remain. The runner stops if the count is not 38. All 272 certificates rechecked with 0 problems in the same check.
6. **Practice (own choice):** 2 rounds over the 96 experience pairs, in a seeded order. Each trial shows both boards of a pair. The fly plus store scores both, chooses one with fixed seeded randomness (temperature 0.1), and the verified outcome of the chosen board only is written.
7. **Lesson 1 from memory test v1, balance:** which slot holds the safe board alternates, so it is exactly half each way in every round. The store starts empty, so it has no built-in preference.
8. **Lesson 2 from memory test v1, a silent control:** the no-memory arm never reads and never writes. The run checks that its store is still empty and unchanged at the end.
9. **Tests, no writes:** score both boards of each pair from the frozen store. A pair is correct only if the safe board scores strictly higher. A tie counts as wrong. Seen-board test on the 96 experience pairs; new-board test on the 38 held-out pairs.

## Arms (same retrieval rule, same practice)

| Arm | Features | Feedback written |
|---|---|---|
| graph (primary) | Kenyon-cell activity from the brain pass | verified outcome |
| raw | photoreceptor input itself (Eyes v2) | verified outcome |
| random | random sparse features: each of 5,177 units sums 6 random photoreceptors (fixed seed); the same share of units is kept active as in the graph features | verified outcome |
| mismatched | Kenyon-cell activity | the graph arm's own outcome sequence, shuffled, so outcomes no longer belong to their boards |
| none | none | nothing; no reads |

The rewired-graph comparison is **not included**: no rewired graph exists. The revision allows "random or rewired"; random is used. A rewired graph is needed later before any claim that the fly's wiring matters (eLife protocol E4).

Seeds 5101, 5102, 5103. A seed changes practice order, slot assignment and exploration draws. Features are the same in every seed. Three seeds are not three flies.

## Pass rule (fixed before any run)

In **every** one of the 3 seeds:

1. **Store check:** graph arm gets at least 77 of 96 seen-board pairs right. If any seed misses this, the outcome is "store fault: result not interpretable", and nothing else is read.
2. **New boards:** graph arm gets at least 25 of 38 new-board pairs right (chance is 19).
3. **Fair comparisons:** graph beats each of raw, random, mismatched and none on the 38 new-board pairs by at least 4 pairs, and the game-bootstrap 95% lower bound of the difference (10,000 resamples, seed 20261103, `pairGate`) is above 0.

Outcome "passes" only if all three hold in all 3 seeds. Otherwise "does not pass". The summary also flags a raw shortcut if raw gets 25 or more of 38 in any seed.

## What a pass would and would not show

1. **Would show:** on unfamiliar boards from new games, the brain's Kenyon-cell pattern makes this retrieval rule better at spotting an unsafe capture than the same rule on raw eyes or random features.
2. **Would not show:** that the wiring matters (no rewired graph), learning inside the brain, reasoning across unrelated ideas, or anything about a living fly. One idea (safe capture) is not "many unrelated concepts".
3. **Likely outcome, said before the run:** a fail. Eye test v2 found the brain's Kenyon cells near chance on these same pairs with a linear reader, and the raw input carried the answer. A fail here is still useful: it tests the same question with a different reader and with practice.

## Files

1. Store: `.codebase/src/neural-learning/kc-episodic-memory-v2.mjs` (tests: `kc-episodic-memory-v2.test.mjs`).
2. Task logic, no brain: `.codebase/src/neural-learning/engineered-memory-task-v2.mjs` (tests: `engineered-memory-task-v2.test.mjs`, synthetic vectors).
3. Runner: `.codebase/scripts/neural-learning/run-engineered-memory-test-v2.mjs`.
4. Settings, paused: `python actions/engineered-memory-test-v2-step.json`.

## Run command (only after the researcher's own approval)

1. In `python actions/engineered-memory-test-v2-step.json`, set `"paused": false`.
2. `.\fly.cmd --config "python actions/engineered-memory-test-v2-step.json" plan engineered-v2`
3. `.\fly.cmd --config "python actions/engineered-memory-test-v2-step.json" start engineered-v2`

Expected cost, about 20 to 30 minutes in total:

1. 273 brain passes: about 4 to 8 minutes (the seeing test did 96 passes in 86 seconds; Eye test v2 did 576 in about 7 minutes).
2. Memory scoring: 12 scored arm-seed runs (the none arm costs nothing). Measured on synthetic 5,177-long vectors: 37 seconds of CPU per arm-seed, so about 7.5 minutes of CPU, about 15 minutes at duty 0.5.
3. Memory: peak RSS not yet measured for this runner; the runner now records it. Earlier full-graph runs stayed near 260 MiB. Feature vectors add about 70 MiB. Limit 2048 MiB RSS, heap 256 MiB, CPU duty 0.5, wall limit 1 hour.

## Sources

Adaptation of the nearest-neighbour readout proposed in the [eLife protocol](../research-goals/elife-prospective-protocol-2026-11-02.md) (option 2), after Blundell et al. 2016. Registered in the [source register](../../../research/literature/source-solution-register.md) (entry dated 2026-11-03). Changes from that proposal: capacity 256 instead of 128 (so 192 practice writes are never evicted), and 1/distance weighting instead of a plain mean (twin boards often share their 3 nearest neighbours, and a plain mean would then give a tie).
