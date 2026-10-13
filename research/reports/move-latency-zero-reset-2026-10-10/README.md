# Zero-reset move-latency candidate

Status: completed full-graph comparison; exact equivalence passed, latency acceptance failed, candidate not adopted.

The shared `SparseTrainer.forward` spends its first recurrent step traversing all edges although its null initial state is identically zero. The candidate validates edge finiteness and column indices once, computes that first step directly, and leaves all later recurrence and explicit-state evaluation unchanged. It retains all activities needed by teaching and derivatives. Candidate and oracle are preserved beside this report; the active FlyBench sources are untouched.

Acceptance requires exact output, every activity buffer, gradient, and all-legal choice equivalence; no model/graph/history mutation; the same candidate count, eight steps, White-perspective readout, duty 0.5 and resource guards; and improved matched full-move latency. Smaller workloads or synthetic kernel timings cannot establish faster real fly moves. No external solution or biological change is introduced.

Before full-graph measurement, inspect authoritative processes and wait for the current 50-game invocation to become terminal. No new graph inference or training may overlap it. Do not alter its pinned sources. Synthetic checks are separate software evidence.

Three [synthetic equivalence groups](equivalence.test.mjs) pass; [raw output](synthetic-test-output.txt) records the coverage. The [benchmark](benchmark.mjs) passed syntax checking. The [frozen comparison schedule](protocol.json) and [source manifest](source-manifest.json) preserve the proposed [candidate](candidate-trainer.mjs) and [oracle](oracle-trainer.mjs).

The interim regression excluding the entire FlyBench test file passes 215/215 ([raw output](regression-without-flybench-file.txt)). An earlier name-filter attempt incorrectly ran its lock-sharing integration test: 219 passed and that test failed on the existing live lock ([preserved failed attempt](regression-excluding-live-lock-test.txt)). The candidate was not installed for those existing tests; candidate equivalence is the separate synthetic check. The [serial-guard check](serial-guard-check.txt) correctly rejected PID 5044 before graph load and created no benchmark output.

Continuation: the existing 215 software checks also pass with the **candidate** substituted through [a test-only native Node loader](candidate-test-loader.mjs), covering the existing numerical, feedback, learning, wiring and persistence fixtures ([candidate regression output](candidate-regression-without-flybench.txt)). A separate [module identity check](candidate-loader-identity-check.txt) proves active trainer imports resolve to the candidate in these isolated test processes. Production files remain unchanged. This still omits all five FlyBench tests and is not the unfiltered production regression or full-graph latency evidence.

After authoritative process inspection establishes that the current invocation is terminal, run from the repository root:

```powershell
node --max-old-space-size=256 research/reports/move-latency-zero-reset-2026-10-10/benchmark.mjs --out runs/move-latency-zero-reset-v1 --cpu-duty 0.5
```

The benchmark refuses a live competing script process before loading the graph or creating output. It verifies exact full buffers for every legal successor before separately timed alternating all-legal choices; it records raw candidate outputs, wall/CPU/rest durations, fixed identity hashes, cold load, source/dataset hashes and resources. It reports failed timing gates rather than discarding an unsuccessful candidate. Its protocol requires improved median and no worse p95 on each of four development fixtures; no speed factor is assumed.

Pending: full-graph matched benchmark, unfiltered regression, production adoption and browser action verification. See [the mistake and pivot record](../../journal/experiments/2026-10-10-move-latency-zero-reset.md).

## Queued serial verification

A hidden PowerShell waiter, PID 14008 at launch, waits on the confirmed-live FlyBench PID 5044, then runs the comparison and unfiltered `npm test` serially. The [queue record](queued-checks.json) pins both process start times and the exact commands. It performs no source adoption, lock removal or experiment restart. Inspect the actual waiter/child process and output before assuming it ran; a missing completion file alone is insufficient evidence of terminal state. Console output and a completion record will appear here. The default trainer remains unchanged.

## 2026-10-10 result addendum

The researcher stopped FlyBench after 13 completed games; game 14 was interrupted. Both tracked process handles are now absent. The waiter completed the registered comparison and full baseline regression ([exit codes](queued-checks-result.json)); all 220 baseline checks pass. It did not adopt a source change.

The [raw full-graph report](../../../runs/move-latency-zero-reset-v1/report.json) verifies exact activities on every legal successor, all measured candidate outputs/choices, fixed identities and resource guards. Peak RSS was 112.67 MiB; elapsed 481.378 s; CPU 222.109 s. Same graph, seed, eight steps, candidate counts and duty 0.5 throughout.

| Fixture | Oracle median ms | Candidate median ms | Oracle p95 ms | Candidate p95 ms |
|---|---:|---:|---:|---:|
| White start | 8106.95 | 7267.19 | 8650.43 | 8205.21 |
| Black after e4 | 7920.04 | 7959.94 | 8413.32 | 9818.33 |
| Six-ply opening | 14627.09 | 13683.67 | 16912.90 | 14870.13 |
| Rook endgame | 6706.65 | 5886.28 | 9505.70 | 8505.98 |

The frozen all-fixture median/p95 gate fails on black-after-e4. Aggregate median is 8106.95 versus 7959.94 ms, but that does not override the failed per-fixture requirement or establish a dependable faster player. Preserve this failed candidate and all raw samples; production remains the oracle. CPU and wall variation are substantial; the measurements do not uniquely identify the cause of the black-position regression.

### 2026-10-10 statistical labeling correction

Historical medians used lower-middle nearest-rank p50. The [separate dated correction](../checkpoint-sync-repair-2026-10-10/README.md) publishes conventional sample medians from unchanged raw observations. The failed black-after-e4 gate remains failed under either definition; no result, source or gate is replaced.
