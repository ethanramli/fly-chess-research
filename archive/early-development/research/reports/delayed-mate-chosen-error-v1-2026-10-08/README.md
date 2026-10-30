# Initial chosen-error targeting: partial correction, no mate choice

2026-10-08. [Frozen protocol](../../data/delayed-mate-chosen-error-v1/protocol.json), [raw result/rankings/receipt references](result.json), [selection and protocol journal](../../journal/experiments/2026-10-08-chosen-error-targeting-protocol.md). Original scheduled-error experiment and all source archives/results remain preserved. Protocol SHA256 `2eff5afc6728a565242950705b6a30a360f3b3eeef45c3710f3929cb3a1a58f8`.

Command: `node --max-old-space-size=256 .codebase/scripts/puzzle-learning/run-delayed-mate-chosen-error.mjs --out research/reports/delayed-mate-chosen-error-v1-2026-10-08 --cpu-duty 0.5`.

Change exactly one experimental factor from the earlier taught-board screen: reviewed failed action Qf6 becomes actual initial preferred failure Qe6, independently certified. Same model/seed, graph, readout, encoder, delayed rule/constants, four-experience schedule/counts, same public board/task, same mixed shuffle permutation and all-legal before/after evaluation. First lesson runtime assertion binds the actual initial chosen error in every arm. Later reviews remain fixed initial-error rehearsals and are not guaranteed current-error reviews. No supervised fit, source-sign rewrite or final-family inspection.

| Condition | Initial choice | Final choice | Initial margin | Final margin |
|---|---|---|---:|---:|
| Informative |Qe6, wrong|Kh6, wrong|-0.0011605662294|-0.0003353611100|
| No-channel |Qe6, wrong|Qe6, wrong|-0.0011605662294|-0.0011621746235|
| Mixed shuffled |Qe6, wrong|Qe6, wrong|-0.0011605662294|-0.0010521109216|
| Disabled |Qe6, wrong|Qe6, wrong|-0.0011605662294|-0.0011605662294|

Margin = best verified mate score minus best failed-action score. Informative reduces the deficit71.1036646% (absolute improvement0.0008252051193). Shuffled reduces it about9.35%; no-channel worsens slightly; disabled unchanged. All conditions still fail the all-legal mate-choice criterion. Do not convert a margin percentage into a learning grade or an8/10 claim.

Informative removes Qe6 from first place to fourth; three other failures remain ahead of mate moves. Baseline top four Qe6,Kh6,Qd7,Qf6 become Kh6,Qd7,Qf6,Qe6. This supports partial taught-board ranking correction, not solved puzzle, generalized reasoning or recovery of biological memory. Source/factor comparison is one historical board/one seed, not a replicated causal generalization about all target-selection methods.

672 graph presentations total (168 per condition), whole invocation739.9601285 seconds, sampled peak RSS109.0078125MiB, CPU user149.391/system0.875 seconds. Heap256MiB, duty0.5, RSS768MiB/minimum free256MiB. Elapsed/CPU differences from prior run do not establish a performance improvement or guarantee: timing conditions/workload effects were not a matched latency study. No checkpoint promotion.

## Remaining mistake and next pivot

The teacher keeps reviewing Qe6 after the preferred mistake changes to Kh6. A fixed schedule is useful to isolate targeting, but is not a complete attempt-feedback-revision loop. Next protocol must choose the informative learner's current failed action using training-only evidence, bind its independently checked consequence and alternative, and replay the identical recorded experience/timing schedule in matched controls. Predeclare budget, stopping/selection rules and complete permutation; do not hand-select outcomes or tune frozen gates.

The existing source-recovery/cell-level mapping and shared input-mask coverage remain assumptions/hypotheses. Prediction record is ordinal and outcome stimulation is not a neural prediction-error pathway. Association/coexistence/reversal, trained-sentinel non-regression and unfamiliar/counterfactual transfer remain unmet. Do not scale puzzle corpus or claim retention based on immutable checkpoint gains.

Independent fresh-graph receipt and ranking replay is live separately. Training terminal state does not establish audit completion. Preserve complete pending/checkpoint artifacts and all prior failed approaches.

Audit completion addendum 2026-10-08: session78466 exited0. Independent fresh-graph replay passed all16 receipts and8 complete baseline/final rankings,168 presentations in each condition. Audit runtime303.7248389s, sampled peak107.12890625MiB, CPUuser154.218/system0.453s. Auditor SHA2568b7c34726fc49c49329990e6ce355e5195421ff465002df6b9795e6a7bac44e2. These results supersede prior live/pending statements; they validate recorded execution, not a solved mate or biological/transfer gates. No experiment graph process was present at verification. See audit.json in the report directory.

Ranking-delta diagnosis addendum2026-10-08: [static analysis of audited rankings](ranking-deltas.json) pins the raw result hash. Informative Qe6 score delta -0.00409596879035; median delta of25 other actions -0.00305708870292. Thus Qe6 falls an additional0.00103888008744 relative to other actions. Those25 deltas range -0.00306203961372 to -0.00305701931939: predominantly a shared score shift. Reviewed mate Qh7 has delta -0.00306203961372, approximately0.00000495091081 below that median, not a relative lift. Demoting the chosen error is supported; promoting the surviving mate alternative relative to all other failures is not observed in this complete four-event endpoint. This is not per-event causal attribution to PAM/PPL, nor proof that reward is anatomically unavailable. Common representation, local adaptation/readout direction and recurrent effects remain hypotheses. Adaptive targeting tests whether reviewing successive failures suffices; if not, separately test positive discrimination and encoder/pathway coverage, preserving the rule/representation factor separation. No new graph diagnostic run used.
