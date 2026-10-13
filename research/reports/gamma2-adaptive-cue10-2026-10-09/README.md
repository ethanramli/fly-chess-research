# Gamma2 adaptive cue-capacity hypothesis test (registered; not run)

Registered 2026-10-09 before graph execution. This bounded test asks whether allowing the conjoined gamma2 cue encoder to select up to 10 cells, instead of 8, improves action ranking when total cue current remains 12. It uses the existing rate-timing memory and the independently audited adaptive target schedule. Training is authorized only to test this registered prediction.

## Evidence and limits

The audited cap-8 comparison is [gamma2 adaptive target v1](../../data/gamma2-adaptive-target-v1/protocol.json), with raw result and audit at [result](../../../runs/gamma2-adaptive-target-v1/result.json) and [audit](../../../runs/gamma2-adaptive-target-v1/audit.json). It selected each arm's unique unaided top error, f7g8, verified it as failure, then taught f7g8 and verified success f7h7. Informative margin change was +0.00032014166936278343; every arm still chose f7g8.

A static, read-only sweep over 26 legal moves found exact total current 12 for all cues at both caps (floating arithmetic tolerance 1e-12). Cap 8 always selects 8 cells. Cap 10 selects 8, 9, or 10 cells because of token-to-cell collisions; it does not increase total dose. Maximum pairwise stimulation-set cosine is predicted to decline 0.375 to 0.3535533905932738, while mean cosine rises 0.07576923076923077 to 0.08168387202779266. The geometry signal is mixed; this is not evidence of learning or a blanket overlap reduction. The protocol preserves these predictions.

## Frozen predictions

The primary prediction is that informative cap 10 makes Qh7 the unique all-legal top move while informative cap 8 did not. Failure of this gate falsifies useful acquisition for this test. Secondary evidence is the audited Qh7-minus-current-error margin change versus cap 8's +0.00032014166936278343 and its within-cap matched controls. Directional plasticity, swapped, absent and disabled outcomes are reported independently. No thresholds or interpretation will be changed after results.

Only maxCells changes between cap 8 and cap 10. Seed 47, graph, annotations, model, all-legal puzzle, adaptive target rule, verified success move, total current 12, timing schedule, memory rule, readout, four conditions, exposure and independent audit logic are held fixed. Cap 8 is existing audited evidence; only cap 10 will be run, serially.

## Scope

One deterministic puzzle and seed cannot establish generality. A result cannot validate receptor identity, biological timing, the engineering gain equation, natural vision, chess transfer, retention, reversal or a working chess learner. No weights are frozen or imported. Full report will be appended after the cap-10 run and audit.


# Audited result appended 2026-10-09

The cap-10 run completed under the registered protocol. Its independent receipt/certificate/update audit passed all 152 frame replays, local direction and specificity checks, and disabled-state isolation. The informative arm's cue-gain changes were -0.0192439218 for verified failure f7g8 and +0.0101385965 for verified success f7h7; fully swapped feedback reversed the signs. The informative Qh7-minus-f7g8 margin change was +0.0002970388, versus +0.0003201417 in the audited cap-8 comparison. Within cap 10, informative still exceeded swapped, absent and disabled controls, so local selective association remains detectable.

The primary behavioral prediction failed. Cap 8's informative all-legal top remained f7g8 (verified failure); cap 10 changed it to f7d7 (also verified failure). Swapped, absent and disabled cap-10 arms remained f7g8. Thus wider cue capacity changed which wrong move won in the informative arm, but it did not select Qh7, and its target-pair margin change was slightly smaller than cap 8. This does not support the idea that the tested width increase solves the useful-choice problem. The narrow hypothesis that cue width alters competition among wrong actions remains possible; this single puzzle/seed cannot establish that causal generalization.

Cap-10 runner: peak RSS 189.57 MiB, elapsed 269.41 s; heap 256 MiB, duty 0.5. The separate comparison audit verifies the already audited cap-8 result and the cap-10 raw result/audit hashes, and records the prespecified prediction failures in [comparison-audit.json](comparison-audit.json). The cap-10 receipt audit is [audit.json](../../../runs/gamma2-adaptive-cue10-v1/audit.json), raw run [result.json](../../../runs/gamma2-adaptive-cue10-v1/result.json), protocol [protocol.json](../../../runs/gamma2-adaptive-cue10-v1/protocol.json), and archived auditor [auditor.mjs](../../../runs/gamma2-adaptive-cue10-v1/auditor.mjs). Comparison code: [audit-cue-capacity-comparison.mjs](audit-cue-capacity-comparison.mjs).

Corrections and mistakes: a first one-off PowerShell static-sweep command lost JavaScript quotes and failed before computation; a corrected here-string completed the read-only sweep. A progress-monitor command also had a PowerShell pipeline syntax error and produced no run change; the corrected monitor confirmed checkpoint progress. Neither affected the protocol, training data or result. The frozen runner and prior runs were not edited. No weights were frozen. No biological validation, retention, reversal, transfer or working chess learner is established.
