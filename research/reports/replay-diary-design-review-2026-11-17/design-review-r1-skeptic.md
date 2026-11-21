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