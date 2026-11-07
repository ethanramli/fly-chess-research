# Feedback and result-checking review

Review date: 2026-11-02. Simple-English rewrite: 2026-11-03.
The explanation changed. The findings and saved test results did not change.
No code was fixed. We did not train or run the simulated fly.

## Limits of this review

We did not run the full fly simulation that sends activity through all connections in the simulated brain.
None ran during this review. No training ran. Final test examples stayed closed.
This reviewer did not read the other reviewers' results before finishing.
AI reviewers can share errors. Agreement is not an independent scientific experiment.

## The result checker can pass an empty answer list


**What happens**

The audit (a second program that checks saved results) checks each answer in a supplied list. It does not first require all four answers. The final rule says the word pass if every answer in the list passes its check. An empty list has no answers that fail, so the program reports the word pass even though it checked nothing.

**Why it matters**

Several files can agree while all omit required answers. The program reports 144 checks from a planned-count calculation. That number does not show how many answers it actually checked.

**What we checked**

The actual extracted rules accepted an empty list. They checked zero answers and returned a final pass. We did not make a complete false set of run files.

**What this does not prove**

This does not show that the earlier run was empty or false. The saved examples inspected in this review contained four answers per test.

**Before this test can run**

Do not use this audit as proof of complete checks until it rejects missing required answers. Test it with incomplete but mutually consistent files.

[Saved evidence](../primary-feedback-audit/checks-result.json). [Exact code or plan](../../../../.codebase/scripts/neural-learning/audit-long-term-memory-v1-live.mjs:127).

## The training command skips safety checks before training starts


**What happens**

The comparison command runs the fly simulation and changes its memory. Its saved settings call it a `check` command. The start program skips some safety checks for commands with that label.

The skipped checks include whether research is paused and whether another fly simulation is already running.

**Why it matters**

This command could start a new fly simulation while research is paused or while another simulation is running. Matching input files would not prevent that.

**What we checked**

We gave the code that checks whether training can safely start a test case where research was paused, another process was active, and no memory was free. It still said the new run was ready. We did not start the fly simulation.

**What this does not prove**

The completed old folder is protected against reuse. The run program also has separate memory and time limits. We did not show any past unauthorized or overlapping run.

**Before this test can run**

Do not start a fresh brain run through this command type yet. First show that it rejects pause and active or unknown brain processes. This can be checked without training.

[Saved evidence](../primary-feedback-audit/guard-result.json). [Exact code or plan](../../../../python%20actions/curriculum.py:319).

## Suspected defects that were not established

The pilot uses assigned answers, not claims about good chess moves.
Its certificate (a saved record of the answer and its reason) binds the board, move, and assigned task.
That supports only a test of whether the fly can connect each given situation to its assigned answer. It does not prove that the fly can work out what will happen after a chess move.

The audit rebuilds local memory from recorded activity. It does not calculate the complete brain response again.
The report states this. No hidden claim of an independent brain calculation was established.

The external memory relies on its caller (the program that uses it) to verify events.
A SHA256 file-comparison code can show that data match. It cannot show that a chess answer is correct.
An unknown answer does not write an external record. Neural memory can still change from ongoing activity.

The restore check rejects inconsistent checksums (numbers used to detect changes in saved data) and event order.
No repeated-update error was found on this path.
The run saves both memory types and a pending receipt (an update record not yet acknowledged).
There is no automatic crash-restart program for this pilot. The report states this limit.

Some separate chess proof code treats exhausted checking limits as unknown.
The assigned-answer pilot does not use that chess proof code.

## Checks and coverage limits

The empty-list check runs extracted audit rules, not the complete audit.
We checked the actual code that decides whether training can safely start, using controlled test data.
The first check lacked a required folder-location setting. We added it and repeated the check before saving the result.
No training run started.

The saved row inspected here has six phases with four items each.
A complete false set of mutually matching run files was not built.
No operating-system crash test, complete test suite, or full brain replay ran.
We found no saved file that explains the deleted 15,000-checkpoint review or smoke run 15.
[Empty-list check](checks.mjs). [Its result](checks-result.json).
[Check of the safety rules before training starts](check-guards.py). [Its result](guard-result.json). [Sources](sources.md).

[Return to the full problem list](../ranked-problems.md).
