# Stage 1 data-separation check (2026-10-30)

This answers findings W01 and W02 of the [codebase weakness review](../codebase-weakness-review-2026-10-30/README.md) for the data package used by full-r14 and full-r15.

**Authorization.** The researcher gave permission on 2026-10-30 ("yes. my answer is yes"): read the sealed validation and final board lists and pair IDs only, never learner results, and output counts only. The script was developed and tested on the training split only by a Haiku agent. The main session reviewed it before running it once on all splits at 11:13 local. No learner result, run artifact, score or audit output was read.

## Result

| Check | train | validation | final |
|---|---|---|---|
| Boards bound through the production panel binders | 24 (0 failures) | 16 (0 failures) | 64 (0 failures) |
| Within-split duplicates: exact position, position+history, symmetry class, piece placement | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| Counterfactual pairs, distinct pair IDs, distinct unordered board pairs | 12, 12, 12 | 8, 8, 8 | 32, 32, 32 |
| Boards covered by pairs; boards in more than one pair | 24; 0 | 16; 0 | 64; 0 |

Cross-split shared keys (train-validation, train-final, validation-final) are 0 for every key type. The key types are exact position (FEN placement, side, castling, en passant), position plus move history, symmetry class (colour flip, plus the horizontal mirror when no castling rights exist) and piece placement alone.

- **W01 (position separation):** no training board is the same position as a validation or final board, and none is a mirror or colour-flip of one. No two splits share a piece placement, even ignoring side to move.
- **W02 (distinct counterfactual pairs):** the final plan has 32 distinct board pairs that together cover all 64 final boards exactly once. The repeated-pair weakness in the gate code is real, but it did not occur in this data.

Every input file hash matches the full-r15 registration. The three plan files are pinned through the registered data audit v2 (`research/reports/lichess-stage1-synthetic-data-audit-v2.json`). Output: [all-splits-output.json](all-splits-output.json). Peak RSS 79.1 MiB; 8.2 s.

## Limits

- The check compares whole positions. It cannot detect near-duplicates, such as the same tactical motif with one irrelevant piece moved. All splits are built by the same three template constructors from different source games. Transfer here therefore means new source games and new positions within known motif templates, not new kinds of motif. Any transfer claim must say so (as the review also notes).
- The symmetry check treats colour flip and mirror as task-equivalent at board level. It does not show that the outcomes are symmetric.
- The data audit's source-record replay was not repeated here; it is part of the pinned data audit.
- The gate-code weakness (W02: unique pair IDs are trusted) still needs a code fix in a future data-audit and evaluator version.

## Files

- [check-data-separation.mjs](check-data-separation.mjs): the script (counts and hashes only; validation and final contents are never printed).
- [check-data-separation.test.mjs](check-data-separation.test.mjs): 9/9 unit tests on synthetic FENs.
- [train-only-output.json](train-only-output.json): the development run, on the training split only.
- [all-splits-output.json](all-splits-output.json): the authorized run.
