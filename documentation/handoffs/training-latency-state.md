# Training latency handoff - repeatability complete

2026-10-19. Original optimization goal remains closed at researcher request. A later separately authorized three-repeat consistency check is now complete; no further graph work is pending.

[Three-repeat report](../../research/reports/training-latency-2026-10-19/repeatability-v1/README.md) and [machine-readable summary](../../research/reports/training-latency-2026-10-19/repeatability-v1/summary.json).

Trials:447.550->187.664s (58.069%),429.130->172.096s (59.897%),456.159->184.727s (59.504%). Mean59.156%, median59.504%, range58.069-59.897%. All3 independent integrity/timing gates pass;6552 publications/3276 pairs/1638 historical receipt instances. Historical69.126% plus/minus5-point consistency band fails. Keep historical evidence unchanged; current replicated selected-workload gain is approximately59%. No whole-curriculum timing or RAM-causality claim.

All12 timed batches and3 audits were serial through python actions/repeat_training_latency.py and existing curriculum actions. Driver tool32572 exited0; last audit8668 terminal. Registration research/data/training-latency-repeatability-v1/registration.json, frozen runner/protocol/binaries unchanged, no tuning/dropped trial/retry. Existing summary action produced phase/cold totals independently for each trial. Source states/receipts match.

Researcher added8GB physical RAM and authorizes2GB process budget for future unfrozen work; AGENTS objective/resource text updated. All3 repetitions used upgraded physical RAM with original frozen768MiB RSS/256MiB heap/duty0.5 guards. Actual baseline180-200MiB was usage, not a cap. Do not allocate memory merely to fill the budget.

Default curriculum config was not changed or launched. Its paused flag was false at final inspection, contrary to earlier unverified prose; no separate curriculum process was observed live. Do not infer a live process or authorization to resume from that flag. Old scientific auditor/history and other owner's goal remain outside this task.

65 abandoned candidate/action/test/design files remain byte-identically preserved in research/source-archives/training-latency-abandoned-2026-10-19/manifest.json and absent from active paths. No experimental engine was adopted. Native codec/pinned portable Node26 and original sparse trainer retained. No G0/transfer/Elo/Fly release claim.
