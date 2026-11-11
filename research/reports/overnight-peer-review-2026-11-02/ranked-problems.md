# Problems to address before more chess training

**Start with the example where the fly gets identical eye input for a capture and a non-capture.**

Review date: 2026-11-02. Simple-English rewrite: 2026-11-03.
The explanation changed. The findings and saved test results did not change.
No code was fixed. We did not train or run the simulated fly.

Four reviewers reported ten concerns. Two pairs described the same problems, so the list below has eight distinct problems.
The list below has eight different problems. The order reflects which problems could most affect the next test. It does not reflect how many reviewers mentioned each problem.
Our question stays reasoning under the stated limits. This is not a new project to repair fly memory.
Each problem blocks only the test or code use named below. It does not stop every part of the research.

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

[Saved evidence](school-input/checks.json). [Exact code or plan](../../../.codebase/src/chess-input/eyes-v1.mjs:89).

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

[Saved evidence](primary-feedback-audit/checks-result.json). [Exact code or plan](../../../.codebase/scripts/neural-learning/audit-long-term-memory-v1-live.mjs:127).

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

[Saved evidence](primary-feedback-audit/guard-result.json). [Exact code or plan](../../../python%20actions/curriculum.py:319).

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

[Saved evidence](primary-methodology/checks.json). [Exact code or plan](../../../.codebase/scripts/neural-learning/compare-long-term-memory-v1.mjs:146).

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

[Saved evidence](school-input/checks.json). [Exact code or plan](../../../documentation/design/research-goals/restart-plan-2026-10-30.md:144).

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

[Saved evidence](school-input/sources.md). [Exact code or plan](../../../documentation/design/research-goals/restart-plan-2026-10-30.md:165).

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

[Saved evidence](school-components/findings.json). [Exact code or plan](../../../.codebase/src/neural-learning/episodic-consequence-memory.mjs:31).

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

[Saved evidence](primary-methodology/findings.json). [Exact code or plan](../../../documentation/design/research-goals/restart-plan-2026-10-30.md:171).

## Suspected problems that were not confirmed

1. We found no confirmed answer clue in move-marker brightness or legal move filtering (listing moves allowed by chess rules).
2. We did not establish overlap between actual training and final examples. Final examples stayed closed.
3. A calculation still proves that changing one shared reference score cannot fix all four saved move rankings. It does not show that every possible memory setting fails.
4. We found no clear saved record for the deleted 15,000-checkpoint audit or smoke run 15. No missing history was invented.

## What remains unchecked

The review did not inspect every file or reproduce the complete brain run.
It does not guarantee that the code has no other errors.
Four AI reviewers are not four independent scientific experiments.
Some sources were read only as abstracts (short paper summaries). One source could not be opened.
Their separate source notes state these limits.

## Order for later work

- First, give the fly enough information and make the result checker reject missing answers.
- Next, make the safety checks before training starts reliable and compare moves using unchanged memory.
- Then, correct the eye-test strength and impossible example group.
- Finally, specify and test learning on unfamiliar inputs and the reasoning claim.

This list says what evidence is needed and in what order. It does not approve code changes or new runs.

[Review leader's checks](parent-adjudication.md). [Word definitions](writing-notes.md).
Sources: [input](school-input/sources.md), [components](school-components/sources.md), [feedback](primary-feedback-audit/sources.md), [method](primary-methodology/sources.md).

## Fixes added 2026-11-03

The findings above are unchanged. On 2026-11-03 the researcher directed fixes for all eight problems. Each fix, its evidence and any remaining blocker are in the [fix report](fixes-2026-11-03.md). Its first table says, for each problem, what is implemented, what software checks verified, and what still needs the researcher's approval. Software checks do not show that the fly passes any scientific test.
