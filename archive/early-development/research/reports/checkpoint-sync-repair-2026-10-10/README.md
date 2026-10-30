# Checkpoint synchronization repair and statistical correction

[2026-10-10 independent re-review: both actionable findings closed within checked scope](independent-review.md).

2026-10-10. Status: repaired and checked. Pre-fix failure is preserved; the disk regression passes all four precision/optimizer cases and unfiltered production regression passes 222/222. Statistics independently recomputed and corrected below.

The [independent audit](../independent-wasm-audit-2026-10-10/README.md) found disk checkpoint loading restores canonical magnitudes but leaves derived signed recurrent weights stale. Both the current WASM trainer and archived JS oracle exhibit the defect. Existing passing inference tests missed this shared checkpoint boundary. The WASM input recopy cannot fix an already stale signed-weight source. This report is a separate repair; independent audit and frozen latency sources/results remain unchanged.

Add one disk round-trip regression covering changed magnitudes, both precisions, SGD and Adam checkpoints, full restored inference and a subsequent update, including graph/sign invariants. Require it to fail before the fix. Then refresh derived weights once at the shared successful checkpoint-load boundary and run the regression plus unfiltered `npm test`. No full-graph experiment, dependency change or additional performance measurement is needed for this repair.

Reporting correction: the original 11-23% used nearest-rank p50, the lower-middle order statistic on four samples. It was mislabeled as a conventional median, and the builder's audit repeated the same convention. Publish conventional middle-pair medians in a dated addendum using the existing raw samples, retaining frozen statistics/gates/results. The independent auditor reports 19-40%; independently recompute and compare before publishing. Four observations cannot establish dependable tails, cold-server performance or cross-session improvement. The browser policy remains untrained; neither statistic demonstrates learning, reasoning or calibrated Elo.

Mistakes and pivots are recorded in [the journal](../../journal/experiments/2026-10-10-checkpoint-sync-repair.md). Broader historical impact depends on changed magnitudes and the specific restoration path; no blanket invalidation or retrospective correction of model results is justified yet.

## Repair evidence

[Preserved loader before repair](storage-before.mjs), [pre-fix failing regression](regression-before.txt), [passing targeted regression](regression-after.txt), [current loader](../../../.codebase/src/runtime/storage.mjs) and [new disk regression](../../../.codebase/tests/runtime/storage.test.mjs). The only production change calls the existing `refreshSignedMagnitude()` after successful checkpoint validation and before resetting gradients/returning. Save format, graph wiring, optimizer data, WASM arithmetic and teaching paths are unchanged. Synthetic checkpoints are retained at the diagnostic paths printed in the test output.

[Unfiltered production regression](full-regression.txt) passes 222/222 with zero failures in 82.603 seconds. [Verification manifest](verification.json) checks the one-line source difference, pre-fix failure, passing tests and preserved trainer/helper/raw timing hashes. Coverage includes both precisions, both optimizer checkpoint formats, previously used target buffers, restored full trajectories, optimizer state, equal next updates and graph/sign invariants. This closes the reproduced successful-load cache defect; it does not establish general correctness of every checkpoint failure mode or retroactively certify historical training/evaluations. An independent re-review remains appropriate.

## Dated statistical correction

The earlier 11-23% was nearest-rank p50 and was incorrectly labeled as a sample median. [Recomputed statistics](statistics-correction.json) use the conventional middle-pair average and agree exactly with the auditor's machine-readable results. This uses existing observations only; it supplies no additional latency evidence. The historical benchmark and builder audit remain frozen with their original statistics, gates and outcomes.

| Fixture | JS conventional median | WASM conventional median | Recorded reduction |
| --- | ---: | ---: | ---: |
| White start | 9.073 s | 6.699 s | 26.16% |
| Black after e4 | 9.942 s | 5.948 s | 40.18% |
| Six-ply opening | 19.168 s | 14.703 s | 23.29% |
| Rook endgame | 6.843 s | 5.534 s | 19.13% |

WASM satisfies the original per-fixture and aggregate inequalities under either definition. Zero-reset still fails black-after-e4: conventional medians 7.963 s JS / 8.516 s candidate, 6.94% slower. The independent audit's prose gave 8.098 / 8.660 s for that predecessor; its own JSON and the original raw data agree with the values here. Its rejection and percentage remain supported. The independent report is preserved unchanged.

Four warmed pairs per fixture on one host cannot establish reliable population tails, cold-server or cross-session performance. Sampled p95 is the observed maximum. No new performance run is needed to correct the reporting error. Stronger performance claims require a separately preregistered comparison. The browser policy remains untrained; speed is not evidence of biological learning, transfer, reasoning or calibrated Elo.

## 2026-10-10 independent-review clarification

The 19.13-40.18% statement in the table applies to the adopted WASM accumulator only. The JSON also includes the rejected zero-reset comparison: its four conventional median changes range from a 6.94% regression to a 10.16% improvement, and it still fails the black-after-e4 per-fixture gate. Its aggregate median happens to be slightly lower, which does not pass the frozen per-fixture acceptance rule. Do not summarize the full JSON as every recorded candidate improving 19-40%. This clarification changes no raw data, comparison gate or result.
