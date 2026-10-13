# 2026-10-08 bidirectional assay infrastructure review

Researcher requested reviewable assay infrastructure without training, graph experiments or prospective simulation. Ponytail mode was requested and applied. Initial process inspection found three Node processes (PIDs 1076, 16336, 17564); Windows denied command-line inspection. Their ownership/run identity remains unresolved, and none was interrupted or touched.

## Mistakes and pivots

- The inherited draft was initially treated as if it could be made into a prospective harness by adding a callback orchestrator. Inspection showed its `runAssay` reset each brain, replayed only JSON receipts through an undefined `fastForward`, omitted pending receipt persistence and never serialized physiological/neural state. Pivot: remove the replay orchestrator and retain only standalone planning, validation and receipt primitives; do not claim integrated resume.
- The inherited control planner shuffled channel labels but could accept degenerate permutations, did not require contingency balance, and represented anti-correlation as channel swapping without schedule-level matching checks. Pivot: require balanced schedule classes, seeded explicit assignments, identical ordered exposures and report shuffle agreement/identifiability.
- The inherited protocol described itself as frozen but lacked experience evidence fields expected by the runner; used fabricated/self-hash placeholder identities; and assigned the unknown event a positive expected channel. Pivot: mark the artifact as a development protocol blocked from execution, use explicit `unknown`, and have preflight reject unresolved identities.
- The initial anatomy audit was too optimistic in its shape: it streamed annotation columns without validating the header and inferred candidate cell counts from `hemibrain_type` alone. Pivot: treat it as a static blocker report only; do not claim it proves absence of a signal or anatomically supported branch. A fully pinned identity-bound map and raw signed local-rate trace remain missing.
- Atomic JSON publication primitives can be tested, but do not prove atomic learner-state resume, pending receipt idempotency or guard recovery across a live graph interruption. Pivot: list those as unresolved rather than extrapolating from a file helper.
- First fixture execution exposed an absent-arm plasticity flag mismatch, then a hyphenated-key typo in the test. Both were corrected before proceeding. First preflight exposed schema mistakes (schedule count compared with unique experiences, memory budgets read from the wrong block, and an invalid unknown channel); these were corrected, and identity placeholders remain deliberately rejecting. These were implementation/validation errors, not learner evidence.

## Current result and limits

Added a preflight-only entry point, protocol/receipt utilities, a fixture test file, and a development protocol README. The illustrative kernel remains disconnected from graph/plasticity state. Certificate fixtures cover exact board/history/action and independently recompute the one-ply capture-retention proof. No graph/model load, neural forward pass, training or prospective learner simulation was performed.

The signal-and-anatomy gate remains blocked: the current specification has no justified local bidirectional signal, defensible target-compartment/receptor mapping, or supported dynamics trace. The protocol records verified graph, delayed-memory, dataset and certificate-check hashes, but model, final encoder, readout, policy, protocol and candidate-kernel identities remain explicit placeholders. A graph-backed adapter, full checkpoint serialization, integrated pending-receipt exactly-once recovery, independent auditor, and locked behavioral/resource thresholds still require review.

Next test, if later authorized: complete a static identity-bound signal/anatomy feasibility report from pinned sources/model data, then implement and separately fixture-test the reviewed adapter and full state checkpoint. This work does not validate biology or establish learning.

- Source-certificate preflight caught a transcribed second-candidate digest mismatch before any event was used. Corrected it from the existing training fixture and retained the mismatch/correction here; no certificate or historical source file was modified.

- A second source-certificate check exposed that I copied the failure-candidate digest from the wrong panel while correcting the first mismatch. The action is from tr-01, and the correction now uses that exact panel/action pair; the strict source check remains in place.


Correction: `audit-plasticity-signal-anatomy.mjs` initially failed before reading inputs because `createHash` was imported from `node:fs` instead of `node:crypto`; no report was written. Corrected the import before rerunning.


Correction: The first static audit then reported a false upstream hash mismatch because the source manifest filename is keyed as `models_base.py`, not `models_base`. Corrected the manifest lookup; the earlier output was stdout-only and was not published. Rerun produced the report.

- Protocol correction pivot: preserved registered v1 bytes and created v2 for new matched evaluation-budget and resume-output publication requirements. The first PowerShell edit attempted to assign an undeclared JSON property and emitted an error; v1 was not changed, and v2 is being reloaded with Add-Member before its hash is frozen. This is a tooling mistake, not assay evidence.

- Protocol v2 digest generation initially failed because PowerShell stripped quotes from the inline Node -e argument; no digest was written. The protocol remains with an empty self-hash, and I am switching to a temporary source file to avoid shell-quoting ambiguity.

- Second digest attempt incorrectly retained --input-type=module while executing a .mjs file; Node rejected the redundant flag before running script content. No protocol bytes changed. Corrected invocation runs the temporary .mjs directly.

- First v2 static preflight exposed two validation issues: the protocol still pinned Node v22.23.0 while this workspace runs v22.23.2, and the v1 test still expected an empty protocol digest after the v2 digest had been frozen. The preflight correctly refused; no learning ran. I am correcting only the new v2 runtime identity and updating the fixture expectation; v1 remains preserved.

- Updating the v2 fixture test after preflight then exposed an incomplete in-memory test protocol: it lacked the now-required fixed search-budget object. The coordinator failed before the intended injected interruption. This was a fixture-contract failure, not a learner or persistence result; I am completing the fixture and asserting the fixed budget is passed to all adapter stages.

- The fixture resume test next failed before its injected interruption because its verifier stub returned a meaning label but omitted the required explicit erifiedScope field. The production verifier returns that field. Updated the test stub to exercise the same contract; no learner adapter was used.

- Gate-review mistake: the first auditor excluded all skipped records from control separation, which wrongly removed the absent-feedback arm even though its certificate was verified and only delivery was absent. It also read a top-level saturation array absent from the validated receipt schema, forcing saturation to be unknown. These are code-path defects, not assay outcomes. Correcting the control filter to retain verified absent-arm observations and deriving saturation from per-compartment gain rows; fixtures will set absent skipped=true and use the actual schema.

- Run-gate review mistake: the prospective branch validated protocol shape and adapter hash but did not repeat pinned-file hashes, source-certificate verification, map validation, or exact feasibility-report hash checks. It is currently blocked by placeholders, but that would become a bypass if later populated. Run mode is being changed to require the same complete static preflight result. This was found by code inspection; no prospective path ran.

## 2026-10-08 dated implementation addendum

The inherited callback/reset/replay-only orchestrator was not retained. Added a serial coordinator that snapshots per-arm physiological, neural-transient and eligibility state; randomization, identity, exposure counters and receipt status are included in checkpoints. Pending receipts are published before delivery; applied receipts are committed with the saved record, and resume publishes into a new directory, restores only the last completed checkpoint and copies acknowledged JSONL records. Fixture fault injection covers interruption during delivery, after-applied publication, and resource-guard recovery. makeVerifiedReceipt now requires outcome agreement and exact verified scope. Run mode now invokes the same complete preflight as dry-run before importing an adapter.

The first gate implementation incorrectly filtered verified absent-feedback observations and queried an undefined top-level saturation field; corrected both and added fixtures. Resource gate reads the pinned runtime limits. A separate run-gate inspection found missing rechecks in prospective mode; corrected to share complete preflight. V1 protocol was preserved; v2 adds fixed per-assessment evaluation budget, actual Node v22.23.2 identity, and the final coordinator/entrypoint hashes. V2 self-hash is set after these protocol changes.

Nine standalone fixture groups and four 
ode --check validations pass. Static preflight returns exit 1 by design with all registered file hashes and evidence matching, while model identity remains unresolved and the feasibility gate is blocked. Static audit: 139255 annotation rows, 14 mapped DAN identities joined; 786 PPL103 and 84 PAM02 existing mapped edges inspected, all fixed positive signs. This does not establish local bidirectional signals, receptor/target compartment, stabilization timescale or biological interpretation. No graph forward pass, neural learner, training or prospective simulation ran.

Unresolved required work: source-supported local signal and defensible target compartments; pinned model/encoder/readout/policy identities; reviewed graph adapter; independently certified contradictory contexts and a balanced, matched reversal schedule; and protocol/gate review after those inputs exist. The v2 run command in its README is a placeholder form and is explicitly not run. No claim of mechanism validation or learning.

- Protocol-design pivot: the registered schedule had no unaided retention-probe phase, while its preservation gate only covered interleaved coexistence. This would not test retention independently. Preserve v1/v2 and create v3 with matched probe-only slots. The coordinator will assess and record these without a teaching delivery, and the preservation gate will require both coexistence and probe margins. Certified contradictory reversal contexts remain unavailable and are not synthesized.

- Retention-probe fixture extension first failed because a new per-cue regression assertion referenced the test's protocol variable before its later const declaration. The coordinator and probe code were not implicated. I am moving that assertion below the fixture protocol initialization.

- V3 protocol correction: v1/v2 remain byte-preserved. Added 16 seeded alternating slots (eight cue cycles, delays 0–3) and two verified, no-teaching retention probes. The planner excludes probes from signal-dose balancing and assigns them null channels in every arm; fixture recovery includes a probe publication. The preservation gate now requires both coexistence and unaided retention-probe margins. For registered seed 20261008 the shuffle is identifiable with 12/28 correct-label agreement and preserves the 14/14 dose balance. No contradictory consequence was fabricated; reversal remains an explicit blocked gate.

- Bounded-memory review found checkpoint snapshots duplicated all physiological/neural/eligibility arrays in both egisteredState, dapterStates, and the cloned coordinator state. This could exceed the 256 MiB heap despite each adapter snapshot being individually bounded. Refactor to store full per-arm snapshots once, retain explicit state-location descriptors/randomization, omit redundant adapter-state copies from coordinator metadata, and enforce aggregate checkpoint bytes before publication.

- Final fixture extension: added a protocol-digest mutation assertion and a pure numerical fixture for the documented candidate equation. The candidate kernel remains disconnected from any learner adapter; this checks its math only, not a mechanism. Suite now contains ten fixture groups.

- Documentation-editing mistake: an ancillary PowerShell command targeted esearch/current-status.md instead of the authoritative documentation/current-status.md, creating a one-line blank stray file. It was not historical or linked; verified it was created by this command, then removed. The authoritative status was separately updated at its correct path.

The final static feasibility blocker details were checked against the pinned v2 report: (1) learner uses rectified above-rest DAN excess despite upstream signed-D source equation; (2) no pinned unrectified per-cell DAN trace/justified tonic baseline; (3) no receptor/synapse-coordinate compartment identity to assign distinct drives; (4) no mapped source-backed stabilization timescale. These are gaps, not evidence that a future mechanism is impossible. The report is static and performs no activity simulation.

- Documentation patch attempt used a stale 
ine fixture groups context after the README count had already been corrected to ten; the patch made no changes. Re-read the current section and applied the blocker clarification against its actual text.

## Final verification — 2026-10-08

Ten standalone fixture groups passed: control assignment/dose, certificate and ranking binding, identity/split checks, atomic hash publication, resource guard, protocol/certificate preflight and digest mutation, per-criterion and saturation gates, local-drive/state-isolation contract, candidate-kernel numerical fixture, and interruption/resource/idempotent resume including unknown and retention-probe no-delivery cases. 
ode --check passed for coordinator, runner, anatomy audit, and fixture file. Static preflight intentionally exited 1: all 20 pinned file hashes matched, mapping validation passed, exact success/failure source certificates matched, unknown was nonteachable, feasibility report hash matched but gate was blocked; protocol also reports unresolved model identity and missing certified reversal schedule. No training, graph experiment, or prospective learner simulation ran. Final process inspection still showed Node PIDs 1076, 16336, 17564 with command-line ownership unavailable earlier; none was touched. The only run folder observed was the old 2026-09-30 puzzle-round artifact.

- Adding the auditor exposed an import-side-effect issue: the runner parsed CLI arguments even when imported by another script. The first entrypoint guard introduced a misplaced semicolon in the conditional expression; 
ode --check caught it before execution. I am fixing the declaration and rerunning syntax checks; no run or audit was started.

- Independent-auditor fixture integration first exposed that the compact resume-test protocol had no registered gate table, while production v3 does. The audit correctly refused to compute behavior gates from an incomplete fixture. I am adding explicit fixture thresholds; no auditor or learner run started.

- Added the independently invoked post-run auditor after review of the existing capture-retention auditor. It re-verifies source certificates and exact context, checks signal/control assignment and per-slot exposure parity, validates checkpoint identity and behavioral/resource records, then computes pre-registered per-criterion gates. It never opens the graph. Fixture tests include normal, unknown/exhausted and retention-probe receipts. The auditor is pinned in protocol v3 but cannot run until complete preflight passes.

## Final verification correction — 2026-10-08

Added and pinned udit-bidirectional-plasticity-assay.mjs after the first final check to meet the independent post-run certificate audit requirement. The runner is import-safe; the audit command refuses before reading a run unless complete preflight passes. Fixture suite still passes all ten groups, including read-only audit of fake records produced by inert adapters for known, unknown/exhausted and probe cases. Four source/test modules pass 
ode --check. Repeated static preflight: 21/21 pinned hashes match, map and success/failure certificates pass, unknown remains nonteachable and the exact feasibility-report hash matches. Expected exit 1 is due to missing model identity, blocked anatomy report and no certified two-direction reversal schedule. No learner graph, training or audit of a real run was executed.

Verification count correction: the final 
ode --check batch covered five files (coordinator, runner, independent auditor, anatomy audit and fixture test), not four as stated in the preceding entry.
