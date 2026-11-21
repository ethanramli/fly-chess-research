You are a new session continuing a review you began in another session (that session is not available). Below are (A) your round-1 instructions, (B) the round-1 review you wrote, and (C) your round-2 instructions. Act as the same reviewer, holding the same assigned assumption.

===== (A) YOUR ROUND-1 INSTRUCTIONS =====
ROLE: Scientific skeptic. Question you own: could a different mechanism produce the same results?
ASSIGNED DECISION-CRITICAL ASSUMPTION: the arms in section 7.2 (no diary, filler replay, same replays before B (yoked), shuffled-pulse diary, interleaved from start, learning off, lookup on the diary, simple learner with the diary) separate the main hypothesis (interleaved replay of the fly's own past lessons lets shared connections hold old and new lessons) from the rivals in section 6 (conflict, extra practice of anything, more practice of A at any time, re-exposure without the verdict, case recall, simpler learner), and none of these controls is biased for or against the diary.
HOW TO CHALLENGE IT: name a credible rival mechanism that every arm would pass, or a control that is unfair (for example: unequal reward and punishment balance after shuffling; the yoked control replaying entries when the fly's connections differ; filler pairings that themselves interfere; output-to-dopamine feedback during replay amplifying whatever the fly already prefers; the lookup bar using the best of three keys; the simple learner's update rule). For each, state what the main hypothesis and the rival predict and propose the smallest check where they differ. Also check whether stage 2's ideas A (legal recapture) and B (exchange value) can create interference at all under the transfer protocol's rejection rules, and whether the stated pass margins (32 of 48 pairs, above-chance retention 0.70, B learning at least 90% of the no-diary arm) can be met by a mechanism other than the one claimed. An observation that would overturn the assumption: a rival that passes every arm, or a control whose outcome is fixed by its construction.

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
**VERDICT: APPROVE WITH REQUIRED CHANGES. Revise the controls before building.**

**Assigned assumption:** section 7.2 fairly separates shared-connection interleaving from the section 6 rivals. **Disposition: open.** Several comparisons change more than the proposed cause, and a passing score pattern would not uniquely identify that mechanism.

Reviewed revision 1, hash `62c72ba4`. No files changed or experiments run. Scope: Volume 3, chapters *Process* and *Evidence*.

1. **required-BUILD — The pass margins allow substantial forgetting and a rival mechanism.**

   **Evidence:** [design:213–224](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:213). Acquiring 32 pairs and finishing with 30 passes retention: `(30−24)/(32−24) = 0.75`. Yet only **14 of the original 32 correct pairs** need remain correct; gains on previously wrong pairs can conceal 18 losses. Learning 32 new pairs against the no-diary arm’s 32 also passes the 90% rule. The all-legal measure has no success threshold.

   **Rival hypothesis:** replay repeatedly refreshes a nonlinear case classifier without producing a stable setting that preserves both lessons. It could beat no diary, filler, front-loaded replay and corrupted replay; succeed with mixed training; and beat the particular lookup and raw linear controls. That complete empirical pattern remains unverified.

   **Smallest check:** record old-pair survival and both groups’ rankings immediately before and after the final replay. Stable joint learning predicts both remain usable; repeated restoration predicts losses after new lessons followed by recovery after replay. Require useful all-legal performance before interpreting pair rankings as useful chess learning.

2. **required-BUILD — The yoked arm does not match the diary’s experience or effective teaching dose.**

   **Evidence:** [design:74–84](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:74) permits replay of earlier lessons from either block, while [design:169](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:169) moves only old-block entries. New-block replays disappear. Also, “same online lessons” at line 162 is unresolved against own-choice feedback at line 211: identical boards and seeds do not ensure identical chosen moves.

   The actual update uses current dopamine activity and current gains, not merely the stored current pulse ([implementation:85–103](/C:/Users/ethan/Documents/fly-chess-research/.codebase/src/neural-learning/three-board-feedback-v1.mjs:85)).

   **Predictions:** the main account attributes the advantage to interleaving old lessons. Rival hypotheses attribute it to additional new-block practice, different chosen experiences, saturation, or output-to-dopamine amplification.

   **Smallest revision/check:** preserve every replay except the old entries whose timing is moved; specify board, move, pulse and update-count matching explicitly. Log induced dopamine factors and update sizes. Test feedback-loop amplification with a separately declared replay-only ablation that preserves acquisition. Different connection states are the intended timing treatment, but identical external pulses do not establish identical effective dose.

3. **required-BUILD — Shuffling and filler can damage learning rather than isolate re-exposure or extra practice.**

   **Evidence:** [design:168–170](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:168).

   A permutation preserves pulse counts **per stored entry**, not per replayed event. Two entries carrying reward and punishment, replayed nine times and once, deliver nine rewards originally but only one after swapping. Thus the shuffle can change reward/punishment balance despite preserving the entries and schedule.

   **Rival hypotheses:** seeing old boards helps, but incorrect verdicts counteract that benefit; arbitrary filler activates overlapping connections and erases old learning. Both can make the diary win without establishing the claimed explanation. Filler interference is unverified.

   **Smallest revision/check:** add identical-board replay without an external teaching pulse; preserve pulse counts, amplitudes and timing at the replay-event level in the shuffled control. Measure old-task changes caused by filler. The main account predicts a benefit from correctly paired verdicts; the rival predicts benefits from re-exposure that corrupted teaching conceals.

4. **required-BUILD — The chess lessons can interfere, but their definitions do not create a contradiction; mixed-training failure cannot prove incompatibility.**

   **Evidence:** the [rejection rules:94–104](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md:94) make both lessons consistent with the same combined rule. Interference remains possible if their representations overlap, but that is a hypothesis.

   Moreover, [design:171](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:171) calls one shuffled order without replay an “upper bound.” It receives fewer updates than diary training. Its failure cannot establish “no joint setting” as asserted at lines 231 and 250.

   **Predictions:** the main account requires measurable loss during continued learning and a reachable joint solution. A noninterfering representation predicts no loss to repair.

   **Smallest revision/check:** retain the no-diary forgetting prerequisite; treat mixed-training success as a feasibility witness and failure as failure of that schedule. Require separate evidence or proof before claiming incompatible settings or a Volume 4 limit.

5. **required-BUILD — The lookup and simple-learner controls cannot bear their stated general conclusions.**

   **Evidence:** [design:173–174](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:173). “Reward-signed update” leaves the simple learner’s equation, normalization, learning rate and bounds unspecified. Three-neighbour lookup is one case-classification method.

   **Rival hypothesis:** nonlinear representation plus ordinary associative learning explains success. It can outperform a raw linear reader and those particular lookup implementations without requiring concept combination.

   **Smallest revision/check:** freeze the baseline equations and comparable development-only tuning budgets; add a simple learner on matched nonlinear features. Beating these controls would challenge that rival, while matching them would support it. Taking the best of three whole, predeclared keys is conservative against the fly, not automatically invalid; specify that comparison explicitly. Beating it still excludes only those implementations.

**Strongest supportable sentence, conditional on passing:** “With its diary absent during evaluation, the replay-trained model outperformed the specified control implementations on the registered retention and chess tasks.”

===== (C) ROUND-2 INSTRUCTIONS =====
Lead's ledger for your round-1 findings (scientific skeptic):
1. Margins hide losses; refresh rival; all-legal had no threshold: fixed. Stage 2 adds a pair-by-pair kept-share rule (condition 2) beside the net rule; every fly snapshot is taken after an online lesson and before its replay (section 4.3), and a sawtooth log scores A just before and after replays every 48 B lessons; refresh is named as Rival 4 in section 6; the all-legal measure has a threshold (condition 8) and is required in stage 3.
2. Moved-timing mismatch and own-choice divergence: fixed. Moved timing keeps every replay and moves only earlier-block entries' replays (7.2); stage 2 uses one teacher-chosen fixed tape so all arms get identical lessons (disclosed as a clue); dopamine factors, connections changed and summed absolute change are logged per replay (4.2); a descriptive feedback-cut arm silences output-to-dopamine connections during replay passes only.
3. Shuffle changed per-event balance; filler may interfere: fixed. Event-level shuffle over the diary arm's replay log keeps per-block pulse counts, amplitudes and timing; a no-pulse arm isolates re-exposure; condition 7 makes the filler comparison uninformative if filler itself damaged A.
4. A and B need not conflict; mixed-order failure is not incompatibility: fixed. No-diary forgetting is a prerequisite; mixed order gets one filler step per lesson to match update counts and is a feasibility witness only; a Volume 4 limit needs a separate proof or exact search.
5. Controls cannot bear general conclusions: fixed. Exact case-recall and learner rules (7.2), with a random nonlinear-feature learner added and a stated tuning budget chosen on the learner's own online accuracy; attribution narrowed to the listed controls (Read first item 6, section 7.5).

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
