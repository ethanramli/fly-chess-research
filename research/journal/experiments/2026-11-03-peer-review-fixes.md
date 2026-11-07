# 2026-11-03 — Fixes for the eight peer-review problems

The researcher directed fixes for all eight problems in the [peer review of 2026-11-02](../../reports/overnight-peer-review-2026-11-02/ranked-problems.md), with the needed decisions made and written down. Full record: [fix report](../../reports/overnight-peer-review-2026-11-02/fixes-2026-11-03.md). No training, brain-model run or sealed-data access happened. Code for the new files was written by three Haiku helper agents from complete specifications and then reviewed and tested in the main session.

## Mistakes found by the review (earlier work)

1. **Design mistake, Eyes v1.** Showing only the board after the move erased whether the move captured. A capture and a quiet move could give identical input with opposite answers. Fixed by Eyes v2 and a required collision check.
2. **Implementation mistake, pilot audit.** The audit checked each answer in a list but never required the list to be complete. Fixed by required counts.
3. **Implementation mistake, launcher.** The label `check` skipped the safety checks before training starts, even for a command that runs the brain model and changes memory. Fixed by applying the checks to any brain-model command.
4. **Design and interpretation mistake, pilot.** The pilot updated memory between two move scores. Its practice choices were not scored from one unchanged memory. Fixed for future choosers by `frozenScores`; the pilot's practice results are relabeled, not rerun.
5. **Protocol mistake, eye test.** The plan used a strength (1.8) that no inspected rule can reach, and did not define the strength measure exactly. Fixed by Eye test v2; the original section is preserved as blocked.
6. **Protocol mistake, test group.** "En passant recapture" cannot occur after a capture. Replaced by an en-passant capture by the fly.
7. **Interpretation risk, answer file.** Exact recall could have been mistaken for learning that carries over to new boards. The answer file is now a comparison system only.
8. **Protocol gap, later tests.** Transfer and combination tests lacked tasks, comparisons, pass scores and stopping rules. Now specified.

## Pivots

1. **Input version:** new tests use Eyes v2 instead of Eyes v1. Reason: problem 1. Before: [Eyes v1](../../../documentation/design/chess-input/eyes-v1.md). After: [Eyes v2](../../../documentation/design/chess-input/eyes-v2.md).
2. **Eye test:** section 7 of the restart plan is blocked as written; Eye test v2 replaces it with reachable strengths 0.2 and 1.0 and the strength measure M. Reason: problem 5. This adopts option A of the 2026-11-02 eLife proposal. The 2026-11-01 decision not to swap 1.8 for 1.0 silently is respected: the swap is a new, dated, numbered test, and section 7 is unchanged.
3. **Phase C:** split into two ideas (C1) and three ideas (C2). A reasoning claim needs C2. Reason: two ideas are not "many".

## Mistakes made during this fix session

1. **I edited the audit file before saving its original bytes.** That file was never committed to git. I rebuilt the original by removing my exact insertions and checked that its SHA256 matched the recorded `39cdc4b7…`. It did, and the copy is saved in the report folder. Lesson: save untracked files before editing them.
2. **The first fixed-audit run failed** because its output folder did not exist. I created the folder and ran it again. No result was lost.
3. **The first safety-check repeat failed for two reasons.** It could not import a sibling module (fixed by adding the folder to the import path). Then it did not see the review's mock process as a brain-model process, because the mock line had no file path. A real launch line includes `.codebase/scripts/…`, so I used the real form. This is a limit of the review's mock, not a gap in the fix; the process check itself was not changed.
4. **One Python test failed when run through `unittest -k`.** The test reads the process's own command line, which changes with the launch method. Run as the file it expects, all 47 tests pass. Unrelated to the fix.

5. **My first handoff left three gaps.** (a) I wrote that the pilot's practice choices were relabeled, but I had not edited the pilot's own report. Corrected with a dated note at the top of that report. (b) I handed off with 6 failing tests and asked whether to fix them. They had been failing since 2026-10-31, after the archive move; three now read the archived files and three skip with a stated reason (see the fix report). (c) The training move score had no chooser over all legal moves and no coefficient file. Both now exist; the contract stays switched off by design.
6. **My first skip guard in `plasticity-mechanism-assay.test.mjs` did not work.** Under `node --test` that file runs its own direct-run branch, not the `test()` branch I had changed. I moved the check above both branches; the test now prints its skip reason.
7. **Replaying the old tests at the tag `early-development-final` did not finish.** The first attempt failed on Windows' path-length limit; the second was stopped when the laptop was closed. Before deleting the half-made copy, I checked that it held no link to the real `node_modules`, so nothing outside it could be deleted. A third attempt used a partial checkout of only the needed folders; both archive-dependent tests pass there, 14 of 14 ([record](../../reports/overnight-peer-review-2026-11-02/fix-checks/tag-replay.json)). The temporary copy was removed after unlinking `node_modules` first.

8. **One test position in my generator spec was wrong.** I asked for a value pair on a board where the captured pawn had no defender. With no possible recapture the capture is always good, so no value edit can change the answer. The agent reported this rather than forcing the test; I changed the position to one with a defender.

## Pivot: proposals instead of further runs

The researcher declined to accept the work with open items and asked for the generator plus concrete proposals for the remaining decisions. [Proposals](../../../documentation/design/research-goals/approval-proposals-2026-11-03.md): game source (Lichess puzzle database already on disk, CC0, old games excluded by hash), Eye test v2 and the MBON05 memory test (commands, about 15 and 60 minutes, 2048 MiB limit), and the memory formula (the existing `ReversalMemory` rule on the γ4 connections). Nothing is approved or has run.

9. **I treated delegated answers as the researcher's approval.** The researcher later said the 2026-11-03 approval answers were drafted by a delegated AI (GPT-6.1 Sol). Before acting on Proposal C (network fetch and data generation), I paused and asked for confirmation. Nothing had been fetched or generated.
10. **My brain-only transfer rule contradicted an earlier researcher permission** for disclosed engineered memory (2026-11-01). Corrected in the revision (problem 7 correction); the reasoning-first scope is unchanged.

## Eye test v2 run (pivot from build-only to run)

The researcher then asked directly to test the eyes. I ran the exclusion check, the history fetch, pair generation and one Eye test v2 run. Result: pipeline fault, raw-eyes shortcut, Graph near chance ([result](../../reports/eye-test-v2-2026-11-03/README.md)). Mistakes in this step: my first pair-count check read the file mid-write and reported 24 instead of the final 136; the runner records no memory-use samples, so the run's peak memory is unknown (the run stayed under the 2048 MiB guard, which would have stopped it). Next test: none until the researcher decides; candidate causes are listed as hypotheses in the result.

## Limits and what is still open

1. The training move score is implemented (contract file and chooser), but the contract stays switched off until the separately approved memory test on the brain model passes. That test was not run.
2. The memory equation (restart plan section 5) still needs the researcher's approval before any transfer test.
3. The answer checker for Phases B and C is built (`landing-square-certificate.mjs`), and so is the Eye test v2 arithmetic (`eye-test-v2.mjs`). The programs that pick twin pairs from games (generators) are not built for any phase yet, including Phase A.
4. Changing `curriculum.py` and the audit means earlier completed registrations now report pin mismatches. Their original bytes are in git commit `82af13f` (curriculum.py) and in the saved audit copy.

## Next test

Build the Eye test v2 registration with Eyes v2, run the collision check on its 48 development twin pairs, and ask the researcher before any brain-model run.

## Engineered memory: v1 build reviewed, v2 built (not run), 2026-11-03 later

Researcher instruction: design and build, do not run, the disclosed engineered-memory condition, with the fair comparisons of the problem 7 correction and the two lessons from memory test v1. No brain run, no training and no sealed data in this step.

11. **Mistake: the first build (v1, never run) could not answer the question.** Found in review before any run.
    1. It tested only boards the fly had already seen. The task asked for scores on new boards, and an exact or nearest match on seen boards works for any input, so it shows nothing about transfer.
    2. When stored patterns were equally similar, the oldest won (`similarBoardRecall` keeps the first best). Identical patterns from the same board always tie, so the reversal block could never pass, whatever the brain did.
    3. Its "random" arm was a random projection of the Kenyon-cell activity itself. That keeps the brain's information, so it is not a random-features control.
    4. Its pass rule only reported raw and random. Rule 4 of the problem 7 correction says the engineered condition must beat them.
    5. The association (knight board right on items 0 and 2, bishop on 1 and 3) was arbitrary, not a verified chess outcome.
    v1 files and its paused step file are kept unchanged as history.
12. **Pivot: v1 → v2.** v2 uses the 136 certified safe-capture twin pairs (training bucket), 96 for practice and the rest as new boards from other games, with the eLife protocol's nearest-neighbour readout (Euclidean, 3 nearest, per-feature RMS scaling, latest evidence wins for an identical pattern). Arms: Kenyon cells, raw eyes, random sparse features of the raw eyes, mismatched outcomes, no memory. The pass rule requires beating all four. [Design and pass rule](../../../documentation/design/neural-learning/engineered-memory-test-v2.md).
13. **Mistake: my v2 spec assumed new boards never repeat practice boards.** A brain-free check on the real pairs (certificates, split and eye inputs only) found 2 of 40 new-board pairs with eye inputs identical to practice pairs: common openings reached in other games. The runner would have stopped at its assert. Fixed before any run: such pairs are removed and counted, leaving 38; the pass threshold was set for 38 (25 correct, the same 65% as 26/40). The same check rechecked all 272 certificates: 0 hash mismatches, 0 unknown, 0 label mismatches.
14. **Mistake: first scoring code was slow and unpaced.** On synthetic 5,177-long vectors one arm-seed took 95 s; plain loops brought it to 37 s. CPU pacing ran only during brain passes, so scoring would have run at full CPU; pacing now also runs during scoring.
15. **Disclosure, not a mistake:** all 48 Eye test v2 pairs are among the 136; 13 are in the new-board set. Eye test v2 found the brain's Kenyon cells near chance on these pairs with a linear reader. The design says in advance that a fail is the likely outcome.

What is not done: the rewired-graph comparison (no rewired graph exists); an end-to-end runner check with the real brain (needs approval). The task logic is tested on synthetic vectors only (19 tests pass).

Next test: Engineered memory test v2, only after the researcher's own approval.

## Engineered memory v2 ran (researcher: "run teh memory test"), 2026-11-03

16. **Result: does not pass.** Store works (seen 90–92/96); graph at chance on new boards (20–22/38); raw 23–25 and random 26–29 beat it. [Result](../../reports/engineered-memory-test-v2-2026-11-03/README.md).
17. **Mistake in my design: the twin boards carry a brightness shortcut.** "More total eye input = safe" alone gives 64/96 and 23/38. I did not check this before fixing the pass rule, so the raw and random arms were not clean comparisons. The eye test v2 report had already named a raw-input shortcut; I should have measured it on these pairs first.
18. **Mistake in my design: the "sparse" random control was not sparse.** I matched its active share to the graph's, but the graph's Kenyon-cell vectors are fully non-zero, so the control became dense.
19. **Diagnostic run, justified before launch.** Named question: at which stage (photoreceptors, optic lobe, visual projection neurons, Kenyon cells, MBONs) does the good/bad twin difference stop being useful for nearest-neighbour retrieval? This blocks the next feedback experiment, because the fix (memory, Kenyon-cell coding or input) depends on the answer. Method: the same 273 read-only passes, saving activity; analysis without the brain. Any fix is chosen only by leave-one-pair-out on the 96 practice pairs, never on the 38 new pairs. Feedback-enabled next step: memory v3 (episodic memory without hints) on fresh positions.
20. **Pathway trace result:** the twin difference falls from 11.6% of the between-board distance at the eyes to 0.24% at Kenyon cells; with perfect labels, nearest-neighbour retrieval stays near chance at every stage, including the eyes. Diagnosis (measured, on this data): both the Kenyon-cell code and the whole-board similarity rule fail. Hypothesis, not yet tested: a description centred on the move's landing square would let similarity retrieval generalize. Next check: brain-free symbolic test of that hypothesis. [Report section](../../reports/engineered-memory-test-v2-2026-11-03/README.md#pathway-trace-read-only-diagnostic-same-day).
21. **Fix attempts for v2, chosen on practice pairs only (researcher gave permission to fix).** All brain-free on the saved activity. None lifts the Kenyon-cell code clearly above the brightness rule (64/96):
    1. Scaling none / RMS / z-score: Kenyon-cell leave-one-out 68 / 60 / 65 of 96.
    2. Keeping the top 5% or 10% of Kenyon cells (sparse, like a real fly): 59 to 65 of 96.
    3. A view centred on the landing square (symbolic boards, a test of the rule only): 67 vs 69 (k=3), 78 vs 78 (k=5) against the whole board. Not supported on practice data, so not adopted. Its better new-board numbers (29 and 32 of 38) were not used to choose anything.
    4. More practice: symbolic boards improve (0.68 to 0.80 from 24 to 96 pairs); the Kenyon-cell code stays flat (0.59 to 0.65, k=5).
    Conclusion: no change to the memory fixes v2. The failure sits in the Kenyon-cell code. The test design also had fixable faults (hint, shortcut, small practice), so those are fixed in v3. [Raw](../../../runs/engineered-memory-test-2026-11-03/practice-curve-v1.json), [centred check](../../../runs/engineered-memory-test-2026-11-03/centred-retrieval-v1.json).
22. **Deleted: the stale `.cache/flybench.lock`** (owner process 17220 had exited). The researcher asked to delete "something redundant"; this was the only item I had offered to delete. The benchmark test now passes (5/5). v1 engineered-memory files are kept: the project rules say preserve original designs.
23. **Pivot: memory v3, episodic memory without hints.** Real positions, every legal move scored, feedback on the chosen move only, one pass. [Design and pass rule](../../../documentation/design/neural-learning/engineered-memory-test-v3.md). Built, not run.
24. **Tooling slip (twice):** backticks inside double-quoted shell commands were run as commands while I appended to documents. Once a filename vanished from the source register entry; once Python tried to open a non-existent file (no change made) and a filename vanished from the handoff. Both texts were repaired. Lesson: write document text with a quoted heredoc, never inside a double-quoted shell string.
25. **State at end of this step:** v2 and pathway-trace step files re-paused after their completed runs; v3 step file paused and never run. New tests: 51 pass (store, v2 and v3 task logic, pathway analysis, centred boards, position generator).
