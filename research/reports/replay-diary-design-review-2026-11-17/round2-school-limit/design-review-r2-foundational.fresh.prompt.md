You are a new session continuing a review you began in another session (that session is not available). Below are (A) your round-1 instructions, (B) the round-1 review you wrote, and (C) your round-2 instructions. Act as the same reviewer, holding the same assigned assumption.

===== (A) YOUR ROUND-1 INSTRUCTIONS =====
ROLE: Foundational skeptic. Question you own: if the design succeeds exactly as planned, will it answer the researcher's question?
ASSIGNED DECISION-CRITICAL ASSUMPTION: a memory that only replays the fly's own past lessons into its own learning rule, and is removed before every test, (a) helps the fly remember, (b) cannot supply the intelligence later attributed to the fly, and (c) can still potentially support reasoning as the researcher defines it.
HOW TO CHALLENGE IT: construct a concrete case where every test in section 7 passes but the memory has in effect supplied the intelligence (for example: repeated replay turning the fly's connections into a stored-case table so its weights just implement lookup; replay amplifying a teacher-chosen curriculum; supersession or reservoir sampling quietly encoding outcome information; the stored pulse being the teacher's verdict). Then challenge (b) and (c) from the other side: is "absent at test" too strict for a Volume 3 system that is allowed outsourced memory, working memory and specialized reinforcement learning? Can a memory that only shapes a Kenyon-cell-to-output readout ever support combining separately learned concepts, or is the ceiling set entirely elsewhere (representation, readout capacity), making the memory irrelevant to reasoning? Is the design premature given that the fly has not yet acquired a chess lesson? Does it repeat recorded past mistakes (optimizing against a gate; volume or property conflicts with the memory handoff's Property 1 and Property 2)? An observation that would overturn the assumption: a passing scenario in which the attributed ability is demonstrably the memory's, or a reason the design cannot bear on reasoning at all.

You are an independent strict reviewer. Review only: do not edit, create, delete or commit files, do not run experiments or graph simulations, and do not start subagents or other reviewers. Reading files and running read-only commands (grep, git log, small node/python scripts that only print) is allowed.

Repository: C:\Users\ethan\Documents\fly-chess-research (a research project: a Drosophila-connectome-constrained model that learns chess from verified feedback).

The researcher's goal, verbatim:
"Design a new memory system that the simulated fly can use to learn from experience and potentially support reasoning. Computational memory is allowed; biological realism is not mandatory.
The memory may help the fly remember. It must not supply the intelligence we later attribute to the fly.
1. Define what enters and leaves memory. Every stored item must come from the model's permitted experience. No hidden chess knowledge, future outcomes, test answers or privileged teacher information.
2. Keep remembering separate from solving. Storage and retrieval are allowed. The memory must not independently evaluate positions, recommend moves, perform chess search or supply prewritten concepts. Examine whether its encoding or retrieval quietly does any of those things.
3. Support continued learning. Specify capacity, interference, forgetting, correction and persistence. Test whether learning something new preserves useful earlier memories.
4. Make the scientific claim defensible. Document assumptions, justify design choices, and define tests before seeing results. Include memory-only and simpler-system controls that could reveal whether retrieval alone explains apparent reasoning.
5. Design before implementation. Compare plausible designs, challenge their hidden shortcuts, and recommend one with explicit failure conditions. Do not assume improving v8 is the answer."
The researcher's definition of reasoning: "being able to apply many unrelated concepts to solve an unfamiliar problem".

The proposal under review (revision 1, git blob 62c72ba462e156f15d4f2ddcd4cc13f51697fdfe):
  documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md
Context to read as needed:
  AGENTS.md (project rules: feedback quality gate, controls, disjoint families, plain-words writing)
  documentation/design/research-goals/memory-handoff-2026-11-07.md (Properties 1-4 and the v8 limits)
  documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md
  documentation/design/research-goals/restart-plan-2026-10-30.md (sections 2 and 4: reasoning definition, feedback rule)
  documentation/design/neural-learning/three-board-feedback-test-2026-11-14.md (current learner and teaching pathway)
  research/reports/engineered-memory-test-v8-2026-11-07/README.md
  research/reports/long-term-memory-v1-live-comparison-2026-11-01/README.md
  research/reports/memory-retention-continuation-2026-11-01/README.md and cubic-exit-spec.md
  research/reports/memory-interference-diagnosis-2026-11-01/next-mechanism-decision.md
  Code under .codebase/src (chess-input for the eyes, neural-learning, search-and-feedback) and .codebase/scripts.

Return markdown with:
1. VERDICT: APPROVE, APPROVE WITH REQUIRED CHANGES (building allowed after the changes), or REJECT.
2. The assumption you were assigned, and your disposition: confirmed for the tested scope, changed (state the revision), or open (state the next check).
3. Numbered findings, most severe first. Each: severity (required-BUILD = must change before building; required-LAUNCH = must change before any run; optional), the claim challenged, evidence (file:line or quoted text), consequence if true, and the smallest revision or check that would settle it. Mark anything you could not verify as a hypothesis.
4. The strongest sentence the design, if executed as written, could support.
Be concrete and brief. Do not pad. Do not repeat the proposal back.

===== (B) YOUR ROUND-1 REVIEW =====
**VERDICT: APPROVE WITH REQUIRED CHANGES — building allowed after the required-BUILD changes below.**

Revision 1’s blob matches the supplied hash. Scope: Volume 3, chapters *Process* and *Evidence*.

**Assigned assumption — changed.** Removing the diary proves that it cannot evaluate the current test position directly. It does **not** establish where the learned ability came from. Retention benefit remains untested; support for reasoning remains open.

1. **required-BUILD — A case classifier could pass while reasoning is wrongly attributed.**  
   **Evidence:** The controls are three-neighbour lookup and a linear reader on raw eyes; nevertheless, beating lookup is said to show that stored cases did not do the work ([design:173](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:173), [design:238](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:238)).  
   **Concrete passing scenario — hypothesis:** replay trains connection strengths into a classifier of recurring visual templates and their teacher verdicts. Connections preserve information from cases already evicted; the final quarter-capacity diary does not. The classifier retains earlier templates, learns new ones and beats shuffled pulses, filler and early replay. Unseen games retain the same template correlations. It scores 54/60 combination pairs, including 18/20 per group, while the specified controls score at most 42. Every software audit can pass. This remains compatible with case-based prediction rather than combining concepts.  
   **Smallest revision/check:** add a matched nonlinear case-classification control using the complete permitted experience history and replay exposure, including random or rewired features. Narrow attribution to superiority over the controls actually tested. Storing the pulse is permitted experience; repeatedly transferring that verdict into weights is still a possible explanation.

2. **required-BUILD — The combination gate need not demonstrate solving a problem.**  
   **Evidence:** A twin pair passes when one move scores higher across two boards ([protocol:12](C:/Users/ethan/Documents/fly-chess-research/documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md:12)). Stage 2 reports all-legal choice without making it a pass requirement; the later combination gates also use twin rankings ([design:215](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:215)).  
   **Consequence:** a learned board-wide score offset can improve twin rankings while leaving the candidate below a bad rival on both boards. Passing the earlier safe-capture choice gate does not settle choice on unfamiliar combinations.  
   **Smallest revision/check:** require useful all-legal choices on the combination tasks under their declared criterion. Include a comparison that cancels board-wide offsets, such as candidate-minus-rival margins. Otherwise call the result retained pair discrimination.

3. **required-BUILD — Failed interleaving does not establish an architectural ceiling.**  
   **Evidence:** Interleaving failure becomes “no joint setting is reachable” and “the memory cannot help” ([design:231](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:231), [design:250](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:250)).  
   **Consequence:** an unsuccessful learning schedule could be mistaken for inadequate representation or capacity. Conversely, replay cannot supply missing representational distinctions merely by repeating lessons. A Kenyon-cell readout could support combination through the circuit’s nonlinear dynamics; neither possibility is settled here.  
   **Smallest revision/check:** change the failure statement to “this schedule did not find a joint solution.” A capacity claim needs a bounded argument about the actual circuit and permitted gains. A successful witness would establish capacity, separately from learnability.

4. **required-BUILD — Assisted retention is being relabelled as Property 2.**  
   **Evidence:** The proposal claims “Property 2 with a disclosed aid” ([design:228](C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:228)); the handoff explicitly says engineered memory does not count towards Properties 1 or 2 ([handoff:18](C:/Users/ethan/Documents/fly-chess-research/documentation/design/research-goals/memory-handoff-2026-11-07.md:18)).  
   **Consequence:** another passing gate could be reported as closing an older, stronger requirement—the recorded v8 mistake.  
   **Smallest revision:** name this **assisted retention for Volume 3**. Leave the original properties unresolved unless their definitions are explicitly amended.

5. **optional — Absence at test is a useful restriction, not a necessary boundary for Volume 3.**  
   **Evidence:** Volume 3 permits outsourced memory, working memory and specialized reinforcement learning ([volume scope:26](C:/Users/ethan/Documents/fly-chess-research/research/literature/writings/03-reasoning/README.md:26)).  
   **Consequence:** failure of replay-only consolidation would not reject an assisted system that retrieves experiences during decisions while the circuit evaluates them.  
   **Smallest revision:** identify removal as this candidate’s restriction. Designing it now is reasonable; the proposal appropriately keeps chess testing dependent on acquisition. Success on the older non-chess learner would remain a mechanism result.

**Strongest supportable sentence if execution succeeds as written:** “Replay of previously received teaching events improved retention and later locked twin-pair performance over the specified controls, with the diary absent during evaluation; this does not yet distinguish concept combination from a replay-trained case classifier.”

===== (C) ROUND-2 INSTRUCTIONS =====
Lead's ledger for your round-1 findings (foundational skeptic):
1. A case classifier in the weights could pass: addressed. Case recall on the full lesson history (not only the final diary) and a learner on random nonlinear features with the same diary and replay are added (7.2); attribution is narrowed to beating the listed controls, with the untested-classifier limit stated (Read first item 6, 7.5, 9).
2. Twin rankings need not mean solving: fixed. Offset-cancelled pairs (move margin over the best other legal move) and an all-legal measure with a threshold are required in stage 2 and for any stage 3 reasoning claim (7.4, 7.5).
3. Failed interleaving is not a ceiling: fixed. Mixed order is a feasibility witness; failure means only that the schedule failed; a Volume 4 limit needs a separate bounded proof or exact search (7.2, 7.4).
4. Assisted retention relabelled as Property 2: fixed. Renamed assisted retention for Volume 3; Properties 1 and 2 stay unmet (Read first item 1, section 9, section 11 item 4).
5. Removal is not a necessary boundary (optional): adopted. Section 2 now calls removal this design's restriction; other Volume 3 memories may be consulted at decision time with their own lookup control.

Round 2. Same rules as round 1: review only; do not edit, create, delete or commit files; do not start subagents or other reviewers; read-only commands are allowed.

The proposal is now revision 2, git blob 5e22be792b2f49cb69628c702863fdaacef25c84, at the same path:
  documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md
Revision 1 (the text you reviewed) is preserved at research/reports/replay-diary-design-review-2026-11-17/design-revision-1.md (blob 62c72ba4). Section 12 of revision 2 maps every round-1 finding from all three reviewers to its change. All required findings were adopted; none was declined. The lead's ledger for YOUR findings is below.

Check only:
(a) each of your round-1 findings: mark it RESOLVED, or STILL OPEN with the reason and evidence;
(b) new problems introduced by the changed text (sections 2, 4.1-4.9, 6, 7.2-7.5, 8, 11). Do not re-review unchanged text unless a change makes it wrong.

Return markdown:
1. VERDICT: APPROVE, APPROVE WITH REQUIRED CHANGES (building allowed after the changes), or REJECT.
2. One line per round-1 finding: number, RESOLVED or STILL OPEN, reason.
3. New findings only, most severe first: severity (required-BUILD, required-LAUNCH, optional), claim, evidence (file:line), consequence, smallest fix.
4. The strongest sentence the current revision, executed as written, could support.
Be brief.

Update before this round ran: the first attempt stopped at the usage limit. Since then the lead has made further edits, all recorded in section 12 and in research/reports/replay-diary-design-review-2026-11-17/lead-recheck-round2.md. Review revision 6, git blob 0b57e4601faeda47b6fb5d4d30e2eca603d0c492, at the same path. Earlier revisions are preserved in the review folder: design-revision-2.md (5e22be79), design-revision-3.md (72fcbec9), design-revision-4.md (99df41e4), design-revision-5.md (0c71bb4d).
- Revision 3: four small fixes from the lead's own recheck (event-level shuffle within each block, unknown trials, sawtooth snapshots, named boards and tuning block).
- Revision 4: adds the section "The design on one page" (picture, module interface, data, practice loop, worked example, files to build). It should restate sections 4.1-4.8 without adding rules: check that it does, and that its interface really has no path from the diary to move scoring.
- Revision 5: six fixes from the lead's second read (stage 1 arms yoked to the diary arm's choices; supersession disclosure; moved-timing placement after the earlier block's snapshot; replay persistence; stage 3 diary across phases and filler trials; stage 2 arm count).
- Revision 6: the lead's solo deep-in-thought pass. Most important: the four replay controls now change only replays of old lessons (entries from earlier blocks), so through the first block each is in exactly the diary arm's state and later differences measure keeping, not learning. Stage 1's delay condition is now "not worse than no diary", because raw records show delay losses happen when there are no lessons and so no replays; benefit conditions count only damage after new learning. Also: prerequisite requires no-diary acquisition, runtime corrected (about 22 hours single process), entry size measured, bootstrap seed and tie tolerance specified, development boards disjoint from the tape, early-stopped runs, a worked example, order-not-counterbalanced limit.
Check all of these edits too. Your verdict should be on revision 6 as a whole.
