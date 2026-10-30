# 2026-10-23: FEN-root synthetic task integration

## Why this changed

The current Stage 1 source pool and one-piece counterfactual path do not supply audited examples for all four frozen semantic strata. The documented next data design uses hypothetical positions tied to, but kept separate from, authentic Lichess source histories. Inspection found that the Stockfish collector replayed every panel from the standard initial position and sent `position startpos`, so it could analyze the wrong board for a synthetic task. The production panel binder also equated source history with the task board, while runtime maps assumed one task per source puzzle.

## Change

The collector now preserves the standard-start path for legacy/source-history panels and accepts an explicit `historyKind: "synthetic-root-position"` path. That path requires a zero-ply FEN-rooted PGN, a complete legal Stage 1 FEN with no castling or en-passant rights, and the panel's audited source-prefix hash. Stockfish receives the exact task FEN and candidate move through UCI.

The panel binder now allows the task PGN/FEN to differ from its Lichess source context only when a `lichess-synthetic-task-position-v1` record binds both: it checks the authentic source prefix, parent source hash, exact sorted occupancy diff, task identity, side to move, zero played plies and six-piece cap, then replays every legal task certificate. Stage 1 runtime/evaluator lookup now uses a unique `lessonId` when supplied, so several synthetic positions can retain the same puzzle/game provenance. Block, Stockfish session and runtime context keys include the synthetic history kind and parent-source hash. `node --check` passed on all edited JavaScript modules; no behavioral tests were run.

## Scope correction and limits

The production call path now has source/task panel plumbing, but it still has no producer for this row schema and no independent audit that binds `sourceRecordSha256` to the pinned source row and proves family/split integrity. Thus synthetic panels remain unavailable to a legitimate registration; no data or campaign has been authorized.

Read-only train/validation count diagnostic: an initial PowerShell summary looked for `stage1DomainEligible` at the row top level and incorrectly reported zero. The field is nested under `lesson`; correcting the selector found 20 eligible rows in each 128-row split. Train piece counts are 2/8/10 at four/five/six pieces; validation counts are 4/3/13. This is only a source-capacity count, not candidate-family evidence. The mistake changed no files or data. No final input was inspected.

This is necessary plumbing, not an accepted dataset, campaign readiness, or an experiment result. No behavioral test, Stockfish process, neural event, graph run, or G0 work occurred.

The campaign status remains `not_registered`, with zero accepted stages. Synthetic task production, independent source-row/family/split audit, eligible Stage 1 registration, campaign registration and production runtimes for Stages 2-12 remain unfinished. The frozen four-stratum and final-seal requirements are unchanged.
