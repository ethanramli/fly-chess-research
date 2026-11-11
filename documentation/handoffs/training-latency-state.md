# Training latency handoff: repeatability complete

2026-10-19. Original optimization goal remains closed at researcher request. A later separately authorized three-repeat consistency check is now complete; no further graph work is pending.

[Three-repeat report](../../archive/early-development/research/reports/training-latency-2026-10-19/repeatability-v1/README.md) and [machine-readable summary](../../archive/early-development/research/reports/training-latency-2026-10-19/repeatability-v1/summary.json).

Trials: 447.550 -> 187.664 s (58.069%), 429.130 -> 172.096 s (59.897%), and 456.159 -> 184.727 s (59.504%). The mean gain was 59.156%, the median was 59.504%, and the range was 58.069% to 59.897%. All three independent integrity and timing gates passed; the run recorded 6,552 publications, 3,276 pairs, and 1,638 historical receipt instances. The historical 69.126% ±5 percentage-point consistency band failed. Keep the historical evidence unchanged. The replicated gain for this selected workload is about 59%. No claim is made about whole-curriculum timing or RAM causality.

All 12 timed batches and three audits ran serially through `python actions/repeat_training_latency.py` and the existing curriculum actions. Driver tool 32572 exited with code 0. The final audit, 8668, is terminal. Registration: `research/data/training-latency-repeatability-v1/registration.json`. The frozen runner, protocol, and binaries were unchanged; there was no tuning, dropped trial, or retry. The summary action produced phase and cold totals separately for each trial. Source states and receipts match.

The researcher added 8 GB of physical RAM and authorized a 2 GB process budget for future unfrozen work. The AGENTS resource text was updated. All three repetitions used the added RAM and retained the original frozen limits of 768 MiB RSS, 256 MiB heap, and duty 0.5. The actual baseline of 180–200 MiB was measured usage, not a cap. Do not allocate memory just to use the budget.

The default curriculum config was not changed or launched. Its paused flag was false at the final check, contrary to earlier unverified prose. No separate curriculum process was live. Do not infer a live process or permission to resume from that flag. Old scientific audits and history, along with another owner's goal, remain outside this task.

The 65 abandoned candidate, action, test, and design files remain byte-identically preserved under `research/source-archives/training-latency-abandoned-2026-10-19/`, as listed in `manifest.json`; they are absent from active paths. No experimental engine was adopted. The native codec, pinned portable Node 26, and original sparse trainer remain. No gate, transfer, Elo, or Fly release claim is made.
