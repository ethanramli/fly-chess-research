# 2026-10-22 - babysit encoder bridge

## Mistake and correction

The researcher resumed the full babysit goal and explicitly said not to work on G0. The prior turn misread an earlier HDD-move request as the task to continue and stopped babysit work. That turn made no progress toward the active goal. This turn returned to the babysit path; no HDD operation or G0 work was performed.

## Change

`MappedPuzzleBrain` calls its encoder with `(board, action, task)`, while `createPublicLessonFrameEncoder` accepted only a serialized frame object. The encoder now converts the board call into its existing strict `{schema, fen, pgn, action, task}` frame and then applies the same validation. No teacher label or answer feature was added.

## Evidence and limits

`node --check .codebase/src/chess-input/public-lesson-frame-cue.mjs` passed. No behavioral tests, graph run, Stockfish process, or G0 work occurred. This fixes one interface mismatch only. The production learner/replay factory, eligible disjoint Stage 1 family package, Stockfish review registration, and campaign configuration remain unfinished. The current v7 lesson audit still denies neural teaching, family disjointness, and graph launch.

## Next action

The fresh Stage 1 brain-construction part is now implemented in `.codebase/src/puzzle-learning/lichess-stage1-brain-factory.mjs`. It checks pinned graph/mapping/model-source bytes and cell identities, initializes a new sparse model and dual-valence memory, and builds the existing Stockfish-value brain over the public Lichess frame encoder. Static syntax checks pass; it was not instantiated against the research graph. The Stage 1 audit still denies neural teaching and family disjointness.

Next: connect this constructor to panel/review loading, the resumable block session, and an independent replay/evidence factory. Keep execution blocked until the independent Stage 1 lesson/family gates are true. Do not work on G0.

## Replay boundary correction

Tracing the production call path found that `auditLichessCurriculumStage` passes the decoded stage-prefix checkpoint object into `createReplayBlock`. The runtime factory attempted `readFileSync` on that object, so independent matrix replay would fail. It now validates the decoded object's schema and identity directly; the unused checkpoint-decoder import was removed.

Evidence: `node --check` passes for the runtime factory and stage auditor. This is static interface verification only; no graph or campaign was run. The campaign registration and data eligibility gates remain missing/false.

## Correction: babysit is still unfinished

The researcher clarified that the deliverable is the working `fly babysit` command. The Python command interface exists, but no default campaign registration exists, and the pinned Stage 1 audit denies neural teaching, relation-family disjointness and graph launch. A new runtime factory had an incorrect Windows root-path conversion; changed it to derive the root from `fileURLToPath(import.meta.url)`. The matrix audit also labeled unavailable acceptance evidence as a measured gate failure; it now preserves that state as `unknown`.

The runtime identity stays equal to the matrix-provided identity, which already binds the campaign and lineage; the session/checkpoint identity remains separately pinned for replay. This avoids changing identity when the audit reconstructs the runtime.

Evidence: `node --check` passed for both changed modules. No training, Stockfish or G0 process was started. These fixes do not complete the campaign or establish learner efficacy. Next: finish the registered runtime and independent evidence derivation while the false data gates remain closed.
