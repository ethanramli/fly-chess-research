# Stage 2 outcome-only gap map (2026-10-29)

Read-only map. No file was edited, moved or executed. Line numbers are from the files as read on 2026-10-29. Items marked **(inference)** are reasoning from the code, not verified by running it.

## 1. Existing Stage 2 and its Stockfish dependencies

Call path: `runtime-factory.mjs buildArm` (97-131) calls `brain-factory.mjs createLichessStage2Brain` (17-79).

Stockfish dependencies in the existing Stage 2:
- `lichess-stage2-runtime-factory.mjs:13-14`: imports `bindLichessStockfishReview` and `CoupledStockfishSession`.
- `:76-87`: requires a pinned `lichess-stage2-stockfish-reviews-v1` file, one review per panel, and binds each to its panel.
- `:98`: asserts `feedbackProtocol === 'verified-outcome-plus-stockfish-v2'`. An outcome-only registration fails here.
- `:114-116`, `:126-127`: the `stockfish-shuffled` condition and `registration.stockfishShuffle.sha256`.
- `:119`, `:123-124`: review identities are bound into the session identity.
- `brain-factory.mjs:13`, `:71-73`: builds `CoupledStockfishBrain`, not the outcome-only receiver that Stage 1 v7/v8 use (`coupled-outcome-only-brain.mjs:120`).
- Six-condition lists that include `outcome-only` and `stockfish-shuffled`: `lichess-stage2-checkpoint-selector.mjs:12`, `curriculum-retention-challenge.mjs:15`, `curriculum-retention-promotion.mjs:13` (also asserted at `:33`).

Not Stockfish-dependent: `lichess-stage2-avoid-mate-panel.mjs` binds every legal action through `verifiedExperience` (`:42`) and enforces the four strata and task contracts (`:23-25`, `:31`).

Encoder mismatch **(inference, must resolve)**: `brain-factory.mjs:70` uses `createPublicStage2CurriculumFrameEncoder` (`chess-input/public-lesson-frame-cue.mjs:85-87`). Stage 1 v8 uses `public-attack-map-cue-v2` (`lichess-stage1-brain-factory-v8.mjs:94`). The domain doc says Stage 2 must match the earlier projection settings (`documentation/design/puzzle-learning/stage2-avoid-mate-domain.md`, "Continuity and rehearsal").

## 2. New versioned files for outcome-only Stage 2

Versioning follows the repo's convention: the new file is `-vN` and the parent is left untouched.

| # | New file | Parent | Change |
|---|---|---|---|
| A | `.codebase/src/puzzle-learning/lichess-stage2-brain-factory-v2.mjs` | `lichess-stage2-brain-factory.mjs` | Build `CoupledOutcomeOnlyBrain` (`coupled-outcome-only-brain.mjs:120`) instead of `CoupledStockfishBrain`. Update the identity schema. Decide the encoder: attack-map v2 to match Stage 1 v8, or justify the public-lesson encoder. |
| B | `.codebase/scripts/puzzle-learning/lichess-stage2-runtime-factory-v2.mjs` | `lichess-stage2-runtime-factory.mjs` | Import A (`:10`). Change `:98` to `verified-outcome-only-v1`. Delete the stockfish-shuffle branches (`:114-116`, `:126-127`). Keep review binding (`:76-87`, `:119`) as Stage 1 does (`lichess-stage1-runtime-factory-v7.mjs:7-9`). The session still needs the string `verified-outcome-plus-stockfish-v2` (`coupled-stockfish-session.mjs:20`). Keep `deriveAcceptanceEvidence`, retention and replay wiring. |
| C | `.codebase/scripts/puzzle-learning/lichess-stage2-acceptance-evaluator-v1.mjs` | `lichess-stage1-acceptance-evaluator-v2.mjs` plus the selector | Must export the three functions the runner and factory check (see section 3). Four conditions, not six. |
| D | `.codebase/src/puzzle-learning/curriculum-stage2-acceptance.mjs` | `curriculum-stage-acceptance.mjs` | Stage 2 gate: current validation at least 14/16 with 3/4 per stratum (the Stage 1 D2 pattern, `:100-103`); no D7 deferral. |
| E | `.codebase/scripts/puzzle-learning/lichess-stage2-checkpoint-selector-v2.mjs` | `lichess-stage2-checkpoint-selector.mjs` | Four conditions (`:12`). Import helpers from `lichess-stage1-acceptance-evaluator-v2.mjs`, not v1 (`:8-9`), because v1 is the six-condition, Stockfish-D9 evaluator. |
| F | `.codebase/src/puzzle-learning/curriculum-retention-challenge-v2.mjs`, `curriculum-retention-promotion-v2.mjs` | the v1 files | Four conditions (`challenge:15`, `promotion:13`, `:33`). |
| G | `.codebase/scripts/puzzle-learning/build-lichess-stage2-registration-v1.mjs` | none (Stage 1 builder is the template) | Four conditions, `feedbackProtocol: verified-outcome-only-v1`, no `stockfishShuffle`, `dataAudit.schema` prefixed `lichess-stage2-`, and `acceptanceData.retention.earlierPrinciples` filled (see section 3). |
| H | `.codebase/scripts/puzzle-learning/run-lichess-curriculum-matrix-v6.mjs` | `run-lichess-curriculum-matrix-v5.mjs` | Stage >1 in merge and replay; retention phase in merge (section 4). |

Prerequisite **(inference)**: `build-lichess-stage1-registration-v1.mjs` still writes six conditions (`:56`), pins the v1 evaluator (`:60`), and uses `retention:{sentinelPanelIds, earlierPrinciples:[]}` (`:68`). Confirm which builder produced the outcome-only Stage 1 registration before reusing it.

## 3. Stage 2 acceptance evaluator contract

Runner checks (`run-lichess-curriculum-matrix-v5.mjs:153-160`) require, for stage 2:
- `deriveStage2AcceptanceObservations`
- `evaluateStage2ReplicasAcceptance`
- `selectStage2TrainingCheckpoint`

Current status: `selectStage2TrainingCheckpoint` exists only in `lichess-stage2-checkpoint-selector.mjs:61`. The other two are called by the factory (`lichess-stage2-runtime-factory.mjs:237-238`, `:261`) but exist in no file. Grep found no definition in `.codebase`.

Observation shape required by the factory (`runtime-factory.mjs:245-260`): `schema: lichess-stage2-acceptance-observations-v1`, replicas with `initialMemoryHashes`/`finalMemoryHashes`, and per-replica `evidence` with `prerequisites`. Stage 1's shape (`lichess-stage1-acceptance-evaluator-v2.mjs:300-417`) is the model.

Where D7 and the sentinel rules are specified:
- Stage 1 policy B: D7 is deferred (`evaluator-v2.mjs:345-349`, string `stage1-d7-rechecked-by-stage2-v1`; gate skip at `curriculum-stage-acceptance.mjs:126`).
- Cumulative retention rule: `curriculum-retention-observations.mjs:62-63`. Earlier validation after must be at least the selected checkpoint's count, and at least its baseline. All four sentinels must be correct before and after. Also `:39` requires `earlier.length === stage-1`, and `:42-45` requires 16 validation and 4 sentinel panels per earlier stage. Domain doc: `stage2-avoid-mate-domain.md`, "Measured retention and promotion".
- Stage 2 incoming check: `lichess-stage2-checkpoint-selector.mjs:100-101` requires baseline at least 14 and four sentinels, but selection (`:97`) does not gate earlier validation. The gate is applied only in the retention phase (`:62-63`). Keep that split.

Defects to fix in the registration and selector **(inference, verify before use)**:
- `selector.mjs:52-56` reads `acceptanceData.retention.earlierPrinciples[0]` with `validationPanelIds` and `sentinelPanelIds`. The Stage 1 builder writes `earlierPrinciples: []` (`build...:68`), so Stage 2 will fail until G fills it.
- The Stage 1 builder takes sentinels from `validation-families.json` (`build...:52-53`). The selector looks them up in training panels (`selector.mjs:55`). Unless the IDs are train-split, this is a mismatch.

## 4. Runner v5 and audit v2 changes for stage >1

Runner v5 (`run-lichess-curriculum-matrix-v5.mjs`):
- `:117-118` requires exactly the four outcome-only conditions. No change needed.
- `:137-141`, `:167-173`: stage >1 data and receiver schemas must use the `lichess-stage2-` prefix. Supply those in G.
- `:215` merge is stage 1 only. `:226-234` reads one-replica parts and checks `part.status`. Required change: after merge, run `completeTraining` on the merged result and write `training-phases.json` (`lichess-curriculum-matrix-v2.mjs:191-215`). Today the runner calls `completeTraining` inside each `--replica` train run (`:258`), which would run retention on a one-replica result. Make `train --replica` skip it, and let merge run it once (inference).
- `:300` replay is stage 1 only. Keep stage >1 on the replay-free audit path. `:305-311` (`--replays`) must refuse stage >1 unless audit v2 is changed.
- `:283-290` reads `training-phases.json`. This is already generic.

Audit v2 (`lichess-curriculum-matrix-audit-v2.mjs`):
- `:69` stage 1 only.
- `:99-100` rejects retention promotion. The v1 audit handles it (`lichess-curriculum-matrix.mjs:243-262`, calling `validateRetentionPromotion`). Simplest path: use the v1 audit for stage >1. Porting promotion into v2 is the alternative.

Matrix v2 `completeTraining` path (`lichess-curriculum-matrix-v2.mjs:191-215`) is already generic. The `digest` used for `matrixResultSha256` is `sha256(JSON.stringify)`, matching the runner check at `:288`. No change needed.

## 5. Final ordered work list

1. Confirm the Stage 1 outcome-only registration and evaluator pins (section 2, prerequisite).
2. Decide the Stage 2 encoder (attack-map v2 vs public-lesson) and record it in a decision-log entry.
3. Write A (brain factory v2) and B (runtime factory v2). Check them against section 1.
4. Write the four-condition retention challenge and promotion modules (F) and selector v2 (E).
5. Write the Stage 2 gate (D) with cumulative D7 per `retention-observations.mjs:62-63`.
6. Write the Stage 2 evaluator (C) with the three exports and the factory observation shape.
7. Write the registration builder (G), filling `earlierPrinciples` and resolving the sentinel source.
8. Write runner v6 (H): stage >1 merge runs retention once, `train --replica` skips it, and `--replays` refuses stage >1.
9. Run the outcome-only offline checks, including selector and retention tests (`tests/puzzle-learning/lichess-stage2-checkpoint-selector.test.mjs` exists), before any graph run. The Stage 2 path has never been executed (domain doc).
