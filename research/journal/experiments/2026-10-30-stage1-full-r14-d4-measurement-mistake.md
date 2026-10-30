# 2026-10-30 - full-r14 D4 failure: a measurement mistake and a real valence weakness

**What was tried.** The registered full Stage 1 run r14: 3 replicas x 4 arms x 32 blocks, attack-map cue v2, outcome-only, evaluator v2, independent audit.

**What failed.** The audit is gate-failed: D4 is exactly 64/128 in every replica. All other measured gates pass (final 61-64/64, pairs 29-32/32, D6 lower95 > 0 against every control). [Report](../../../archive/early-development/research/reports/stage1-full-r14-2026-10-30/README.md).

**The mistake.** The D4 observation in evaluators v1-v3 reads `provisionalMBONValue`, tanh(MBON12 - MBON01), the value proxy of the Stockfish-value prototype. When brain v5 (2026-10-26) moved the choice readout to MBON12 - MBON01 - MBON07 + MBON14, D4 was not moved with it. On every training row the receipts hold (1,412/1,412, trained and naive), MBON12 - MBON01 is positive, so D4 always predicts +1 and is structurally 64/128. The mistake was missed because no test ties the D4 value to the choice readout, smokes never run D4, and I (Claude Code) did not trace each gate's observation path before registering full-r14.

**Limits of the evidence.** The constant sign is measured on training receipts, not on the final probes themselves (those were read only as the audit's aggregate). It is a strong inference that the final rows behave the same, because the sign never varies in 1,412 rows from both trained and naive memories.

**A real weakness behind it (measured, training only).** The choice readout has no calibrated zero. Relative to naive, learning lowers unsafe captures (16/16 per replica) but rarely raises safe ones (11, 0 and 5 of 16), although success and failure feedback were balanced. *Hypothesis:* reward and punishment cancel on cue cells that safe and unsafe captures share.

**What changed.** Nothing in frozen code, protocol or gates. full-r14 is preserved as gate-failed.

**Next.** Researcher decisions: (1) which readout D4 should measure, to be fixed before the next registration on training evidence only; (2) whether the next registered run may reuse the final families. Research step meanwhile: test the shared-cell cancellation hypothesis on training data, and add a test that the D4 value channel agrees with the registered choice readout.

## Addendum 02:40 - my cancellation hypothesis was wrong
The first hypothesis (reward and punishment cancel on shared cue cells) is refuted: the synaptic change on each probe action's own cells has the correct sign on 24/24 boards per replica. The measured cause is in the readout. The restrained compartments (MBON12 and MBON01) shift every capture by about the same amount, while the long-term alpha stores carry the move-specific valence: sign(MBON14 - MBON07) is correct on 95/96 training probe actions, against 34/96 naive. Report point 5.
