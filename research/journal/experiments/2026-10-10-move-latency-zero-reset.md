# 2026-10-10: Faster thought-to-move computation

The researcher requests faster fly moves. Trace inspection finds that both the browser and FlyBench use `chooseFlyMove`, which evaluates every legal successor with `SparseTrainer.forward` and paces each candidate at duty 0.5. No fixed move delay or learned motor-output stage was found in that path. This request is an engineering latency task; it does not establish faster biological signaling or learned reasoning.

## Active-run constraint and direction

Authoritative process inspection confirms PID 5044 is running the frozen 50-game FlyBench invocation. Eight games were published, with CPU and move-log progress during inspection. Preserve its pinned sources and keep full-graph runs serial. Stage a proposed trainer change outside the active source tree, check it on synthetic fixtures, then measure full-graph all-legal moves only after the live invocation is terminal. Do not interrupt or restart it because a wait expires.

Candidate hypothesis: a null initial state makes every activity at t=0 zero, so the first recurrent step can validate finite edge weights and valid column indices without multiplying and adding all their zero contributions. Preserve the original recurrence for explicit initial states and subsequent steps, all time-step buffers, parameter identities, fixed topology/signs, input validation and pacing. Exact activity/output/gradient/choice equivalence and measured move-latency benefit are acceptance requirements. This is an engineering identity, with no new external biological claim or mechanism.

The next feedback-enabled scientific experiment remains a separately preregistered informative consequence-feedback learning condition with matched controls, following the existing plasticity diagnosis. This latency task is not a diagnostic learner round and supplies no learning progress.

## Inspection mistakes and correction

Initial batched inspection printed the entire large current-status/state files and a very large dirty-worktree listing; output was truncated. A search also used nonexistent `src/browser-player`, corrected to the existing `src/browser`. No source or experiment changed. Subsequent inspection reads targeted fields and actual call-path files. The old September latency report is historical locating evidence, not a current speed measurement or baseline for a comparative claim.

## Pending evidence

Candidate, test output, benchmark protocol and eventual full-graph measurements are indexed in [the engineering report](../../../archive/early-development/research/reports/move-latency-zero-reset-2026-10-10/README.md). Production adoption and a speedup claim remain pending until those requirements pass.

## Synthetic check and prelaunch review

Three synthetic test groups passed: exact full buffers/derivatives/post-update outputs across both precisions and 1/2/8 steps with null/zero/nonzero initial states; preserved numerical and graph-column rejection; and identical all-legal scores/choices/pawn choices/tie order while preserving actual history across seven chess fixtures. These are small constructed graphs, not a full-graph result or proof of a speedup. The standalone benchmark passed syntax checking.

Prelaunch review caught an imprecise correctness-pass pacing calculation: it timed only the candidate and guessed a factor of two. Replaced that guess with measured elapsed time for both evaluations and hashes before resting. No full-graph run used the incorrect draft. Process JSON was also made tolerant of a single process row. Full `npm test` remains due before adoption: its real-Stockfish integration test acquires the same repository FlyBench lock as the live experiment, so launching that test now would conflict. Run the remaining software tests with that one named integration test excluded, then require the unfiltered suite after terminal state.

### Regression-filter mistake

The attempted name-pattern exclusion did not exclude the real-Stockfish integration test: all 220 tests ran, with 219 passing and that test failing on `EEXIST` for the live FlyBench lock. Raw failure is preserved in `regression-excluding-live-lock-test.txt`; that filename describes the attempted filter, not its actual coverage. No competing graph loaded, the live lock was not removed and PID 5044 remains live. The reason the name filter failed is unresolved; do not infer a learner or candidate defect from this harness collision. Correction: explicitly omit the entire `flybench.test.mjs` file for the interim regression. The full suite, including its five FlyBench checks, remains required after terminal state.

Corrected interim regression passed 215/215. The candidate has not replaced the live trainer, so those tests establish unchanged existing-path software status, while the separate equivalence check covers the proposed implementation. Intentional benchmark preflight rejection independently named live PID 5044 and created no run directory. At the latest check nine games were published; CPU and move-log progress continued. No speedup or completion claim is made.

## Serial follow-through queued

Started a hidden native PowerShell waiter (PID 14008, authoritative process existence confirmed) on the live PID 5044. After that handle terminates it invokes the registered guarded benchmark and then unfiltered `npm test`, preserving separate console files and exit codes. Exact commands and target/monitor creation times are saved in `queued-checks.json`. No adoption or restart is automatic. Review the raw benchmark/equality/resource gates before replacing the production trainer, rerun full regression with the adopted candidate and verify browser move application. If the candidate fails, retain all evidence and diagnose before a new proposal; do not claim the task complete from a queued command. The scientific feedback-enabled next step is unchanged.

## Continuation: test candidate against existing learning contracts

The previous goal turn made concrete progress (staged implementation, synthetic evidence and queued guarded verification), followed by a verified wait. Authoritative PID 5044 and waiter 14008 remain live; ten games are published with ongoing played moves. No result file or waiting timeout is interpreted as termination.

The initial 215-test interim regression exercised the unchanged active trainer, not the candidate. Add a seven-line native Node loader that substitutes only the candidate's trainer module URL in test processes. This permits the existing numerical, feedback, unknown-handling, wiring, learning and persistence fixtures to exercise the candidate while all active files remain pinned and untouched. Explicitly omit the FlyBench test file to avoid its live-lock collision. This is synthetic/software verification, not a new graph experiment or changed biological learning mechanism. Full production regression and actual browser application remain due after measured adoption.

Candidate regression passed all 215 included checks in 26.968 seconds. An independent module-identity assertion confirms the loader substitutes Candidate rather than Oracle. Raw TAP and loader stdout/stderr are preserved in the report directory. This closes the initial existing-test candidate-coverage gap but leaves full-graph timing, unfiltered production regression, adoption and browser application unverified. No new mistake or pivot was needed during this check.

## 2026-10-10: First candidate fails latency acceptance

On resume, authoritative target/waiter handles are absent and their completed outputs exist. Current status and terminal FlyBench results show the researcher intentionally stopped after 13 games; do not restart the 50-game invocation or infer completion of all 50. The queued benchmark completed all four development fixtures; exact activities/outputs/choices and fixed parameter/graph hashes pass, with RSS 112.67 MiB, elapsed 481.378 s and CPU 222.109 s. Full baseline regression passes 220/220.

The zero-reset candidate fails its frozen latency gate: black-after-e4 median 7959.94 ms versus oracle 7920.04 ms, p95 9818.33 versus 8413.32. Three other fixtures improve, but those improvements and the aggregate median do not permit adoption under the registered gate. Substantial CPU/elapsed variation is observed; scheduling or thermal effects are hypotheses, not isolated causes. Preserve raw comparison and reject this candidate as a dependable production speedup.

Pivot: measured per-move forward recurrence still dominates (seconds, versus tens of milliseconds for encoding/ranking/administration). The prior archived phase profile also places almost all synchronous forward time in sparse recurrence; leak coefficient caching targets only about one millisecond per pass and is unlikely to resolve this bottleneck. Check existing local native/WASM tooling before proposing one bounded exact sparse-accumulation kernel, preserving edge order, topology/signs, complete state and pacing. No new dependency, backend implementation or graph run is authorized by this evidence alone beyond the researcher's existing speed request and resource limits; first define a small checked kernel and its memory bound, then register a new matched comparison without changing v1 gates.

### WASM staging newline mistake

The first candidate-staging command assumed CRLF when replacing the recurrence block. Its uniqueness guard rejected the pattern before writing any source/candidate file; a following test invocation consequently found no test file. Only the empty destination directory was created. Inspect actual newline bytes, normalize the new candidate string for replacement, and preserve the original oracle bytes unchanged. No active trainer or frozen result was modified.

### WASM candidate regression: provenance failure preserved

All three synthetic equivalence groups passed for the new WASM candidate. A full loader-isolated `npm test` attempt then passed 220 of 221 checks; the real-Stockfish synthetic-player resume check rejected `Resume protocol/source/snapshot mismatch`. Do not relax that guard or call the suite green. Existing numerical, learning and persistence fixtures passed, but the cause of this integration failure is not yet isolated. A follow-up inspection incorrectly expected `resumed/protocol.json` to exist; the runner rejects before publishing it, so that read failed. Preserve raw TAP/stderr and compare the prior protocol pins against current files before rerunning. No full-graph WASM experiment or production adoption has occurred.

The saved prefix pins FlyBench runner SHA-256 `37b356fdebafa08f13896d53fbb578b4e3ba5f4e43817296ae231c9e740e9234`, while current source is `6e20ddd50f5b25ce46ab0fbdf1c87589d2a3ec3e0ebdf2e17342ba39f391d2bd`; all other saved pins match current files. This confirms source drift during the broader test interval and is consistent with the provenance rejection. A retry with the stable current runner passes all 221 checks, without code/guard relaxation. Preserve the original failure and temp prefix. No unique inference about kernel arithmetic follows from the first integration failure.

### WASM graph comparison launch

The new candidate and fixed comparison are registered in [the WASM report](../../../archive/early-development/research/reports/move-latency-wasm-2026-10-10/README.md), with helper/candidate/oracle hashes and the unchanged four-fixture median/p95 gates. Synthetic f32/f64/full-buffer/derivative/choice checks and 221 full candidate checks pass. Authoritative process inspection finds no active graph/experiment process after tests completed. Launch exactly `node --max-old-space-size=256 research/reports/move-latency-wasm-2026-10-10/benchmark.mjs --out runs/move-latency-wasm-v1 --cpu-duty 0.5`, serially, with 768 MiB RSS / 256 MiB free-memory guards. Raw output and report are required before adoption; learning/transfer gates remain unmet.
## 2026-10-10: WASM comparison passes; audit before adoption

The serial comparison is terminal. Independently recomputed all 32 recorded sample summaries, legal candidate coverage (92 successor positions), equal candidate scores/choices, source hashes and resource bounds; the audit passes. Every fixture improves its median with no worse p95 (four samples means this p95 is the observed maximum). Median reductions are 11.25% white-start, 23.18% black-after-e4, 21.45% six-ply opening and 16.52% rook endgame. Peak RSS is 135.39 MiB, elapsed 465.392 s, CPU 222.344 s, duty 0.5; end free memory 991.86 MiB. This small, variable host sample does not establish a universal latency guarantee or learning speedup.

The staged candidate remains frozen. Verify the existing HTTP server with the candidate loader before adopting, as required by the frozen protocol. Then relocate the import only in the production trainer, run unfiltered production npm test and verify the server without the loader. No graph/experiment process is active at this point. No learning/transfer gate changed.

### HTTP staging and production relocation

Staged HTTP verification passes both colours: exact expected legal move, score, resulting board, PGN replay, history and wrong-turn rejection; the existing page is served. These fresh-server requests took 17.396 s (black after e4) and 11.001 s (white start), slower than warmed benchmark samples; no cold-request speed guarantee is inferred. The owned server was stopped after PID/start-time verification. Production trainer now contains the exact staged candidate with only its import relocated; oracle/candidate/report hashes are unchanged and the production source manifest pins the relocated hash. Unfiltered production regression and loader-free HTTP verification remain due before reporting completion.
### Completion collector encoding mistake

Loader-free production HTTP checks pass both colours, exact move/score/FEN/history/PGN and wrong-turn rejection; requests took 7.209 s and 10.007 s, and the owned server was stopped after PID/start-time verification. The completion collector then incorrectly decoded PowerShell-redirected TAP as UTF-8. Its assertion failed because the preserved file is UTF-16LE with BOM; no completion file was published. This is an evidence-reading mistake, not a failed regression or neural computation. Read the actual BOM/encoding and recheck the existing output; do not rerun or rewrite the successful raw tests. The source and loader-free server identity checks had already passed.

### Completion verified

Correct BOM-aware reading confirms all 221 production tests pass with zero failures; no tests were rerun for the decoding error. Loader-free HTTP application passes and source identity is exactly the frozen candidate plus import relocation; helper and evidence hashes are captured in completion.json. Production HTTP peak RSS is 142.246 MiB. Both owned test servers are stopped, leaving no graph experiment launched by this work. The demonstrated outcome is lower warmed engineering latency with all candidates/steps/state/scores/choices preserved. There is no matched cold-server speed comparison, browser visual coverage, trained-policy gain or reasoning result. Current status and decision log are updated, report and source register linked. Next scientific step remains the separately declared informative-feedback condition with matched controls and independent consequence certificates; this optimization does not substitute for it.
