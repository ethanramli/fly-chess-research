# Latest state: 2026-10-19 15:28 Jakarta

The goal is active after researcher pause/resume. No timing process was live on authoritative inventory; exact-reuse-latency-v1 output absent. Full observer10960 completed with28.14% mean reusable incoming-edge work and49.64% rows, all clean outputs exact. Candidate software checks passed3 direct,255 npm,8 fixtures,1 actual seven-pair feedback fixture,2 fresh recovery; timing math4/4 and syntax pass. New isolated four-process ABBA campaign is registered and ready, **not yet launched at this entry**. Next explicitly run `C:/Users/ethan/.venv-class/Scripts/python.exe "python actions/run_exact_reuse_latency.py" --wait-seconds 14400` once, then track its exact handles/configs. Campaign config `python actions/exact-reuse-latency-campaign.json`, output `research/reports/training-latency-2026-10-19/exact-reuse-latency-v1`. Baseline and candidate both Node26/native; only exact-row reuse differs. New>5%/no>5% arm regression gate selects this candidate and does not replace the original whole-pipeline target. All historic sources/failed runs remain frozen. Never run tests/bulk scans during timings. See dated journal for source pins and software logs. Older live-process statements below are superseded by this entry.

# Training latency: current handoff

Updated2026-10-19 15:05 Jakarta. Optimization goal remains active. Previous expanded handoff preserved in [snapshot](../../research/reports/training-latency-2026-10-19/handoff-snapshots/20261019T0805-before-compact.md); [dated journal](../../research/journal/experiments/2026-10-19-training-latency.md) records every failure/pivot.

## Live action: verify before doing anything heavy

Full-graph causal-row observer v2 started once: PID10960, logs `runs/python-actions/20261019T080427-a31d49e3/`, own state `runs/python-actions/trajectory-reuse-v2-current.json`. Use:

```powershell
.\fly.cmd --config 'python actions/trajectory-reuse-v2.json' status
.\fly.cmd --config 'python actions/trajectory-reuse-v2.json' watch --seconds 45 --interval 15
```

Never restart because waiting expired; use exact PID/creation/command identity. Keep graph jobs serial. Do not run bulk searches/tests/another graph process alongside it. This is instrumented observation, not clean timing; fixed heap256MiB, duty0.5, RSS768MiB/free256MiB. Keep sources/protocol/config pinned. Output: `research/reports/training-latency-2026-10-19/trajectory-reuse-v2/`.

The runner replays72 preselected complete historical lessons (first/middle/last in24 stages/all6 arms),1512 paced presentations plus one initialization forward,3024 durable publications. It compares every original receipt and final restored state; actual original trainer computes every row. It captures one stage's19 complete intermediate trajectories and observes exact causal row arguments (previous states, drive, alpha, allowed signed weights). Every allegedly clean activity and next-state value is compared bit-exactly against recomputation. Fixed graph/parameter hash checked at both lesson boundaries; all derived signed weights checked every observed frame. Only122 permitted local magnitudes change. Disposable reference history storage is bounded to one stage, released with explicit GC at stage changes. Completed observations also stream to `causal-observations.jsonl`; that diagnostic stream never acknowledges or resumes learning.

Full runner SHA `edddbf1e8281a30581da8dccdb254779ebc5d7737b5315b6c31b5ad13de83121`; protocol SHA `454987e4e19880db6d37e53f8a8482f969d865ee65a250a0545408993c821c39`. Protocol pins old sources, new sources, parents, archival selection, runtime and graph identities. Do not refresh pins blindly.

## Completed evidence

- Independent runtime comparison: `runtime-comparison-v2/timing-audit.json`, integrityPassed=true/timingPassed=true,2184 decoded publications/1092 pairs,546 historical receipt instances. Actual fixed-state hash matches historical receipt0 under both Node22 and Node26.
- Matched24 early-acquisition lessons per variant:913.8016641s->282.1271928s,69.12599% pooled elapsed reduction. Complete benchmark process sums987.2199233s->327.6996793s,66.80581%. These combine two rounds, not one entire curriculum run.
- Round0 measured245.6707197s->118.9991483s (51.56%); round1 measured668.1309444s->163.1280445s (75.58%). Host conditions varied; cause unresolved. Preserve per-round evidence and `timing-context.json`. Never advertise69.1% as stable device-wide or whole-curriculum gain. User explicitly challenged this overstatement and was given a correction.
- Candidate residual forward93.499s includes CSR accumulation63.051s and prepare copies3.215s; publication31.398s, pacing121.580s. Timers nest. More compression alone cannot remove the main residual recurrence cost.
- Full archived-state reuse v3:1368 original hash-verified states,134209 neurons,72 lessons/all24 stages. Median changed fraction59.588% adjacent;19.032% across corresponding frames of different lessons (roughly81% equal values).912 cross-lesson pairs,16 wholly equal. Results vary by frame (frame3 median85.21% changed; frame18 median15.78%). Equal output is not causal reuse or a speedup. Report SHA `0dc16af215573e6a0ed78ee3f005281833c539f7b00213895a7dde4eabb44e8a`; peak149.527MiB;335.463s offline analysis.
- Observer assertion check1/1, Float32/Float64, input propagation, permitted weight mutation and deliberate clean-output corruption: logs `20261019T080036-deff8a0e`.
- Six-neuron observer v2 integration complete:72 exact lessons,1512 paced presentations,3024 publications,912 comparisons (1824 numerical steps; fixture uses2 steps), report SHA `53988db8ea7ccd791ae81ac1838e328add0c786f6d3cf84e3a0345ea3aad4935`, peak92.1875MiB,42.54s. PID13460 terminal, stderr empty; logs `20261019T080302-408d0081`. Counts are software integration, not full-graph reuse evidence.

## Preserved failures and limitations

- Observer v1 completed72 exact lessons but crashed at final report metadata `mapping.inputs.graph`, absent in fixtures. All raw checkpoints/sample files remain; final in-memory observations were not published. v2 preserves v1 and fixes fixture metadata plus streams completed observations. Full-graph v1 was never run. Do not claim v1 completed integration.
- Earlier pipeline-v3 raw42.2% failed registered timing gates; oversized repository search overlapped late round1. Preserve all samples, do not remove disturbed results post hoc. Fresh runtime v2 had no such local heavy work, but host variation remains large.
- Original other-session curriculum auditor14548 stopped in host reboot, no audit publication. Do not restart it, change owner config/handoff or infer scientific completion. User paused future curriculum work for this exclusive window.
- Competitor Fable83.3%/7h is user-reported and unmatched. User declines sharing its patch/report to preserve independent development. Do not ask again or seek its implementation.
- Production runners still do not import the native codec. No scientific migration, useful chess transfer, G0 pass, whole-curriculum timing or time-to-quality improvement is established.

## Next actions

1. Observe the same PID10960 to terminal. Read report via `C:/Users/ethan/.venv-class/Scripts/python.exe "python actions/report_neural_reuse.py" PATH_TO_REPORT`; inspect stderr/raw source if failed and preserve a new version before retry.
2. Inspect reusable edge-work fraction as well as rows across all intermediate steps and phases. High output equality need not save many incoming edges. Observation timings include assertions/reference copies and are not speed comparisons.
3. If causal reuse is substantial, implement an isolated exact engine using original per-row sum order, precision and full histories, complete invalidation for mutations/restores, bounded memory and fresh-cache recovery. No thresholds, pruning, approximate deltas, missing local histories or hidden cache memory as learned state. Measure total pipeline after exact equivalence; never infer speed from counts.
4. If dirty closure defeats reuse, record the negative finding and pivot from evidence. Other structural hypotheses: shared immutable transient checkpoint blobs/bounded deterministic replay (retain both durability barriers, fsync, pending-before-ack, exactly-once updates and count recovery cost); independent auditor's own validated-prefix checkpoints. Neither is implemented.
5. Broader phase equivalence/performance, production adoption and a complete defined training workload before/after remain required. Do not declare the goal complete from selected lessons. Whole-run benchmark must include initialization, stage boundaries, assessments, teaching, persistence and pacing, with fresh identities/raw evidence and independent audit.

Portable Node26.12.0 remains `.cache/latency-runtimes/v26.12.0/node.exe`, pinned SHA `1a14457b043fe82fd2fc027959595e91d138a8185c7ca6c02c15c16632b51aa4`. Default PATH unchanged. Native codec source SHA `31956d5985c25ca521c080ee716199d70761d2eacefc913afd3f375390a018ed` remains frozen. Shared-Wasm v2 candidate has small checks but no full-graph speed/adoption; do not prioritize it without measured justification.


## 2026-10-19 15:21 Jakarta: causal observation complete; direct candidate equivalence passes

PID10960 is terminal/missing with report published, empty stderr and all72 exact lesson receipts/checkpoint roundtrips. Full report SHA ebb53bc59d106634752bb3cf3f53a51dd152cc3def3dbd8d87aaa6f33598ae86.912 cross-lesson comparisons cover7296 intermediate numerical steps on134209 neurons /2700513 edges. Every causally clean row's actual recomputed activity and next value matched its reference. Mean reusable row fraction0.4963895208; mean reusable incoming-edge work fraction0.2814482327. Per-phase edge work26.05% acquisition,30.47% interference,28.03% reversal. Frame0 edge reuse76.70%, frames3-5 roughly0.15-0.58%, frame18 36.78%; do not infer a uniform benefit or skip those dense frames without checking dependencies. This replaces the preliminary first-four-arm estimate of roughly33% with the completed28.14% screen. Peak449.039MiB. Observation overhead is included; these are not speed results. Final output equality (~81% median) was a weak predictor of causal work (~28% mean edges), which is why the dependency check was necessary.

The isolated candidate direct checks passed3/3 (logs runs/python-actions/20261019T082057-3560cfc3/), exercising both precisions,1/8/40 steps, actual masked-row use, complete histories/gradients/SGD, direct topology/weight/input/bias/leak/head/saturation changes, dtype replacement, cache clearing and invalid/bounded fallback. Candidate default math/production imports unchanged. npm test now running once through exact-frame-reuse-checks-v1.json math-regression (tool session88806), after authoritative observer termination. Do not launch other tests/graph work until it is terminal. Next existing fixtures, actual paired feedback lessons, propagated fresh recovery, then separately registered graph speed measurement. No new total speedup or adoption.


### 2026-10-19 15:29 Jakarta: exact reuse timing launched once

Driver tool session18044 is live; first baseline batch round0-nativeOriginal PID12436, logs runs/python-actions/20261019T082844-b9e7f3c4/, state exact-reuse-latency-round0-nativeOriginal-current.json. Driver runs the four registered ABBA batches and independent audit serially, with no retries/adoption. Re-poll this driver or the registered current batch, never duplicate it. No tests, bulk search or checkpoint analysis during timing. Completed observer and software evidence remain as above; no speed result from the new candidate yet.


## 2026-10-19 15:35 Jakarta: researcher raises active objective to beating83%

User explicitly replaced the goal objective: outperform the reported Fable83% reduction, superseding the earlier40%-plus-margin target. Treat>83% matched complete-workload elapsed reduction as the current success requirement (reported83.3% remains additional context), with original feedback, learning, graph identity/topology/signs, resource and recovery constraints. The competitor result remains unavailable/unmatched; do not request its patch again or claim cross-machine superiority. Earlier completed/frozen benchmark thresholds and current>5% reuse-ablation selection gates remain unchanged and cannot themselves satisfy this updated objective. Whole defined curriculum before/after remains necessary, and the goal stays active until the broader requirement is actually proven.

Current ABBA trial still helps diagnose the next engine: round0-original12436 finished, driver18044 started round0-reuse14972 once, logs20261019T083228-7889011a; exact receipts continue. Do not overlap tests, simulations or bulk analysis. Prior timing percentages cannot be added to a future reuse percentage.

Next larger hypothesis, before implementation: vectorize independent neuron rows into separate SIMD lanes while retaining original per-row f64 multiplication/addition order. This differs from reordering/reducing edges inside a row. Pair/pack rows by degree with explicit original-neuron mapping, mask padding rather than changing zero-sign arithmetic, and gather previous-state values. Original sparse topology/indices remain available for local learning and gradients. No implementation or expected speedup; potential gather/padding/layout/update memory costs might defeat it. Register primary SIMD opcode/semantics and layout sources before experimental use, estimate bounded allocations, then test exact histories/updates and actual pipeline performance in a separate version. Existing frozen reuse trial is untouched. This is our engineering derivation, not a literature-backed local performance claim.


### 2026-10-19 15:39 Jakarta: interim reuse attribution; prioritize compiled dependency checks

First completed but unaudited pair: nativeOriginal189.6722143s measured /221.398388s cold versus nativeReuse184.8982142s /217.1376965s. Rough2.5%/1.9% gains do not pass registered>5% gates; final ABBA/audit pending, no candidate rejection/success declared. Forward actually regressed66.775s->70.214s despite CSR accumulation47.026s->25.781s. Candidate reuseValidation7.135s, reuseMask21.696s, referenceCopy0.855s. Checkpoint publication25.846s->19.255s differed too, so the tiny total improvement cannot be credited to faster graph forward. Peak255.86->468.14MiB. Preserve complete data/variation.

Diagnosis: measured JavaScript dependency classification largely cancels reduced accumulation work. Next isolated v2 hypothesis is to classify exact dependencies/weights/topology in WebAssembly beside the existing arrays, while preserving per-row arithmetic, private bounded references, every history, dtype fallback and fresh-cache recovery. This directly targets named measured overhead; no speed claim or code modification to active v1. Independent-row SIMD remains researched but unimplemented; prioritize the measured validation/mask bottleneck before layering a new layout. Current four-batch trial and audit must finish; no test or graph launch alongside timing. Updated>83% whole-workload target still requires several substantial improvements and full before/after proof, not summed component percentages.


### 2026-10-19 15:44 Jakarta: compiled-classification candidate v2 prepared; v1 raw totals regress

All four v1 timing batches completed and independent auditor9676 is live (logs runs/python-actions/20261019T084155-21dd673e/, driver18044). Raw unaudited measured totals: original328.0802835s versus reuse339.3067138s, a3.42% regression. Round0+2.52%, round1-11.56%; no v1 speedup or adoption. Await independent decoded-publication audit; preserve failures and host variation. The earlier final28% edge-work feasibility screen did not establish a useful runtime improvement.

Prepared a separate v2 implementation without editing any active v1 dependency: sparse-accumulator-reuse-wasm-candidate.mjs, frame-reuse-cache-wasm-candidate.mjs, trainer-reuse-wasm-candidate.mjs. The new Wasm helpers compare topology, signed-weight bits and row dependencies, while the original scalar sum/activation order remains. Current/reference previous-state copies feed one compiled classifier; its mask/result flags are reused directly by the sum kernel, avoiding the v1 JS graph scans and repeated mask-result initialization. Drive/alpha/saturation/weight row flags are prepared once per forward, not8 times. Mixed history dtypes fall back to the full computation to avoid losing exact prior-state bits in a narrower scratch buffer. Canonical scratch is included in the256MiB cache budget and model allocation/RSS accounting. Copies and extra bounded scratch remain real costs, not assumed free. No SIMD layout or new dependency/worker/GPU introduced.

V2 sources/check manifest saved in exact-frame-reuse-wasm-v2; own config exact-frame-reuse-wasm-checks-v2.json registers direct Float32/Float64 comparisons, npm test, actual feedback fixture and propagated fresh recovery. All remain unexecuted until v1 audit terminal. Generation action succeeded; no compile/math or speed claim yet. New hard>83% complete-workload objective remains active, with full-run comparison/adoption outstanding. Independent-row SIMD primary-source review remains separately recorded, unimplemented.


### 2026-10-19 15:45 Jakarta: v1 independently rejected; v2 direct checks pass

Driver18044 finished normally and independent auditor9676 is terminal. exact-reuse-latency-v1/timing-audit.json confirms integrityPassed=true, timingPassed=false:24 matched lessons per engine,2184 independently decoded publications/1092 pairs and546 historical receipt instances. Original328.0802835s measured /375.2660413s cold versus JS-classified reuse339.3067138s /385.9904868s:3.42185% and2.85782% regressions, respectively. Arm medians informative-8.47%, absent-17.97%, disabled+16.83%, shuffled+37.39%/-18.64%/-50.36%. Preserve every sample; no post-hoc removal or adoption. This closes the raw-regression observation as independently confirmed engineering failure, not failed biological learning.

V2 compiled classification exact-check now passes3/3 (runs/python-actions/20261019T084526-39024a82/), after v1 audit terminal. Both Float32/Float64,1/8/40 steps, actual masked skips, complete histories/gradients/SGD, raw changes, invalid shapes/dtype fallback and cleared/bounded caches exercised. npm test, actual feedback fixtures and fresh recovery remain before timing. Current goal is the user's superseding>83% full-workload reduction; earlier40% goal and frozen selection thresholds remain historical/unchanged. No new total win.
