# Stage 1 cue sparsity on the planner surrogate (2026-10-29, no graph)

Surrogate evidence only: a direct-path linear model of the r11 KC-to-MBON path, not the graph, not a learning result, not a gate. Training rows only. Validation and final data were not read.

## Setup

- Script: `sparsity.mjs`. It copies the planner-surrogate logic from `stage1-attack-map-cue-v2-2026-10-28/planner-surrogate.mjs` (not edited): the registered rehearsal planner rule, mean r13 factors per frame type, null frame on, eta 0.2, the same 5 wirings (seed 20261101 plus 101, 202, 303, 404).
- Cue: `cue-v2-sparsity-variant.mjs`, a test-only copy of cue v2 with only caps relaxed (cellsPerToken up to 80, since the original cap is 32; maxCells up to 1024; totalCurrent up to 1.5 times maxCells). Tokens, hashing and budget logic are unchanged. Per-cell current is `min(1.5, totalCurrent/cells)`, so it is 1.5 in every setting.
- Each setting: 32 blocks (no early stop), and leave-one-family-out (LOFO): planner-taught on the other families for 16 blocks, then the held-out boards counted (of 24).
- Overlap: mean pairwise Jaccard of stimulated cell sets between different legal moves on the same board, averaged over boards, then over wirings.

## Results

Counts are correct boards out of 24. "After 16" covers blocks 16 to 32 on all 5 wirings.

| cellsPerToken / maxCells | After-16 min-max | Per-wiring min (5 wirings) | LOFO held-out per wiring | Mean LOFO | Pair Jaccard | Cells per move (mean) |
|---|---|---|---|---|---|---|
| 5 / 32 | 20-24 | 22, 20, 24, 20, 20 | 24, 21, 24, 21, 21 | 22.2 | 0.490 | 29.1 |
| 10 / 64 | 20-24 | 23, 20, 21, 23, 20 | 23, 20, 24, 22, 20 | 21.8 | 0.501 | 57.0 |
| 20 / 128 (v2) | 21-24 | 21, 22, 21, 23, 24 | 22, 21, 24, 23, 23 | 22.6 | 0.522 | 108.1 |
| 40 / 256 | 20-24 | 23, 22, 20, 24, 22 | 23, 22, 24, 23, 23 | 23.0 | 0.549 | 202.9 |
| 80 / 512 | 17-24 | 17, 23, 24, 22, 17 | 18, 22, 23, 24, 22 | 21.8 | 0.571 | 355.5 |

## Reproduction check

The 20/128 setting reproduces the v2 rows of `stage1-attack-map-cue-v2-2026-10-28/planner-surrogate-results.jsonl` (nullFrame true) on all 5 wirings: the 8-block smoke counts with early-stop point, the 32-block counts, and the LOFO counts all match exactly. `reproduced: true` is in `sparsity-results.jsonl`.

## Conclusions (surrogate evidence)

- Denser codes do not improve training counts. After block 16 all settings sit near the 24-board ceiling. Mean post-16 counts are about 23.1 to 23.9 across settings.
- Held-out LOFO transfer is flat across 5 to 40 cells per token (mean 21.8 to 23.0 of 24). The differences are within the spread between wirings and within 1 to 2 boards. No setting is clearly better.
- Overlap rises steadily with density (0.49 to 0.57), which fits the interference concern. At 80/512 it also comes with a real cost: two wirings drop to 17 after block 16, and the lowest held-out values appear there (18 and 22).
- So in this surrogate, the current 20/128 sits in the flat middle. Denser codes add shared cells without a measured transfer gain. This surrogate cannot show whether the graph's saturation or its interference behaves the same way.

## Limits

- Direct-path surrogate, not the graph. Recurrent dynamics are omitted. The Stage 1 KC pools and mapping are the r11 surrogate's.
- Five wirings, 24 training boards from 6 families. The LOFO differences are small relative to wiring variation.
- The 5/32 setting has a mean of 29 cells per move, below its 32-cell cap because of collisions; the budget is shared across tokens.
- The cellsPerToken 40 and 80 settings required relaxing the test variant's cellsPerToken cap (test-only). Those settings are not engineering encoders.
- Sampled residency and times are from this machine: wall time 332 s for the whole sweep, peak RSS 215 MiB (`--max-old-space-size=512`). No graph file was loaded directly by this script beyond the existing surrogate's r11 factory.

## Files

- `sparsity.mjs`: sweep and reproduction check.
- `cue-v2-sparsity-variant.mjs`: test-only cue variant.
- `sparsity-results.jsonl`: per-setting, per-wiring rows, reproduction record and run record.
