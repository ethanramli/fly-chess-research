# Memory test v1, 2026-11-03: the γ4 memory rule did not pass

**Result: "memory does not pass".** Researcher approval: "you can run the memory test, you can train the fly a little just to see if memory works". One run, 12 arms, 8,652 full-graph passes, 44 minutes.

## What ran

- Task: an arbitrary association, not chess. For each of 4 items, the fly chose between two boards from the seeing test (knight on e4 or bishop on e4). The knight was rewarded in practice blocks B0-B3 (24 trials each). After a 16-board delay, item 0 was reversed (bishop rewarded, 24 trials).
- Memory: the γ4 rule `ReversalMemory` (η = 0.5) on the connections from Kenyon cells to MBON05, driven by PAM08 dopamine cells. Move score = minus the mean MBON05 activity. Every choice was scored from unchanged memory (`frozenScores`), and learning happened only after each choice.
- Arms: informative, no feedback, shuffled feedback, learning switched off; seeds 4101, 4102 and 4103.
- Pass rule, fixed before the run: the informative arm passes after acquisition, after the delay and after the reversal in all 3 seeds, and every control fails.
- Command: `fly.cmd --config "python actions/memory-test-v1-step.json" start memory`. Code: `.codebase/scripts/neural-learning/run-memory-test-v1.mjs`. Raw output: [summary](../../../runs/memory-test-2026-11-03/memory-test-v1/summary.json), [records](../../../runs/memory-test-2026-11-03/memory-test-v1/records.jsonl).

## Results

| Arm (every seed) | After each practice block | After the delay | After the reversal | Gains changed |
|---|---|---|---|---|
| Informative | 4/4 | 4/4 | 3/4 (item 0 not reversed) | 2,094 |
| No feedback | 4/4 | 4/4 | 3/4 | 2,094 |
| Shuffled | 4/4 | 4/4 | 3/4 | 2,094 |
| Learning off | 4/4 | 4/4 | 3/4 | 0 |

All 12 arms gave identical test results.

## What it means

1. **Feedback had no measurable effect.** The arm with learning switched off scored the same as the informative arm.
2. **The fly already preferred the knight board before any training.** All 4 items were correct at the first test even with learning off, so this design could not show acquisition. Only the reversal could show learning, and it failed in every arm.
3. **Gains changed without feedback.** The no-feedback and shuffled arms changed as many connections as the informative arm. So the boards themselves excited the PAM08 dopamine cells, and the rule responded to that, not to the reward.

## Design mistakes in this test (recorded, not fixed after the fact)

1. The rewarded candidate matched the fly's built-in preference, so acquisition was untestable.
2. Visual input drives the dopamine cells, so the "no feedback" arm was not a true no-update control.

## Next step (researcher decision before leaving, 2026-11-03)

On failure: design and build, but do not run, the disclosed engineered-memory condition: store memory-cell (Kenyon-cell) patterns with their verified outcomes and answer new boards by similarity, with the fair comparisons in the [revision](../../../documentation/design/research-goals/restart-plan-revision-2026-11-03.md) (problem 7 correction). The MBON05 move score stays switched off.
