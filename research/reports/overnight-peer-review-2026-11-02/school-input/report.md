# Input and task review

Review date: 2026-11-02. Simple-English rewrite: 2026-11-03.
The explanation changed. The findings and saved test results did not change.
No code was fixed. We did not train or run the simulated fly.

## Limits of this review

We did not run the full fly simulation that sends activity through all connections in the simulated brain.
None ran during this review. No training ran. Final test examples stayed closed.
This reviewer did not read the other reviewers' results before finishing.
AI reviewers can share errors. Agreement is not an independent scientific experiment.

## The fly gets the same eye input for a capture and a non-capture


**What happens**

Eyes v1 is the code that turns the board after a proposed move into signals for the fly's simulated eyes. A captured piece is already absent from that board. We checked two boards that differ only by a black pawn on a4.

In both positions, White moves a rook from a1 to a4. In one position, a black pawn is on a4, so the rook captures it. In the other position, a4 is empty, so the rook moves without capturing. The correct answers differ: the first move is safe; the second is not.

The task gives these moves different correct answers. But after each move, the fly receives exactly the same signals from its simulated eyes.

**Why it matters**

If the fly receives the same eye signals and has the same stored memory in both cases, its decision rule has no information to tell the two cases apart. More practice cannot restore the missing information unless the input is changed or another part of the system provides it.

**What we checked**

We checked the actual map that assigns chess squares to 5,543 simulated eye cells in the fly. The two correct task answers pass their checks. Each eye input contains 308 values, and all 308 values match. The SHA256 code (a value used to check whether data match) also confirms the inputs are identical.

The saved result shows both chess positions and the eye-input values.

**What this does not prove**

The example was made for this check. We did not find it in final test data. It does not prove that every system must fail.

A system that also sees the starting board could have more information. A test of captures only is a different task.

**Before this test can run**

Do not use this input for the full task yet. First change or justify the input so the fly receives different eye signals for these two positions. Then check that each input matches its correct answer.

[Saved evidence](../school-input/checks.json). [Exact code or plan](../../../../.codebase/src/chess-input/eyes-v1.mjs:89).

## The eye-test plan uses an unreachable strength


**What happens**

The planned eye-signal test sets a gain (a number that scales the effect of a connection) to 1.8. The learning rule inspected by the reviewer allows a maximum gain of 1.

The plan also does not fully state how the fly's score for each move will be calculated.

**Why it matters**

An imposed setting can test a hypothetical condition. It cannot show that this fly can reach that setting through its own updates.

**What we checked**

The reviewer compared the plan with default gain limits and the earlier record of this problem.

**What this does not prove**

Different declared conditions could use different limits. The finding is not a proof against every memory rule or external memory.

**Before this test can run**

Do not run the complete registered eye test with this unresolved interpretation. First approve reachable strengths and an exact score rule. Preserve the original limits and results.

[Saved evidence](../school-input/checks.json). [Exact code or plan](../../../../documentation/design/research-goals/restart-plan-2026-10-30.md:144).

## One promised test group cannot occur


**What happens**

The planned en-passant test asks the fly to make an en-passant recapture after a first move that is also a capture. En passant is a special pawn capture allowed immediately after an opposing pawn moves two squares. That two-square move is not a capture.

The test also requires the first move to be a capture. These rules conflict: en passant is allowed only immediately after a two-square pawn move, and that move does not capture.

**Why it matters**

The test-making program cannot honestly supply this promised group. Replacing this impossible case with another chess position would change the test.

**What we checked**

The reviewer compared the task with official FIDE chess rules. The current check program decides whether a capture is a recapture by checking if both captures end on the same square. In en passant, the captured pawn is removed from a square different from the square the capturing pawn moves to.

**What this does not prove**

An initial en-passant capture followed by an ordinary recapture is a different possible group. It is not an example of the original group. No final examples were opened.

**Before this test can run**

Do not make and lock the full final set under this impossible group definition. Approve the exact group first. Then check examples with real game history.

[Saved evidence](../school-input/sources.md). [Exact code or plan](../../../../documentation/design/research-goals/restart-plan-2026-10-30.md:165).

## Other checks and limits

The move marks have fixed brightness. No branch that sets brightness from the correct answer was found.
Legal move generation is an explicitly supplied interface. It is not automatically an extra hidden clue.

The rank relay is an engineered step that turns eye responses into selected Kenyon-cell inputs.
Kenyon cells are cells in the fly's learning circuit.
The relay uses other proposed moves when setting signal values. No task-answer label was found in this step.
Comparison systems must still receive equivalent information.

Some game-history rights are absent from the image. That alone does not establish another error in this immediate-recapture task.
The answer producer and checker share chess.js (the chess-rules software). They do not independently prove all its chess rules correct.
No incorrect capture label was found in the checked examples.

The saved check uses actual eye-cell placement. It does not calculate brain signals.
Its initial recorded memory use was 41,463,808 bytes. This is not proof of all resource limits.
We did not measure how often duplicate examples occur across training and final sets.
No final examples were opened. The earlier 200-game scan was not repeated.

Some first searches used incorrect paths. Correct paths were used before conclusions were made.
We found no saved file that explains the deleted 15,000-checkpoint review or smoke run 15.
[Check program](check.mjs). [Exact results and file-match codes](checks.json). [Sources](sources.md).

[Return to the full problem list](../ranked-problems.md).
