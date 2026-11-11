# Brain components and memory review

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

The separate answer file only helps when a board exactly matches one it has stored. That does not show how the fly will use training on a new board. Before testing new-board learning, specify how training changes the fly's stored brain values and compare it with fair alternatives. We do not need to solve memory in living flies first.

[Saved evidence](../school-components/findings.json). [Exact code or plan](../../../../.codebase/src/neural-learning/episodic-consequence-memory.mjs:31).

## Other code and limits

`SparseTrainer` is a class name. That name does not prove this run uses supervised training (learning from supplied target answers).
The inspected pilot does not call its backpropagation step (the calculation used to change weights from an error).
Its move score uses selected neuron activity.

The local memory rule stores four numbers for each selected connection. The chosen numbers and time steps are settings in our computer model.
They are not measured fly physiology (how a living fly functions). The code states this limit.
External memory is allowed. It does not turn these constants into biological measurements.

MBON05 means mushroom body output neuron type 05. The mushroom body is part of the fly's learning circuit.
The two model cells have different output signs (whether connections add or subtract signals).
Earlier work traced this to source labels and a fallback rule. Known cell type does not determine every target response or chess-score sign.
The large source-table comparison and full brain tests were not repeated here.

The pilot stores reference responses using the original input-list objects (the actual lists held in computer memory).
A new but equal list has no reference entry. The pilot uses its original eight lists.
No current crash from a new list was demonstrated. This is a limit on extending this runner.

The small calculation changes gain from 1 to 0.872955216483345.
Its memory trace (a stored value that links earlier activity to later updates) changes to 0.8646647167633873.
This is a possible calculation, not a measured brain response from the saved run.
Fourteen focused software tests passed. The 15,000 arithmetic steps in those tests are computer calculations, not experiments on a fly brain.
Memory-use peaks were not measured for those checks.

We inspected a saved audit that reports 720 trials, 4,280 local update steps, and 3,318 brain calculations.
We did not repeat that complete audit. It does not independently calculate the brain response again.
The shared-score calculation does not show that every possible memory setting fails.
Some initial paths were incorrect and were corrected. No clear record of the deleted audit or smoke run 15 was found.
[Check program](check.mjs). [File-match codes](source-hashes.json). [Sources](sources.md).

[Return to the full problem list](../ranked-problems.md).
