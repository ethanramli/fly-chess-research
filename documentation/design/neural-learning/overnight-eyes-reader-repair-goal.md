# Overnight goal: Eyes, graph and neuron-reader repairs

Requested 2026-11-01. This document is the execution brief for a future `/goal` invocation. Saving it does not start experiments.

## Objective and authority

Diagnose, repair and verify the Eyes → graph → neuron-reader pathway, focusing on MBON05 sign provenance and outstanding eye/reader checks. Deliver tested, reviewable changes and an honest readiness decision.

The researcher authorizes necessary implementation, software verification and bounded serial graph experiments for this scope, including completing the authorized MBON05 comparison and executing the read-only eye test after its prerequisites pass. Chess training, memory-rule selection, changes to frozen gates and sealed evaluation families remain outside scope.

Do not ask the researcher questions during this task. Resolve factual uncertainty through repository evidence and primary-source internet research. For engineering decisions, choose the smallest defensible option consistent with the approved plan and record assumptions. Where scientific evidence is missing, narrow the claim or leave the decision unresolved.

Follow repository AGENTS.md instructions. Use approximately eight hours from execution start as the work budget; record the start and deadline. Start no experiment that cannot reasonably finish and publish within the remaining budget. Preserve tracked process identity and terminal evidence for any work launched.

## Read first

- Repository `AGENTS.md` and [current status](../../current-status.md).
- [Approved restart plan](../research-goals/restart-plan-2026-10-30.md).
- [Neuron-reader design](neuron-reader.md).
- [MBON05 provenance](../../../research/reports/mbon05-sign-provenance-2026-11-01/README.md) and [conditioning protocol/adapter](../../../research/reports/mbon05-sign-conditioning-2026-11-01/README.md).
- [Graph audit](../../../research/reports/neuron-reader-graph-audit-2026-11-01/README.md), [Eyes identity trace](../../../research/reports/eyes-retina-identity-2026-11-01/README.md) and [reader build](../../../research/reports/neuron-reader-build-2026-10-31/README.md).
- [F03/F04 pre-data corrections](../../../research/reports/overnight-memory-plasticity-2026-10-31/pre-data-corrections.md).
- [Latest live-memory comparison](../../../research/reports/long-term-memory-v1-live-comparison-2026-11-01/README.md).

Reconcile historical statements against the latest raw artifacts rather than treating every pending statement as current.

## Scope and blocker-first order

Work on these two questions:

1. What causes the MBON05 sign discrepancy, what are its functional consequences, and does evidence justify a correction?
2. Does the Eyes → graph → reader measurement path satisfy its contract and carry usable task information under the approved eye-test protocol?

Repair another component first only when a reproducible defect directly blocks or invalidates those questions. Read the actual call path and fix shared root causes. Record a ranked blocker list separating confirmed defects, unresolved assumptions and unrelated historical failures. A major redesign becomes an explicit blocker; continue other independent work within scope.

Audit direct prerequisites: source/graph identity, root/index mappings, retained edges, Eyes rendering, dynamics/sign application, transient reset, complete persistent-state preservation, reader roster/sampling/copied values, candidate order, board/history bindings and applicable conditioning feedback/audit bindings.

Annotation disagreement alone is not a demonstrated component defect. Transmitter polarity, behavioral valence, teaching sign and move-score coefficient require separate evidence.

Preserve engineered memory and other sessions' owned files. Biological memory repair, APL redesign, new memory architectures, chess acquisition, transfer experiments, Elo work and general cleanup are outside scope.

## Workstream 1: MBON05

Verify the complete chain from source annotation through graph construction to runtime sign use. Research primary sources where interpretation is uncertain; register externally sourced adaptations before experimental use.

Complete the prepared baseline/sign-variant comparison in isolated pinned artifacts after prerequisites pass. Preserve the released graph, freeze identical stimuli across variants, declare changed identities and use the prospectively registered informative and matched control conditions. Verify the adapter and complete the registered replay/audit.

Report all associations and conditions. A variant difference establishes sensitivity to the sign assumption, not biological truth. Adopt a correction only when provenance and verification support it; otherwise preserve explicit alternatives and identify the missing evidence.

Completion: publish the verified provenance chain, test/audit outcomes and a supported recommendation to adopt, retain alternatives or defer. An unresolved biological decision can complete the investigation; it cannot be called a repaired component.

## Workstream 2: Eyes and neuron-reader

Reconcile prior diagnoses first. The flagged photoreceptor subtype conflicts have not demonstrated wrong root/index mappings.

Verify the implemented measurement contract: exact cells/identities; endpoint values and independent copies; rejection of missing/nonfinite data; unchanged complete persistent state and real board/history; candidate-order invariance from the same snapshot; and separation of passive observations from deployed scores.

Resolve the documented F03/F04 prerequisites within the approved plan. Preserve frozen numerical gates and use physiologically attainable model states for usable-signal claims. If resolution would require changing a frozen gate, report the blocker instead.

Prepare and execute the authorized read-only eye test only after its prerequisites pass. Use the prescribed comparators, report usable task information and its limits, and keep diagnostic decoding separate from a deployed move scorer.

Research scoring-coefficient provenance and memory compatibility as far as evidence allows. Production coefficients cannot be fitted to task labels, engine scores or sealed positions. Preserve unknown signs and unresolved chooser decisions explicitly.

Completion: publish contract checks and the eye-test result, or the exact prerequisite preventing execution, plus a readiness decision. Recorder correctness alone does not establish a useful chooser.

## Bounded iteration loop

Allow at most three substantive design/repair iterations per workstream. Record routine software corrections too; they do not automatically require another graph experiment.

For each iteration:

1. State the blocking question and smallest proposed change.
2. Register the test and falsification criterion before new graph data.
3. Challenge the design: strongest confound, alternative explanation and likely failure mode.
4. Implement the smallest justified patch in unfrozen code.
5. Run focused checks and required regressions; run `npm test` for core-math changes.
6. When necessary, register and execute one bounded serial graph experiment through the repository Python-action workflow.
7. Perform separate arithmetic/replay verification where applicable; state which evidence it does not independently regenerate.
8. Review connected code and evidence for changed inputs, identity leakage, persistent-state mutation, invalid controls and unsupported conclusions.
9. Record mistakes/pivots immediately, then accept, make one targeted revision or stop the workstream with a precise blocker.

Repeat experiments only for a documented new question, repair or predeclared replication. Preserve failed attempts and final-family separation. Avoid latency work and abstractions unless required by this scope.

## Execution discipline

Inspect authoritative processes and artifacts before graph work or dependency changes. Keep graph experiments serial. Preserve another owner's work; stale status or elapsed waiting does not authorize interruption/restart. While the graph slot is occupied, progress on research, software checks, protocols and review.

Use repository Python actions for repeated CLI work and bounded monitoring. Preserve commands, pins, one run identity, resource guards and recovery semantics; retain raw logs in artifacts and concise milestones in context.

For new unfrozen work, enforce at most 2048 MiB RSS, at least 256 MiB free system memory, Node heap 256 MiB and CPU duty 0.5, or stricter applicable protocol limits. Keep sparse processing and existing frozen sources/gates intact.

Apply the repository feedback-quality requirements to conditioning experiments. Unknown verification creates no teaching event. Read-only eye diagnostics must name the gate-relevant question and feedback-enabled next step before launch.

Re-read shared files immediately before editing. Preserve other sessions' changes. Record all mistakes/pivots and update status, decision log, journal and navigation for material findings. No trained Fly version or reasoning claim is authorized.

## Stop and deliver

Stop when both workstreams have passed their applicable checks with supported conclusions, reached evidence-backed blockers within the iteration limits, or exhausted the time budget. Publish incomplete outcomes honestly. An untested proposal is not a completed repair.

Produce one linked overnight report containing:

- Initial blockers and final dispositions.
- Confirmed defects repaired, source/code identities and review findings.
- Protocols, exact commands, raw artifacts and audit links.
- Test outcomes, separating pre-existing failures from new regressions.
- Strongest remaining weaknesses and alternative explanations.
- MBON05 recommendation: adopt, retain alternatives or defer.
- Eyes/reader readiness decision.
- Exactly one recommended next bounded experiment.

Keep current status, decision log, journal and documentation navigation consistent with material findings. Final reply: briefly state what was fixed, tested and blocked, with the report link. Do not ask the researcher for a decision during execution.
