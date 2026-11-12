# Neural feedback and memory code

[Src guide](../README.md) · [Code guide](../../README.md)

[Design and scientific boundaries](../../../documentation/design/neural-learning/README.md)

- [association-validation.mjs](association-validation.mjs)
- [balanced-valence-schedule.mjs](balanced-valence-schedule.mjs)
- [dual-valence-interface.mjs](dual-valence-interface.mjs)
- [gf-readout.mjs](gf-readout.mjs)
- [mbon-readout.mjs](mbon-readout.mjs)
- [mapped-activity-trace.mjs](mapped-activity-trace.mjs): bounded opt-in mapped KC/DAN activity rates across recurrent states; diagnostic only.
- [mushroom-body.mjs](mushroom-body.mjs)
- [reversal-memory.mjs](reversal-memory.mjs)

- [neural-episode.mjs](neural-episode.mjs): bounded transient frame continuity and snapshot/restore; no teaching/plasticity.

- [delayed-reversal-memory.mjs](delayed-reversal-memory.mjs): engineering delayed-credit adaptation retaining source-rule recovery; no validated retention/transfer.
- [bidirectional-plasticity-kernel.mjs](bidirectional-plasticity-kernel.mjs): disconnected illustrative numerical candidate; not integrated or biologically justified.

- [timing-plasticity-candidate.mjs](timing-plasticity-candidate.mjs): pure local-event hypothesis; no graph adapter or biological timing calibration.

- [dopamine-response-components.mjs](dopamine-response-components.mjs): disconnected exact rate filters; abstract signal states, not validated receptor kinetics.

- [rate-timing-plasticity-candidate.mjs](rate-timing-plasticity-candidate.mjs): disconnected exact piecewise-constant rate integration; local credit and bounded gain remain hypotheses.

- [rate-timing-memory.mjs](rate-timing-memory.mjs): full-frame candidate memory; explicit reference/timing, persistent traces, no mainline graph integration.

- [consequence-value-readout.mjs](consequence-value-readout.mjs): fixed reference-relative MBON contrast; [audited scope and limits](../../../archive/early-development/research/reports/consequence-value-feasibility-v1-2026-10-10/README.md).

- [curriculum-g0.mjs](curriculum-g0.mjs): neutral certificates, public-only cue projection and explicit frame receiver; [static preflight](../../../archive/early-development/research/data/curriculum-g0-receiver-v1/README.md), no learning result.
- [Restart memory fixtures and rejected candidates](../../../research/reports/overnight-memory-plasticity-2026-10-31/MORNING-REPORT.md): `memory-assay-*`, `local-gated-memory.mjs` and `local-slow-memory.mjs` are isolated synthetic development components; no graph/training approval.
- [memory-assay-readout-bound.mjs](memory-assay-readout-bound.mjs): diagnostic upper certificates for the existing bounded linear readout, never a learner or imported fitted state.
- [memory-assay-recorded.mjs](memory-assay-recorded.mjs), [strict checker](memory-assay-checker-v2.mjs) and [separate replay](memory-assay-record-audit.mjs): versioned per-trial evidence for the unchanged synthetic learner. Fresh replay passes; retention still fails. [Repair contract](../../../research/reports/overnight-memory-plasticity-2026-10-31/receipt-repair-v2-spec.md).

- [local-coupled-memory.mjs](local-coupled-memory.mjs), [local-metaplastic-memory.mjs](local-metaplastic-memory.mjs) and [local-reservoir-memory.mjs](local-reservoir-memory.mjs): preserved synthetic continuation candidates. [All-condition results](../../../research/reports/memory-retention-continuation-2026-10-31/development-comparison-v2.json) fail the joint memory requirements; no biological rule selected.
- [Phase-recorded producer](memory-assay-phase-recorded.mjs) and [separate phase audit](memory-assay-phase-audit.mjs): complete test-phase state snapshots and event replay for the metaplastic/reservoir conditions. Software evidence only.
- [neuron-reader.mjs](neuron-reader.mjs), [pinned cells](neuron-reader-cells.json): pure endpoint observations and an explicit, evidence-reviewed fixed-score contract; no default biological signs or learning. [Interface](../../../documentation/design/neural-learning/neuron-reader.md).

- [local-cubic-reservoir-memory.mjs](local-cubic-reservoir-memory.mjs): one fixed weak-drive protection hypothesis; preserves the quadratic parent. No calibrated receptor mechanism, biological timescale or approved chess learning. [Protocol and scope](../../../research/reports/memory-retention-continuation-2026-11-01/cubic-exit-spec.md).

- [eye-test-v2.mjs](eye-test-v2.mjs) (2026-11-03): arithmetic for Eye test v2: reachable strength settings (0.2 and 1.0), the strength measure M and the 10% gate. It runs no model.
- [move-chooser-v1.mjs](move-chooser-v1.mjs) and [move-score-contract-v1.json](move-score-contract-v1.json) (2026-11-03): the fly's choice over all legal moves, scored from unchanged memory, and the MBON05 coefficient contract. The contract stays switched off until the separately approved memory test passes. [Decision](../../../documentation/design/research-goals/restart-plan-revision-2026-11-03.md).
- [transfer-evaluation-v1.mjs](transfer-evaluation-v1.mjs) (2026-11-03): checks for the later transfer and combination tests: scoring every move from unchanged memory in both orders, exact-repeat detection, similar-board recall as a comparison system, and the locked-set pass rule. Nothing here learns. [Protocol](../../../documentation/design/research-goals/transfer-and-combination-protocol-2026-11-03.md).
- [long-term-memory v1](episodic-consequence-memory.mjs) (implementation: `EpisodicConsequenceMemory`): bounded external exact-cue store with revisable consequence values, idempotent events and validated snapshots. No graph mutation or biological memory claim. [Component identity, replay and evidence](../../../research/reports/engineered-episodic-memory-2026-11-01/README.md).


- [memory-backed-policy-v1.mjs](memory-backed-policy-v1.mjs): fixed long-term-memory v1 lookup precedence, neural fallback and explicit score ablations; no fitted mixing coefficient. [Live pilot protocol](../../../research/reports/long-term-memory-v1-live-comparison-2026-11-01/README.md).


- Memory v4 (2026-11-04): [engineered-memory-v4-ledger.mjs](engineered-memory-v4-ledger.mjs) (history replay, committed schedules, certificates, ledger, permutation), [engineered-memory-task-v4.mjs](engineered-memory-task-v4.mjs) (arms, transforms, s / c scoring, judge), [transfer-evaluation-v2.mjs](transfer-evaluation-v2.mjs) (numeric game-bootstrap gate). [Proposal](../../../documentation/design/neural-learning/memory-v4-proposal-2026-11-04.md).
