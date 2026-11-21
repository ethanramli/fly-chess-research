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