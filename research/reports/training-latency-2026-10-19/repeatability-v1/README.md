# Three-repeat latency verification

Completed 2026-10-19 using the existing Python actions, frozen runner and independent auditor. All three repetitions passed integrity and the original timing gates.

**The observed gain clusters around 59%, rather than the historical 69.1%.** The predeclared test requiring every repetition to fall within five percentage points of 69.1% failed. No repetition was excluded, restarted or used to tune the implementation.

## Selected complete lessons

Each row repeats the same four-batch ABBA experiment: 24 matched measured lessons per version across two rounds, plus the original warm-ups. Timings include assessment, neural feedback, memory updates, evidence, both durable publications and pacing. These are not whole-curriculum durations.

| Repetition | Baseline | Optimized | Less elapsed time | Independent audit |
|---|---:|---:|---:|---|
| 1 | 447.550s | 187.664s | 58.069% | [Passed](trial1/timing-audit.json) |
| 2 | 429.130s | 172.096s | 59.897% | [Passed](trial2/timing-audit.json) |
| 3 | 456.159s | 184.727s | 59.504% | [Passed](trial3/timing-audit.json) |

Mean reduction: **59.156%**. Median: **59.504%**. Range: **58.069–59.897%**, a spread of **1.828 percentage points**. Sample standard deviation: **0.962 percentage points**. Three repetitions describe this observation window; they do not establish a statistical guarantee across machines or days.

## Cold process totals

These include setup, checks and warm-up in the separate benchmark processes.

| Repetition | Baseline | Optimized | Less elapsed time |
|---|---:|---:|---:|
| 1 | 490.738s | 212.221s | 56.755% |
| 2 | 471.233s | 195.716s | 58.467% |
| 3 | 500.836s | 208.653s | 58.339% |

## Neural forward time alone

| Repetition | Baseline | Optimized | Less forward time |
|---|---:|---:|---:|
| 1 | 63.532s | 57.206s | 9.957% |
| 2 | 60.370s | 50.152s | 16.925% |
| 3 | 64.614s | 54.015s | 16.403% |

The larger end-to-end gain chiefly comes from checkpoint publication: baseline phase totals were 213–224s per repetition, versus 27–29s optimized. Forward-only time excludes setup, hashes, persistence and rest. Phase timers can nest and must not be added arbitrarily.

## Environment and interpretation

The researcher reported adding 8 GB physical RAM during the verification; launch logs already showed roughly 9 GB free. All three new repetitions ran in this upgraded environment. Preserve the historical 69.126% result as a measurement in its original environment; use the replicated approximately 59% figure when describing this current selected workload. The benchmark retained identical source/runtime hashes, parents, graph, feedback, choices and controls. Implementation and runtime binaries were unchanged.

Observed optimized totals of 172–188s are lower than the historical 282s. The baseline also changed substantially, so a lower relative percentage does not imply a longer optimized run. These observations do not isolate the causal effect of additional RAM.

The new authorized ceiling is 2048 MiB RSS for future unfrozen work, recorded in `AGENTS.md`. This frozen comparison kept heap 256 MiB, RSS ceiling 768 MiB, at least 256 MiB free memory, requested duty 0.5 and both synchronized publication barriers. The default curriculum configuration was not edited or launched. Closeout inspection found its `paused` flag false; older prose describing that flag as paused was an unverified assumption. No separate curriculum process was observed running.

## Evidence

- [Registration and predeclared consistency band](../../../data/training-latency-repeatability-v1/registration.json).
- [Three-trial machine-readable summary](summary.json).
- Per-trial phase totals and provenance: [1](trial1/total-times.json), [2](trial2/total-times.json), [3](trial3/total-times.json).
- Across all three independent audits: **6,552 publications**, **3,276 matched checkpoint pairs**, **1,638 historical receipt instances**. Recorded states, memories and receipts match their counterparts and historical evidence.
- Every child command, source/runtime/graph identity, CPU measurement, peak RSS and raw log is retained in the trial reports, source snapshots and `runs/python-actions/` handles.

No G0, useful chess transfer, biological validation or Elo result follows from these engineering timings. The optimization search remains closed; the requested three-repeat check is complete.
