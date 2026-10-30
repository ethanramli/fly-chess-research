# Evidence locations

All paths below are local evidence, inspected 2026-10-30. Code tracing does not mean a fresh neural experiment was run. Use the [issue register](issue-register.md) for evidence status and current repair state.

## Current execution path

r15 [registration](../../data/lichess-stage1-synthetic-v1/stage1-full-r15-registration.json) and [protocol](../../data/lichess-stage1-synthetic-v1/stage1-full-r15-protocol.json) -> [runtime factory v8](../../../.codebase/scripts/puzzle-learning/lichess-stage1-runtime-factory-v8.mjs) -> [brain factory v8](../../../.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v8.mjs), through earlier pinned factories -> [outcome-only receiver](../../../.codebase/src/puzzle-learning/coupled-outcome-only-brain.mjs) / [brain v5](../../../.codebase/src/puzzle-learning/coupled-stockfish-brain-v5.mjs) -> [attack-map encoder v2](../../../.codebase/src/chess-input/public-attack-map-cue-v2.mjs), [sparse dynamics](../../../.codebase/src/supervised-baselines/trainer.mjs), [alpha memory](../../../.codebase/src/neural-learning/alpha-lobe-memory.mjs) / [restrained memory](../../../.codebase/src/neural-learning/reversal-memory.mjs) -> [acceptance evaluator v4](../../../.codebase/scripts/puzzle-learning/lichess-stage1-acceptance-evaluator-v4.mjs) -> [frozen gate module](../../../.codebase/src/puzzle-learning/curriculum-stage-acceptance.mjs).

The current receiver's inherited file names contain Stockfish, but r15's declared teaching condition is outcome-only. Presence of supervised/Adam code elsewhere is not proof that this active path uses backpropagation.

## Issue-to-evidence map

| Issues | Decisive locations and inspection landmarks |
|---|---|
| M01 | [Fixed comparator](check-training-shortcut.mjs), [raw result](training-shortcut-output.json), encoder v2 above: attackTokens/moveTokens/encode. Tokens are computed before KC projection; the dummy pools affect projection, not token semantics. |
| M02–M03 | [Scientific contribution](../../../documentation/design/research-goals/scientific-contribution.md): explicitly distinguishes living-organism inference, computational existence and topology advantage. r15 protocol lists feedback controls but no topology null. |
| M04 | Registration replicaSeeds; [brain factory v5](../../../.codebase/src/puzzle-learning/lichess-stage1-brain-factory-v5.mjs) seed/input comments and factory-v8 encoder replacement. Fixed graph/model; seed-dependent cue projection. |
| M05 | [Full-r14 result and diagnosis](../stage1-full-r14-2026-10-30/README.md), r15 protocol revisions entry; [decision log](../../project/decision_log.md) r15 entry. Post-failure D4 change and reuse disclosed. |
| M06 | [Synthetic generator](../../../.codebase/scripts/data/prepare-lichess-stage1-synthetic-families-v1.mjs): pin/blocked/absent constructors, split-specific family construction and task constraints. [Data follow-up](../stage1-data-separation-check-2026-10-30/README.md) limits. |
| M07–M08 | [Previous gate reproductions](../codebase-weakness-review-2026-10-30/README.md); new [counts-only checker](../stage1-data-separation-check-2026-10-30/check-data-separation.mjs), [safe aggregate output](../stage1-data-separation-check-2026-10-30/all-splits-output.json), [data audit v2](../../../.codebase/scripts/data/audit-lichess-stage1-synthetic-families-v2.mjs). |
| M09 | Evaluator v4 lines 393–394: certificateAndUpdateReplay and pendingReceiptExactlyOnce both derived from fullNeuralReplay. The second observation has no independent recovery witness here. |
| M10 | [Matrix v2](../../../.codebase/src/puzzle-learning/lichess-curriculum-matrix-v2.mjs) versus future [matrix v3](../../../.codebase/src/puzzle-learning/lichess-curriculum-matrix-v3.mjs), selectResume; [six bounded tests](../../../.codebase/tests/puzzle-learning/lichess-curriculum-matrix-v3-resume.test.mjs). |
| M11 | [Source-closure helper](../../../.codebase/scripts/runtime/source-closure.mjs), [new step builder](../../../.codebase/scripts/puzzle-learning/build-lichess-parallel-steps-v2.mjs), ledger L104; W05 reachability reproduction. Returning runtime/package metadata is different from binding it in a registered step. |
| M12 | Alpha-memory header lines 1–11 and update; [source-solution register](../../literature/source-solution-register.md), 2026-10-25/26 alpha1/alpha3 entries (approximately lines 433–467 in inspected version); primary-source timing in [external sources](external-sources.md). |
| M13 | Alpha-memory lines 111–119: D <= 0, k >= 0, gain clipping. Equation supports monotonic-depression observation; whole-model inevitable failure is not inferred. |
| M14 | Alpha-memory persistence contract and register: no consolidation/decay clock; r15 learning dt versus elapsed pacing time. |
| M15 | Brain v5 readAlphaLobeMBON and sign convention; register's explicit MBON14 engineering-convention qualification; r14 D4 diagnosis. |
| M16 | Alpha-memory mapping: alpha/beta KC type and hemisphere filters. These identify cells but do not reconstruct synaptic receptor/spatial locality. |
| M17 | SparseTrainer constructor and forward, above. [Graph provenance report](../connectome-provenance-check-2026-10-28/README.md) line 28 and E06: outside an input/plastic mask does not prove functional disconnection. |
| M18 | [Capture-retention verifier](../../../.codebase/src/search-and-feedback/capture-retention-action-domain.mjs): objective and one-reply certificate semantics; quiet moves fail the task criterion. |
| M19 | [Rehearsal planner v2](../../../.codebase/src/puzzle-learning/curriculum-rehearsal-plan-v2.mjs); [block v2](../../../.codebase/src/puzzle-learning/lichess-curriculum-block-v2.mjs): all-legal certified outcomes, learner scores, target/rehearsal scheduling. |
| M20 | Synthetic generator constraints; r15 protocol data description. Source linkage preserves capture identity, not the original game's whole tactical distribution. |
| M21–M23 | Frozen gate module thresholds, paired-family bootstrap; r15 registration, family counts in counts-only report. Check denominators/selection before treating action-level counts as independent observations. |
| M24 | [Curriculum](../../../documentation/design/puzzle-learning/principles-curriculum.md), policy-B/D7 changes in protocol; [G0 report](../curriculum-g0-assay-v1-2026-10-11/README.md), [2026-10-19 G0 journal](../../journal/experiments/2026-10-19-g0-audit-memory-guard.md). |
| M25–M26 | [Novelty scoping note](../../literature/novelty-search-2026-10-29/README.md), source-solution register, [pinned upstream analysis](../../literature/cesp99-calculation-2026-10-07/README.md), [memory review](../stage1-memory-literature-and-surrogate-2026-10-27/README.md). |
| M27–M30 | [Venue/eligibility project notes](../../project/README.md) if available through its navigation; [ethics checklist](../../project/ethics_and_permissions.md); official target-year uncertainty and source links in [external-sources.md](external-sources.md). Mastery/actual submissions/approvals were not determined. |
| M31 | Root [setup](../../../README.md), [package.json](../../../package.json), [lockfile](../../../package-lock.json), source pins; [G0 pruning record](../g0-checkpoint-pruning-2026-10-24/README.md). Root directory inspection found no root LICENSE/CITATION. Full release/licensing audit not performed. |
| M32 | [Historical 50-game target report](../flybench-current-fly-50-2026-10-10/README.md): 13 completed losses, untrained seed-47 player, uncalibrated reference scale, interrupted game excluded. |
| M33 | [Latency report](../training-latency-2026-10-19/README.md), [independent WASM review](../independent-wasm-audit-2026-10-10/README.md) and resource rules: bounded timings are not matched energy/time-to-quality evidence. |
| M34 | [Python supervisor](../../../python%20actions/curriculum.py): _publish_lock, _claim_lock, _release_lock; [fix ledger](../../../documentation/handoffs/fix-goal-ledger-2026-10-24.md) L100 records repair and residual stale-reclamation race. |
| M35 | [Reasoning handoff](../../../documentation/handoffs/reasoning-research-goal-2026-10-28.md) dated overriding update; [current status](../../../documentation/current-status.md); fix ledger L098–L104. |
| M36 | Positive-channel V2 audit scope, WASM review, full-r14 replay, evaluator imports and certificate checker. Independence is specific to what is re-derived; shared implementation assumptions remain. |
| M37 | [Decision log](../../project/decision_log.md), r15 protocol revisions, fix ledger, [retention probes v1–v8](../../journal/experiments/2026-10-27-stage1-memory-probes-v1-v8-summary.md). |
| M38 | Novelty note expressly says snippets/abstracts and UNVERIFIED items. The Jiang/Litwin-Kumar work has a 2021 PLOS journal version; upstream code methods were reviewed elsewhere locally more deeply than that novelty table indicates. |
| M39 | [Representation screen](../stage1-representation-ceiling-2026-10-27/README.md): selected supervised perceptrons/fact pairs and leave-one-family-out comparisons. Finite failures do not establish universal information limits. |
| M40 | Scientific contribution versus actual completed Stage 1 result; official science/engineering criteria and eLife article-type guidance in external sources. |

## Selected historical branches checked

- [Positive-channel V2](../positive-channel-association-v2-2026-10-06/README.md): bounded computational prerequisite, six seeds, limited auditor scope.
- [Training-volume failure](../training-volume-resumed2-2026-10-06/README.md): repeated schedule, finite budgets, preserved recovery.
- [Delayed integration](../delayed-lesson-integration-resumed-2026-10-08/README.md): contrast adaptation versus incorrect absolute top choices.
- [Multi-context transfer](../multi-context-stability-transfer-v1-2026-10-07/README.md): familiar-repair evidence did not yield useful sibling choices.
- [Cue-width hypothesis](../adaptive-contrastive-coverage-v2-2026-10-09/README.md): improved relative change ranks, absolute policy still wrong; setup/analysis corrections.
- [G0 shuffled diagnostic](../curriculum-g0-shuffle-control-diagnostic-2026-10-12/README.md): single shuffle's agreement does not establish the cause of neural outcomes.
- [Feedback-quality review](../feedback-quality-review-2026-10-08/README.md): certificate explanation versus delivered signal.
- [Capture-transfer audit](../capture-retention-transfer-audit-v1-2026-10-07/README.md): duplicated early cue patterns caught; replacement/static audit not a learning result.
- [Attack-map v2 development](../stage1-attack-map-cue-v2-2026-10-28/README.md): correction of earlier surrogate reproduction, representation revision and smoke evidence.
- [Eye-route diagnostic](../stage1-eye-route-2026-10-29/README.md): bounded direct-drive reach, not general impossibility of visual learning.

The [report-summary index](report-summary-index.json) is an automated navigation aid over 163 top-level summaries. It is not a claim that each report, raw run or source archive received a complete audit.
