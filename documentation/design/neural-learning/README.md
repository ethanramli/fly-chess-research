# Neural learning and memory experiments

This topic records candidate neural learning rules and tests of association, retention, and reversal. Read [Gamma4 association and reversal tests](gamma4-association-tests.md) first for the early benchmark and its failures. Passing a computational prerequisite does not establish biological validation or useful chess learning; earlier failures remain part of the record.

## Association prerequisites

- [Gamma4 association and reversal tests: V1 and V2 failed](gamma4-association-tests.md)
- [Gamma4 plasticity prototype: mechanism and limitations](gamma4-plasticity.md)
- [MBON choice decoder: computational association prerequisite passed](mbon-choice.md)
- [Positive feedback association V1: specificity gate failed](positive-feedback-v1.md)
- [Positive feedback association V2: balanced-control prerequisite passed](positive-feedback-v2.md)
- [Local recovery experiment: matched exposure comparison](recovery-comparison.md)
- [Reversal mechanism: source evidence and implementation limits](reversal-mechanism.md)
- [Compartment memory: proposed preservation, recovery and timing diagnostics](compartment-memory-diagnostics.md)

[Current status](../../current-status.md) · [All design topics](../README.md)

## Mechanisms and assay infrastructure

- [Delayed source-rule eligibility candidate and remaining interference](delayed-reversal-credit.md)

- [Bidirectional plasticity without freezing: analytical failure modes, primary evidence and untested replacement specification](bidirectional-plasticity-without-freezing.md)
- [Assay infrastructure review](../../../research/journal/experiments/2026-10-08-bidirectional-assay-infrastructure.md): preflight-only software utilities; local signal/anatomy and resumable graph integration remain blocked.

- [Bidirectional plasticity assay protocol v2](../../../archive/early-development/research/data/bidirectional-plasticity-assay-v2/README.md): identity-pinned static preflight; blocked before graph execution.

- [Bidirectional assay protocol v3](../../../archive/early-development/research/data/bidirectional-plasticity-assay-v3/README.md): matched retention probes, long alternating schedule and explicit reversal blocker.

- [Independent assay receipt auditor](../../../.codebase/scripts/puzzle-learning/audit-bidirectional-plasticity-assay.mjs): static post-run verification of certificates, control signals, exposure, checkpoints, and gates; not run.

- [Independent infrastructure review](../../../archive/early-development/research/reports/bidirectional-assay-infrastructure-review-2026-10-08/README.md): original fixtures pass, but inert checks expose recovery, disabled-state isolation, behavioral-audit and contextual-gate defects; training remains blocked.


- [Repaired v4 infrastructure](../../../archive/early-development/research/data/bidirectional-plasticity-assay-v4/README.md): 195/195 fixture tests pass; explicit recovery stages, whole-slot disabled isolation, bound rankings/margins and measured-cue reversal contract; actual graph learning remains blocked.


- [Gamma2 timing candidate: 122 existing edges, static evidence and remaining mechanism work](../../../archive/early-development/research/reports/plasticity-timing-candidate-2026-10-09/README.md).

- [Local event timing numerical candidate](local-event-timing-candidate.md): disconnected hypothesis; numerical reversibility checked, retention and graph integration unresolved.

- [Rate-compatible dopamine response components](dopamine-response-components.md): source-motivated local filters; feedback-path and retention validation unresolved.

- [Integrated rate-timing candidate and static feedback-path audit](rate-timing-plasticity-candidate.md): numerical time integration checked; no graph learner validation.

- [Full-frame rate timing memory adapter](rate-timing-memory.md): inert continuation/disabled checks; actual graph and assay integration pending.

- [Conditional retention and revisability without freezing](conditional-retention-without-freezing.md): analytic inactive-cue protection, finite scalar reversal and limits under overlapping activity.

- [Read-only gamma2 neural overlap result](../../../archive/early-development/research/reports/gamma2-neural-overlap-v1-2026-10-09/README.md): actual cue separation improved with fixed parameters; learning and retention still untested.

- [Curriculum G0 neutral association assay](curriculum-g0-assay.md): frozen serial receiver prerequisite, original gates, matched controls and real checkpoint recovery.
- [G0 reversal history diagnostic](g0-reversal-history-diagnostic.md): unlaunched paired retained/reset memory specification following the independently replayed reversal failure.
- [Restart memory-fixture report, 2026-10-31](../../../research/reports/overnight-memory-plasticity-2026-10-31/MORNING-REPORT.md): local/slow candidates failed; bounded-readout capacity and missing event-audit evidence require a prospective repair.
- [Long-term-memory continuation](../../../research/reports/memory-retention-continuation-2026-10-31/README.md): completed coupled/cascade/reservoir comparisons, preserved joint failures, static anatomy and prospective delayed-retrieval/consolidation requirements. No selected rule or graph learning.

- [neuron-reader design review, 2026-10-31](../../../research/reports/neuron-reader-design-review-2026-10-31/README.md): researcher-chosen name for Readout v1; passive-recording specification recommended, signed chooser unresolved; no implementation or experiment.
- [neuron-reader repair plan](neuron-reader.md): each critique mapped to a concrete module change/check; exact cell roster, two-function interface, fixed observable/pooling and explicit unresolved scoring decisions.
- [Overnight Eyes/reader repair goal](overnight-eyes-reader-repair-goal.md): bounded execution brief for MBON05 sign verification and Eyes/reader checks, with blocker-first repairs and three iterations per workstream.

## Memory tests and recent proposals

- [Executed overnight Eyes/reader goal](../../../research/reports/overnight-eyes-reader-repair-2026-11-01/REPORT.md): comparison, contract checks, audits and unresolved scientific prerequisites.
- [Engineered memory test v2](engineered-memory-test-v2.md): built, not run. Disclosed nearest-neighbour store over Kenyon-cell patterns, scored on new boards against raw-eye, random-feature, mismatched and no-memory arms; pass rule fixed in advance.
- [Engineered memory test v3](engineered-memory-test-v3.md): episodic memory without hints. Real positions, every legal move scored, feedback on the chosen move only; built, not run.

- [Memory v3 review proposal, 2026-11-04](memory-v3-review-proposal-2026-11-04.md): positive-experience coverage, fair tie choices and a proposed development screen; proposal only, no launch.

- [Memory v4 proposal, 2026-11-04](memory-v4-proposal-2026-11-04.md): externally scheduled representation assay; reviewed, built, dry-run; launch needs researcher approval.
- [Memory v4 file formats](memory-v4-file-formats.md): run-folder contract between the v4 runner and its independent audit.
- [Memory v5 proposal](memory-v5-proposal-2026-11-04.md) and [build contract](memory-v5-file-formats.md): does the fly's episodic memory learn; reviewed rounds 1-2.
- [Memory v6 proposal](memory-v6-proposal-2026-11-05.md): frozen replication of v5 on 574 positions from 300 new games.
- [Memory v7 proposal](memory-v7-proposal-2026-11-05.md): scores the choice among captures only, so a random capture is the floor; draft, not reviewed.
- [Memory v8 proposal, 2026-11-07](memory-v8-proposal-2026-11-07.md): outcome-informed exploratory redesign of the capture curriculum; building allowed, but not confirmatory.

- [Fly connections memory v1 proposal](fly-connections-memory-v1-proposal-2026-11-07.md): historical first draft for Properties 1–3; strict source review rejected it before building. See the later revisions and [stop report](../../../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md).

- [Fly connections memory v1 revision 2](fly-connections-memory-v1-revision-2-2026-11-07.md): revised source-based candidate; its implementation and development dry run completed, but the learning gates did not pass. See the [run report](../../../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md) and [journal](../../../research/journal/experiments/2026-11-07-fly-connections-memory.md).
- [Fly connections memory v1 revision 4](fly-connections-memory-v1-revision-4-2026-11-09.md): widened circuit candidate. The predeclared single-shot capacity gate failed; a later exact search found settings after that failure, while reward-only and valence probes left safe captures below their best rivals. No full learning run is recorded; the research is stopped pending review and the researcher's decision. See the [stop report](../../../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md).
- [Three-board feedback test, 2026-11-14](three-board-feedback-test-2026-11-14.md): proposal awaiting approval. Compares the current circuit with a quiet, rescaled one on three development boards, using correct, swapped-label and learning-off lessons, and states when to expand to 12 boards, drop the approach, or call it inconclusive. See the [scale check](../../../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/README.md).
- [Fly connections memory v1 run gates, 2026-11-08](fly-connections-memory-v1-gates-2026-11-08.md): frozen protocol and pass rules for a dated proposal; historical design, not current authorization.
- [Fly connections memory v1 run file formats, 2026-11-08](fly-connections-memory-v1-file-formats-2026-11-08.md): data contract for the runner, job loop, judge, and independent auditor.
