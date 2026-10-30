# Synthetic positions derived from Lichess puzzles

2026-10-23. Data and runtime contract for one-ply Stage 1 counterfactuals. This allows a hypothetical board to retain Lichess provenance without pretending the modified position occurred in the recorded game. The panel binder and Stockfish UCI collector now accept an explicitly FEN-rooted task while verifying its source record separately. No synthetic prepared dataset, independent split audit, or training authorization exists yet.

## Two separate records

Every lesson has an immutable **source record** and a separate **task position**.

- The source record binds the Lichess puzzle ID, source game ID, CSV row hash, authentic standard-start PGN prefix, original FEN, source audit and puzzle split. It is provenance only; it does not claim the modified position occurred in that game.
- A source-position task uses the original verified PGN/FEN and its real history.
- A counterfactual task stores its exact hypothetical FEN, the parent source-record hash, a complete occupancy diff, side to move, task criterion and an explicit `synthetic-root-position` history kind. It must not reuse the original PGN as if the changed board followed from those moves.
- The task-position identity hashes the exact FEN, history kind, parent source hash, mutation and task. Source-game, symmetry and mutation-family descendants stay in one data split.

## Prepared row and runtime binding

Keep the existing lesson/history row shape, with these additional fields for a synthetic task:

- `lesson.lessonId`: unique task identity; `lesson.puzzleId` and `lesson.gameId` remain the authentic source IDs.
- `lesson.context`: a FEN-rooted PGN with zero played plies, the exact task FEN/task, `historyKind: "synthetic-root-position"`, and `parentSourceRecordSha256`.
- `history.context`: the authentic Lichess source-prefix FEN and PGN; `history.prefixPgnSha256` continues to hash this source PGN.
- Top-level `sourceRecordSha256` and `syntheticPosition`: the parent source hash, source/task FENs, side to move, `mutation`, `occupancyDiff`, and `taskPositionSha256`.

`mutation` and `occupancyDiff` are the same sorted list of `{square,before,after}` entries, covering every changed occupancy square. `taskPositionSha256` is SHA-256 over the UTF-8 JSON serialization of `{taskFen,historyKind,sourceRecordSha256,mutation,task}` in that property order. The panel binder recomputes the source-prefix hash, task PGN/FEN, zero-ply root, six-piece cap, rights restrictions, full occupancy diff and task-position identity. It then independently replays every all-legal task certificate. The family loader keys synthetic variants by `lessonId`, allowing several distinct task positions to retain one source puzzle ID; train/validation/final family audits must still keep source-game and mutation descendants in one split.

This is a runtime contract only. The upstream independent data audit must bind `sourceRecordSha256` to the exact source row and verify the Lichess source split before setting any teaching-eligibility flag.

For the current one-ply capture-retention task, only positions with no castling or en-passant rights are eligible. The task's stated consequence is immediate legal recapture of the capturing piece; it makes no claim about repetition, fifty-move draws, game outcome or full move-history legality. Synthetic counters may be normalized only under this explicit task scope and must never be represented as authentic historical counters.

## Teacher and learner boundary

The learner receives the task position and legal actions. The independent checker receives the exact task position, source binding, chosen action and proof. It recomputes legality and every required immediate reply. Unknown or exhausted proof produces no event. Every legal action must have a task-scoped result: a capture can be certified for retention; a quiet move is labeled `does-not-perform-capture-task`, not globally bad. The learner never receives the result, proof, mutation label, future reply or engine value before its unaided all-legal ranking is recorded.

The Stockfish-assisted arm is separately declared and receives only a complete, position-bound engine review after that ranking. Its value target is an estimate, not a verified task consequence. The outcome-only arm receives the independent capture-retention result. Matched shuffled, absent and disabled-plasticity arms use the same boards, actions, order and exposure. A FEN-rooted engine request must bind to the hypothetical FEN; the original game PGN cannot be sent as the board history for a modified position.

## Required independent audit

Before any Stage 1 registration can use a derived position, an independent audit must verify:

1. The source row, puzzle split, authentic history and original task position against pinned inputs.
2. The hypothetical FEN differs only by the declared mutation, has exactly the registered side to move, and is a legal static chess position under the Stage 1 restrictions.
3. The capture and every legal reply are independently recomputed from that exact FEN; all legal actions receive a task-scoped certificate or an explicit unknown.
4. Family construction and train/validation/final partitioning occur before teaching. Related source roots, counterfactuals, distractors and symmetry equivalents cannot cross splits. Final stays sealed until validation selection is frozen.
5. All four frozen Stage 1 semantic strata have their full registered quotas, and the receiver, evaluator, resource, retention and causal-control prerequisites independently pass.

## Current evidence and stop condition

Validation capture-counterfactual v2 replayed 822 one-piece flips from 74 Lichess roots. Exact signature comparison with training v2 found 377 validation signatures absent from training, but the existing stratum classifier found no pinned-apparent-defender examples, only 12 open-to-blocked pairs, and 152 check-state cases unknown to that classifier. The current candidate output does not meet the frozen four-stratum data gate. The new panel/runtime binding does not waive that gate, resolve the no-G0 instruction, supply an independent family audit, or authorize `fly babysit` to load a learner. Data generation and independent source/split audit remain necessary before a new pinned stage registration.

## Partial implementation - 2026-10-23

`stockfish-review-collector.mjs` distinguishes the existing standard-start PGN route from an explicit `historyKind: "synthetic-root-position"`. Synthetic requests require zero played plies, a complete canonical FEN with no castling or en-passant rights, and a retained audited source-prefix hash; UCI receives `position fen <task FEN> moves <candidate>`. Legacy contexts without a history kind keep the standard-start replay check. This prevents the engine from analyzing the source game's board when a task is rooted at a changed FEN.

Scope correction: inspection of the production call path shows this is not yet reachable through the current Stage 1 binder, which still requires a source PGN to reproduce the task position. Do not treat the collector branch as synthetic-panel support or a runnable data path. Next implement the separate source/task panel binding and its independent preparation audit; keep the four-stratum gate, family split, and final seal intact. No Stockfish process, learner, graph, or G0 work was run.
