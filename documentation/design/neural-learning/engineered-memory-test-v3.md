# Engineered memory test v3: episodic memory without hints (built 2026-11-03, NOT run)

Status: designed and built; tested on synthetic data only. Running it needs the researcher's own approval.

## Why v3

[Engineered memory test v2](engineered-memory-test-v2.md) failed ([result](../../../research/reports/engineered-memory-test-v2-2026-11-03/README.md)). The diagnosis found 4 problems. v3 removes the 3 that belong to the test design. The 4th belongs to the fly and is what v3 measures.

| v2 problem | Evidence | v3 change |
|---|---|---|
| Hint: the twin format tells the fly one of two boards is safe, and offers only the capture that matters | design | Real, unedited positions. The fly scores **every legal move**. Nothing says a safe move exists. |
| Shortcut: the twin edits change total brightness ("more eye input = safe" gives 23/38) | brightness check | No edited boards, so no edit-made shortcut. |
| Too little practice: 96 pairs | symbolic boards improve from 0.68 to 0.80 between 24 and 96 pairs | 388 practice positions (14,243 legal moves seen). |
| The fly's Kenyon-cell code squeezes the deciding difference 48 times | pathway trace | Not changed. This is the question. |

## The rule for "no hints" (restart plan section 4)

1. The fly scores every legal move through its eyes. The legal-move list comes from code; this is a disclosed limit of the restart plan.
2. It chooses with fixed seeded randomness (temperature 0.1).
3. The checker verifies the chosen move only: safe capture +1; unsafe capture or quiet move −1; unknown writes nothing.
4. Not given: hints, labels, the right move, outcomes of moves it did not choose, repeats because of errors. Each practice position is seen once, in one fixed order (game hash, then ply), the same for every seed.
5. The store saves only the chosen move's Kenyon-cell pattern and its checked outcome.

## The system

1. **The fly's part:** one read-only brain pass per (position, legal move), as in v2 and the seeing test: Eyes v2 image of the board after the move, 8 steps, the 5,177 Kenyon-cell values. Brain connections never change (hash checked).
2. **The engineered part (disclosed):** the v2 store, `NearestEpisodeMemory`, unchanged: Euclidean distance, 3 nearest, 1/distance weights, the latest outcome replaces an identical pattern, capacity 512 (388 writes, so nothing is evicted). Per-feature RMS scaling from one label-free vector per practice position (the first legal move in sorted order).
3. Results are for **the fly plus this store**, never brain-only.

## Data

`runs/restart-data-2026-11-03/capture-choice-positions-v1/` from the 300 training-bucket games (generator `generate-capture-choice-positions.mjs`, 6 tests pass). A position qualifies when the side to move has at least 1 safe and at least 1 unsafe capture (ply 10 or later, at most 2 per game, at least 10 plies apart). The position choice uses the teacher's checker; the fly never sees it.

1. 572 positions from 297 games; 36.8 legal moves per position on average; 1.4 safe captures per position.
2. Split by game hash: 388 practice positions (198 games), 184 new positions (99 games). 0 new boards repeat a practice board.
3. Chance on the new positions: random move 3.9% safe; random capture 42.0% safe.
4. Overlap disclosed: these games also supplied the v2 twin pairs (different, edited boards).

## Arms (same store, same practice)

| Arm | What the store sees | Outcome written |
|---|---|---|
| graph (primary) | Kenyon-cell activity | checked outcome |
| raw | photoreceptor input | checked outcome |
| random | random sparse features of the photoreceptor input: 5,177 units, 6 random inputs each, top 5% kept (fixed, not matched to the dense graph code) | checked outcome |
| mismatched | Kenyon-cell activity | the graph arm's own outcome sequence, shuffled |
| none | nothing; no reads, no writes | nothing |

No rewired-graph arm (none exists).

## Test

On each of the 184 new positions, the store is frozen and every legal move is scored. The fly's choice is the single highest-scoring move. Correct only if that move is a safe capture. A tie at the top counts as wrong.

## Pass rule (fixed before any run)

In **every** one of the 3 seeds (6101, 6102, 6103):

1. Graph's top move is a safe capture on **at least 96 of 184** new positions. (A random capture would give about 77; 96 is that plus 10 points.)
2. Graph beats each of raw, random, mismatched and none by **at least 9 positions**, with the game-bootstrap 95% lower bound above 0 (`pairGate`, 10,000 resamples, seed 20261103, positions clustered by game).

Otherwise "does not pass".

## Expected outcome, said before the run

Likely a fail. On v2's twin boards the Kenyon-cell code stayed flat as practice grew. And 94% of moves are quiet (−1), so practice will mostly store "bad" examples. A fail would mean: with a disclosed similarity memory and no hints, the fly's Kenyon-cell code does not support choosing safe captures in new positions. A pass would be the first evidence that the fly's own code makes this memory useful on unfamiliar positions. It would still not be reasoning across many ideas, and not a brain-only result.

## Run command and cost (only after the researcher's own approval)

1. In `python actions/engineered-memory-test-v3-step.json`, set `"paused": false`.
2. `.\fly.cmd --config "python actions/engineered-memory-test-v3-step.json" start engineered-v3`

Cost, estimated from v2 and the pathway trace:

1. Brain: 21,054 passes; about 0.26 s each at duty 0.5, so about 90 minutes.
2. Memory scoring: about 42,000 scorings per arm-seed against up to 388 stored patterns; about 4 minutes of CPU each, 12 scored arm-seeds, so about 95 minutes at duty 0.5.
3. Total about 3 hours (wall limit 5 hours). Peak memory about 700 to 900 MiB (Kenyon-cell cache about 435 MiB as Float32); limit 2048 MiB.

## Files

1. Positions: `capture-choice-positions-v1.mjs` and its generator.
2. Task logic: `engineered-memory-task-v3.mjs` (tests on synthetic vectors).
3. Runner: `run-engineered-memory-test-v3.mjs`.
4. Settings, paused: `python actions/engineered-memory-test-v3-step.json`.
