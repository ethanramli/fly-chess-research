# Frozen-memory assessment cache: matched development benchmark

Terminal 2026-10-07, independently audited. Same 32-candidate development board, initial memory, full sparse graph, local rule, verified negative event and four assessment requests per condition. Each condition runs two assessments before and two after the same teaching replay. [Frozen protocol](../../data/assessment-cache-v2/README.md), [design](../../../documentation/design/evaluation-and-performance/assessment-cache.md).

| Condition | Actual candidate/replay presentations | Wall time excluding shared setup | CPU time | Invocation peak RSS |
|---|---:|---:|---:|---:|
| Uncached | 129 | 46.93 s | 24.23 s | 109.65 MiB |
| Cached | 65 | 22.90 s | 11.89 s | 115.02 MiB |

Caching avoids 64 repeated candidate presentations and reduces this workload's wall time by 51.2%. Shared setup was 0.669s. Both run heap256/duty0.5/RSS768/free256 guards; peak RSS is cumulative within the invocation and cannot isolate cache allocation. Forward/encode/pace phase times are nested in assessment elapsed time. Single sequential uncached-then-cached order has warm-up/order effects; the avoided presentation count and exact outputs are stronger evidence than a general speed multiplier.

All eight all-legal panels, both teaching receipts and resulting memories match exactly. Cache records two hits, two misses and one invalidation after teaching. Fresh replay still invokes the neural model and produces local KC/DAN activity. Independent [audit](audit.json) passes one certificate, all panel coverage/perspectives and 1,740 local gain recurrences; it verifies atomic pending memory/receipt evidence against acknowledged results. `AUDITED.json` binds report and audit hashes. All119 software tests pass, including history/order/task identity, mutation-safe outputs and invalidation after teaching/restoration/fixed state changes.

No new learning efficacy or transferable reasoning result: both modes replay the same already audited training event. Cached repeats are engineering summaries and cannot count as fresh-activity repeatability or retention evidence. The cache is a separately available module; existing frozen experiment runners/protocols remain unchanged. Integration into a new learning run must preserve fresh scientific gates and evaluate matched time to quality separately.

Earlier v1 instrumentation failed before panels or feedback because it tried to replace the encoder's frozen method. [Failure evidence](../assessment-cache-v1-2026-10-07/failure.txt), original source and protocol remain preserved. V2 wraps the encoder without mutation. Source and input hashes are in `report.json` and protocol.
