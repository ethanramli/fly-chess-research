Round 3 (scientific skeptic). Same rules as before: review only; do not edit, create, delete or commit files; do not start subagents or other reviewers; read-only commands are allowed.

Your round 2 ran in a different session on another account (that account then hit its usage limit). This is the review you wrote there, on revision 6 (blob 0b57e460):

----- YOUR ROUND 2 REVIEW -----
**VERDICT: APPROVE WITH REQUIRED CHANGES. Revise before building.**

Reviewed revision 6, blob `0b57e460`. No files changed or experiments run.

1. **RESOLVED — Hidden losses and refresh.** Kept-pair retention, snapshots before replay, the sawtooth log and an all-legal threshold address the original finding. The new denominator problem is below.
2. **RESOLVED — Replay matching.** Every replay is preserved, online lessons are matched, and effective update sizes are logged. Different connection states remain the intended timing intervention.
3. **STILL OPEN — Filler damage.** The filler guard compares against no diary, whose initial learning lacks replay ([design:268](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:268), [design:330](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:330)). Filler could damage the stronger initial state while losing less than no diary. Stage 1 also requires beating filler without a damage exception. **Required-BUILD:** assess filler against a copy of the same initial state receiving identical later lessons and current-block replays, with old-lesson replays omitted.
4. **RESOLVED — Interference and feasibility.** Acquisition and forgetting are prerequisites; mixed-order failure no longer establishes incompatible settings.
5. **RESOLVED — Scope of baseline conclusions.** Equations and a nonlinear-feature learner are supplied, and conclusions exclude only the listed implementations.

**New findings**

1. **required-BUILD — Separate exclusions can manufacture an all-legal advantage.**  
   **Evidence:** unknown top choices are removed separately from each arm’s denominator ([design:314](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:314)); any positive bootstrap advantage can pass. Identical totals of 90 verified successes could become **90/183 versus 90/192** merely because one arm excludes nine unknown boards—within the 5% allowance.  
   **Consequence:** an apparent improvement need not mean better choices.  
   **Smallest fix:** retain the fixed eligible-board denominator and require the paired advantage to survive conservative bounds on unknown outcomes. Specify this for both stages using the measure.

2. **optional — The learning-rate sweep provides no meaningful tuning.**  
   **Evidence:** the additive update starts at zero and multiplies every increment by the same positive learning rate ([design:282](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:282)). Changing that rate only scales weights; predicted signs and rankings remain unchanged, apart from numerical tolerance.  
   **Consequence:** the stated tuning budget does not strengthen this control.  
   **Smallest fix:** freeze the rate and remove the tuning claim, or introduce a consequential, predeclared tuning choice.

The one-page interface adds no direct path from diary retrieval to move scoring.

**Strongest supportable sentence, conditional on passing:** “On the registered tests, replay training retained earlier chess-pair rankings better than the listed replay controls, with the diary absent during scoring.”
----- END -----

The lead adopted all three points in revision 7, git blob 8d1fc4f2c5b8717d9ad325b06c9ba2a6a51bf991, same path (documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md); section 12 "Revision 7" lists them. Revision 6 is preserved as research/reports/replay-diary-design-review-2026-11-17/design-revision-6.md.
1. Filler damage (round 1 finding 3, still open): new arm "no old replays", identical to the diary arm with every old-lesson replay skipped. It is the reference for filler damage (stage 1 condition 5; stage 2 condition 7), for the forgetting prerequisite in both stages, and is added to the comparisons. Arm counts and runtime updated.
2. New finding 1 (unknown boards): every eligible board stays in the denominator; comparisons use the worst case for the diary (its unknown boards score 0, the other arm's score 1) and need a bootstrap lower limit above 0; the 5% inconclusive rule stays; stage 3 condition 4 uses the same scoring.
3. New finding 2 (optional, learning rate): the rate is removed and the tuning claim dropped.

Check only: (a) each item above, RESOLVED or STILL OPEN with reason and evidence; (b) new problems introduced by the revision 7 changes. Do not re-review unchanged text unless a change makes it wrong.
Return markdown:
1. VERDICT: APPROVE, APPROVE WITH REQUIRED CHANGES (building allowed after the changes), or REJECT.
2. One line per item: RESOLVED or STILL OPEN, reason.
3. New findings only, most severe first: severity (required-BUILD, required-LAUNCH, optional), claim, evidence (file:line), consequence, smallest fix.
4. The strongest sentence revision 7, executed as written, could support.
Be brief.
