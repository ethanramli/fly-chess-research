# Eye test v2 result, 2026-11-03

**Result: the fly's brain did not carry the safe-or-unsafe answer from Eyes v2 in this test, and the test's own pipeline check failed, so under the frozen rules the result does not count as evidence either way.** Researcher instruction for this run: "i want you to test the eyes too. see if the fly can actually see teh fucking board". One run, read-only; memory unchanged throughout.

## What ran

- Rules: [restart plan revision, problem 5](../../../documentation/design/research-goals/restart-plan-revision-2026-11-03.md) (Eye test v2), with the count rules of restart plan section 7 unchanged.
- Data: 48 twin pairs (one capture, safe on one board and unsafe on the other) from 48 different training-bucket Lichess games ([pairs](../../../runs/restart-data-2026-11-03/eye-test-pairs-train/manifest.json)). Earlier games were excluded: the [exclusion check](../../../runs/restart-data-2026-11-03/old-game-exclusion/report.json) scanned 48,432 files, found 2,347 old game codes, and confirmed the old split rule on 2,390 rows with 0 mismatches.
- Command: `fly.cmd --config "python actions/eye-test-v2-step.json" start eye-test` (process 3680), all safety checks before the run passed, no other brain-model process running.
- 576 full-graph passes, about 7 minutes (14:18 to 14:25 local). Memory fingerprint unchanged at the end.
- Raw output: [summary.json](../../../runs/eye-test-v2-2026-11-03/eye-test-v2-v1/summary.json), [records.jsonl](../../../runs/eye-test-v2-2026-11-03/eye-test-v2-v1/records.jsonl).

## Results

| Measure | Result | Rule | Met? |
|---|---|---|---|
| Tokens (positive control: the old cue states the answer) | 41/48 | at least 44/48, else pipeline fault | **No: pipeline fault** |
| Raw eyes (decoder on the photoreceptor input itself) | 38/48 | 36/48 or more means a shortcut | **Yes: shortcut** |
| Graph (decoder on the brain's 5,177 Kenyon cells) | 26/48 | at least 36/48 to pass; 30/48 or less means no | **No** (chance is 24/48) |
| Strength M, Graph | 0.0000085 | at least 10% of Tokens | **No**: 0.04% of Tokens |
| Strength M, Tokens | 0.0225 | must be above 0 | yes |

The rules set the order: a pipeline fault is read first, so **this run does not count**. All rows are reported anyway.

## What this means and does not mean

1. **The brain's response did not carry the answer.** Graph scored 26/48, close to chance. Under reachable gains, the brain's output cells changed about 2,600 times less than with the token cue.
2. **The answer was visible in the raw eye input.** The raw photoreceptor pattern alone scored 38/48. The unsafe board of each pair has one extra opponent piece that can recapture, and the eyes see that piece. So the input already shows a clue the decoder can use without the brain.
3. **The pipeline check failed.** The token cue scored 41/48, below the required 44. So we cannot rule out a fault in the pipeline, and the frozen rule says the result does not count.

Possible causes, not tested (hypotheses):

1. The eye signal is weak by the time it reaches the Kenyon cells, about 5% of the token drive in earlier measurements.
2. The token pools were rebuilt from the graph, not copied from the archived Stage 1 runs. This may explain the 41/48.
3. The decoder has 94 training boards and 5,177 features.

This does not show that the fly can never see the board, and it does not show that Eyes v2 is wrong. As software, Eyes v2 passed all its checks.

## Diagnosis after the run (no brain run)

1. **The token input does tell the boards apart.** In all 48 pairs the safe and unsafe boards get different token lists (0 identical).
2. **The token content alone is enough.** The same decoder on token counts, with no brain, scores 46/48, above the 44 needed. So the token control was lost between the tokens and the Kenyon cells. This supports cause 2: the rebuilt token pools.
3. **Fixing the token path would not change the outcome.** The raw-eye shortcut (38/48) is independent of the tokens. Under the plan's order, a fixed pipeline would give "shortcut", which is also a stop.

## What happens next

**Correction:** the plan's rule for a pipeline fault is "fix the pipeline; result does not count", not "stop and talk". "Stop and talk" applies to the shortcut, no and grey outcomes. I first wrote the wrong rule.

Here, though, the shortcut stop applies in any case. The task shows the answer in the raw eye input: the unsafe board has one more visible opponent piece. So the next step is a task decision for the researcher, not a rerun. Every twin pair differs somewhere on the board, so the raw input always shows the difference. The question is only whether a simple decoder can use it. For example, the researcher could choose twins with the same number of pieces on each side (a pin or a blocked line instead of an extra defender), or a rule that the raw-eyes decoder must stay below 36/48 on development pairs before a run. Nothing was changed after seeing these results.


[Fix report](../overnight-peer-review-2026-11-02/fixes-2026-11-03.md) · [Current status](../../../documentation/current-status.md)
