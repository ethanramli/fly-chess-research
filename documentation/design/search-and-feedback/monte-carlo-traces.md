# Monte Carlo investigation: bounded search and consequence traces

2026-10-06. Implemented a separate search/review path toward the original puzzle-learning objective. Existing frozen deterministic search and learning experiments are preserved. This path has software tests and a bounded synthetic-policy probe; it has not yet run fly inference, delivered neural feedback, or demonstrated persistent learning or transfer.

## Investigation

[monte-carlo-puzzle-search.mjs](../../../.codebase/src/search-and-feedback/monte-carlo-puzzle-search.mjs) uses seeded stochastic PUCT. On each selection it either samples the current player's mixed policy or selects the PUCT maximum. Both actors use their own preferences; values change sign on backup. Random sampling creates varied continuations, but strong defense still requires independent verification.

The workspace copies the task's complete PGN history, bounds simulations, model evaluations, depth, node storage and elapsed time, and awaits a streaming callback for each simulated path. A deadline cannot interrupt an evaluator already running. A depth/resource cutoff has a null estimate and does not contribute a zero-valued draw to the value average. Root visit counts include incomplete investigations; value counts are recorded separately. A checkpoint selected by visit count can therefore still be wrong and must be verified.

Each trace includes its legal move sequence, leaf FEN, stopping reason, random generator state, evaluation count and evidence category. Terminal values are observed consequences of that continuation; nonterminal values are model estimates. Neither is a best-defense proof. The callback is awaited to prevent an unbounded queue. The current review API takes a bounded complete panel of traces; a larger streaming coverage-review interface and search-resume protocol remain to be implemented.

## Independent review

[trace-consequence-review.mjs](../../../.codebase/src/search-and-feedback/trace-consequence-review.mjs) runs after commitment. It rejects incomplete or oversized panels, illegal continuations, mismatched leaves, incorrect terminal perspectives, invented cutoff outcomes and root visits inconsistent with the complete traces. It then uses the existing independent AND/OR certificate construction and replay checker, bound to task history, actor and horizon.

A checked failure certificate at the defender's turn supplies a legal reply preventing the stated bounded-mate objective. Review records whether that candidate/reply prefix appears in the investigation. An absent prefix means **verified defense not sampled**, not proof of a full-game loss, a uniquely best reply, or a particular neural defect. Located cutoff paths can be associated with a verified candidate consequence without claiming that truncation caused the model's preference. Exhausted proof construction/checking remains unknown and supplies no teaching experience.

Current feedback still covers bounded forced mate only. Calibrated position-evaluation error, exchange/compensation, sacrifice payoff, delayed credit and learning from these richer traces remain unfinished. Structured diagnostic records are not physiological memory updates.

## Full-graph latency evidence

2026-10-07: one correctly paced development-position profile of the real neural-backed search completed two board evaluations in 22.68 seconds, generating 48 separate all-legal neural candidate presentations. The two-evaluation limit allowed one completed PUCT simulation. This identifies per-action full-graph inference as a major search cost; it is a single-position latency measurement, not a learning result or scale estimate. The first profile double-paced evaluations and is preserved as invalid timing. See the [corrected profile](../../../research/reports/monte-carlo-neural-profile-v2-2026-10-07/README.md) and [harness-error note](../../../research/reports/monte-carlo-neural-profile-2026-10-07/README.md).

## Verification

`npm test`: **64/64 passed**. New tests cover seed reproducibility and changed-seed exploration, both actor perspectives, unknown depth cutoffs, resource bounds, task history, evaluator failure, verified unsampled defenses, corrupted/incomplete traces and proof exhaustion.

Software probe command:

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-monte-carlo-review.mjs --out research/reports/monte-carlo-review-software-2026-10-06
```

[Raw report](../../../research/reports/monte-carlo-review-software-2026-10-06/report.json) pins its sources and trace files. The [independent audit](../../../research/reports/monte-carlo-review-software-2026-10-06/audit.json) passes replay of 79 trajectories, 12 certificates and four defense diagnostics. An initial audit-only JSON signed-zero mismatch is preserved and corrected without changing raw evidence. Uniform synthetic policy, three fixtures: 32 simulations each for white/black mate-one and 15 for a three-ply opening objective, stopped by the evaluation budget. The opening review found two sampled and two unsampled independently verified defensive replies. Observed peak process RSS **51.59765625 MiB**, elapsed **0.8319413 s**, CPU **1.001 s**. No connectome graph was loaded; these figures cannot be used as fly-search performance or compared as a resource improvement over full-graph experiments.

The original goal remains incomplete. Next integration must preserve label-blind fly assessments, bounded verified teacher experiences, permitted persistent local state changes, matched controls and unfamiliar/counterfactual evaluation. The running fixed-coverage volume experiment is a separate diagnosis and must finish and audit before changing its mechanism.
