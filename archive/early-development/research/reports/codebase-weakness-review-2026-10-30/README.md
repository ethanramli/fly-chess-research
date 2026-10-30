# FlyChess codebase weakness review — 2026-10-30

This review found **seven verified weaknesses: three critical, two high, one medium and one low**. The most consequential gaps are incomplete position/symmetry separation checks, repeated counterfactual pairs being counted toward D5, and D8 reporting pending-receipt recovery from an uninterrupted replay. Additional failures concern stale checkpoint selection after a hard interruption, incomplete source pins, a supervisor-lock race and stale recovery guidance. These are bounded findings about the code and its evidence contracts; they do not establish actual sealed-set leakage, corrupted experimental results or failure of the learner itself. All nine requested areas were reviewed within the contract's read-only limits. No graph, training, production audit, network upload or experiment-control operation was run.

| Rank | ID | Severity | Component | Verdict | Finding |
|---|---|---|---|---|---|
| 1 | W01 | critical | Data separation | CONFIRMED | Split audit does not establish position or symmetry separation. |
| 2 | W02 | critical | Gate/audit integrity | CONFIRMED | One counterfactual board pair can count 32 times toward D5. |
| 3 | W03 | critical | Gate/audit integrity; persistence | CONFIRMED | D8 substitutes uninterrupted replay for pending-receipt recovery. |
| 4 | W04 | high | Persistence/resume | CONFIRMED | A saved recovery pointer can override newer published checkpoints. |
| 5 | W05 | high | Reproducibility | CONFIRMED | Executed numerical and certificate-checking dependencies are unpinned. |
| 6 | W06 | medium | Supervisor/tooling | CONFIRMED | The single-supervisor lock is not acquired exclusively. |
| 7 | W07 | low | Documentation drift | CONFIRMED | Current recovery guidance retains superseded barriers and registration state. |

“CONFIRMED” means reproduced or traced through the relevant call path. It does not mean a hypothetical malformed input occurred in an existing experiment.

## W01 — Split-disjointness flag does not establish position separation

**Component / severity / verdict:** Data separation; **critical; CONFIRMED by code trace**.

**Locations:** `.codebase/scripts/data/audit-lichess-stage1-synthetic-families-v1.mjs:109` and `:124`; generator `.codebase/scripts/data/prepare-lichess-stage1-synthetic-families-v1.mjs:269` and `:288`; requirement `documentation/design/puzzle-learning/principles-curriculum.md:31`.

**Failure scenario:** Different source games, assigned distinct split buckets and family IDs, can produce identical or symmetry-equivalent synthetic task positions. The audit compares only family IDs and source-game IDs across splits, then emits `familySplitsDisjoint: true`. The generator's exact-FEN `seen` set is local to one source family; it neither compares splits nor canonicalizes symmetries. The evaluator trusts the pinned audit and independently compares family IDs, rather than establishing positional separation. Thus the prerequisite can pass while a training task has an equivalent held-out task.

**Evidence:** Read the generator, data auditor, evaluator `validateDataAudit` and acceptance prerequisite path. The code makes no cross-split board/symmetry comparison. No sealed rows or final-plan contents were opened to test whether this occurred.

**Impact on existing evidence:** Full-r14/full-r15 rely on this prerequisite path. Their disjointness flag alone is insufficient evidence of the stronger separation required by the curriculum. Actual overlap and score impact remain **unknown**; this finding does not invalidate those scores by itself. The producer also uses the same three template constructors in every split: source-family holdout must not be described as holdout of motif-construction algorithms.

**Smallest fix:** Add an independent, hash-bound comparison of task-relevant canonical positions under explicitly allowed chess symmetries. Preserve history-dependent distinctions where required. Publish only overlap counts/witness hashes to keep final contents sealed. Reject overlaps before registration.

## W02 — D5 can count the same board pair repeatedly

**Component / severity / verdict:** Gate and audit integrity; **critical; CONFIRMED by reproduction and trace**.

**Locations:** `.codebase/scripts/data/audit-lichess-stage1-synthetic-families-v1.mjs:56` and `:73`; `.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs:372`; `.codebase/src/puzzle-learning/curriculum-stage-acceptance.mjs:87`, `:97`, `:109`.

**Failure scenario:** Repeat one genuine reversed-outcome board pair 32 times under distinct `pairId` strings. The data auditor checks reversal and total count; the evaluator checks membership and different panels within each entry; the gate checks unique pair IDs. None requires distinct unordered board pairs or coverage of all 64 final boards. A learner correct on that one pair can be credited with 32/32 pairs.

**Evidence:** [verify-gates-and-pins.mjs](verify-gates-and-pins.mjs), [output](gates-and-pins-output.json). The actual gate accepted synthetic unit-test observations containing one pair repeated 32 times, with D5=true and counterfactualPairsCorrect=32. The actual data-audit function also passed the current **training-only** package after replacing its 12 pairs with 12 renamed copies of one valid training pair. Baseline training audit passed. The v2-to-v4 source diff confirms this path is unchanged. The test uses no real final observations.

**Impact on existing evidence:** Confirmed acceptance hole for malformed plans. No claim that full-r14/full-r15 actually have duplicate final pairs: the producer constructs distinct indexed pairs and their sealed plans were not inspected. Existing D5 conclusions need independently established pair coverage, rather than relying on pair-ID uniqueness alone.

**Smallest fix:** Validate unique unordered board pairs and the registered one-pair-per-board coverage in the data audit and acceptance path. Bind both members to the corresponding final-choice records. Keep the reversal and successful-choice requirements.

## W03 — D8 claims recovery without exercising recovery

**Component / severity / verdict:** Gate and audit integrity / persistence; **critical; CONFIRMED by end-to-end trace**.

**Locations:** `.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs:394`; `.codebase/src/puzzle-learning/curriculum-block-audit.mjs:92` through `:101`; `documentation/design/puzzle-learning/principles-curriculum.md:27` and `:64`.

**Failure scenario:** Every lineage completes and its receipts replay uninterrupted, but restoration from a published pending update is broken or never tested. The evaluator nevertheless sets `pendingReceiptExactlyOnce` to the same `fullNeuralReplay` conjunction used for certificate/update replay. The block auditor reconstructs the complete log and reads the final acknowledged checkpoint (`pendingReceipt === null`); it does not restore a pending publication or exercise the append-before-acknowledgement recovery branch. D8 can therefore pass without its specified recovery observation.

**Evidence:** Traced matrix audit -> stage audit -> block audit -> evaluator -> D8 decision rule. A successful replay is real evidence of the completed trajectory, but the boolean at evaluator line 394 has no pending-recovery witness as input. Existing software tests of recovery are distinct from this per-experiment independent audit. The preserved acceptance tests pass despite not requiring such a witness.

**Impact on existing evidence:** The D8 recovery subclaim for full-r14 and the r15 audit path is not established by this boolean. This does **not** show that ordinary receipts duplicate updates or that existing memory hashes are wrong. W04 independently demonstrates why uninterrupted replay and recovery correctness must be checked separately.

**Smallest fix:** Derive a separate recovery observation from an identity-bound pending-publication witness: restore into a fresh bounded audit context, replay both pre-append and post-append/pre-acknowledgement cases, and compare event count, receipt chain, memory and rankings with the uninterrupted result. Without that evidence, report this D8 subcheck as unavailable rather than true. Schedule any graph implementation separately; it was prohibited here.

## W04 — Resumed hard interruption can roll back acknowledged progress

**Component / severity / verdict:** Persistence, resume and replay; **high; CONFIRMED by source-expression check and call-path trace**.

**Locations:** `.codebase/src/puzzle-learning/lichess-curriculum-matrix-v2.mjs:124` through `:133`, `:150`; `python actions/curriculum.py:247` and its matrix-resume branch around `:835`.

**Failure scenario:** A resumed invocation starts from a saved block-8 checkpoint. Its matrix state records the older checkpoint pointer plus the new active attempt directory. The stage runner durably publishes later checkpoints, for example block 16, but the process is terminated without reaching the matrix coordinator's catch or completion code. On the next resume, the existing `savedActive.latestCheckpoint` wins before the code scans the active attempt. Python checks that a checkpoint exists in that attempt but forwards the unchanged matrix state. The learner resumes block 8 rather than the latest published progress. The same preference exists for a saved block-level pointer.

**Evidence:** [verify-recovery-selection.mjs](verify-recovery-selection.mjs), [output](recovery-selection-output.json) execute the exact selection expression extracted from the current source with mocked paths: saved block 8 was selected and the scanner was never called despite a newer block-16 publication. Code trace confirms that pointers are refreshed on caught errors/returned pauses/completion, rather than at every stage publication.

**Impact on existing evidence:** Applies to a **hard interruption of an already resumed invocation**. Caught exceptions update the pointers and are outside this scenario. Full-r15 training is reported complete, so no such occurrence is established there. Earlier resumed experiments were not inspected to infer occurrence. The failure can waste hours and violate “resume the last completed publication”; it rolls memory back and repeats exposure from that rollback rather than proving double application to the same restored memory.

**Smallest fix:** Reconcile the active attempt's newest complete stage and matching block checkpoint with saved pointers before choosing recovery. Validate lineage, identity, sequence and continuity, preserve parent attempts, and refuse conflicts. A regression should cover two interruptions with the second bypassing the catch.

## W05 — Registered source pins omit executed dependencies

**Component / severity / verdict:** Reproducibility; **high; CONFIRMED by static import/pin comparison and execution-path trace**.

**Locations:** `python actions/curriculum.py:285`; the `pins` objects of the four `python actions/lichess-stage1-synthetic-v1-full-r15-{r1,r2,r3,merge}-step.json` files; `.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v5.mjs:81`; `.codebase/src/supervised-baselines/trainer.mjs:74`; `.codebase/src/puzzle-learning/lichess-curriculum-panel.mjs:105`.

**Failure scenario:** A relative dependency such as `trainer.mjs` or `capture-retention-certificate-check.mjs` changes while its callers, registrations, graph and listed pins remain identical. Python verifies only listed pin entries; the runner checks its explicit references, not a transitive source manifest. The imported forward dynamics or consequence checker can change under the same registered identity. Hashing parameter arrays does not hash the JavaScript implementing those dynamics.

**Evidence:** [verify-gates-and-pins.mjs](verify-gates-and-pins.mjs) walked literal relative imports from runner v5, runtime factory v8 and evaluator v4 without executing them. [Output](gates-and-pins-output.json) records 66 reachable source modules and 37 absent from **all four** step pin maps and the registration's path/hash references. The two named examples execute through the factory/assessment and panel-certificate paths. The protocol contains no additional transitive source-hash manifest.

**Impact on existing evidence:** Full-r15's advertised zero pin mismatches does not mean its entire executing implementation is pinned. Actual mid-run edits or divergence are **not established**. Some reachable imports are unused search/comparison code; the count of 37 is not a count of active learning modules, and importing Adam does not mean backpropagation occurred.

**Smallest fix:** Pin the actual source dependency closure, including numerical kernel, verifier, receipt/checkpoint and audit helpers, and bind its manifest hash to training/resume/audit. Record Node/dependency runtime identities too. Preserve a matching source snapshot; do not mutate active pins to conceal a mismatch.

## W06 — The supervisor lock has a check-then-replace race

**Component / severity / verdict:** Supervisor and tooling; **medium; CONFIRMED by mocked concurrency reproduction**.

**Locations:** `python actions/curriculum.py:693` through `:706`; `:48` (`atomic_json`).

**Failure scenario:** Two callers both observe the supervisor lock as absent before either publishes it. Each writes a unique temporary file and `os.replace` overwrites the same lock. Both enter `_supervise`, although the wrapper claims one supervisor per step. Atomic replacement publishes complete bytes; it does not provide exclusive acquisition.

**Evidence:** [verify-supervisor.py](verify-supervisor.py), [output](supervisor-output.json). Two threads interleaved the actual `supervise` wrapper with mocked process inventory and supervisor body. Both reached that body concurrently; no jobs, actual process inspection or experiment directories were touched. The normal sequential live-owner check, live-job adoption and transient-inspection retries have landed and were read.

**Impact on existing evidence:** No evidence that two real supervisors raced for full-r15. The short exclusive `.launch-lock` in `execute` provides a separate launch guard; this reproduction does **not** prove duplicate graph jobs. Concurrent supervisors can still race campaign/handle transitions, so the stated single-supervisor guarantee is false.

**Smallest fix:** Acquire ownership with exclusive creation or an OS lock before checking/replacing state. Reconcile stale ownership using process creation identity and release only the acquired ownership token. Preserve the separate launch guard.

## W07 — Recovery guidance retains superseded barriers

**Component / severity / verdict:** Documentation drift; **low; CONFIRMED by current-source comparison**.

**Locations:** `documentation/handoffs/reasoning-research-goal-2026-10-28.md:13`, `:38`; `.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs:1`. Correcting records: ledger L093/L094; `research/project/decision_log.md` entry “2026-10-30 01:45”; full-r15 protocol/registration.

**Failure scenario:** A recovering reviewer follows the handoff's current step and weakness map: cue v2 is still being fixed, one board is “never acquired”, and evaluator v4 awaits a researcher decision. Current registration pins v4 and the ledger says r15 training has completed and its audit started. The training-side memory report explicitly corrects “never acquired” for later revisions. The frozen evaluator header also still says “not registered”. Acting on those statements can repeat superseded diagnosis or wait for a decision already exercised.

**Evidence:** Compared the handoff, registration/protocol, current status, newest ledger and decision-log entries, and `research/reports/stage1-memory-literature-and-surrogate-2026-10-27/README.md` section 4 correction. No experiment's validation/final output was opened. Current-status's newest entry also stops at launch while the ledger has a later audit milestone.

**Impact on existing evidence:** Misleading recovery/navigation, not demonstrated numerical corruption. Dated historical status entries remain valid history; the defect is in current-summary wording without a superseding pointer.

**Smallest fix:** Append a dated correction to the current handoff/weakness map and link the newer registration and ledger. Preserve frozen source bytes and historical failures; clarify the old evaluator header in an external addendum rather than editing pinned code.

## Coverage of all nine requested areas

| Area | Reviewed path and assessment |
|---|---|
| 1. Gate/audit integrity | W02/W03. Read the acceptance rule, stage/block/matrix auditors, evaluator v4, v2-to-v4 diff, alpha readout and report formatter. D1/D2/D3 counts, stratum/family floors and all-legal tie handling match their definitions on the traced path. D4 v4 computes MBON14−MBON07; finite nonnegative inputs required, zero incorrect. D6 aligns control record identities and uses the declared seeded family bootstrap. D7 is explicitly deferred under policy B. D8 scratch ablation and repeated validation rankings have concrete paths; the pending-recovery flag is the exception. Reporter faithfully displays stored verdicts and does not claim to recalculate an audit. |
| 2. Data separation/leakage | W01/W02. Reviewed synthetic producer, training data audit, registration metadata and evaluator file-open order. Planner consumes training panels; checkpoint selector uses validation only; final rows are opened after durable selection publication. Shared template code limits structural novelty. Reuse of r14 final families after a failed gate is explicitly disclosed in r15, so new seeds do not make that set an untouched confirmatory test. No current-data overlap conclusion is made. |
| 3. Learning mechanism faithfulness | **Reviewed, no additional implementation defect found in the active path.** Runner v5 -> runtime v8 -> brain factory v8/v7/v6/v5 -> CoupledOutcomeOnlyBrain -> brain v5/v3 -> AlphaLobeMemory. Forward propagation uses SparseTrainer, but the traced learner calls forward/setMagnitude/local observe, not supervised backward/Adam updates. Task success co-stimulates PAM02/PAM11; failure PPL103/PPL106. Released root indices and positive existing KC edges are checked against mappings; gains are bounded. Biological validity of coarse compartments, immediate alpha3 updates and deterministic persistence remains an assumption explicitly described in code. No biological revalidation was performed. |
| 4. Feedback correctness | **Reviewed, no additional defect found in the Stage 1 path.** Panel binder, capture/action certificate checker, coupled preparation/session and independent block replay bind exact PGN/FEN/task/action, enumerate all required immediate replies, reject incomplete/mismatched proofs and stop unknowns before teaching. Fresh all-legal scores and memory identity are recorded before feedback. Outcome-only remaps informative to task-only; the retained engine estimate is not delivered to informative memory. Binary one-reply valence does not establish delayed credit or strategic evaluation. |
| 5. Persistence/resume/replay | W03/W04. Read pending publication -> log append/fsync -> acknowledgement checkpoint, recovery acknowledgement before a new frame, frame rollback on error, stage continuity and merge paths. No additional duplicate-update defect found in the ordinary caught-error path. Controls inherit their replica's informative plans and matched presentation exposure. Merge checks registration/protocol, replica order, conditions and duplicate lineage keys. Static inspection supports per-replica independence; full-graph numerical equivalence was not rerun. |
| 6. Supervisor/tooling | W06. Reviewed hardened lock, inventory identity matching, live-job adoption, retry helper, two-resample resource response, launch guard and fly_controls pause/report paths. Unknown inspection does not authorize a new launch. An audit guard breach stops supervision for review while leaving the process untouched; a train runner can receive a cooperative pause. No actual launch, pause, detach, babysit or audit command ran. |
| 7. Representation/readout ceilings | **Reviewed, no additional code defect inferred from existing reports.** Reviewed training-only representation-ceiling, memory/surrogate and eye-route reports. Linear/perceptron transfer failures are measured for those learners and inputs, not a mathematical impossibility theorem for all models. Eye-drive strength and pool coverage are model/rendering-specific recorded measurements; the approximate 140× lesson comparison is an extrapolation from activity scaling. Candidate information is absent from eyes alone. Natural perception, general position-value calibration and multi-ply reasoning remain unestablished. |
| 8. Reproducibility | W05. Graph/mapping/model-source references, encoder/memory settings, replica seeds and cached review hashes have explicit checks. The source closure is incomplete. This review's current source hashes for the missing dependencies are preserved in the output; no graph bytes were loaded. |
| 9. Documentation drift | W07. Compared current status, goal/handoff, newest ledger, decision log and r15 protocol/registration. “Stage 1 accepted” is not claimed here. Older dated experiment statements were treated as history. No existing project documentation was changed. |

## Checks performed and retained evidence

- [Gate and pin check](gates-and-pins-output.json): repeated pair accepted by gate (32/32) and training auditor (12/12); source walk 66/37. Process RSS 86.6 MiB; free memory about 5,264 MiB at completion.
- [Supervisor check](supervisor-output.json): two concurrent mocked entries, zero errors.
- [Recovery selection check](recovery-selection-output.json): old block 8 selected, zero scans of active attempt despite newer block 16.
- [Alpha-lobe tests](alpha-lobe-tests-unsandboxed.txt): **4/4 passed**.
- [Acceptance tests](acceptance-tests-unsandboxed.txt): **8/8 passed**. These ordinary tests coexist with the reproduced missing-coverage check; passing them does not refute W02/W03.
- Initial sandbox [alpha](alpha-lobe-tests.txt) and [acceptance](acceptance-tests.txt) logs preserve `spawn EPERM` before test execution. Escalated reruns are separate files.
- `tasklist` confirmed Node PID 9520 present at the precheck. This is a point-in-time process observation; its terminal state and final results were not inspected.
- [Review corrections and scope refinements](review-log.md); [exact shell commands](commands.md). Report artifacts and scripts are the only review writes.

## Checks deferred to preserve the contract

1. **Positional/symmetry overlap and final pair coverage:** an authorized independent audit should compare canonical identities and verify final plan coverage, publishing only safe aggregates. This review must not open sealed rows or final evaluation outputs.
2. **D8 pending publication and W04 crash recovery:** an authorized bounded experiment should exercise pending-update and append-before-acknowledgement recovery and a second hard interruption during a resume. No process was deliberately interrupted here.
3. **Parallel equivalence:** compare complete serial and split-replica memory/receipt/ranking identities under identical pins, seeds and schedules. This requires graph execution and was prohibited; merge bookkeeping alone is insufficient proof.
4. **r15 gate outcome and inherited r14 readout failure:** no final/validation outputs were re-read or rescored. Existing documentation supplied context; this review does not independently certify either experiment or choose a new readout from held-out performance.

These are limits of the permitted review, not unfinished authorized experiments. The required nine-area review and ranked findings are complete; proposed fixes remain unapplied.
