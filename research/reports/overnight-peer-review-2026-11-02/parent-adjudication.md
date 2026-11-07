# How the review leader checked the findings

Review date: 2026-11-02. Simple-English rewrite: 2026-11-03.
The explanation changed. The findings and saved test results did not change.
No code was fixed. We did not train or run the simulated fly.

This file explains which reviewer claims were supported by code checks and which limits still apply.
The [ranked list](ranked-problems.md) contains the eight accepted problems. This file does not add new problems.

## Repeated findings were combined

Two reviewers found that memory changes between scores.
Two reviewers found that exact recall does not explain answers to different inputs.
Ten reviewer findings therefore become eight different problems.

## Checks repeated by the review leader

1. The eye-map check gives the fly the same eye signals after a rook captures a pawn and after it moves to an empty square. The task gives those moves different answers, and both answers passed the task rules.
2. The actual extracted audit rules accept an empty list. A full false set of run files was not built.
3. The code that checks whether training can safely start said a run was ready even when research was paused, another run was active, and no computer memory was free. We did not start the fly simulation.
4. The first saved trial has memory changes. A separate calculation demonstrates a possible connection-strength change.
5. The arithmetic proof about changing one shared reference score still passes. It rules out that one proposed repair. It does not show that every possible memory setting fails.

We did not run the full fly simulation that sends activity through all connections in the simulated brain.

## Limits of the accepted findings

The input finding assumes that the fly sees only the board after the move and starts with the same stored memory in both cases.
A system that also sees a previous board could have more information.
The small pilot tests a different task: it asks the fly to pair four given situations with four given answers.

In the pilot, the fly updates its memory while it scores proposed moves.
So the pilot does not compare moves with memory held constant. The separate final tests keep memory unchanged, and this finding does not invalidate those tests.

This problem with the safety checks before training starts does not show that any earlier run started without permission.
The old output folder is protected, and the test used fresh-folder conditions.
The empty-list defect does not show that the earlier lists were empty. The inspected saved examples were complete.

The plan already recorded the eye-test and en-passant problems. It also already said that the later reasoning tests were unfinished.
The review does not turn those known missing parts into newly failed experiments.
No evidence identified the deleted audit or smoke run 15. No missing history was invented.

## Tool mistakes recorded during review

Some first file searches used incorrect paths. Correct paths were found before conclusions were made.
One check first lacked a required folder-location setting. We added it and repeated the check before saving the result.
A text scan first assumed UTF-8 (one way to store text). Two reports used a Windows text format instead.
The first link scan checked its own result file before creating it. A later scan passed.
One attempted text change found no matching text and changed nothing.
These mistakes did not change experimental data or scientific findings.

## Saved checks

Before this rewrite, a check found 52 working links and confirmed 28 source files matched their saved comparison codes.
Those counts apply before this rewrite. The [rewrite check](simple-english-verification.json) gives the new counts.
The [original check record](verification.json) stays unchanged.
The code, source files, original results, and required scores were not changed.
The [original report text](original-text-before-simple-english-2026-11-03.zip) is preserved.

[Back to the problems](ranked-problems.md).
