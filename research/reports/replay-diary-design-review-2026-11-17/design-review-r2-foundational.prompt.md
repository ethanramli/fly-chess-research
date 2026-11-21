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

Update before this round ran: earlier attempts stopped at usage limits on two accounts. Since then the lead has made further edits, all recorded in section 12 of the design and in research/reports/replay-diary-design-review-2026-11-17/lead-recheck-round2.md. Review revision 7, git blob 8d1fc4f2c5b8717d9ad325b06c9ba2a6a51bf991, at the same path. Earlier revisions are preserved in the review folder as design-revision-2.md to design-revision-6.md.
- Revision 3: four small fixes from the lead's own recheck (event-level shuffle within each block, unknown trials, sawtooth snapshots, named boards and tuning block).
- Revision 4: adds the section "The design on one page" (picture, module interface, data, practice loop, worked example, files to build). It should restate sections 4.1-4.8 without adding rules: check that it does, and that its interface really has no path from the diary to move scoring.
- Revision 5: six fixes from the lead's second read (stage 1 arms yoked to the diary arm's choices; supersession disclosure; moved-timing placement after the earlier block's snapshot; replay persistence; stage 3 diary across phases and filler trials; stage 2 arm count).
- Revision 6: the lead's solo deep-in-thought pass. The replay controls change only replays of old lessons (entries from earlier blocks), so through the first block each is in exactly the diary arm's state; stage 1's delay condition is "not worse", because raw records show delay losses happen with no lessons and so no replays; plus runtime, entry size, bootstrap seed, tie tolerance, disjoint development boards, early-stopped runs, a worked example, order limit.
- Revision 7: the scientific skeptic's round 2 (design-review-r2-skeptic.md in the review folder): a new "no old replays" arm (the diary arm with old-lesson replays skipped) is the reference for filler damage, the forgetting prerequisite and the benefit conditions; the all-legal measure keeps every eligible board in the denominator and comparisons must survive the worst case for the diary on unknown boards; the simple learners' learning-rate sweep is removed because a rate only rescales scores.
Check all of these edits too. Your verdict should be on revision 7 as a whole.
