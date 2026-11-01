# Puzzle Learning src

[Src guide](../README.md) · [Code guide](../../README.md)

[Design and scientific boundaries](../../../documentation/design/puzzle-learning/README.md)

- [Stage 2 learner constructor](lichess-stage2-brain-factory.mjs) and [runtime factory](../../scripts/puzzle-learning/lichess-stage2-runtime-factory.mjs): bind the fresh graph-constrained learner, bounded mate tasks, audited all-legal panels, Stockfish reviews and the shared resumable block path. No registered data/evaluator or campaign currently authorizes execution.

- [Lichess source history](lichess-history.mjs) and [capture lesson preparation](lichess-capture-lesson.mjs): bounded teacher-side source/proof binding, not neural learning or curriculum acceptance.
- [Lichess curriculum panel bridge](lichess-curriculum-panel.mjs): converts audited training rows into rehearsal panels and audited validation/final rows into read-only evaluation panels. It records fresh all-legal rankings, rejects split mismatches, incomplete action coverage and certificates that fail replay, and never teaches evaluation panels. The caller still pins/audits each family registration and source corpus.
- [Lichess Stockfish review collector](stockfish-review-collector.mjs) and [review binding](lichess-stockfish-review.mjs): stream bounded UCI input/output, hash the engine binary/settings, use one thread and reset the hash before each legal child/budget search, then bind the matched-budget results to the source-bound panel. The caller must supply resource guard and raw-log callbacks. The collector does not deliver neural learning; its current check uses a mock analyzer, not a live Stockfish process.
- [Stockfish value session](stockfish-value-session.mjs): checkpointable engine-error feedback, separate from verified task consequences. The Stage 1 runtime factory now wires this into registered matrix arms; no eligible family registration, independent acceptance evaluator, or full campaign is available.
- [Lichess curriculum block bridge](lichess-curriculum-block.mjs): resumable four-event blocks and a bounded 32-block stage driver. The Stage 1 runtime factory and matrix CLI now connect it to the learner; eligible family data, independent acceptance observations, and full campaign registration remain missing.
- [Lichess curriculum condition matrix](lichess-curriculum-matrix.mjs) and [pinned matrix CLI](../../scripts/puzzle-learning/run-lichess-curriculum-matrix.mjs): yokes causal control schedules and independently replays each lineage. A production-facing Stage 1 runtime factory exists; eligible lesson families, the pinned evaluator module, and the complete campaign registration remain unavailable.
- [Lichess stage replay auditor](lichess-curriculum-stage-audit.mjs) and [Stage 1 D1-D8 gate evaluator](curriculum-stage-acceptance.mjs): replay integrity and the frozen decision rule are implemented. The new [pinned observation evaluator](../../scripts/puzzle-learning/lichess-stage1-acceptance-evaluator.mjs) derives train, validation, final, control, retention and counterfactual observations, freezing validation-selected checkpoints before opening final data. Syntax-checked only; no eligible data registration, campaign registration, or evaluator run yet.
- [Curriculum rehearsal planner](curriculum-rehearsal-plan.mjs): training-only four-event correction/alternative/rehearsal blocks; all-legal proof checks, balanced outcomes, current-memory binding and explicit unknown/budget stops. Inert planning only; a runner must freshly assess and persist every delivery.
- [Rehearsal planner v2](curriculum-rehearsal-plan-v2.mjs), [block/stage runner v2](lichess-curriculum-block-v2.mjs) and [matrix v2](lichess-curriculum-matrix-v2.mjs) (2026-10-24, fix goal task 2, registration revision 8+): consecutive-target cap, informative-arm early stop on block-start training counts, cooperative block-boundary pause; plans keep the v1 schema and the independent audit is unchanged. Earlier registrations keep the v1 files.
- [Coupled brain v3](coupled-stockfish-brain-v3.mjs) and [Stage 1 brain factory v2](lichess-stage1-brain-factory-v2.mjs) (2026-10-24, reviewer finding 2, revision 7+): Stockfish child value read and taught in the mover's perspective on the move's own cue cells; side-to-move cues behave as v2.
- [Block session](curriculum-block-session.mjs), [bounded disk runner](curriculum-block-runner.mjs) and [separate replay](curriculum-block-audit.mjs): fresh event rankings, immutable pending-receipt checkpoints and exactly-once recovery across four-event blocks. Four-cell software checks only; no receiver qualification or curriculum acceptance.

- [adaptive-coverage-experiment.mjs](adaptive-coverage-experiment.mjs)
- [contrastive-coverage-experiment.mjs](contrastive-coverage-experiment.mjs)
- [dual-valence-puzzle-brain.mjs](dual-valence-puzzle-brain.mjs)
- [mapped-puzzle-brain.mjs](mapped-puzzle-brain.mjs)
- [lichess-stage1-brain-factory.mjs](lichess-stage1-brain-factory.mjs): constructs a fresh Stage 1 brain from hash-pinned graph, dual-valence mapping, and readout-source inputs; does not start a run or relax data gates.
- [lichess-stage2-brain-factory.mjs](lichess-stage2-brain-factory.mjs): constructs a fresh Stage 2 brain with the bounded mate-frame encoder and the existing local-plasticity receiver; it is not yet connected to a stage runner or acceptance evaluator.
- [puzzle-experience-plan.mjs](puzzle-experience-plan.mjs)
- [puzzle-round.mjs](puzzle-round.mjs)

- [Multi-context coverage orchestration](multi-context-coverage-experiment.mjs)

- [Bounded unchanged-state assessment cache](assessment-cache.mjs): summary reuse only; fresh scientific gates bypass it.
- [Bounded unchanged-state assessment cache](assessment-cache.mjs): summary reuse only; fresh scientific gates bypass cached results.

- [Feedback quality binding and channel controls](feedback-quality.mjs): context, decision and certificate provenance; no learning claim.

- [Correction and preservation plan](correction-preservation-plan.mjs): verified training-only teacher selection; graph effects untested.

- [verified-lesson-frames.mjs](verified-lesson-frames.mjs): independently checked immediate-capture continuation frames and bounded continuous exposure; explicit endpoint encoder required, no learning.

- [delayed-lesson-brain.mjs](delayed-lesson-brain.mjs): checked continuous lessons with pre-feedback ordinal record and delayed local update; no atomic runner/graph learning claim.

- [delayed-mate-lesson-brain.mjs](delayed-mate-lesson-brain.mjs): independently checked bounded mate continuation/endpoint on all legal actions; no graph learning acceptance.

- [plasticity-mechanism-assay.mjs](plasticity-mechanism-assay.mjs): fixture-tested control planning, verified receipt binding, identity/checkpoint contracts and resource guards; no graph runner.

- [plasticity-mechanism-assay.mjs](plasticity-mechanism-assay.mjs): fixture-testable balanced control planning, evidence binding, identity checks, pending-receipt validation and resource guards; no graph runner or biological validation.

- [plasticity-mechanism-assay.mjs](plasticity-mechanism-assay.mjs): bounded coordinator, pending receipt recovery, matched controls, and behavior/resource gates; no biological adapter.

- Retention-probe slots are nonteaching observations; see [assay protocol v3](../../../archive/early-development/research/data/bidirectional-plasticity-assay-v3/README.md).
- [Accepted stage memory handoff](curriculum-memory-handoff.mjs): restores only a condition/replica's independently accepted, validation-selected predecessor checkpoint. Stage 2 training and replay now use it; failed, missing or changed evidence stops the stage. Offline fixtures only; full campaign remains unregistered.
- [Prospective checkpoint selection](curriculum-checkpoint-selection.mjs): earliest passing published block with per-stratum validation and earlier retention; controls use the informative block. The frozen original selector is preserved.
- [Additional interference execution and replay](curriculum-retention-challenge.mjs): Stage 2 uses the serial resumable matrix for eight extra four-event blocks on earlier training foundations, starting from each selected source memory. Delivery does not pass D7; independently measured post-challenge validation/sentinels remain required.
- [Registered task-outcome shuffling](curriculum-outcome-shuffle.mjs): pins the balanced per-block task-control schedule, distinct from Stockfish-error shuffling. Independent receipt replay rederives that schedule.
- [Post-interference observations](curriculum-retention-observations.mjs): read-only current/earlier validation and training sentinels across accepted baseline, selected and actual post-challenge memories, with independent rule-certificate checks and explicit unknown/failure gates.
- [Post-interference promotion](curriculum-retention-promotion.mjs): binds the frozen source selection, parent registration/result, replayed eight-block challenge and measured retention to the actual checkpoint carried forward. Generic matrix auditing and memory handoff validate the artifact; full stage acceptance remains separate.
- [record-neuron-candidates.mjs](record-neuron-candidates.mjs): streamed Eyes inference with copied endpoint observations, full declared state/board fingerprints and a completion receipt; no teaching or policy selection. [Interface](../../../documentation/design/neural-learning/neuron-reader.md).
