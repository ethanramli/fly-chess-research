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
