# Independent audit of FlyChess WASM adoption

2026-10-10. Audit requested by the researcher using both attached instructions. This report assesses the current implementation and preserved evidence. It makes no implementation repairs. Paths below are relative to this report; line numbers identify the inspected current sources.

## Verdicts and acceptance

| Claim | Verdict |
| --- | --- |
| Production uses the proposed WASM accumulator | Verified. The production trainer is the frozen candidate with only its import relocated. |
| Numerical equivalence on the four full-graph development positions | Verified independently for all 92 legal successors: predictions, every trajectory/activity buffer, drive and leak coefficients match the JS oracle and the preserved hashes exactly. |
| General implementation correctness, including checkpoint restoration | Rejected. A real checkpoint load leaves recurrent signed weights stale. This is inherited from the archived oracle, rather than introduced by WASM. |
| 221 production tests pass | Verified by a new unfiltered, loader-free npm run: 221 passed, zero failed. These tests do not cover the disk checkpoint defect. |
| HTTP production move application succeeds | Verified independently for both colours, exact move/score/FEN/history/PGN, wrong-turn rejection, invalid human move rejection and concurrent-new-game rejection. |
| Published 11–23% warmed “median” reduction | Reproduces the lower-middle nearest-rank p50 calculation. It is not the conventional middle-pair sample median. Conventional medians give 19–40% and still pass the same per-fixture inequalities. |
| Dependable speed improvement across positions, sessions or cold requests | Not established by four pairs per fixture on one host. The bounded recorded comparison passes; a latency guarantee does not. |
| Biological learning, reasoning, transferable chess evaluation or measured Elo | Not established by this optimization. The browser model is untrained and does not receive teaching or update persistent memory. |

**I would not accept the current build as generally verified across inference and checkpoint restoration.** Finding 1 is a correctness blocker; Finding 2 blocks accepting the published statistic as a conventional median. I would accept the narrower WASM integration result for the checked untrained browser workloads, subject to those explicit limits. Neither biological validation nor a future 2000-Elo result is a prerequisite for accepting this engineering result. A dependable general speed claim would additionally require Finding 3's follow-up.

## Findings, ordered by severity

### 1. High: checkpoint restoration silently retains old recurrent weights

**Observed evidence.** [storage.mjs:41–61](../../../.codebase/src/runtime/storage.mjs) loads canonical parameter arrays and resets gradients, but never calls `refreshSignedMagnitude`. [trainer.mjs:80,101–104](../../../.codebase/src/supervised-baselines/trainer.mjs) forwards the separate `signedMagnitude` array to the accumulator. [sparse-accumulator.mjs:72–81](../../../.codebase/src/runtime/sparse-accumulator.mjs) faithfully recopies that stale array. The claim that recopying prevents stale inference after a checkpoint change is consequently too broad.

The [independent production probes](production-probes.json) use the real `saveCheckpoint`/`loadCheckpoint` functions on a small signed graph. Loaded canonical parameters match the donor exactly, but output 0 is **0.0018844943260774016**, versus the donor's **0.002562297973781824**. The loaded signed weights remain approximately `[0.55183,-0.34817,0.34817,-0.55183]` while the restored magnitudes are `[0.05,0.08,0.11,0.14]`. Refreshing the derived weights on the disposable audit object restores both predictions exactly. The archived JS oracle reproduces the same failure.

**Practical consequence.** [evaluate-position.mjs:22–24](../../../.codebase/scripts/supervised-baselines/evaluate-position.mjs) and [evaluate-split.mjs:19](../../../.codebase/scripts/supervised-baselines/evaluate-split.mjs) infer immediately after loading, so a checkpoint that changed recurrent magnitudes can be evaluated with the wrong recurrent core. Resumed supervised training can similarly start from unsynchronized forward weights. This audit does not retroactively invalidate every historical result; outcomes depend on whether magnitudes actually changed and which restoration API was used. Local physiological memory restoration through `setMagnitude` is a different path and passed the synthetic comparison.

**Confidence:** confirmed by a disk checkpoint reproducer in current production and the archived oracle. The four untrained timing fixtures do not load checkpoints, so this does not invalidate their recorded equivalence.

**Smallest decisive follow-up:** in a separate repair, synchronize derived weights at the shared checkpoint-load boundary, then repeat this donor/load/forward comparison with changed magnitudes, both precisions, SGD and Adam checkpoints, and a resumed next update. No repair was performed during this audit.

### 2. Medium: the reported “median” is an undisclosed lower-middle statistic

**Observed evidence.** [benchmark.mjs:69–72](../move-latency-wasm-2026-10-10/benchmark.mjs) selects `sorted[ceil(n*.5)-1]`. For four samples that is the second order statistic; the conventional sample median averages the second and third. [result-audit.mjs:11–15](../move-latency-wasm-2026-10-10/result-audit.mjs) repeats the same convention. Its agreement is evidence of arithmetic consistency, not independent validation of the statistic's labeling. The zero-reset predecessor uses the same convention.

**Practical consequence.** The published 11.25%, 23.18%, 21.45%, 16.52% reductions are reproducible nearest-rank p50 reductions, but readers expecting ordinary sample medians receive a different summary. [recomputed.json](recomputed.json) contains both definitions, raw values and paired outcomes. The correction does **not** reverse adoption: WASM still passes every per-fixture median/max inequality, and zero-reset still fails on black-after-e4.

**Confidence:** confirmed from all 64 recorded samples across the two runs.

**Smallest decisive follow-up:** append a dated reporting correction naming the historical nearest-rank statistic, or publish conventional medians beside it without overwriting frozen reports or changing gates. This audit supplies the latter values below; it does not alter the original benchmark.

### 3. Medium, claim scope: the sample does not establish dependable tail or cold performance

**Observed evidence.** Each fixture has one explicit warmup pair and four measured pairs. Before that warmup, every successor has already been evaluated by both methods for correctness; these are substantially warmed computations. Measured pair order is oracle/candidate, candidate/oracle, oracle/candidate, candidate/oracle. Fixtures run in a fixed sequence in one process, using one candidate-created model and substituting the archived `forward` method. Candidate scratch remains resident during oracle measurements. This isolates forward-path latency reasonably, but does not compare fresh process startup or independent complete baseline allocations.

Nearest-rank p95 on four samples is the maximum. WASM wins 15/16 paired elapsed comparisons, including 4/4 in three fixtures and 3/4 in the rook endgame. Large within-fixture variation remains. Alternation limits simple order bias but does not isolate scheduler, temperature, background load or session effects. The implementation records CPU, forward, rest and elapsed time separately; overall comparison CPU/elapsed includes correctness passes, warmup, identity hashing and load overhead.

**Practical consequence.** Accept “lower warmed latency in this recorded comparison.” Do not treat the sample maximum as a reliable population tail estimate or translate the result into a fresh-server, browser-visible, stronger-play or time-to-learning guarantee. The source reports already acknowledge much of this limitation; no evidence of a hidden latency guarantee was found.

**Confidence:** high about the design and observed sample; general performance remains unverified.

**Smallest decisive follow-up:** preregister repeated independent sessions with balanced order and enough observations for an uncertainty estimate, retaining all failures. Measure cold initialization and first request against an equivalent fresh JS server separately if that claim is desired. Keep model, candidates, graph, pacing and resource guards matched.

## Recomputed performance

These are conventional medians computed directly from [the original 32 WASM samples](../../../runs/move-latency-wasm-v1/samples.jsonl), not new timing measurements. Seconds are rounded here; [recomputed.json](recomputed.json) preserves exact milliseconds.

| Fixture | Legal candidates | JS median s | WASM median s | Reduction | JS / WASM sampled maximum s | JS / WASM CPU median s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| White start | 20 | 9.073 | 6.699 | 26.16% | 12.245 / 7.220 | 4.328 / 3.125 |
| Black after e4 | 20 | 9.942 | 5.948 | 40.18% | 12.840 / 6.619 | 4.664 / 2.891 |
| Six-ply opening | 33 | 19.168 | 14.703 | 23.29% | 21.476 / 17.858 | 8.656 / 6.641 |
| Rook endgame | 19 | 6.843 | 5.534 | 19.13% | 12.221 / 9.865 | 3.281 / 2.625 |

The timer surrounds `chooseFlyMove`, including legal generation, successor application/undo, encoding, neural forwards and duty-0.5 rests. It excludes graph loading, source hashing, untimed state equality and the final application of the selected move. It is warmed selection latency, not raw neural CPU or complete browser action time. The original run reports 465.392 s total elapsed, 222.344 s total CPU and 135.391 MiB peak RSS; those totals include other work and must not be compared to a single move. Guard checks occur around candidate pacing, not continuously within a synchronous forward. End free memory is 991.863 MiB; no continuous minimum-free-memory trace is available.

Historical loader-free HTTP requests are 7.209 s and 10.007 s; staged requests are 17.396 s and 11.001 s. This audit's independent fresh-server requests are **7.504 s black-after-e4** and **8.374 s white-start**. All include the HTTP response and selected action application. None has a matched cold JS baseline. There was no rendered-browser or visual action-time measurement.

## Implementation trace and numerical scrutiny

The server checks the graph hash, creates `createUntrainedFly(graph,47)`, and calls [chooseFlyMove](../../../.codebase/src/evaluation-and-performance/fly-policy.mjs) from `/api/fly-move`. The policy enumerates every chess.js legal successor, applies it hypothetically, encodes its FEN and calls production `SparseTrainer.forward`. `finally` undoes the candidate even if inference fails. Output 0 is interpreted in White's perspective: White maximizes, Black minimizes, and strict comparisons preserve the first generated move on ties. Only after selection does the server apply the returned move and publish score/history/PGN. The original Chess object preserves actual history and draw detection; the neural FEN encoding itself is a symbolic interface, not a proof of learned history reasoning.

The shared `thinking` flag serializes server requests while pacing yields. Independent probes confirm failed/nonfinite inference restores the caller's board, HTTP wrong-turn and illegal-action rejection, both-colour perspective, ties and real move history. Independent HTTP checks verify both colours against the already checked raw successor scores. [http-probe.json](http-probe.json) preserves full responses; [http-owned-process.json](http-owned-process.json) records the owned server's terminal exit. The page text was fetched; visual layout is unverified.

The actual production generator emitted a **437-byte** module, SHA-256 `55399ce373f7746625e7cd97f07617d590833ed281b8d67c3443d5a4a962fa26`, preserved as [generated-accumulator.wasm](generated-accumulator.wasm). An independent byte decoder produced [binary-disassembly.json](binary-disassembly.json): `sum32` loads f32 and promotes to f64; `sum64` loads f64. The only edge multiplication is `f64.mul` followed immediately by separate `f64.add`, inside the serial increasing-edge loop. No SIMD, fused multiply-add or thread instructions occur. Finite f32 promotion preserves the value, and ordinary multiply/add have separate rounding semantics under the [primary numeric specification](https://webassembly.github.io/spec/core/exec/numerics.html); opcode identities were checked against the [instruction index](https://webassembly.github.io/spec/core/appendix/index-instructions.html).

The fixed linear memory stores aligned CSR row/column int32 arrays, precision-matched weights/previous/drive and f64 result sums. The byte layout rejects over 128 MiB scratch; the memory's maximum equals its initial page count, so growth cannot invalidate the typed views. Each forward recopies rows, columns, signed weights and drive; each step recopies previous activity. Results are reused on the next call, but the production caller consumes them immediately and never retains them as a trajectory. Unsigned comparisons reject negative/high columns and invalid row bounds. JS shape checks require first/last offsets. Native WASM bounds remain an additional trap boundary. No new stale graph/state copy was found within the validated int32 graph domain.

The f64 sums enter the unchanged JS finite check, tanh/ReLU, typed activity/state writes and readout. Synthetic checks include cancellation, signed zero, empty rows, graph/state refresh, both precisions, 1/2/8 steps, Float64 explicit initial state, SGD/Adam gradients and post-update forwards, local-memory snapshot restoration, invalid indices, NaN/Infinity weights/drives/readout and fixed memory growth failure. Full graph checks use float32, null initial state, eight steps, 134,209 neurons and 2,700,513 edges. All 92 legal successors match every state element and the original hashes. The [independent replay](full-graph-replay.json) used 179.477 MiB peak RSS, 75.222 s elapsed and 37.578 s CPU at duty 0.5.

This supports finite valid-domain equivalence in the inspected arithmetic path and tested cases. It does not establish arbitrary malformed-object equivalence, identical partially mutated buffers after every exceptional exit, NaN payload bit identity, every possible graph/configuration or universal physiological equivalence. The disk checkpoint failure demonstrates why equality to an oracle can preserve a shared defect.

## Failed predecessor, provenance and pivots

[Zero-reset raw evidence](../../../runs/move-latency-zero-reset-v1/report.json) remains rejected and unadopted. Its black-after-e4 conventional median is 8.098 s JS versus 8.660 s candidate (6.94% slower); sampled maxima are 8.413 versus 9.818 s. Three other fixtures improve, but neither those results nor an aggregate statistic overrides the per-fixture gate. WASM retains the same fixtures, model, seed, exposure, warmup/pair count, duty, resource thresholds and median/max inequalities. No changed behavioral gate or removed failing fixture was found between the two latency protocols.

The [latency journal](../../journal/experiments/2026-10-10-move-latency-zero-reset.md) preserves the wrong interim test filter, live-lock test failure, corrected file exclusion, initial baseline-only test coverage, loader-based candidate coverage, zero-reset rejection, candidate-staging newline failure, source-drift regression rejection/retry, HTTP checks and UTF-16 completion-collector mistake. Raw candidate regression includes 220/221 on the failed attempt; successful production TAP is genuinely 221/221. Source drift was reported as a provenance failure and was not repaired by disabling its guard. These records are consistent with the supplied outputs; exhaustive recovery of unrecorded actions cannot be established from a worktree.

The independent source audit confirms current production is exactly the archived WASM candidate after import relocation; the helper hash and completion evidence hashes match. The benchmark's historical active-trainer hash necessarily differs after adoption. Its printed staged launch command therefore cannot simply rerun in the adopted worktree: it asserts the active trainer is still the oracle before loading the graph. Reproduction needs an isolated checkout of the pinned stage, or a separately registered harness. Zero-reset's package manifests also differ now following later dependency work; the saved hashes alone do not reconstruct those earlier manifest contents. Neither observation establishes that workloads differed within the completed run.

No evidence found supports selective removal of a latency failure or a retroactively relaxed per-fixture gate. File timestamps and preserved JSON are consistent with staging before measurement, but this audit cannot independently establish immutable external preregistration chronology. The statistical definition was already shared by both runs; it was not introduced to rescue WASM. The audit's own mistakes, failed sandbox regression and corrected inspections are preserved in [audit-log.md](audit-log.md).

## Scientific validity, assessed separately

The browser/FlyBench policy uses random initialized input/head parameters and anatomically initialized recurrent magnitudes. In this path there is no checkpoint, reward delivery, local-memory object, backward call or parameter update. Each candidate starts from zero activity. HTTP history storage and retained scratch buffers are not acquired neural memory. Output 0 is an engineered, uncalibrated White-perspective readout; its numerical sign is not a learned chess-value scale.

The repository does contain distinct learning paths. Supervised SGD/Adam alters parameters by externally defined targets and derivatives; it is a comparison baseline. [Gamma4Memory](../../../.codebase/src/neural-learning/mushroom-body.mjs) and [ReversalMemory:74–104](../../../.codebase/src/neural-learning/reversal-memory.mjs) retain local gains and apply them to declared existing KC-to-MBON edges through `setMagnitude`. [RateTimingMemory:37–77](../../../.codebase/src/neural-learning/rate-timing-memory.mjs) retains gains plus KC and short/long modulatory traces, integrates fixed-reference rates from full trajectories and snapshots/restores those states. [TemporalFeedbackSession](../../../.codebase/src/puzzle-learning/temporal-feedback-session.mjs) binds unaided all-legal assessments to certified experiences, rechecks each frame and preserves memory/episode/pending lesson state. Its plan skips independently unknown consequences. Those mechanisms are not invoked by the audited browser policy.

The learning paths declare substantive biological assumptions: coarse cell/hemisphere mapping without synapse-coordinate compartment/receptor reconstruction; fixed modulatory sign; baseline-subtracted/scaled rates; unfitted gain bounds and rates; engineered stimulation and timing; frame-held gains rather than continuously coupled physiology; symbolic input bypassing eyes; engineered action readout. Local DAN activity/filter scalars are not measured dopamine release. Computational deterministic persistence is not measured biological retention or consolidation. A literature-motivated equation and preserved neuron identities do not validate those assumptions.

The latest inspected [adaptive temporal-loop raw audit](../../../runs/adaptive-temporal-loop-v1-resumed/audit.json) explicitly reports `passed:true` for execution audit but `usefulChoice:false`, `causalChoice:false`, `adaptiveAdvantage:true`, and no transfer evidence. That distinguishes verified recorded execution from failed choice gates. Prior familiar-repair/association outcomes are outside this audit's independent neural replay; they cannot be promoted to new transfer evidence here. No independently audited disjoint/counterfactual reasoning result, calibrated Elo predictor or human comparison is supplied by this latency package. Faster unchanged computation cannot establish any of them; current failures also do not prove universal incapacity.

## Coverage, limitations and preserved evidence

All six requested scrutiny areas have been addressed: production move/application path; generated arithmetic and memory; real implementation equivalence, updates and checkpoint restoration; raw performance/resource/source analysis; rejected predecessor and recorded pivots; separate scientific assessment. [audit-log.md](audit-log.md) records the audit sequence. [recompute.mjs](recompute.mjs), [production-probes.mjs](production-probes.mjs), [binary-and-edge-probes.mjs](binary-and-edge-probes.mjs), [full-graph-replay.mjs](full-graph-replay.mjs) and [http-probe.mjs](http-probe.mjs) preserve runnable checks. Their outputs are new evidence, not replacements for historical reports.

The new regression's first sandbox attempt failed `spawn EPERM`, with raw [failure](production-regression.txt) preserved; an escalated [retry](production-regression-unsandboxed.txt) passed 221/221. Authoritative process checks found no graph experiment before replay; the replay handle became terminal before HTTP. The owned HTTP server was stopped and a final process check found only Codex Node processes. No other run was stopped, restarted or repaired.

No repeated timing campaign, visual browser inspection, full-graph float64/explicit-state derivative campaign, new training, biological validation, exhaustive historical receipt re-audit or final transfer-family evaluation was run. Those are explicitly unverified, rather than passed. The implementation and frozen reports were preserved. Checkpoint correctness and statistic labeling remain unresolved findings for a separately authorized repair.
