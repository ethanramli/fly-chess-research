Round 4 (same role as before, same assigned assumption). Review only: do not edit, create, delete or commit files; do not start subagents or other reviewers; read-only commands are allowed.

Revision 8 is at documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md, git blob 47e58441824ef4754f63a99ea5632ab46386d019. Revision 7 (blob 8d1fc4f2) is preserved at research/reports/replay-diary-design-review-2026-11-17/design-revision-7.md.

Your round 2 review of revision 7 returned approve with required changes. Revision 8 adopts them as section 12 "Revision 8" lists:
1. Peer, required to build: random-feature control fully specified (section 7.2).
2. Peer, required to launch: stream derivation, generators and run seeds fixed (section 4.8); launch gates G1 to G3 named (section 11).
3. Peer, required to launch, and skeptic, required to build: section 8 defers to each stage's prerequisite.
4. Peer, optional: replay publication added to the one-page loop.
5. Foundational, required to build: stage 3 control experience specified (section 7.5).
6. Skeptic, required to build, and foundational, optional: exact equality only through the first block; no state copied between arms afterwards (section 7.2).
7. Scoring boundary worked example added (section 7.4).

Check only:
(a) each item above that was raised in your review: RESOLVED or STILL OPEN, with reason and line evidence;
(b) new problems introduced by revision 8. Do not re-review unchanged text unless a change makes it wrong.

Return markdown:
1. VERDICT: APPROVE, APPROVE WITH REQUIRED CHANGES (building allowed after the changes), or REJECT.
2. One line per item: RESOLVED or STILL OPEN, reason.
3. New findings only, most severe first: severity (required-BUILD, required-LAUNCH, optional), claim, evidence (file:line), consequence, smallest fix.
Be brief.
