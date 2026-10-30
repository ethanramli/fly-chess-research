# Stage 1 learnability diagnostics (2026-10-24)

Read-only scripts used to diagnose why the Fly did not learn Stage 1. None runs the connectome, changes memory, or reads validation/final data. Run from the repository root: `node <script> [run-dir-name ...]`. Full narrative: [journal](../../journal/experiments/2026-10-23-babysit-stage1-end-to-end.md).

| Script | What it shows | Result recorded |
|---|---|---|
| `encoder-overlap-and-scorer.mjs` | Same-board vs cross-board input overlap for the v1 and action-relative cues; a leave-one-family-out logistic token scorer (representation check, not the Fly) on training rows | v1: overlap 0.856, scorer fits 10/20, held-out 3/24. Action-relative: overlap 0.183, fits 20/20, held-out 11/24 |
| `arm-lesson-choices.mjs RUN [RUN...]` | Per block, how many of the 4 lesson-start unaided choices were correct, for every arm | smoke-r6: informative 8/32 vs controls 7-9/32 (no taught advantage) |
| `target-board-rank.mjs RUN [RUN...]` | Rank of the certified move on each block's target board (informative) | full-r5 (v1 cue): stuck at 29/30 and 21/22 for 15 blocks |
| `lesson-events.mjs RUN` | Each lesson's taught move, top-3 ranking and success rank | smoke-r6: one success pulse moves the correct move to rank 1; learning fades across blocks |
| `plasticity-factors.mjs RUN` | ReversalMemory factor D per pulse in a block | task pulses D about -1.0, Stockfish about -0.5; with eta 0.5 each pulse halves every inactive cell's deviation |
| `dose-proxy-negative.mjs` | Crude linear proxy of the rule at several eta/recovery settings | No setting learned the 24 boards (best 9-11/24 vs 7/24). Negative design probe only; too crude to choose a mechanism |

Run names are directory names under `runs/` (for example `lichess-stage1-synthetic-v1-smoke-r6`).
