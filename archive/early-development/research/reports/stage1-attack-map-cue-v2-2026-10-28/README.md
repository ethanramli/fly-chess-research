# Stage 1 attack-map cue v2: design, surrogate validation and screen (2026-10-28)

Context: stop S2 after smoke r13 ([report](../stage1-smoke-r13-2026-10-27/README.md)). The researcher chose (a) separate attack facts for quiet moves and captures and (b) a true pin flag, with eta kept at 0.2. Everything here uses training rows and the r13 run's own records. It is engineering screening evidence, not a learning or gate result. The attack map is engineered input given to the Fly, and every claim must say so.

## Encoder

`.codebase/src/chess-input/public-attack-map-cue-v2.mjs` (tests: `.codebase/tests/chess-input/public-attack-map-cue-v2.test.mjs`, 6/6; v1's 5/5 unchanged). Tokens per move:

- `act:capture` or `act:quiet`;
- `act:<tag>|att:<piece>:<mark>` for each enemy piece type that can reach the landing square after the move, or `act:<tag>|att:none`. The mark is one of:
  - `pin`: on a clear line with its own king, and the first piece beyond it on that line is a mover's slider that moves along the line;
  - `kline`: on a clear line with its own king, not pinned;
  - `free`: otherwise.

The pin mark is geometric. It does not check whether the pinned piece could still capture along the pin line, so it is not a legality verdict. A test checks that folding v2 back (removing the tag prefix, mapping pin to kline) gives v1's tokens, so v2 adds the pin fact and separates cells, and nothing else.

Both structural ties of v1 are resolved:
- f0-pin-p0a: hxg5 gives `n:pin`, Qxg5 gives `n:kline`;
- f2-pin-p0a: Rxf6 gives `q:pin`, Qxf6 gives `q:kline`.

## Surrogate validation (`replay-r13.mjs`, `planner-surrogate.mjs`)

- **Replay.** Every learning frame recorded in r13 (stimulated cells and the recorded restrained and alpha-lobe factors) was replayed through the r11 surrogate. Block-start counts are 0, 7, 20, 19, 8, 20 against the graph's 0, 7, 20, 19, 7, 20. Gain deviations correlate 0.99 with the stage checkpoints.
- **Correction to the r13 report.** That report said the surrogate does not reproduce the collapse. It does, when driven by the actual lesson schedule. The earlier rotation screen used a different schedule.
- **Background plasticity.** The no-channel third frame and the untaught-channel factors during a pulse (about -0.02 to -0.11, against about -1.05 for a pulse) lower the v1 peaks by about 3 boards (22 to 19). They do not cause the collapse.
- **Planner-driven surrogate.** This applies the registered planner rule with the mean recorded factors per frame type. For v1 at the r1 seed it reproduces r13 exactly: counts 0, 7, 20, 19, 7, 20 and the same five targets.

## Screen: v1 against v2 (5 cell wirings, eta 0.2, `planner-surrogate-results.jsonl`)

| Cue | 32-block range after block 16 | Leave-one-family-out (planner, 16 blocks) |
|---|---|---|
| v1 | 0-22 per wiring (minimum 0, 15, 16, 11, 18) | 16, 19, 19, 18, 19 /24 |
| v2 | 21-24 (minimum 21, 22, 21, 23, 24) | 22, 21, 24, 23, 23 /24 |

Removing the no-channel frame makes no material difference under v2.

**Defect found:** the registered early stop (`informative-training-progress-v1`) ends a run that has reached the ceiling, because 24/24 cannot improve. In the screen, v2 lineages at 24/24 were stopped as "no progress". Smoke r14 therefore registers no early stop.

## Smoke r14 (graph)

Registered as r13 with cue v2 and runtime/brain factory v8, with eta 0.2 and no early stop. Launched detached on 2026-10-28; after an unclean system shutdown it resumed from block 3 into `runs/lichess-stage1-synthetic-v1-smoke-r14-resume-0001` (ledger L053-L055). Informative arm block-start training counts: 8, 18, 24, 23, 24, 24, 22, 24 (the surrogate predicted 8, 17, 24). Validation-only audit (registered addendum `stage1-smoke-r14-validation-audit-addendum.json`; evaluator v3; the final set was not opened):

| Arm (block 8) | Training /24 | Validation /16 (open, blocked, absent, pinned) |
|---|---|---|
| informative | 24 | **15** (4, 4, 4, 3) |
| absent | - | 0 |
| disabled | - | 2 |
| shuffled | - | 0 |

D1 and D2 pass, and the full neural replay is verified for every lineage. One replica, 8 blocks: not stage acceptance. Full Stage 1 (`full-r14`, 3 replicas, 32 blocks) was launched 2026-10-28 (ledger L061).

## Limits

- One replica's model and graph, and 24 training boards from 6 families.
- Leave-one-family-out is within training. It is not validation (D2), and validation was not read.
- The surrogate omits recurrent dynamics beyond the direct KC-to-MBON path. Its agreement is measured on this run, not guaranteed for other cues.
