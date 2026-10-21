## Latest verification:2026-10-19

The three exact repetitions are complete: **58.1%,59.9%,59.5% reduction**, all independently audited. Use approximately59% for the current selected workload; historical69.1% did not reproduce within its declared band. [Results and full scope](repeatability-v1/README.md). Further optimization remains closed.

# Training latency investigation

## Latest state: 2026-10-19 15:06 Jakarta

**Whole-curriculum before/after is not measured.** [Independently audited runtime benchmark](runtime-comparison-v2/timing-audit.json):24 matched early lessons per variant,913.80s->282.13s (69.1% pooled); complete benchmark process sums987.22s->327.70s (66.8%). These combine two rounds with large host variation (51.6% and75.6% measured-lesson reductions); see [timing context](runtime-comparison-v2/timing-context.json). No stable whole-run percentage or production adoption follows.

[All-phase archived-state screen](neural-state-reuse-v3/report.json) is complete:1368 exact hash-bound134209-neuron states across72 lessons/all24 stages. Corresponding frames across lessons show median19.03% changed values; equality alone is not causal reuse or a speedup. [Causal observation registration](../../data/trajectory-reuse-v2/protocol.json) now replays original feedback lessons with every computation intact and checks all intermediate arguments/outputs. Its six-neuron integration passed; full graph PID10960 is live at this update. [Compact current handoff](../../../documentation/handoffs/training-latency-state.md) gives the authoritative action and remaining requirements. The failed v1 fixture report and earlier timing failures remain preserved below/in the journal. Earlier text below records prior states and is superseded by dated addenda.


Work in progress. [Registration and mistake record](../../journal/experiments/2026-10-19-training-latency.md).

Target: reduce current training elapsed time by more than40% at identical state/evidence and unchanged resource guards. No whole-training speed claim yet. Preserve the live independent audit and all frozen experiments.

## Measured component result

The [latest matched offline comparison](persistence-native/report.json) restored all240 checkpoint variants exactly from six real publications (134209 transient neuron values per publication). It includes seven measured rounds plus warmup; the graph was never loaded. Measurements ran alongside the curriculum audit and need a serial whole-lesson comparison before an overall claim.

| Median | Current JSON/default gzip | Native typed state/V8/zstd1 |
|---|---:|---:|
| Durable publication |257.73ms|28.76ms|
| Decode |57.61ms|35.18ms|
| Bytes |1197926|510930|
| Publication CPU |250000us|31000us|

Publication elapsed reduction88.84%; this is a component result. Peak RSS111.27MiB. Exact commands, raw samples, six input hashes, Node identity and source hashes are in the report; preserved source bytes are in [sources](persistence-native/sources/). Earlier [gzip pilot](persistence-pilot/report.json) and [compressor comparison](persistence-compressors/report.json) remain preserved. Their differing baselines must not be combined into cumulative gains.

## Complete pipeline and scheduling

[V3 registration](../../data/training-latency-v3/README.md) selects12 real complete lessons, both outcomes in all six conditions. V1 and v2 remain preserved and were superseded before timing to repair launch recognition and exact baseline save order. The staged profiler measures assessment, forward/CSR copies/accumulation, local learning, plan verification, snapshots, hashes, receipt publication, checkpoint encoding/publication, and pacing. It compares every emitted receipt with historical evidence and requires exact restored states. It has not run on the full graph.

Use the separate [latency step configuration](../../../python%20actions/training-latency-step.json). It is operationally paused to prevent competing with the other Codex curriculum session; the optimization goal remains active. Its own state file is separate. Preview:

```powershell
.\fly.cmd --config 'python actions/training-latency-step.json' plan profile
```

The shared Python launch classifier initially missed the curriculum session's new auditor under `research/data/`. The repaired classifier recognizes `--cpu-duty` regardless of path;17/17 Python checks pass. The preview now refuses live auditor PID14548 and matches both configured pins. This is not a global launch lock; the curriculum session retains scheduling ownership. Reserve a shared idle window before graph timing or broad tests.

Production scientific runners remain unchanged. The Node regression suite passed243/243 before the latest small Python-only coordination change. The Python metadata bridge read a real native pending checkpoint successfully. Full-graph timing, independent comparison/recovery review and adoption remain outstanding.

## 2026-10-19 bounded verification addendum

- Codec and four-neuron fresh-process recovery checks:3/3, no skips, [raw log](../../../runs/python-actions/20261019T034040-d465428f/stdout.txt). This supersedes the initial headroom skip; both pending-receipt crash boundaries resume with exactly one acknowledgement and no repeated update.
- Literal original-versus-benchmark save checks:2/2, [raw log](../../../runs/python-actions/20261019T034411-81b5a2fd/stdout.txt). Original gzip bytes and ordered durable calls match; size/compression failures never publish and close open descriptors.
- Actual benchmark functions on the archived six-neuron fixture:1/1, [raw log](../../../runs/python-actions/20261019T034750-b261d51b/stdout.txt). Seven lessons cover all six controls and both informative outcomes;294 presentations and294 historical receipts across both representations match exactly, including final state/memory. This is software integration, not current graph speed evidence.

The integration test's first attempt failed because the VM test harness created arrays with another realm's prototypes. That test mistake and its raw failure remain preserved; using the current realm corrected the harness. The staged pipeline required no neural/feedback repair. The asynchronous question about the next exclusive run window remains pending; curriculum keeps priority meanwhile.


## Authorized queue and external technique review

The researcher paused future curriculum scheduling and authorized this chat's next exclusive window. Existing non-resumable audit PID14548 continues to completion; the separate Python campaign (tool session78128) waits on its exact identity and successful full replay publication, then runs v3 profile followed by the [independent timing/publication checker](../../data/training-latency-audit-v1/README.md) once. Own config is now unpaused; this supersedes earlier scheduling statements. No comparison result exists yet.

The checker independently decodes every publication, validates physiology/receipt prefixes and recomputes timing gates. Its helpers pass the seven six-neuron paired lessons and reject deliberately corrupted physiology/receipt bytes: [latest fixture log](../../../runs/python-actions/20261019T035640-45b5e1fe/stdout.txt). This remains bounded software evidence.

[External technique review](../../literature/training-latency-techniques-2026-10-19.md) maps primary Node/V8, zstd, WebAssembly and SQLite recovery documentation to concrete code. [Access metadata](search-access.json) distinguishes extracted sections from abstract-only research. Next non-storage opportunity is shared fixed-size Wasm arrays; current copies are confirmed but their latency share is not. Future audit recovery could preserve completed prefixes after interruption. Neither candidate is adopted.

The selected lessons exclude1369 of15481 full-audit presentations (8.84% by count), cold setup and recovery cost. A paired lesson speedup is not by itself an entire-training percentage.


## Shared memory candidate and quantitative priority

The separate [shared-Wasm v2 candidate](shared-wasm-v2/README.md) removes owned weight/drive/history boundary copies without changing the serial kernel or topology refresh. Bounded exact comparisons5/5, existing fixtures10/10 and actual seven-pair archived lesson integration1/1 pass, all without skips. See its report for source pins, raw logs and the fresh-process recovery scope limit. No graph speed measurement or production change.

The researcher explicitly requested an actual before/after training speed number. The queued v3 comparison remains the next graph work; obtain elapsed/CPU/throughput, per-arm equality and phase attribution before selecting a combined candidate. Preserve the original competitor claim as unverified: its raw benchmark is unavailable.

## Newer runtime: another measured component

A portable newer V8 runtime [reduces canonical state-hashing time by49.69% median](neural-hash-runtime-v1/README.md) on six existing full-neuron arrays, with literal byte equality.84 hashes; peak94.98MiB; concurrent audit timings remain provisional. Default runtime and queued v3 unchanged. Bounded compatibility and archived six-neuron feedback replay pass, but full-graph cross-runtime arithmetic and overall gain remain unverified. Do not combine this percentage with the88.84% checkpoint component reduction.


## 2026-10-19 reboot reconciliation and exclusive engineering window

At approximately06:51UTC, authoritative process inventory confirms auditor14548 and queued campaign are missing after a host reboot; audit output stops at9500/14161 receipts, stderr empty, audit.json absent. Tool session78128 no longer exists. Raw OS boot/process evidence is preserved in research/reports/training-latency-2026-10-19/reboot-reconciliation.json. Earlier live/wait statements are historical. No curriculum audit success or failure cause beyond interruption is inferred. Do not restart the other session's auditor.

Pivot: the original campaign required successful curriculum audit publication before profiling, as a conservative scheduling dependency. With that audit interrupted, the researcher-authorized exclusive latency window is now free. Execute the unchanged frozen v3 engineering replay directly through its isolated Python action. It independently checks252 original receipts and every reconstructed state, followed by its publication/timing auditor. This does not replace, pass or alter any curriculum scientific gate. Preserve original campaign and every source/protocol pin. The engineering benchmark can establish historical equivalence and latency in its declared lesson scope despite the broader curriculum audit remaining unfinished.

Runtime fallback preparation is complete but unlaunched: fixed-parameter v2 runner and protocol, independent four-batch checker, separate serial configs and run_runtime_latency.py. Pure timing-math checks4/4 pass (runs/python-actions/20261019T045751-4aaba527/), including per-arm regression and cold-start gates. Original v1 identity-coverage gap remains preserved. No full-graph runtime gain has been measured.


## Oversized competitor-result search: timing confound

While answering how Fable achieved83%, a text search mistakenly included the broad numerical regex0.83 in research JSON artifacts and did not bound file size/line length. It streamed several gigabytes of irrelevant numerical matches instead of locating a competitor report. The search overlapped late round1 of v3 profiling; its exact effect on timing is unmeasured. Do not present this run as a clean exclusive CPU/I/O comparison or silently remove individual slow samples. All original samples remain preserved and the independent integrity check is still useful. A later clean fresh-process runtime comparison remains necessary for a final performance claim. This is our measurement mistake, not a model or learner failure.

The specific search PID7424 was inspected before attempting to stop only that rg.exe process; it had exited by the guarded stop check. Its tool session51198 confirms terminal exit0. No graph process was terminated or restarted. Corrected search uses markdown only,512KiB file cap and filename-only output, avoiding numerical data and source archives. It found only our own mentions, not a Fable patch/report. Requested the actual competitor artifact asynchronously; continue local latency work while awaiting it.


## First full selected-lesson comparison completed; target not established

Profile9856 completed1050 paced presentations and published pipeline-v3/report.json: raw pooled elapsed reduction0.4221557129027972, peak206.566MiB, total invocation799.999s. Registered gates are false for both per-condition and pooled>45%; arm medians are informative36.78%, absent43.46%, disabled39.36%, shuffled40.66%/29.86%/42.13%. All runner receipt/state checks pass. Preserve these results, including the known late-round search disturbance;42.2% is not a clean final win or evidence of the requested margin. Independent timing/publication auditor1832 started once by the existing observer, logs20261019T070529-70c0e6fd, and is checking2100 publications. Next use the already registered fresh-process Node26/native comparison after integrity publication and terminal auditor status.

Researcher confirms Fable's83% result is on another computer and declines to share its patch/report to preserve independent development. Do not ask again or search for its implementation. Treat the number as an unverified reported comparator and continue original local optimization against our pinned baseline; no claim about Fable's specific method is supported.


## 2026-10-19 14:09 Jakarta: integrity passed; fresh runtime comparison launched

V3 independent audit1832 is terminal, integrityPassed=true, timingPassed=false:2100 checkpoints/1050 pairs and525 historical receipt instances verified. Raw measured24-lesson totals: JSON476.4145377s versus native275.2934189s; forward-only76.1618414s versus73.9083844s. Publication227.0732850s versus31.4061524s. Full totals and search disturbance are preserved in pipeline-v3/total-times.json and timing-context.json; these are not a clean final performance claim. Native codec changes mostly surrounding training work, not the neural graph computation.

The pre-registered runtime comparison v2 has now actually started, once, through python actions/run_runtime_latency.py (tool session61092). First batch round0-json6 PID3372, raw logs runs/python-actions/20261019T070905-221c88f2/, own state runtime-latency-round0-json6-current.json. Master output research/reports/training-latency-2026-10-19/runtime-comparison-v2 has protocol/campaign/batch-index. Driver runs four fresh serial batches ABBA then the independent audit; no automatic retry, restart, kill or adoption. Continue monitoring the same driver/registered config, never duplicate it. Frozen runtime runner/auditor/config/source pins must stay unchanged. Do not run searches, tests or other CPU/I/O-heavy work alongside timing.

Broader curriculum phases, full-graph Node26 equivalence, timing gates, cold invocation gain and adoption remain unproved. User requests total graph/training times and independent development; no competitor source will be supplied, so do not ask again. Goal remains active and no scientific stage has advanced.


2026-10-19 first-principles investigation: researcher asks whether repeated whole-graph computation, rather than small component improvements, is the main weakness. Prepared a separate observational analyzer, .codebase/scripts/evaluation-and-performance/analyze-neural-state-reuse.mjs, registered in python actions/neural-state-reuse.json (sourceSHA6ee9cbd10ae09a292c188cd7969b9382a189e7a0ff98d5c64bf8bd49cfab58a0). It fixes72 lessons across all24 stages before observing values, reads1368 original acknowledged frame states, checks their full-neuron receipt hashes, and counts exact per-neuron/chunk changes. No graph simulation or parameter update. Self-check and complete execution remain pending until the active runtime benchmark/audit are terminal; do not launch concurrently or treat observed reuse as a speedup.

Possible next architecture is exact dirty-row recomputation with original edge sum order and complete histories. Archived final-frame stability is only a feasibility screen; intermediate states, causal dependency closure, cache correctness under updates/restoration and memory cost still require measured validation. No approximate threshold, changed graph, new biological claim or implementation is authorized by a favorable reuse count alone. Existing frozen runtime comparison continues.


## 2026-10-19 14:53 Jakarta: independent benchmark complete; full-run claim corrected

Independent runtime timing audit is terminal: integrityPassed=true and timingPassed=true in research/reports/training-latency-2026-10-19/runtime-comparison-v2/timing-audit.json. It independently decoded2184 publications /1092 pending-acknowledged pairs and compared546 historical receipt instances. All six registered early-acquisition arm gates passed. Actual matched24-lesson totals are913.8016641s baseline versus282.1271928s candidate (69.12599% reduction); complete benchmark invocation sums including setup/warmup are987.2199233s versus327.6996793s (66.80581%). These are pooled across two rounds, not a single entire curriculum run. Round0 measured245.6707197s->118.9991483s (51.56%); round1 measured668.1309444s->163.1280445s (75.58%). Preserve host variation and unresolved cause. No stable device-wide percentage, whole-curriculum result, production adoption or scientific gate advancement follows.

Interpretation mistake: prior conversational emphasis on roughly70% could imply an entire training-run reduction. Researcher challenged this; explicitly corrected the scope to matched early lessons and separate cold benchmark processes. Entire-curriculum before/after remains unmeasured and required for that broader claim. Competitor83.3% is an unverified reported comparator, not a matched local result. Continue first-principles work rather than stopping at the selected benchmark.

The v3 reuse analyzer self-check and six-neuron archived integration passed, checking1368 original frame hashes over72 lessons/all24 stages plus1296 adjacent and912 cross-lesson comparisons. Software fixture peak118.10MiB; these reuse percentages do not describe the actual graph. Original PID9376 is no longer owned/live; authoritative process inventory found only Codex node11988 before starting full analysis. Preview verified every source/input pin and fresh output. Started exactly once with fly.cmd --config "python actions/neural-state-reuse-v3.json" start analyze: PID13380, logs runs/python-actions/20261019T075151-55d44499/. It reads archived full-graph states, performs no simulation, and must not be overlapped with timing. Next inspect full results for exact temporal and cross-lesson reuse before selecting an incremental computation design. No speedup is inferred from equal outputs alone.

Inspection corrections: attempted runtime audit.json path was absent; actual artifact is timing-audit.json, inspected directly. An initially assumed .codebase/src/neural folder was absent; use code navigation/current runtime and supervised-baselines paths. No source, run or measurement was changed by these read failures.


## 2026-10-19 15:01 Jakarta: full-graph archival reuse observation completed

Authoritative status confirms PID13380 missing with report published and empty stderr. report.json SHA2560dc16af215573e6a0ed78ee3f005281833c539f7b00213895a7dde4eabb44e8a;1368 exact hash-bound states,134209 neurons,24 stages,72 lessons.1296 adjacent pairs: median changed fraction0.5958803061, changed Float32-byte fraction0.1655337943.912 cross-lesson same-frame pairs: median changed fraction0.1903188311, changed byte fraction0.0511292089,16 wholly identical frames. Cross-frame3 median changed0.8521, late frame18 median0.15784: distribution is strongly time-dependent. Peak149.527MiB,335.463s analysis elapsed. These are observed equalities, not saved computation, a compression ratio or a speedup. Legacy JSON signed-zero limitation remains.

Next named gate-relevant engineering question: how many rows have every exact numerical dependency unchanged across matching frames, and how many incoming edges belong to those rows? This directly determines whether replacing repeated full-graph accumulation with exact causal reuse is worth implementing. The next replay includes informative feedback and all matched controls, rather than a read-only learner diagnostic. Keep the actual full trainer/learning path unchanged and verify all original receipts; observe all eight intermediate h/activity histories and drive/alpha/allowed-weight inputs. For any claimed clean row, assert actual recomputed activity and next-state are bit-identical to the reference. No cache engine, skipped row or predicted speedup is implemented.

Registered causal observation runner .codebase/scripts/evaluation-and-performance/profile-trajectory-reuse.mjs (SHA c029bcf3492933a13e619e4060efc5313e4bd340e3ca87d70f3cea6ae963e897), protocols research/data/trajectory-reuse[-fixture]-v1/protocol.json and own Python configs. All72 first/middle/last lessons from the archived screen,1512 paced presentations,3024 durable publications, exact original receipt comparison, same guards and Node26/native codec. Reference histories bound to a single stage (19 frames), disposable after stage; explicit GC at stage changes to bound observational memory. Full-state fixed graph/parameter hash checked at both lesson boundaries; complete signed-weight consistency checked every observed frame; only the mapped122 magnitudes may differ. This is deliberately instrumented observation, not a clean timing comparison or scientific migration.

The small observer assertion check passed1/1 on Float32/Float64 trajectories, changed input/propagated dependencies, allowed-weight change and deliberate corruption of an allegedly clean output; logs runs/python-actions/20261019T080036-deff8a0e/. Next run the complete six-neuron72-lesson integration before full graph. Pre-execution review corrected the runtime binary metadata key before generation; no failed run or source-pin modification occurred. One guessed old helper config filename was absent during read-only inspection; use explicit current configs rather than guessed names.


### 2026-10-19 causal observation v2 supersedes failed v1 reporting

The v1 six-neuron run reached all72 exact lessons, then failed final report construction because fixture mapping.inputs is absent. Preserve the failed run, all3024 checkpoints/sample files and546-byte stderr; no completed causal report exists. V2 runner fixes only fixture graph-file metadata (null for a fixture) and streams completed per-lesson observations so a later metadata error retains diagnostic counts. Original trainer, mathematical operations, timing/feedback, receipt publications and assertion helper are unchanged. V2 runner SHA edddbf1e8281a30581da8dccdb254779ebc5d7737b5315b6c31b5ad13de83121. Separate fixture run PID13460, logs runs/python-actions/20261019T080302-408d0081/. Full graph is not launched until this new integration completes. Use python actions/trajectory-reuse[-fixture]-v2.json; v1 artifacts remain immutable.


### 2026-10-19 15:05 Jakarta: v2 integration complete, full causal observation started

Six-neuron v2 report published with empty stderr and authoritative missing PID13460:72 exact lessons,1512 paced presentations,3024 publications,912 trajectory comparisons/1824 numerical steps, peak92.1875MiB. SHA53988db8ea7ccd791ae81ac1838e328add0c786f6d3cf84e3a0345ea3aad4935. The2-step fixture validates integration, not full-graph reuse. Source/config pins passed; inventory found only Codex node11988 before launch. Full graph v2 started once PID10960, logs runs/python-actions/20261019T080427-a31d49e3/, own config trajectory-reuse-v2.json, sourceSHAedddbf1e8281a30581da8dccdb254779ebc5d7737b5315b6c31b5ad13de83121. Await its actual causal rows/edges and every-step clean-output assertions before implementing a cache. Instrumented times are not speed evidence. Current latency handoff compacted with prior bytes archived in handoff-snapshots/20261019T0805-before-compact.md. Whole-curriculum timings/adoption remain unfinished; no scientific result changes.


## 2026-10-19 15:21 Jakarta: causal observation complete; direct candidate equivalence passes

PID10960 is terminal/missing with report published, empty stderr and all72 exact lesson receipts/checkpoint roundtrips. Full report SHA ebb53bc59d106634752bb3cf3f53a51dd152cc3def3dbd8d87aaa6f33598ae86.912 cross-lesson comparisons cover7296 intermediate numerical steps on134209 neurons /2700513 edges. Every causally clean row's actual recomputed activity and next value matched its reference. Mean reusable row fraction0.4963895208; mean reusable incoming-edge work fraction0.2814482327. Per-phase edge work26.05% acquisition,30.47% interference,28.03% reversal. Frame0 edge reuse76.70%, frames3-5 roughly0.15-0.58%, frame18 36.78%; do not infer a uniform benefit or skip those dense frames without checking dependencies. This replaces the preliminary first-four-arm estimate of roughly33% with the completed28.14% screen. Peak449.039MiB. Observation overhead is included; these are not speed results. Final output equality (~81% median) was a weak predictor of causal work (~28% mean edges), which is why the dependency check was necessary.

The isolated candidate direct checks passed3/3 (logs runs/python-actions/20261019T082057-3560cfc3/), exercising both precisions,1/8/40 steps, actual masked-row use, complete histories/gradients/SGD, direct topology/weight/input/bias/leak/head/saturation changes, dtype replacement, cache clearing and invalid/bounded fallback. Candidate default math/production imports unchanged. npm test now running once through exact-frame-reuse-checks-v1.json math-regression (tool session88806), after authoritative observer termination. Do not launch other tests/graph work until it is terminal. Next existing fixtures, actual paired feedback lessons, propagated fresh recovery, then separately registered graph speed measurement. No new total speedup or adoption.


## 2026-10-19 15:28 Jakarta: resume and register isolated reuse timing

Researcher briefly paused then reactivated the goal; current instruction is active. Authoritative inventory at08:27:56UTC found only Codex node11988; the new exact-reuse-latency-v1 output does not exist. No timing process survived or was silently relaunched during interruption. Previous turn made concrete progress: full causal observation complete and a tested exact-row implementation prepared.

Candidate software gates now complete: direct equivalence3/3 (082057-3560cfc3), npm test255/255 (082105-62d761fd), existing candidate trainer/temporal fixtures8/8 (082237-f7d2e636), actual paired feedback/publication fixture1/1 with seven lesson pairs/all6 arms/both informative valences and294 presentations (082244-c3b97969), propagated candidate-only fresh pending/ack recovery2/2 (082259-8f55cf61). These are software checks; none is a full-graph speed measurement. New timing arithmetic fixtures4/4 (082658-07938c11) and runner syntax check (082724-694c60a6) also passed.

Pre-registered separate ablation in research/data/exact-reuse-latency-v1/protocol.json (SHA8e7d7b989d1bbc5546c48333cb7368a18240886854aee32867f82ae1492ea775). Four fresh serial ABBA processes compare the same Node26/native checkpoint path with original versus exact-row-reuse engine,12 matched early-acquisition lessons per process plus warmup.48 measured samples/52 cases/1092 paced presentations,2184 publications; full historical receipts/states and independent dual-native decoding required. Own driver python actions/run_exact_reuse_latency.py and campaign exact-reuse-latency-campaign.json, new independent audit. Runner SHA9d6d86e48f55456d58361588a7652822d2e3bbd3f1fdb63e0f7a4f3ea86bbb8a. Original experiment sources/protocols are unchanged. Comparison includes cache validation, masks, copying and pacing; actual RSS must pass768/256MiB guards with256MiB heap/duty0.5. No tests, bulk searches or other heavy work during timing.

Ablation acceptance requires>5% pooled and cold-process reduction with no arm median regression exceeding5%, exact outputs and resource guards. This is a new candidate-selection gate against the already optimized Node26/native path, not a reduction of the original goal's>40% plus margin requirement against the original pipeline. Passing selected lessons does not establish an entire curriculum time reduction. Preserve all negative results/host variation; no automatic adoption or retries. Next launch the driver exactly once, watch its actual handles, and let the independent audit finish. Whole defined curriculum before/after and production adoption remain required.


### 2026-10-19 15:45 Jakarta: v1 independently rejected; v2 direct checks pass

Driver18044 finished normally and independent auditor9676 is terminal. exact-reuse-latency-v1/timing-audit.json confirms integrityPassed=true, timingPassed=false:24 matched lessons per engine,2184 independently decoded publications/1092 pairs and546 historical receipt instances. Original328.0802835s measured /375.2660413s cold versus JS-classified reuse339.3067138s /385.9904868s:3.42185% and2.85782% regressions, respectively. Arm medians informative-8.47%, absent-17.97%, disabled+16.83%, shuffled+37.39%/-18.64%/-50.36%. Preserve every sample; no post-hoc removal or adoption. This closes the raw-regression observation as independently confirmed engineering failure, not failed biological learning.

V2 compiled classification exact-check now passes3/3 (runs/python-actions/20261019T084526-39024a82/), after v1 audit terminal. Both Float32/Float64,1/8/40 steps, actual masked skips, complete histories/gradients/SGD, raw changes, invalid shapes/dtype fallback and cleared/bounded caches exercised. npm test, actual feedback fixtures and fresh recovery remain before timing. Current goal is the user's superseding>83% full-workload reduction; earlier40% goal and frozen selection thresholds remain historical/unchanged. No new total win.


## 2026-10-19 15:52 Jakarta: compiled classifier software gates complete; v2 timing registered

V2 direct3/3 (084526-39024a82), npm test255/255 (084550-5d97705b), trainer/session fixtures8/8 (084923-33ca0ee6), actual seven-pair feedback/native-publication fixture1/1/294 presentations (084931-ed51f433), propagated fresh recovery2/2 (085116-ea7d5e60). All terminal with exit0. Runner syntax passes (085117-39f6215a), preview ready and all pins match. Four timing-arithmetic tests from v1 cover the byte-identical exported function; generation explicitly asserts its unchanged prefix.

New separate ABBA registration research/data/wasm-reuse-latency-v2/protocol.json SHA f00f38643855967a1d6b67df2000f51b61d266f8203d2935253a5e4711b8084f; runner profile-wasm-reuse-latency.mjs SHA731a6485a77503a2b111383e142e94e39a180e3f334bd1867abb7522d7d3277a. Driver python actions/run_wasm_reuse_latency.py/campaign wasm-reuse-latency-campaign-v2.json uses the completed v1 integrity audit (2184 publications) as its prerequisite; v1's failed timing is preserved. Original trainer versus compiled-classification engine, both Node26/native, same12 units and four batches,48 measured samples/52 cases/1092 paced presentations/2184 publications. Selection gates unchanged>5% pooled/cold and no arm median>5% regression. These remain intermediate selection gates, not the new>83% whole-workload goal. No automatic retry or adoption; never overlap tests/bulk work with timing.

Next structural persistence hypothesis is the previously recorded bounded-replay checkpoint design: instead of publishing134209 transient values twice per frame, persist lesson-start local memory, verified immutable stimulus plan/prefix, exact cursor/current memory/pending receipt and a versioned binary state digest. Reconstruct at most32 frames on resume through the original neural/plasticity path, reverify certificates, compare final memory/chain/state hash and never acknowledge or double-apply a mismatched update. Full from-scratch graph still runs during teaching; only deterministic transient storage is derived. Recovery cost must be counted and bounded. Binary evidence/typed snapshots are an explicit new schema/identity with independent numeric comparison to legacy states; never silently substitute historical hash identities or omit durable barriers. This is unimplemented and requires a separate protocol, recovery faults and full pipeline proof before use. It directly targets measured serialization/snapshot/hash work and is prioritized before unmeasured SIMD layout work if the new classifier improves actual speed.


## 2026-10-19 16:17 Jakarta: compiled reuse v2 independently rejected

Driver9271 and independent auditor15828 are terminal; exact process inventory finds only Codex node11988. Four serial ABBA batches and audit completed without retries. wasm-reuse-latency-v2/timing-audit.json has integrityPassed=true, timingPassed=false. Original measured420.7608851s/cold464.7661546s versus compiled reuse479.5707326s/cold527.2702356s:13.977% slower measured and13.449% slower cold. Every condition median regressed (3.94% to29.90%); no samples dropped. Original/candidate round0=206.2686374/196.0666647s (~4.95% gain), round1=214.4922477/283.5040679s (~32.17% regression). Host variation remains material and unresolved. The earlier69.13% selected-lesson runtime/codec comparison remains historical, not a current whole-run claim.

V2 round0 forward70.9374864->71.1646102s despite CSR accumulation51.1386739->24.9901145s; compiled validation4.458857s+mask25.6061493s+reference copy0.6957701s consume the work saved. Round1 forward72.7923153->108.6541537s, mask40.1420752s. Peak original250.82/258.15MiB versus candidate486.03/491.17MiB; original guards passed. These phases nest and cannot be summed as independent whole-run savings. Correct states do not imply a fast method. Reject both JS and compiled dependency-classification candidates for adoption on this workload; preserve all sources/reports and avoid another variation of the same full dependency scan without new measured justification.

Pivot to the already staged derived-checkpoint candidate, targeting dense transient serialization/hashing rather than changing biology. Its independent equivalence/recovery checks can now run serially because all timing/audit processes are terminal. No whole-run gain, adoption or scientific progress is established.


## 2026-10-19: researcher closes latency optimization and requests pruning

Researcher explicitly accepts the independently verified69.1% selected-lesson result, withdraws the chase for83%, and instructs pruning of unused work. Stop optimization and further graph/full-training benchmarks. Accepted-result.md preserves913.8016641->282.1271928s (69.126%) on24 selected complete lessons, and66.806% cold-process reduction; no whole-curriculum claim is introduced. The curriculum owner's paused config and frozen sources remain unchanged.

The staged derived prototype passed9 targeted software/recovery groups (logs20261019T131733-377feae2), runner syntax (131751-a20619fe) and npm255/255 (131752-cac4d27f) before withdrawal. No full-graph derived run/timing occurred. It is not adopted. The completed compiled reuse audit remains an integrity pass/timing failure (13.98% slower).

Pruning moved65 exact source/action/test/design files (351983 bytes) from active paths to research/source-archives/training-latency-abandoned-2026-10-19, with old/new paths and SHA256 manifest. All44 winning protocol source/dependency paths were protected. Raw reports, frozen protocols/archives, receipts, logs and failed outcomes stay in place. Historical candidate reproduction requires restoring original relative paths in an isolated checkout; no frozen evidence is rewritten. Updated active navigation and replaced the active handoff with a closed summary after preserving its previous bytes. Final static integrity/import/link checks complete the cleanup; no more simulations are required by the revised task.
