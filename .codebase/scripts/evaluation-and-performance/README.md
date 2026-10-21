# Evaluation And Performance scripts

[Scripts guide](../README.md) · [Code guide](../../README.md)

[Design and scientific boundaries](../../../documentation/design/evaluation-and-performance/README.md)

- [benchmark-circuit.mjs](benchmark-circuit.mjs)
- [benchmark-paired-circuit.mjs](benchmark-paired-circuit.mjs)
- [benchmark.mjs](benchmark.mjs)
- [evaluate-delta-heldout.mjs](evaluate-delta-heldout.mjs)
- [fly-pawn-move.mjs](fly-pawn-move.mjs)
- [profile-play-latency.mjs](profile-play-latency.mjs)
- [profile-learning-iteration.mjs](profile-learning-iteration.mjs)
- [profile-forward-phases.mjs](profile-forward-phases.mjs)
- [benchmark-forward-kernels.mjs](benchmark-forward-kernels.mjs)
- [profile-monte-carlo-iteration.mjs](profile-monte-carlo-iteration.mjs)
- [profile-forcing-shortlist.mjs](profile-forcing-shortlist.mjs)
- [profile-forcing-monte-carlo.mjs](profile-forcing-monte-carlo.mjs)
- [run-paired-delta-probe.mjs](run-paired-delta-probe.mjs)

The 2026-10-07 timing scripts are development diagnostics. The signed-magnitude cache matched one full adaptive cycle; full-graph PUCT and paired forcing-shortlist profiles now measure neural candidate cost. These are engineering measurements, not learning or reasoning evidence. See the [Monte Carlo profile](../../../research/reports/monte-carlo-neural-profile-v2-2026-10-07/README.md) and [paired shortlist profile](../../../research/reports/forcing-shortlist-paired-v3-2026-10-07/README.md).

Run from the repository root. Use the documented resource guards for experiments. Frozen protocols pin old source identities; use their archived sources for historical reproduction.

- [Licensed search comparison runner](compare-licensed-search.mjs) · [recorded replay and proof auditor](audit-licensed-search.mjs)

- [Matched assessment-cache v2 benchmark](benchmark-assessment-cache-v2.mjs) and [independent recurrence/panel audit](audit-assessment-cache.mjs): [protocol](../../../research/data/assessment-cache-v2/README.md). The v1 runner is preserved failed instrumentation.
- [V4 cached-root all-legal PUCT benchmark](benchmark-cached-root-search-v4.mjs) and [independent audit](audit-cached-root-search.mjs): [frozen protocol](../../../research/data/cached-root-search-v4/README.md).

- [FlyBench runner](flybench.mjs) and [replay auditor](audit-flybench.mjs): [usage and limits](../../../documentation/design/evaluation-and-performance/flybench.md).

- [Pinned Nova v3b raw-policy fetcher](fetch-nova.mjs) and FlyBench adapter: [scale, license, and runtime limits](../../../documentation/design/evaluation-and-performance/flybench.md#2026-10-10-nova-raw-policy-integration).

- [Complete G0 teaching-lesson profiler](profile-g0-training-pipeline.mjs) and [offline checkpoint profiler](profile-training-persistence.mjs): [registration and limits](../../../research/reports/training-latency-2026-10-19/README.md).

- [Accepted training latency result](../../../research/reports/training-latency-2026-10-19/accepted-result.md): retain the original trainer, native checkpoint codec and pinned Node26 runtime. Abandoned reuse/derived-checkpoint code and actions are preserved in the [source archive](../../../research/source-archives/training-latency-abandoned-2026-10-19/README.md), outside active code.
