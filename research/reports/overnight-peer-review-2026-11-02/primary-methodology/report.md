# Research-method review

Review date: 2026-11-02. Simple-English rewrite: 2026-11-03.
The explanation changed. The findings and saved test results did not change.
No code was fixed. We did not train or run the simulated fly.

## Limits of this review

We did not run the full fly simulation that sends activity through all connections in the simulated brain.
None ran during this review. No training ran. Final test examples stayed closed.
This reviewer did not read the other reviewers' results before finishing.
AI reviewers can share errors. Agreement is not an independent scientific experiment.

## Memory can change between two move scores


**What happens**

In the small pilot, the fly scores one proposed move and then updates its saved memory. It scores the next move after that update. So the two moves may be scored using different stored memory values.

**Why it matters**

Move order can affect the comparison. The two scores are not necessarily from one unchanged fly memory state.

**What we checked**

We read the calling code and memory update code. The first saved trial has seven steps that change recorded memory. A small separate calculation also shows a possible change in connection strength.

**What this does not prove**

We did not measure whether reversing move order changes the chosen move. The pilot explicitly allowed memory updates during observation. Its final read-only tests (tests that keep saved memory unchanged) are separate and are not invalidated here.

**Before this test can run**

Do not describe this loop as frozen scoring (scoring while saved memory stays unchanged). Check full memory equality and reversed move order in the actual future chooser. An intended sequence of learning observations asks a different question.

[Saved evidence](../primary-methodology/checks.json). [Exact code or plan](../../../../.codebase/scripts/neural-learning/compare-long-term-memory-v1.mjs:146).

## Exact recall does not explain answers to different inputs


**What happens**

The system also has a separate file of stored answers. It returns an answer only when the new input exactly matches a stored input. If the input differs, the file gives no answer and the fly uses its brain score instead.

**Why it matters**

If the fly's brain memory stays unchanged, storing an answer for one input does not change its answer for a different input. Recalling an exact match is not evidence that learning helps with a new position. The memory-only comparison still uses the eye signals that the fly's brain code creates from each chess board.

**What we checked**

A small change in one input value caused a miss. A stored positive answer replaced a strongly negative neural score. These code checks were repeated by the review leader.

**What this does not prove**

Different boards could share a useful input pattern. Changes in neural memory could supply another learning path. Exact recall alone does not establish either possibility.

**Before this test can run**

The separate answer file only helps when a board exactly matches one it has stored. That does not show how the fly will use training on a new board. Before testing new-board learning, specify how training changes the fly?s stored brain values and compare it with fair alternatives. We do not need to solve memory in living flies first.

[Saved evidence](../school-components/findings.json). [Exact code or plan](../../../../.codebase/src/neural-learning/episodic-consequence-memory.mjs:31).

## The reasoning test is not yet complete


**What happens**

The researcher defines reasoning as using many unrelated ideas to solve a problem the fly has not seen before. The planned first test asks whether earlier learning helps the fly solve a new problem. The planned second test asks whether the fly can combine ideas it learned separately. Both tests still need complete rules.

Two related chess concepts are a small first test, not many unrelated concepts.

**Why it matters**

A programmer can supply a fixed rule that combines two answers. That system could beat each single-answer system without learning how to combine concepts itself.

**What we checked**

The reviewer read the plans and actual test programs. The current pilot uses four input-and-answer pairs assigned by the test. It does not implement the planned reasoning tasks.

**What this does not prove**

The later stages were already described as unfinished. This is not evidence that a completed report falsely claimed they passed. A separately approved one-relation study remains possible.

**Before this test can run**

Before testing whether the fly can transfer learning or combine ideas, write down the exact problems, comparison systems, required scores, and when to stop. Show why each idea is needed. List combinations the fly was not taught.

[Saved evidence](../primary-methodology/findings.json). [Exact code or plan](../../../../documentation/design/research-goals/restart-plan-2026-10-30.md:171).

## Suspected problems that were not confirmed

This calculation keeps the recorded move scores fixed and changes one shared reference score.
Exact arithmetic (calculation without rounding the proof numbers) still verifies the contradiction.
The proof also records an example of memory values with all four rankings in the correct order.
It does not claim that every memory state fails. It is not a proof about a living fly.

The pilot uses one development seed (a starting value that makes random choices repeatable).
It describes that result without claiming a measured population advantage. All six conditions are reported.
The reviewer found no incorrect claim about statistical significance in this report.
The chance of at least 44 correct answers in 60 independent fair guesses is about 0.019702 percent.
That agrees with the rounded 0.02 percent in the plan.
It does not show that the test has a good chance of detecting a real effect of a stated size.

The conditions give equal choice opportunities. Their selected moves and received feedback differ.
The memory-only comparison still uses eye signals created by the fly simulation. It does not remove all use of the simulated fly.

The pilot marks every eighth result unknown by a fixed rule.
Real chess checks could instead fail more often on hard positions.
No counting error was found here, but the pilot does not measure that future effect.

## Checks and coverage limits

The saved-trial check reads only through the first trial for the memory-change example.
It rechecks the proof in an isolated code environment without changing shared proof files.
No full brain calculation or final-example inspection ran.
The future statistics program for the transfer and combined-reasoning tests was not found in the inspected paths.
This is missing future work, not a failed completed analysis.
No clear files identified the deleted audit or smoke run 15.
An unrelated note about 15,000 microseconds is not evidence about that audit.
[Check program](checks.mjs). [Results](checks.json). [Sources](sources.md).

[Return to the full problem list](../ranked-problems.md).
