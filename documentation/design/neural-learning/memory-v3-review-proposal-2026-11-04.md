# Proposal: check useful learning before the full memory v3 run

Date: 2026-11-04. Status: proposal only. No new experiment, code change, memory rule or pass score is approved by this document. The existing memory v3 design and paused run settings remain preserved.

## Recommendation

Review the code and test design first. Then, if approved, run a smaller development study that checks whether the fly receives enough successful experiences and whether its memory helps on different boards. Keep the current memory method as a comparison to be tested, rather than describing it as a repaired method.

The scientific question remains: can experience help the simulated fly solve unfamiliar problems? Choosing safe captures is one prerequisite. This proposal does not establish reasoning across many ideas or cognition in a living fly.

## Evidence behind the proposal

1. The [completed memory v2 study](../../../research/reports/engineered-memory-test-v2-2026-11-03/README.md) remembered familiar board pairs: 90-92 correct out of 96. On new pairs it scored 20-22 out of 38; guessing averages 19.
2. Its pathway investigation found that small board differences became much smaller relative to differences between unrelated boards by the time activity reached the fly's memory cells. This is a distance measurement under the tested method, not proof that all information was destroyed.
3. Rescaling activity, retaining only the strongest memory-cell activity, centering a symbolic board view and increasing practice were already examined on practice data. None established a working repair for the brain-based memory. Do not present those attempts as new solutions.
4. [Memory v3](engineered-memory-test-v3.md) improves the task: real positions, every legal move offered, feedback only on the chosen move. It still uses [the same three-example matching method](../../../.codebase/src/neural-learning/kc-episodic-memory-v2.mjs).

## Two issues to resolve before a full run

### Few successful experiences

I checked the existing practice data, using the exact game split in [the task code](../../../.codebase/src/neural-learning/engineered-memory-task-v3.mjs). No brain simulation or learning ran.

Across 388 practice positions there are 14,243 legal moves: 544 safe captures, 837 unsafe captures, 12,849 moves that capture nothing, and 13 unknown answers. Only one move per position would produce feedback in the current design.

For a uniformly random legal choice at each position, the expected number of positive events is **15.34 out of 388**. Calculation: for each position, divide its safe-capture count by its legal-move count, then add those probabilities. This is a reference calculation, not a prediction of the learned policy. A learning policy might discover more or fewer safe captures.

A failure after very few successful experiences would not distinguish poor memory from insufficient informative practice.

### The no-memory comparison automatically scores zero

[The current task code](../../../.codebase/src/neural-learning/engineered-memory-task-v3.mjs) marks a position wrong whenever more than one move shares the top score. A system with no stored memory gives every move zero, so it receives zero correct positions automatically.

That rule can measure whether the system produces a unique answer. It is not a fair measure of how often an untrained system would choose a safe capture. Report tied scores separately and use the same fixed, repeatable random choice among tied moves for every system when measuring actual choices. Preserve the original v3 rule as history and register this change in a new study.

## Proposed development study

### Data and practice

Use only the 198 games already assigned to v3 practice. Preserve the original 99 new-position games for later development evaluation. Those games were also used in earlier development work, so they must never be called untouched final test data. The project's locked final sets remain closed.

Use the existing fixed order calculated from each game code. Select the earliest qualifying position from each game: the first 128 games supply practice; the next 64 supply the development check; six games remain unused. This makes the groups disjoint by game and avoids choosing positions based on performance.

The selected practice group has 4,829 legal moves. One uniformly random choice per position would yield 4.81 positive events on average. Four scheduled passes give 512 choices and an expected 19.22 positive events under uniform choice. These figures come from the current labels, before any run.

Proposed practice policy:

- Four passes over all 128 practice positions, scheduled before results are seen. Repetition never depends on an error or the correct answer.
- On 20% of choices, pick uniformly from every legal move. On the rest, use the existing score-based choice with its fixed randomness setting of 0.1 (the setting that controls how strongly higher scores are favored). This is a proposed engineering setting, not a biological measurement.
- Supply verified feedback only for the chosen move. Unknown answers produce no stored update.
- The informative fly chooses its own practice moves. Save that exact position, move, feedback and timing sequence. Replay the identical experiences into each comparison memory using its own numeric input pattern. Comparison systems do not select different practice moves in this screening study. This isolates the contribution of the stored representation given the same experience; a later claim about learning while choosing its own actions would need separate own-choice comparisons.
- Keep storage capacity at 512, so the fixed budget cannot remove an older experience merely because more practice was scheduled. Identical stored patterns may still be replaced under the existing rule; count these replacements.

Keep the fly's brain connections fixed. The added memory stores its activity patterns and the checked consequences. No engine chooses the moves, supplies a winning move, or calculates a change to a brain connection.

### Comparisons and checks

Use the fly plus added memory, raw eye input plus the same memory, random numeric patterns made from the eye input plus the same memory, shuffled feedback, and no memory. Every comparison receives the informative fly's exact recorded practice position-and-move sequence. The replay into the fly-based memory must reproduce its original saved memory exactly before evaluation. Add two explicit reference policies: uniformly random legal moves and uniformly random captures. The latter is an external chess-rule benchmark, not a capability attributed to the fly.

Freeze memory while checking all 64 development positions. Use the same repeatable tie rule for every system. Report the number of ties alongside actual safe-capture choices. Check that scoring and changing move order cannot alter stored memory.

For shuffled feedback, permute the informative system's verified positive and negative labels using a fixed seed over valid event slots. Preserve the number of events, positive/negative totals and event-slot timing; record that this destroys the true label timing. The same unknown slots remain unknown in every comparison and produce no update. Recheck every teaching event against its exact board, history, chosen move and task answer. An independent replay must verify stored updates and scores.

Run one repeatable random starting value, 6201, for this screening study. A single seed cannot establish reproducibility. A later confirmation must retain all three repetitions and its own predeclared comparisons.

### Proposed decisions after the study

These are new engineering screening rules, proposed before a run. They do not replace a frozen experiment's pass scores or come from a biological paper.

1. **Insufficient successful practice:** fewer than 12 distinct positive position-and-move experiences from at least eight games. Record the failure to obtain sufficient positive practice; do not interpret it as evidence that the fly cannot reason. Do not automatically extend the run.
2. **Enough practice, but no useful new-board choice:** the fly fails to choose safe captures on at least 34 of 64 development positions, or fails to beat raw and random-feature memory by at least four positions with a positive game-level uncertainty bound. Do not scale this unchanged method to the full study.
3. **A promising development result:** the exposure check passes; the fly reaches the stated choice score and beats every matched comparison by at least four positions with a positive game-level uncertainty bound. Review and register a larger confirmation. Do not call the screening result a reasoning result.

The uncertainty bound estimates the range of the improvement by repeatedly drawing whole games from the checked group. Use the existing code: a 95% lower bound from 10,000 draws, with random starting value 20261103. Requiring this bound above zero means the estimated improvement remains positive at that stated uncertainty level. Uniform legal and capture reference policies must also be reported; clearing the low no-memory score alone cannot justify progress.

Before a run, check these screening choices against the actual code and compute the random-policy reference distribution without running the brain. If those checks require a changed protocol, publish a dated revision before launch.

## If the matching method still fails

Do not keep increasing practice or changing distance settings without a named hypothesis. The earlier failures already make another unrestricted run of the same method a weak next step.

Use saved practice activity for a diagnostic comparison: can a simple fitted reader predict the checked consequence across different practice games better than the three-example matcher? All reader fitting and settings must stay inside the practice partition. No result from the reserved 64-position development check may choose the reader or its settings.

This fitted reader is a supervised diagnostic, not the fly's learning mechanism. If it works while matching fails, the way stored experiences are read is a candidate problem. If both fail, the measured brain activity, available practice or tested readers may be insufficient. Neither outcome proves that no possible mechanism can work. Any replacement memory needs its own explicit design, controls and new registration before it enters a primary claim.

## Further limits that must stay visible

- A move that captures nothing is scored negatively only for this safe-capture exercise. It is not generally a bad chess move.
- Every selected position has both safe and unsafe captures. The fly is not explicitly told the answers, but the dataset selection guarantees a safe option exists. Testing positions with no safe capture is separate required future work.
- Removing edited twins removes that particular editing procedure; it does not prove that natural brightness, captured-piece marks or material counts provide no shortcut. Measure these simple reference rules on practice data before launch.
- The current random-feature comparison has different activity sparsity from the fly. Without a matched rewired-brain comparison, a win cannot establish that the specific released wiring caused the benefit.
- Success here would concern the simulated fly plus disclosed external memory on one chess relation.

## Resources, review and approval

There are 7,170 candidate moves across the proposed 128 practice and 64 development positions. Cache each fixed brain response once and reuse it for scheduled practice and comparison systems. The existing eight-step brain calculation is retained. Using the old 0.26 seconds per response gives about 31 minutes for brain calculations alone; memory scoring, loading, saving and audit add time. This is an arithmetic estimate, not a measured runtime guarantee.

Before requesting launch approval, prepare the exact command, pinned inputs and sources, measured small software workload, peak-memory estimate and recovery procedure. Retain the 2 GiB process ceiling, 256 MiB free-system-memory minimum, 256 MiB Node heap setting and half-duty pacing. Keep brain runs serial. Do not promise a one-hour total before measuring scoring cost.

The same four reviewers should inspect the revised code and protocol before a run. Required review questions: does exploration depend only on the allowed information; do all comparisons receive matched exposure and feedback timing; are ties handled fairly; does the data split prevent practice-to-check leakage; can a failed result distinguish inadequate practice from a failed memory method?

Requested decision: approve preparing this revised screening study for review. Experimental approval would apply to a completed protocol and command with exact file versions recorded. This document authorizes no training or simulation.

## Local sources and reading coverage

Read in full: the memory v3 design, its task code, and the current added-memory implementation. Read the memory v2 results, pathway investigation, and recorded failed repair attempts in [the journal](../../../research/journal/experiments/2026-11-03-peer-review-fixes.md). Practice counts were calculated from [the existing position file](../../../runs/restart-data-2026-11-03/capture-choice-positions-v1/positions.jsonl), using the game split from the task code. Its pinned file identity is in [the paused v3 registration](https://github.com/ethanramli/fly-chess-research/blob/8d9bc9ed87c4f38bfb5d2ca07a7eb59f4875f746/python%20actions/engineered-memory-test-v3-step.json).

This is a proposal from local code and evidence. No new biological or literature novelty claim is made, and no new external solution is introduced.
