# Monte Carlo experience pipeline: useful acquisition not demonstrated

2026-10-06 completion correction: the full-graph pilot is complete. Independent record, trace and after-update prefix audits pass: 32 experiences, 24 enabled updates, 64 certificate uses; nine informative traces, eight explanations and two defense diagnostics. Pending receipt resume acknowledges without a new neural presentation. **Useful acquisition is not demonstrated**: informative KQK still fails, KRK already succeeds, searched choices succeed before/after as they do in absent/disabled controls. [Raw report, paired outcomes, exact commands and resource measurements](../../../archive/early-development/research/reports/puzzle-pipeline-v1-2026-10-06/README.md). This supersedes live/pending statements below. Separate [positive-channel association](../neural-learning/positive-feedback-v1.md) is now running; [verified consequence replay clips](../search-and-feedback/consequence-clips.md) have software evidence only and are not used by this pilot. Original reasoning/transfer requirements remain unfinished.

2026-10-06. Two new components connect the separate seeded investigation/trace review to the existing local-memory implementation. They are implemented and tested with bounded numerical fixtures. The full-graph integration run has now started after volume completion; results and audits are pending. No unfamiliar-position transfer or completed reasoning result exists. Earlier frozen learning experiments and their failures are preserved.

## Read-only experience planner

[puzzle-experience-plan.mjs](../../../.codebase/src/puzzle-learning/puzzle-experience-plan.mjs) accepts only declared training/engineering-fixture families with supported forced-mate horizons. It restores complete task PGN when supplied and rejects FEN/history mismatches, finished games and oversized histories. Validation/test inputs cannot be used to create teaching plans.

During investigation it checks a fixed persistent-memory fingerprint around every policy assessment. The policy receives the hypothetical board, legal candidates and declared objective/horizon, never dataset IDs, solutions, certificates or teacher diagnostic labels. Assessments may not mutate the hypothetical board. The callback gets a copy of each trace. Search stops at frozen bounds, after which independent teacher review constructs verified replay experiences and records unknown coverage separately. The task's solvability proof is also recorded independently. Unknown outcomes never appear in the replay experience list.

Every replay experience retains the original board/history, acting side, action, declared task horizon, replay-checked certificate, committed/counterfactual role and associated diagnostics. It now also includes a [verified line explanation](../search-and-feedback/line-explanations.md) recording actual material changes and subsequent consequence. This binds the feedback to a particular earlier choice. It does not claim the original neural activity persisted during calculation; later replay must explicitly evoke that board/action again. The current receiver uses the existing outcome/reinforcement interface, not a semantic parser for the explanation.

The complete trace panel is bounded to at most 512 records, each at most 128 moves. Larger training still needs a streaming coverage-summary interface and resumable orchestration. This component creates a plan and does not modify physiological state or checkpoint a learning run.

## Mapped neural receiver

[mapped-puzzle-brain.mjs](../../../.codebase/src/puzzle-learning/mapped-puzzle-brain.mjs) wraps the existing `ReversalMemory` and fixed MBON12-minus-MBON01 readout. It adds no optimizer, plasticity equation, anatomy, reinforcement mapping or fitted decoder. The experiment runner must verify graph/annotation/mapping/readout identities and fixed-state hashes before use.

Assessment serially evokes each legal board/action cue, produces fixed softmax candidate priors and checks that lasting memory and task history remain unchanged. Its leaf value is explicitly **zero**, a neutral engineering heuristic; it is not a learned strategic position evaluation. This limitation remains a central unmet part of the original objective.

Replay reconstructs the exact task history, independently rechecks the consequence certificate and actor/horizon binding, then stimulates the encoded candidate with the existing optional mapped PPL103 experimental pulse. Measured activity drives the unchanged local efficacy rule. Unknowns are skipped without presentation or update. Disabled plasticity receives the pulse but preserves memory. Absent feedback omits the external pulse while permitting any update driven by endogenous simulated DAN activity; it must not be described as a guaranteed no-change control. A count-preserving shuffled control must be supplied by the runner.

The receipt records neural response, measured local KC/DAN terms, before/after persistent memory, delivered pulse and whether any efficacy changed. Each presentation is bounded and guarded. The caller must atomically checkpoint the updated memory together with the pending receipt before acknowledging the experience, preserving exact resume semantics already used by the volume experiment. This receiver does not implement an orchestration checkpoint or a delayed eligibility trace.

## Verification and next integration

`npm test`: **72/72 pass**. Planner checks public-input separation, memory/board immutability, family/split/history/trace bounds and unknown handling. Receiver tests use a four-cell numerical graph with the actual `SparseTrainer` and `ReversalMemory`, not biological identities. They check permitted local changes, fixed-state invariants, next-update reproduction after restoration, read-only inference, absent/disabled controls, corrupted consequences and presentation exhaustion.

These are engineering tests. The full-graph receiver, a varied puzzle curriculum, independently verified exchanges/sacrifices, validated delayed credit and frozen unfamiliar/counterfactual evaluation remain unvalidated. Neither test success nor structured rich feedback proves learned reasoning. See [trace design](../search-and-feedback/monte-carlo-traces.md), [existing mechanism and limitations](../neural-learning/reversal-mechanism.md), and [current learning direction](../research-goals/feedback-learning.md).

## Prepared orchestration pilot

[train-puzzle-pipeline.mjs](../../../.codebase/scripts/puzzle-learning/train-puzzle-pipeline.mjs) implements sparse serial full-graph orchestration with a frozen [protocol](../../../archive/early-development/research/data/puzzle-pipeline-v1/protocol.json). The two engineering fixtures are KQK with a one-ply objective and KRK with a three-ply objective. An [independent fixture audit](../../../archive/early-development/research/reports/pipeline-fixture-audit-2026-10-06/report.json) confirms solvability in 2/55 construction nodes respectively, followed by certificate replay. These are fixture checks, not a multi-ply reasoning or transfer result; the three-ply task can also have an immediate mate.

Informative feedback plans are generated after commitment and linked by file hashes. Absent, globally count-matched seeded shuffled and disabled conditions replay those exact experiences. Each condition persists memory across fixtures, starts from naive memory and has a bounded presentation count. Before/after unaided choices and seeded searches use the same declared search bounds. Neutral leaf values remain explicit. Repeat, reset to the fixture's starting memory, and restoration checks are required.

The runner streams rows, bounds traces, atomically publishes plan/receipt files and checkpoints updated memory plus pending receipt **before** acknowledging an event. Resource interruptions record per-invocation metrics and the last cursor; resume requires exact source/input/identity matches and a fresh directory. The prepared [independent auditor](../../../.codebase/scripts/puzzle-learning/audit-puzzle-pipeline.mjs) reconstructs control schedules, rechecks consequences and local recurrence, and verifies memory continuity and causal snapshots. Its live audit and after-update prefix test remain pending. Search-trace replay remains a separate audit scope.

A separate prepared [trace auditor](../../../.codebase/scripts/search-and-feedback/audit-pipeline-traces.mjs) replays informative investigation plans, legal continuations, terminal perspectives, root visits, defensive diagnostics and certificate-bound material explanations. Its live execution is pending; it does not reproduce neural inference or audit unstored post-training search paths.

2026-10-06 execution update: volume and pending-receipt prefix runs are terminal and audited. The command below has started in `research/reports/puzzle-pipeline-v1-2026-10-06`; no completed pipeline result, live audit or prefix comparison exists yet. The auditor now supports `--prefix`, optional `--origin` and fresh `--out` for exact checkpoint comparison; that path remains unvalidated until exercised.

Command after the volume run is terminal:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-puzzle-pipeline.mjs --out research/reports/puzzle-pipeline-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/audit-puzzle-pipeline.mjs --run research/reports/puzzle-pipeline-v1-2026-10-06
node --max-old-space-size=256 .codebase/scripts/search-and-feedback/audit-pipeline-traces.mjs --run research/reports/puzzle-pipeline-v1-2026-10-06
```

Keep the 768 MiB RSS/256 MiB free-memory guard. Do not report a learning or resource result before this runs and audits. Exact shuffled specificity may be degenerate and must be reported rather than reseeded after observing results. This two-fixture pilot does not replace the original requirement for unfamiliar and counterfactual improvement.
