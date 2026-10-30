# Future implementation roadmap: inference, search and evaluation

Date: 2026-10-06. Researcher request: write out how to execute all features discussed. This is an implementation plan, not completed code, a frozen experimental protocol or permission to change an active experiment. All new filenames and APIs below are proposed. Existing capabilities are identified separately. Preserve the original biological-learning objective and its evidence requirements.

## Build order and completion boundaries

| Stage | Deliverable | Dependency / exit condition |
| --- | --- | --- |
| 0 | Useful verified puzzle-learning evidence | Existing learning gates, controls, persistent-memory causality and independent audits; association alone is insufficient |
| 1 | Frozen inference profile and snapshot identity | Reproducible baseline, resource accounting and immutable input/model manifests |
| 2 | Faster equivalent inference | Numerical/choice/learning checks and measured latency improvement under matched conditions |
| 3 | Evaluation cache and resumable search session | Valid identity/history matching, bounded storage, correct perspective and exact same-backend resume |
| 4 | Pondering controller | Correct hit/miss handover, bounded cancellation and measured post-move latency/quality |
| 5 | Complete-game runner and snapshot registry | Legal games, frozen learning, audited outcomes and interruption recovery |
| 6 | Reference-pool rating calibration | Connected measured opponent pool, uncertainty and reproducible game-based rating fits |
| 7 | Benchmark-to-Elo predictor | Independent validation beats a declared baseline with useful error/coverage |
| Separate research branch | One-pass action decoder | Justified input/action/learning interface, fresh controls and transfer evidence |

Snapshot identity is a small shared foundation introduced before profiling; the full registry/reporting workflow arrives with evaluation. Preserve the researcher's sequence of working puzzle learning, latency optimization, then scaling. Later infrastructure never substitutes for the original reasoning/transfer gate. These stages are reviewable increments, not one large rewrite.

2026-10-07 update: an equivalent precomputed signed-magnitude cache is measured on one matched adaptive cycle, reducing this fixture from 60.25 s to 45.66 s. A separate full-graph PUCT diagnostic measured two position evaluations at 22.68 s, with per-candidate neural forward passes dominating. A 16/32 forcing shortlist cut paired assessment time 43.5% on one development position and retained its sole verified win, but the fly still selected a verified failure. These are stage-2 measurements only; latency optimization and the preceding useful-learning stage remain incomplete. Full-run, multi-position and time-to-quality profiling remain pending. See [current status](../../current-status.md), the [matched learning profile](../../../archive/early-development/research/reports/learning-iteration-profile-signed-weights-2026-10-07/README.md), the [Monte Carlo profile](../../../archive/early-development/research/reports/monte-carlo-neural-profile-v2-2026-10-07/README.md) and the [paired shortlist profile](../../../archive/early-development/research/reports/forcing-shortlist-paired-v3-2026-10-07/README.md).

## Existing integration points

- `.codebase/src/lowram/trainer.mjs`: sparse serial rate-model forward pass, activation arrays and supervised baseline machinery. The experimental neural receiver uses its forward computation; do not infer that Adam is the biological learning rule.
- `mapped-puzzle-brain.mjs` and `dual-valence-puzzle-brain.mjs`: candidate stimulation, local readout and experiment-specific feedback adapters. Keep their frozen experiment behavior intact.
- `monte-carlo-puzzle-search.mjs` and `experimental-puzzle-search.mjs`: bounded separate-board investigation, move/history helpers and terminal handling. A resumable whole-game search service is not established by these puzzle paths.
- `storage.mjs`: existing streamed data and atomic checkpoint patterns. Extend through separate versioned formats; do not mislabel supervised checkpoints as full local-memory/search snapshots.
- `package.json` at repository root: existing `npm test` runs `.codebase/tests/*.test.mjs`. Add commands only when their scripts actually exist.

## 1. Profile and optimize inference

Create a proposed `.codebase/scripts/profile-inference.mjs` with a frozen development-only position manifest. Include different legal-move counts and history contexts. Pin model/memory and source identities, seeds, hardware and runtime. Run one brain at a time with `node --max-old-space-size=256`, CPU duty 0.5 and the existing guards. Do not select these positions from final test families.

Record separate durations for initialization, cue encoding, forward recurrence, readout, candidate ranking, search administration, persistence and intentional rest. Count candidate presentations and cache hits. Separate cold load from warm inference; predeclare warmup/repetition counts and retain raw per-sample rows. Report median/p95/max post-move latency, total CPU/elapsed time and peak RSS. Full training-round duration is not a move-latency measurement.

Make one optimization per comparison:

1. Cache leak coefficients while their source parameters are unchanged. Invalidate on parameter load/update; never reuse them across a changed leak vector.
2. Reuse drive/encoding/readout buffers where ownership is clear. Do not overwrite activity used by local learning, audit records or retained observations.
3. Add an inference-only execution path only after identifying exactly which time-step activities the readout needs. Rolling buffers can save storage for read-only evaluation, but teaching paths may need traces. Keep the original path as an oracle.
4. Measure the sparse recurrence separately. Consider a native or WASM implementation only if it dominates cost; first make a tiny numerical fixture, then matched full-graph comparisons. Any dependency/backend needs a measured memory justification. Keep graph identities, topology and signs fixed.
5. Treat precomputed signed effective weights carefully: local efficacy changes must refresh affected entries before the next evaluation. Cache invalidation is part of correctness, not an optional performance detail.

Acceptance: same-backend refactors should reproduce raw results exactly when arithmetic order is unchanged. For a changed backend/order, freeze tolerances before measurement, inspect maximum activity/readout error and all legal-choice rankings including near ties, and rerun applicable local-learning recurrence/persistence checks. Run `npm test` for core changes. Publish both correct and failed comparisons. Keep an optimization only with measured benefit and resource compliance; no promised speedup factor.

## 2. Define immutable snapshot identities

Propose `snapshot-manifest.mjs` and `.codebase/scripts/register-snapshot.mjs`. A manifest contains:

```text
formatVersion, snapshotId, parentSnapshotId, trainingRunId, exposureCount
graphHash, modelConfigHash, fixedParameterHash, persistentMemoryHash
encoderHash, readoutHash, policyHash, sourceManifestHash
trainingProtocolHash, artifactChecksums, creationDate
```

Hash exact published artifact bytes and versioned canonical metadata. The persistent-memory export must include every durable field required for continuation, not only a convenient subset of gains. Save to a new temporary directory, verify every checksum, atomically publish, then append its ID to the registry. Never overwrite a published snapshot or acknowledge a partial directory.

Evaluation loads one snapshot in read-only mode and rejects feedback/plasticity calls. Check fixed and memory hashes before and after each game and at run end. Define transient-state reset explicitly between independent evaluations/games. Tests cover corrupt/truncated artifacts, wrong mappings, reload equivalence, attempted mutation and recovery after publication interruption.

Proposed data layout: `research/data/evaluation-protocols/<version>/` for frozen schedules/specifications; `runs/snapshots/<id>/` for immutable snapshot artifacts; `research/reports/<evaluation-run>/` for results. Reuse existing artifacts by verified references where possible rather than copying the graph for every snapshot.

## 3. Add the evaluation cache

Propose `evaluation-cache.mjs`. Keep this distinct from the search tree: it stores model outputs, not visit statistics. Initial API:

```text
get(evaluationKey) -> immutable result or miss
put(evaluationKey, result, accountedBytes)
invalidateSnapshot(snapshotId)
stats() -> hits, misses, evictions, bytes, entries
```

Build the key from snapshot identity, complete relevant board history, candidate/task/cue identity and evaluator settings. Initially hash the starting position plus complete move sequence for conservative correctness; optimize history equivalence later only with tests. Use a byte-bounded LRU policy with both entry and per-entry limits. Include map/object overhead estimates and monitor real RSS; a byte counter alone is not a process-memory guarantee.

Store only read-only deterministic evaluations initially. If stochastic neural input is later used, include the applicable random-state contract or disable caching; silently reusing one random sample changes the experiment. Do not cache teaching presentations, neural traces needed for a new plasticity event, unknown verification as failure, or mutable references to the model's reused buffers.

Test same-input hits, different-history misses, learning/configuration invalidation, returned-value ownership and forced eviction. Compare cached and uncached candidate outputs on the same manifest. Preserve logical search-visit counts separately from expensive neural-evaluation counts so budget accounting stays explicit.

## 4. Turn investigation into a resumable search session

Propose `search-session.mjs` around a separate board and the frozen evaluator. Leave completed experiment search sources unchanged; use a new versioned adapter/protocol. First specify how a whole-game task differs from bounded mate-puzzle objectives. The current neutral leaf heuristic must stay labelled as such until a justified learned assessment exists.

```text
create(history, snapshot, searchConfig, seed)
advance({ maxEvaluations, maxNodes, deadline, cancelGeneration })
reroot(actualMove, actualHistory)
checkpoint() / restore(checkpoint)
close()
```

Use fixed-capacity or explicitly bounded node/edge storage. Retain parent/child identities, legal actions, original priors, visits, value sums, value counts, terminal/unknown flags, depth and stopping reasons. Node values use one documented convention (for example, node-side-to-move perspective); negate only when crossing players during backup. Never count an incomplete rollout as an observed draw.

Persist snapshot/config/history identities, the retained tree, RNG state, counters and remaining budgets. Checkpoint at a complete simulation boundary first. If interruption occurs mid-simulation, either finish it before publication or discard it and restore pre-simulation RNG/counters; never replay half a backup. Cache persistence can initially be optional: record that omitting it affects resumed runtime, not scientific state, and keep evaluation-budget semantics explicit.

On re-root, verify the played move and complete resulting history. Keep only its reachable valid subtree; release siblings. Keep child-perspective values unchanged, rebuild root-specific exploration settings and enforce a declared inherited-depth policy. Root noise used for training must not accidentally leak into deterministic evaluation. If identities fail, discard the tree and search fresh.

Test legal replay, real-board isolation, perspective on alternating turns, unknown leaves, every resource cutoff, maximum capacity and interrupted checkpoint publication. Same-backend seeded resume from a complete boundary should reproduce the uninterrupted continuation. Re-rooted search need not match a fresh tree's trajectory; test state validity and compare quality under declared compute allocations.

## 5. Implement pondering as a controller

Propose `ponder-controller.mjs` with states `IDLE`, `PONDERING`, `HANDOVER`, `OUR_TURN`, `STOPPED`. Use the same serial search session and brain instance for both turns.

1. After committing our move, copy the authoritative history and start opponent-root search. Explore several legal opponent replies using their perspective, including alternatives beyond the top prediction within the budget.
2. Advance in small bounded chunks and yield to the event loop between evaluations. Merely declaring a synchronous loop `async` does not let an incoming move interrupt it. Yield during pacing and make sleep cancellable too.
3. An opponent-move event increments the cancellation generation and becomes the authoritative pending move. Finish at most the current uninterruptible operation, then stop old work. Reject all stale-generation result publications.
4. Validate/apply the actual move exactly once. On a cache/tree hit, re-root and spend a declared verification/continuation budget. On a miss, begin a new root. Partial hits can reuse evaluations without inventing explored continuations.
5. Commit a legal selected move through the board controller, log the decision and restart pondering. Stop immediately on game end, disconnection or resource guard failure.

If one neural forward call makes handover too slow, consider splitting its execution at safe timestep/row boundaries with scratch state isolated until completion. That is a separately tested change. Do not add an extra brain instance as a responsiveness shortcut.

Freeze ponder limits for elapsed time, total evaluations, tree/cache bytes and CPU pacing. Record speculative versus reused work, hit/miss rates, cancellation lag and post-move latency. Test predicted replies, unexpected moves, rapid duplicate messages, terminal moves, stale completions and memory changes. Compare quality at equal total compute and under realistic clocks separately. See [pondering requirements](pondering.md).

## 6. Build complete-game evaluation

Propose `game-runner.mjs`, `stockfish-client.mjs` and `.codebase/scripts/evaluate-games.mjs`. Freeze a versioned protocol before scored games. Do not assume the existing puzzle adapter or browser player supplies a validated whole-game policy.

The protocol includes snapshot IDs, modes, engine binary/network hashes, all engine settings, opponent pool, opening/history records, colour pairing, seeds, clock/compute rules, pacing, draw claims, adjudication, illegal-move/timeout handling and interruption policy. Initial resource proposal: one engine thread and 32-64 MiB hash, subject to measured combined RSS; do not confuse hash memory with total process memory.

Implement a bounded engine subprocess wrapper with initialization/readiness handshakes, configuration, complete position/history input, search request, stop and shutdown. Bound response buffers and startup/search timeouts. Preserve engine logs and reject malformed/illegal moves. Consult the pinned engine's official protocol documentation and add it to the source register before implementation; this roadmap is not a verified UCI API specification.

The board controller owns the only authoritative game state. For each ply: verify side/terminal status, start the correct budget/clock, request a move, validate it, apply it once, update clocks and append an event. Explicitly handle repetition history, castling, en passant, promotions and the selected automatic/claimable draw rules. Test the pinned chess library's behavior rather than assuming one game-over helper covers the protocol. A human claim rule needs an explicit automated player claim policy.

Distinguish chess results from infrastructure failures: resource exhaustion, artificial ply caps and process crashes get protocol-defined statuses, never silently become draws. Flag exclusions and denominator changes. For timed evaluation, interruption generally prevents exact mid-game continuation; initially retain an aborted attempt and restart the scheduled game under a declared retry limit, without treating it as an additional independent game. Exact move-boundary resume is suitable only where the protocol and all player state support it.

Stream `moves.jsonl`, completed PGNs and `games.jsonl`; publish `state.json` atomically. Give each scheduled game and attempt distinct IDs. Commit final outcomes through an idempotent receipt so recovery cannot double count a game. Pair each opening with colour reversal and retain both games in the same sampling unit.

Validate with deterministic stub players first, then a small pinned-engine smoke run, then a full frozen snapshot pilot. Independently replay every completed PGN, verify claimed results and check snapshot invariants. Keep reference-engine analysis out of FlyChess's move choices. Run games serially and measure combined engine/brain memory. For pondering, freeze fair scheduling/permissions and record CPU contention; a weakened opponent from resource contention must not become an apparent model improvement.

## 7. Fit the measured reference-pool ratings

Propose `.codebase/scripts/fit-reference-ratings.mjs` consuming audited completed games only, plus the frozen protocol and exclusions report. Begin with local reference-pool Elo and a declared conventional anchor; external human-scale ratings need separate evidence.

Before games, select a draw-aware rating model and document its primary source/assumptions. Specify colour/opening treatment, regularization if any, fitting diagnostics and interval method. Do not invent an arbitrary puzzle-score conversion. Fit reference-versus-reference and snapshot-versus-reference results jointly, keeping a connected comparison graph. Opponents should span informative strengths; use a declared pilot to choose a ladder, then freeze the scored schedule.

Compute uncertainty by a declared method that keeps paired opening games together and refits opponent ratings, propagating anchor/reference uncertainty where applicable. Check disconnected pools, all-win/all-loss separation, nonconvergence and strength-dependent residuals. Report bounds or inability to identify a rating when data do not support a finite estimate. An arbitrary fixed anchor has no external-scale certainty to propagate; its scale is simply conventional.

Use synthetic game tables to test symmetry, colour reversal, known-order recovery and failure flags; simulation recovery is software evidence only. Publish raw outcomes, exclusions, fitted ratings, intervals, diagnostics and exact fit configuration. Keep unaided, search and pondering conditions distinct. The proposed 100-game pilot per snapshot/mode is a feasibility sample, not a promised interval width. Freeze the final sample or valid sequential stopping rule before confirmatory collection. See [calibration design](elo-calibration.md).

## 8. Fit and validate the cheaper Elo predictor

Propose a streamed benchmark runner and `.codebase/scripts/fit-elo-predictor.mjs`. Each example links a frozen snapshot/mode to benchmark-version features, a measured reference-pool rating and its uncertainty. Candidate features: tactical/defensive accuracy, endgame results and position-assessment errors. Missing unsupported tasks remain missing, not fabricated zeros.

Declare disjoint development, model-selection and validation groups by training lineage and position family before fitting. All neighbouring checkpoints from one run stay together. Exclude final research test families entirely from calibration/tuning/selection. Ensure the feature definition can be computed consistently on disjoint family samples. Too few independent lineages means the predictor remains exploratory regardless of checkpoint count.

Start with an intercept-only baseline and a small regularized linear predictor. Fit feature scaling and regularization only within calibration/model-selection data; account for rating-target uncertainty and dependence. Select the uncertainty method and document its source before implementation. Evaluate mean absolute error, RMSE, bias, interval coverage/width and performance across strength bands on untouched validation groups. Freeze quantitative acceptance targets before looking at validation results.

Save feature definitions, preprocessing, coefficients, calibration data identities, supported rating range, validation report and predictor hash. New snapshots receive a prediction interval and an out-of-range warning or no estimate when unsupported. Periodically run complete games; changes to encoder/readout/search/ponder protocol require new validation or calibration. Measure time saved relative to games as well as predictive error.

## 9. Separate research proposal: one-pass action readout

The current candidate-by-candidate interface can require many brain presentations per position. A one-pass interface would encode the board once and decode many action scores from one recurrent episode. This is a change in representation and learning, not an equivalent speed refactor.

First define action populations or a decoder, where move identity comes from, legal masking, readout timing and how choice-contingent feedback produces persistent supported change. Verify anatomical mappings and document primary evidence, approximations and permitted learned state. A learned linear policy head trained by backpropagation may serve as an explicitly labelled supervised comparison; it cannot silently replace the biological objective.

Freeze new association/control and puzzle/transfer protocols before testing. Compare against the existing candidate interface at matched exposure and compute, preserving old failures. Require supported learning, all-legal choice evidence, memory causality and unfamiliar transfer before claiming scientific improvement. Only then compare latency/RSS and consider adoption. No retinal input redesign is required for the optimization roadmap; vision through modeled eyes remains separate, unimplemented research.

## Release and evidence checklist

For every increment: add the smallest applicable tests, run `npm test` when math/search/learning/persistence changes, inspect raw artifacts and record limitations. Validate reward perspective, unknown handling, separate-board integrity, persistent state and wiring invariants where applicable. Publish source/input/model hashes and exact commands for performance runs. Preserve failed experiments and append corrections rather than rewriting history.

No new dependencies, workers, dense tensors or GPU assumptions without measured resource justification. No concurrent full-graph performance experiment alongside active training. Use new output directories and atomically published checkpoints. Stop the optimization/evaluation roadmap from becoming a substitute for useful neural learning and reasoning evidence.

This roadmap is a project engineering proposal based on the current local modules and the researcher's accepted feature requests. The existing external Elo source is recorded in [the calibration note](elo-calibration.md) and [source register](../../../research/literature/source-solution-register.md). New engine APIs, statistical algorithms or borrowed kernel implementations must be sourced and registered before experimental use. This documentation update introduces no runtime implementation, measurement or new scientific result.
