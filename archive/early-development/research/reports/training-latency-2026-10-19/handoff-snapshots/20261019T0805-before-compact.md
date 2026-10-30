# Training latency engineering handoff

Active goal: reduce current training elapsed time by more than40% with equivalent learning/evidence; researcher explicitly says checkpoint timing is only part of the picture. Do not mark achieved from a component benchmark. The competitor's raw benchmark is unavailable.

Parallel ownership: another Codex session continues curriculum and owns graph scheduling, active step config, runner/auditor and scientific handoff. Do not restart its jobs or launch a competing benchmark merely because a former PID disappeared. Latest optimization preflight recognizes new auditor PID14548 and refuses launch. Preserve its separately pinned waiting auditor in `research/data/g0-reversal-history-audit-wait-v1/`. Our earlier broad test run overlapped a resource-guard failure; causation/subcondition is unknown. Avoid broad parallel tests and heavy profiling.

Completed engineering evidence:

- Trace: assessment -> continuous eight-step sparse model -> local plasticity -> full-state hashes/snapshots -> pending durable checkpoint -> receipt/fsync -> acknowledged durable checkpoint. Default gzip JSON repeats large decimal conversion/compression twice per receipt. Pacing callback excludes later checkpoint CPU. Audits restart from receipt0 after interruption.
- Latest offline matched component report: `research/reports/training-latency-2026-10-19/persistence-native/report.json`; six real134209-neuron publications,240 exact roundtrips. Median durable publication257.73ms current versus28.76ms native typed-state/V8/zstd1 (88.84% component reduction), decode57.61->35.18ms, peak111.27MiB. Previous candidates, raw files, hashes and sources are preserved.
- Candidate `.codebase/src/runtime/checkpoint-codec.mjs` uses exact float32 only when all numbers are representable, otherwise float64; native schema/checksum,16MiB decode bound, legacy gzip support. Installed Node22.23.2 is the measured runtime. Scientific runners do not import it yet.
- Metadata bridge `.codebase/scripts/runtime/inspect-checkpoint.mjs`; Python checkpoint inspection supports native files. A real native pending publication was read correctly.
- Repaired shared Python launch classifier: recognize the mandatory `--cpu-duty` flag, including auditors outside original folders.17/17 action checks pass.243/243 Node checks passed before this Python-only repair. Preserve sandbox failures in the journal.

Prepared full comparison:

- `research/data/training-latency-v3/protocol.json` pins12 real pre-lesson parents and252 original receipts, first two acquisition lessons across informative/absent/disabled/three shuffled arms. V1/v2 preserved and superseded before timing to fix new-auditor recognition and the copied baseline's original save order/JSON bound.
- `.codebase/scripts/evaluation-and-performance/profile-g0-training-pipeline.mjs` measures complete lessons in alternating order, two rounds after informative warmup pair. It includes rankings, all19 continuous frames/updates, full evidence, both durable saves and original CPU-based pacing; checks every historical receipt/restored state and fixed wiring. Source syntax checked; full graph not launched.
- Predeclared gates: every condition's paired median elapsed reduction>40%, pooled>45%, exact states/receipts, original memory/heap/duty settings. Report setup and whole-process CPU fraction separately; no claim of time to successful chess learning.
- `python actions/training-latency-step.json` is a separate operationally paused preparation config with separate state path. This does not pause the active goal. Preview with `fly.cmd --config "python actions/training-latency-step.json" plan profile`; do not unpause/start until scheduling is coordinated with the curriculum session.
- `.codebase/tests/runtime/checkpoint-resume-fixture.test.mjs`: four-neuron software fixture, fresh child process, both pending-receipt crash boundaries. Initial headroom skip preserved; later rerun passed alongside codec checks3/3, no skips (`runs/python-actions/20261019T034040-d465428f/`).
- Literal save-function parity checks2/2 (`runs/python-actions/20261019T034411-81b5a2fd/`): identical original gzip JSON bytes and durable-call order, guard/failure cleanup. Actual pipeline functions pass archived six-neuron integration across7 lessons/all6 controls/both informative valences (`runs/python-actions/20261019T034750-b261d51b/`),294 presentations and all294 receipt comparisons exact. First attempt's VM-realm harness error preserved in journal. No full-graph timing or scientific advancement.

Next: reserve a shared exclusive graph window (asynchronous scheduling question asked; no answer yet, so curriculum retains priority); run the full v3 comparison through its isolated Python config; inspect attribution and equality before any adoption. Bounded recovery/publication/integration checks pass. If timing gates fail, preserve and diagnose. Any edit to pinned candidate sources needs a new preserved registration version. Native adoption into future runners still needs compatible resume/publication review; frozen sources remain immutable.

[Design](../design/evaluation-and-performance/training-latency.md) · [Evidence](../../research/reports/training-latency-2026-10-19/README.md) · [Every mistake and pivot](../../research/journal/experiments/2026-10-19-training-latency.md)


## 2026-10-19 current scheduling and research addendum

Supersedes the earlier paused/pending-question paragraphs above: the researcher explicitly paused future curriculum scheduling and authorized continued latency work. Own training-latency-step.json is paused=false. Existing non-resumable audit PID14548 remains live; preserve it. Python campaign tool session78128 waits on its exact saved handle and requires passed/fullNeuralReplay, then runs frozen v3 profile and timing-audit once using separate state. Never duplicate that campaign merely because observation times out. Its4h wait deadline leaves child work untouched on expiry.

Independent checker and registration: .codebase/scripts/evaluation-and-performance/audit-training-latency.mjs and research/data/training-latency-audit-v1. Seven six-neuron integration pairs include independent decoding and corruption rejection; latest passing log runs/python-actions/20261019T035640-45b5e1fe/. No full comparison result yet. Preserve current runner/codec/protocol/auditor pins while queued.

External search now completed: [technique mapping](../../research/literature/training-latency-techniques-2026-10-19.md), [access record](../../research/reports/training-latency-2026-10-19/search-access.json), source register updated. Strong next candidates after phase attribution: own trainer buffers in fixed Wasm memory to remove repeated copies, and separately registered stage-boundary audit recovery. Both are proposals, not implemented wins. Earlier zero-reset candidate failed its latency gate; don't recycle it as a discovered success.

Selected full lessons omit1369/15481 audit presentations plus cold setup and recovery. Do not label their eventual timing as entire training. Continue authoritative campaign/process/artifact checks through Python actions. No curriculum-source/config/handoff edits, frozen source mutation or concurrent graph work.


## 2026-10-19 shared-Wasm preparation and latest steering

Latest user: wants to see how much faster the repository becomes. Prioritize measured baseline/candidate training times; don't finish on another component estimate.

Isolated shared-Wasm v2 exists at research/reports/training-latency-2026-10-19/shared-wasm-v2, prepared by python actions/prepare_shared_wasm.py. It aliases trainer signed weights/drive/all histories into fixed Wasm memory, keeps topology copies and scratch fallback, and preserves literal kernel bytes. Source manifest pins current originals/candidates. V1's arbitrary33-history cap was rejected before tests and preserved; v2 covers40 steps.

Checks via python actions/shared-wasm-checks.json: equivalence5/5 no skips041941-cbea045f; candidate-fixtures10/10 no skips041955-4c9d3577; candidate-lessons1/1 no skips042100-4a118ce7 (294 six-neuron presentations, historical receipts and full states exact, independent publication checks). Existing resume fixture's child did NOT inherit loader: result proves candidate-to-original interoperability, not candidate-only fresh-process recovery. Direct actual loadCheckpoint/Adam tests use candidate. Broad serial regression and candidate-only recovery remain for adoption.

No graph timing/adoption. Queued v3 and its four configured pins unchanged; current audit14548 live4500/14161 at latest confirmed status. Campaign78128 remains waiting; never duplicate it. Next obtain v3 timings/attribution, then separately register a combined candidate if useful. Keep actual full-run scope, controls, resource/pacing and time-to-equivalent-quality limits explicit.

## Candidate-only recovery addendum

Candidate-recovery2/2 no skips, raw runs/python-actions/20261019T042754-aa404026/. Test-only candidate-recovery.test.mjs propagates the loader through inherited NODE_OPTIONS, asserts module identity, and runs the existing4-neuron fixture in candidate parent and fresh candidate children at both acknowledgement boundaries. This closes the earlier child-coverage gap without editing frozen sources. Broad serial regression and graph timing/adoption remain. Audit14548 confirmed live5000/14161, campaign78128 waiting; do not relaunch.

## 2026-10-19 runtime candidate and quantitative status

Latest status question answered honestly: at04:45:37UTC audit14548 live6500/14161, started03:35:42; estimated80–100min remaining plus20–30min first comparison/audit. Goal not almost complete; outcome and adoption unproved. Campaign78128 still waits on the exact handle and will run frozen v3 once. Its four pins remain unchanged. No duplicate launch.

New source-backed opportunity: current V8 12.4 lacks V8 13.8 JSON/Dragonbox improvements. Official portable Node26.12.0/V8 14.6 is cached at .cache/latency-runtimes/v26.12.0/node.exe, binary SHA2561a14457b043fe82fd2fc027959595e91d138a8185c7ca6c02c15c16632b51aa4. Metadata/checksums/license in research/data/training-latency-runtime-v1. No PATH/default changes. Startup RSS26.55MiB.

Offline real-state hash pilot: research/reports/training-latency-2026-10-19/neural-hash-runtime-v1/report.json;84 hashes, six134209-neuron arrays, literally identical JSON bytes,49.69% median paired component reduction (20.56–62.91% individual), peak94.98MiB. Concurrent audit; not whole-training. Sources/actions frozen by its protocol: profile-neural-state-hash.mjs, python actions/profile_neural_hash.py. Preserve original bytes before any future edit; action's output is currently fixed and refuses existing output.

Node26 compatibility9/9 no skips044042-c8f57b46, historical lessons1/1 no skips044050-7d1c0dac (294 six-neuron presentations/receipts/states exact). Node22 metadata reader parses a Node26 native real checkpoint; see native-reader-compatibility.json (parsing only). Node26 default reporter was spec; separate latency-runtime-checks.json now pins runtime and explicitly requests TAP for future jobs. Do not misread empty Python testCounts as failed/absent tests; inspect preserved raw counts.

No string-value cache: actual states are88–90% distinct; neural-value-inspection.json preserved. No neural state hash algorithm changed. Full-graph cross-runtime arithmetic remains unverified.

Next: prioritize actual v3 timing/independent audit. If it misses45% pooled or further margin is needed, separately register a Node22/JSON versus Node26/native comparison using identical model code (prefer platform upgrade before adopting shared-Wasm complexity). Counterbalance process order ABBA across two rounds and all12 existing units; use fresh serial processes with equal warmup and record cold/setup overhead. A four-batch implementation would require52 cases/1092 presentations (four warmups), revised independent coverage, preserved old registrations, and zero historical state/feedback differences. Do not edit v3 to add this. No such mixed-runtime runner/protocol is implemented or queued yet. Whole-study phases and time-to-quality limits still apply.


## 2026-10-19 reboot reconciliation and exclusive engineering window

At approximately06:51UTC, authoritative process inventory confirms auditor14548 and queued campaign are missing after a host reboot; audit output stops at9500/14161 receipts, stderr empty, audit.json absent. Tool session78128 no longer exists. Raw OS boot/process evidence is preserved in research/reports/training-latency-2026-10-19/reboot-reconciliation.json. Earlier live/wait statements are historical. No curriculum audit success or failure cause beyond interruption is inferred. Do not restart the other session's auditor.

Pivot: the original campaign required successful curriculum audit publication before profiling, as a conservative scheduling dependency. With that audit interrupted, the researcher-authorized exclusive latency window is now free. Execute the unchanged frozen v3 engineering replay directly through its isolated Python action. It independently checks252 original receipts and every reconstructed state, followed by its publication/timing auditor. This does not replace, pass or alter any curriculum scientific gate. Preserve original campaign and every source/protocol pin. The engineering benchmark can establish historical equivalence and latency in its declared lesson scope despite the broader curriculum audit remaining unfinished.

Runtime fallback preparation is complete but unlaunched: fixed-parameter v2 runner and protocol, independent four-batch checker, separate serial configs and run_runtime_latency.py. Pure timing-math checks4/4 pass (runs/python-actions/20261019T045751-4aaba527/), including per-arm regression and cold-start gates. Original v1 identity-coverage gap remains preserved. No full-graph runtime gain has been measured.


## 2026-10-19 13:55 Jakarta: actual exclusive comparison launched

Profile9856 was launched once through training-latency-step.json after authoritative inventory confirmed the rebooted auditor missing and no other graph job. Own saved handle: runs/python-actions/training-latency-current.json; logs runs/python-actions/20261019T065140-44216bac/. Bounded Python observer finish_current_latency.py (tool session8387) waits for that exact handle, requires report publication, then starts the already registered independent timing-audit once. No retries, kills, curriculum audit or adoption. Do not run the original run_latency_campaign.py: its successful-curriculum-audit prerequisite is now unmet. Preserve it as historical.

Runtime fallback is fully prepared, not queued: research/data/training-latency-runtime-comparison-v2 and training-latency-runtime-audit-v1; run_runtime_latency.py uses four fresh serial ABBA processes, fixed-state equivalence and cold-time accounting. All sources/configs pinned by runtime-latency-campaign.json. Pure timing fixtures4/4 pass. Invoke only after v3 integrity passes, when source window is free and further improvement is needed. Do not alter frozen pins.

First measured informative lesson0 pair is20.842s JSON versus13.962s native (about33% reduction); this is an interim single pair, below target and not a final result. Both exactly reproduce old receipts/state. Native publication costs1.689s versus10.778s, while paced neural work and other costs remain. Complete all workloads and independent disk checks before drawing conclusions or selecting the fallback.


## Researcher requests total before/after graph timings

Report matched total training elapsed seconds and graph-forward seconds separately, along with CPU, checkpoint publication, pacing and setup/cold invocations. Do not sum nested timers, add component percentages, or claim selected acquisition lessons time the whole curriculum. Added python actions/summarize_training_latency.py: requires completed independent integrity audit, recomputes matched total times from all measured samples, verifies the pooled ratio and publishes a new total-times.json without replacing evidence. Small executable arithmetic check passes for units, counts and separate phase totals. No active/pinned source changed.

Researcher asks whether40% and83% total reductions are achievable. Answer:40% by a margin is plausible but unproved; first completed pairs roughly33-45%.83% corresponds to~5.9x overall and is not justified by current evidence; it would require much larger savings beyond checkpoints. Competitor workload/equivalence evidence is unavailable. Preserve original declared gates; feasibility questions do not justify a claim or silently redefine the benchmark.


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


## First-principles pivot after researcher challenge

Researcher says micro-wins may miss the main issue and reports Fable took7h for83.3%; this is context, not an imposed time budget or verified comparator. Current clean four-process trial stays frozen and completes. In parallel, Exa primary-source review identifies exact binary evidence and temporal serialization reuse options, but the larger next question is redundant full-graph computation. Do not select another small codec variant without addressing it.

Stage an observational action on existing states: all24 stages/all6 arms; first/middle/last lesson selected before results; all19 frames; exact per-neuron/chunk comparisons and original receipt neuralStateHash checks. No graph loading, teaching, biological gate or speed claim. Wait until the live benchmark and audit are terminal before reading many checkpoints. If final-state reuse is high, measure intermediate dependency/dirty-row closure before implementing an exact incremental engine. If low, preserve the negative result and pivot from evidence. Do not use approximate activity thresholds or change edge summation. Sources registered before this new analysis.

Coverage correction: rendered crypto fetch truncated before the relevant Hash section despite its anchor. Version-pinned upstream raw document subsequently covered the exact hash.update section. A live draft ECMAScript page labels itself2027; record that status rather than treating it as the installed runtime's version. Earlier bulk text search disturbance remains isolated to v3; no new local tests/searches or heavy file analysis run beside the fresh runtime trial.


2026-10-19 first-principles investigation: researcher asks whether repeated whole-graph computation, rather than small component improvements, is the main weakness. Prepared a separate observational analyzer, .codebase/scripts/evaluation-and-performance/analyze-neural-state-reuse.mjs, registered in python actions/neural-state-reuse.json (sourceSHA6ee9cbd10ae09a292c188cd7969b9382a189e7a0ff98d5c64bf8bd49cfab58a0). It fixes72 lessons across all24 stages before observing values, reads1368 original acknowledged frame states, checks their full-neuron receipt hashes, and counts exact per-neuron/chunk changes. No graph simulation or parameter update. Self-check and complete execution remain pending until the active runtime benchmark/audit are terminal; do not launch concurrently or treat observed reuse as a speedup.

Possible next architecture is exact dirty-row recomputation with original edge sum order and complete histories. Archived final-frame stability is only a feasibility screen; intermediate states, causal dependency closure, cache correctness under updates/restoration and memory cost still require measured validation. No approximate threshold, changed graph, new biological claim or implementation is authorized by a favorable reuse count alone. Existing frozen runtime comparison continues.


## Structural costs to question, with fixed correctness boundaries

1. Full sparse recurrence is recomputed for every frame/action. An exact incremental alternative may reuse a row only when its drive, weights and relevant previous-state values are identical; dirty rows retain original edge order, precision and complete histories. No thresholding or approximate delta accumulation. The staged all-phase state-reuse observation is the first feasibility check, not proof of an engine speedup.
2. Pending and acknowledged publications contain the same large transient neural state while acknowledgement changes receipt metadata. More fundamentally, transient episode state may be deterministically reconstructable from a bounded lesson-start publication plus verified frame history, while persistent gains/traces and pending receipts still require durable publication before acknowledgement. Possible future designs include a shared immutable physiology blob or periodic full snapshots with bounded replay. Neither durability barrier, fsync, receipt binding nor exactly-once updates may be removed. Recovery cost must be counted explicitly, and temporary reconstruction must never duplicate a lasting update. This would be a new storage protocol with independent recovery proof, not a silent change to frozen artifacts. No implementation or win claimed.
3. Full independent audits currently discard verified work after interruption. Resume must use the auditor's own atomically published validated state, identities and receipt prefix; never trust the learner's assertion of validation. This helps interrupted workloads and must not be counted as a faster uninterrupted neural pass.

The researcher requested first-principles investigation rather than stopping after small wins. These structural hypotheses extend the existing code-path diagnosis; they do not relax scientific gates, resource bounds or frozen identity contracts. Prioritize evidence on whether large repeated work is avoidable before another compression/copy microbenchmark.


## Pre-execution observational refinements; v1/v2 preserved

V2 adds exact Float32 XOR-word/byte change counts to the same72 preselected lessons, without claiming compression speed or ratio. V3 corrects a methodological blind spot before any reuse results are observed: all lessons reset their transient episode to zero, so global startup work might recur at corresponding frame indices even if adjacent frames differ. Compare first lesson's19 frames with the same indices in middle/last lessons of each of24 stages (912 cross-lesson pairs), alongside1296 adjacent pairs and1368 original hash-verified states. Public-input hashes distinguish same/different input comparisons. Equal outputs do not prove unchanged incoming dependencies or weights. One-stage reference storage is bounded to~9.73MiB; guards remain768/256MiB and duty0.5.

Use python actions/neural-state-reuse-v3.json and separate neural-state-reuse-fixture-v3.json; current v3 runnerSHA0b63088a350f783a8aca09915a25bb4ac61269fa7bad60778c6a8e0e0a6bdc6f. Preserved unlaunched v1/v2 sources/configs and generation actions. No gate/selection tuned from data, no new local analysis/test launched while runtime audit remains live. Next run self-check, archived six-neuron integration, then full archived-state observation once audit7988 is terminal. No graph loading in this action.

A post-timing host snapshot records836MiB available,961 page-inputs/s,159 page-reads/s, reported1700MHz and Balanced power scheme; several Chrome/Code working sets are large. This is a single later sample and cannot identify conditions or cause during earlier timing batches. No app/process or power setting changed. Actual second baseline245.7s->668.1s variation remains in timing-context.json, per-round totals and raw reports; do not attribute it solely to RAM or advertise the larger percentage as a stable device constant.


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


### 2026-10-19 causal observer v1 integration failure and pivot

PID14508 is terminal/missing, stderr546bytes, no report. All72 lesson logs reached exact=true and the runner reached final report construction after its912-observation assertion, but report metadata dereferenced mapping.inputs.graph; six-neuron fixture mappings do not contain inputs. TypeError at profile-trajectory-reuse.mjs:223; raw logs runs/python-actions/20261019T080104-f4b8cd51/. This is a reporting compatibility mistake, not evidence of a learner/math failure. Final causal counts existed only in RAM and were not published, so do not claim a completed integration or reuse percentages. All3024 checkpoint publications and72 sample files remain preserved.

Pivot before further graph execution: preserve v1 runner/protocol/config/run untouched; create v2 with an explicit null graph-file hash for fixtures and the original pinned graph hash for actual graph runs. Also stream completed per-lesson causal observations to a separate diagnostic JSONL so a later reporting failure retains them; this stream does not acknowledge/resume learner updates or replace durable checkpoint receipts. Re-run the whole small integration in a new directory; only then consider full graph. The full-graph v1 protocol was prepared but never launched. Assertion helper is unchanged; no production math changes.


### 2026-10-19 causal observation v2 supersedes failed v1 reporting

The v1 six-neuron run reached all72 exact lessons, then failed final report construction because fixture mapping.inputs is absent. Preserve the failed run, all3024 checkpoints/sample files and546-byte stderr; no completed causal report exists. V2 runner fixes only fixture graph-file metadata (null for a fixture) and streams completed per-lesson observations so a later metadata error retains diagnostic counts. Original trainer, mathematical operations, timing/feedback, receipt publications and assertion helper are unchanged. V2 runner SHA edddbf1e8281a30581da8dccdb254779ebc5d7737b5315b6c31b5ad13de83121. Separate fixture run PID13460, logs runs/python-actions/20261019T080302-408d0081/. Full graph is not launched until this new integration completes. Use python actions/trajectory-reuse[-fixture]-v2.json; v1 artifacts remain immutable.
