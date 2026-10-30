# Stockfish target feasibility v1

2026-10-07 collection terminal; independent audit passes all 124 mate certificates, legal coverage, score perspective, preserved neural predictions and monotonic choice ordering. Hash-bound `COMPLETE.json` reverified. [Frozen protocol and command](../../data/stockfish-target-feasibility-v1/README.md).

This is a real-engine, record-only teacher-target probe on two inspected development boards, plus retrospective comparison to existing neural activations. It does not train the fly with Stockfish and does not test transfer. Per-candidate JSON records preserve raw UCI output, independent mate certificates, score perspective and fixed provisional neural predictions.

| Development board | Nodes per candidate | Exact usable targets / legal moves | Deadline failures tied with successful move at maximum WDL utility |
|---|---:|---:|---:|
| Queen c4, rook f8 | 10,000 | 20/32 | 8 |
| Queen c4, rook f8 | 50,000 | 23/32 | 10 |
| Queen b3, rook e8 | 10,000 | 18/30 | 11 |
| Queen b3, rook e8 | 50,000 | 21/30 | 11 |

Both certified success moves (`c4g8`, `b3g8`) have actor utility 1 and mate scores. Numerous deadline failures also have utility 1 because Stockfish estimates a full-game win. Thus full-game WDL **fails the registered task-discrimination gate**. Forty-two latest scores were bounded/incomplete and remain unavailable; no fallback to stale exact output or teaching occurred. Increasing node budget does not remove the observed ties. This does not reject Stockfish-assisted evaluation learning for appropriately defined tasks; it rejects using this WDL target alone to teach these short-mate criteria.

The prior outcome-feedback memories do not improve the provisional retrospective WDL mean squared error on these inspected panels. That transform uses arbitrary fixed scale 1; this is not a calibrated-value result and is not a causal Stockfish-training comparison. See [audit](audit.json) for all values and budget sensitivity. No useful learning/transfer claim follows.

Collection: 159.84 s wall, sampled combined parent/engine RSS maximum 311.87 MiB, heap256/duty0.5/free-memory guard. Total measured search-request latency was 4.198 s over 124 analyses; median 22.04 ms, maximum 147.89 ms. Most collector elapsed time was outside those requests, including conservative process-memory checks. These are teacher-probe timings, not fly move latency or an optimization comparison. The earlier neural multi-context invocation took 2,923.14 s across four conditions/3,977 presentations; it is a different workload.

Original pinned auditor failed strict `+0` versus `-0` after JSON serialization. [Failure note](audit-first-failure.txt) and original auditor remain preserved. A separate [corrected auditor](../../../.codebase/scripts/puzzle-learning/audit-stockfish-targets-json-zero.mjs) canonicalizes zero and explicitly excludes unavailable pairs from budget sensitivity; its source hash is recorded in `audit.json`. No protocol, receipt or learner change. All 116 software tests pass for the new target interface.

Next design: compare fly-chosen and teacher-reference consequences with an explicitly task-aware target, preserving unknown handling and unaided evaluation. Cache pinned teacher analyses and profile one actual neural puzzle round before optimizing. Relative WDL regret alone would still tie these saturated wins.
- [Stockfish has not yet improved learning direction or training speed](../documentation/design/puzzle-learning/stockfish-value-teaching.md).
