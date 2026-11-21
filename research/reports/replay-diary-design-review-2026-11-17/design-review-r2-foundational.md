**VERDICT: APPROVE WITH REQUIRED CHANGES — building allowed after the required-BUILD clarification below.**

Reviewed revision 7; its blob matches `8d1fc4f2c5b8717d9ad325b06c9ba2a6a51bf991`. Scope: Volume 3, *Process* and *Evidence*.

1. **RESOLVED:** Full-history recall and nonlinear-feature controls are added; attribution explicitly leaves untested case classifiers unresolved.
2. **RESOLVED:** Offset-cancelled comparisons and an all-legal choice requirement now accompany the combination gate.
3. **RESOLVED:** Failed mixed-order learning establishes a failed schedule, not a capacity ceiling.
4. **RESOLVED:** Assisted retention belongs to Volume 3; Properties 1 and 2 remain unmet.
5. **RESOLVED:** Removal is explicitly this candidate’s restriction, rather than a requirement for every permitted memory.

**New findings**

1. **required-BUILD — Stage 3 leaves the decisive controls’ experience ambiguous.**  
   **Evidence:** [Design:263](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:263) requires every comparison arm to receive identical online inputs and pulses. [Design:344](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:344) instead invokes the unchanged protocol on each fly’s own choices, including arms deliberately missing ideas. The explicit matching arrangements cover stages 1 and 2 only.  
   **Consequence:** Different implementations could give the simple learners different experiences, or accidentally give missing-idea controls the omitted lessons. Either would undermine the attribution comparison.  
   **Smallest fix:** Specify stage 3 separately: identify whose complete receipts train each case-recall and simple-learner control; preserve the protocol’s missing-idea and filler conditions; state which fly arms choose independently. For the central attribution test, match the simple learners to the evaluated full fly’s actual lessons and replay tape.

2. **optional — The new reference does not start every later block in the diary arm’s state.**  
   **Evidence:** [Design:269](/C:/Users/ethan/Documents/fly-chess-research/documentation/design/neural-learning/replay-diary-memory-design-2026-11-17.md:269) claims that equality. Stage 1 has four successive item blocks; skipping old replays during the second block can already change the reference’s state before the third. Moved-timing practice also deliberately changes the state after the preceding snapshot.  
   **Consequence:** Later differences measure accumulated replay effects, rather than an isolated intervention from identical starting states. The comparison remains useful, but its explanation overstates the matching.  
   **Smallest fix:** Limit exact equality to the first-block snapshot and describe subsequent comparisons as continuous training with accumulated differences.

The one-page interface adds no direct diary-to-scoring operation; its replay output returns through the learner’s teaching step.

**Strongest supportable sentence, after clarification:** “Replaying previously received lessons improved assisted retention and performance on unfamiliar three-idea chess problems over the specified controls, with the diary absent during evaluation; an untested case classifier in the learned connections remains a possible explanation.”