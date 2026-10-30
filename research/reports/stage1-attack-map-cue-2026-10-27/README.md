# Stage 1 attack-map cue: design, surrogate screens and graph checks (2026-10-27)

Scope: researcher option A after step 1 (decision log 2026-10-27). The Fly is given an attack map of each candidate move's landing square. This report covers the encoder design and the evidence used to choose its settings, then launches the predeclared graph probe v8. Everything here uses training rows only. The surrogate rows are engineering diagnostics, and none of this is a learning or gate result.

Scripts (run from the repository root with `node --max-old-space-size=512 research/reports/stage1-attack-map-cue-2026-10-27/<script>`; outputs alongside):

| Script | Output | What it does |
|---|---|---|
| `screen.mjs` | `screen-results.jsonl` | r11 surrogate (direct-path linear model from the [2026-10-27 surrogate report](../stage1-memory-literature-and-surrogate-2026-10-27/README.md)) with cue v4 against the first attack-map design: move tag, 1 cell per token |
| `capacity.mjs` | `capacity-results.jsonl` | per-cell scratch value and reachable range under the r11 channels; an idealized learner that may set every cell anywhere in its range |
| `variants.mjs` | `variants-results.jsonl`, `variants-seeds-results.jsonl`, `variants-budget-results.jsonl` | coarse capture tag, cells per token k, cell budget, 5 random cell wirings (args in the file header) |
| `fidelity.mjs` | `fidelity-results.jsonl` | read-only full graph: surrogate-learned gains copied into the r11 graph memory, every training move presented, choices compared |
| `mechanics.mjs` | `mechanics-results.jsonl` | factory v6 and registration r12 built from pinned files; graph KC activity and DAN factors for the new cue |

`screen.mjs`, `capacity.mjs` and `variants.mjs` ran on the first draft of the encoder (move tag, task token, one cell per token). That draft is preserved as [`draft-attack-map-cue-v0.mjs`](draft-attack-map-cue-v0.mjs) and the three scripts now import it. Re-running them to confirm identical output waits until probe v8 ends, because graph work stays serial. `fidelity.mjs` and `mechanics.mjs` ran on the registered encoder.

## Encoder

`.codebase/src/chess-input/public-attack-map-cue-v1.mjs` (tests: `.codebase/tests/chess-input/public-attack-map-cue-v1.test.mjs`). Tokens per move:

- `act:capture` or `act:quiet`;
- after the move, `att:<piece type>:kline|free` for each enemy piece that can reach the landing square (pseudo-legal, from chess.js `attackers`, pins ignored), where `kline` means the attacker stands on a clear straight line with its own king;
- `att:none` when no enemy piece can reach the square.

Each token drives 20 hashed KCs in each of the MBON01, MBON12 and MBON07 pools, within a 128-cell budget at 1.5 per cell. There is no task token. Same frame contract as cue v4; the value cue after a public move repeats the move cue from the mover's side. This is a restricted, engineered attack judgement given to the Fly, not vision. Claims must state it.

## Why these settings (surrogate, eta 0.1 unless noted, outcome-only lessons)

1. **First design (move tag such as `pxn`, 1 cell per token).** The r11 rules transferred little: held-out training families 6-8/24, retention probe 0/4 (`screen-results.jsonl`). Teaching only on errors did not help (5-6/24).
2. **Capacity is not the limit.** A learner allowed to set every cell anywhere in its reachable range fits 24/24. The problem is each cell's scratch value: its spread across cells is about 5 times the median learnable range (`capacity-results.jsonl`). Facts never taught keep their random scratch push, which outweighs learned differences.
3. **Fixes (`variants-*.jsonl`).** The coarse capture tag lets tokens recur across families. More cells per token averages out scratch pushes. Results over 5 cell wirings, held-out boards /24 and twin pairs both right /12:

| Cells per token | Boards (5 wirings) | Mean boards | Mean pairs |
|---|---|---|---|
| 3 (with task token) | 22, 11, 19, 19, 14 | 17.0 | 6.8 |
| 6 | 21, 16, 20, 22, 18 | 19.4 | 8.0 |
| 10 | 21, 18, 21, 18, 16 | 18.8 | 8.0 |
| 20 | 21, 20, 19, 17, 21 | 19.6 | 8.4 |
| perfect-memory perceptron, same facts with move tag (step 1) | | 20.2 | 8.2 |

   20 cells per token was chosen for the smallest spread across wirings. With 1-3 cells, results swing widely between wirings (e.g. 10-21/24 at k = 3 under the 32-cell budget).

## Graph checks (read-only; registration r11 graph, replica r1 seed)

Gate-relevant question: does the surrogate used to choose these settings agree with the full graph for this cue? It is answered before the feedback probe.

| Check (`fidelity-results.jsonl`) | Score correlation within boards | Same unique top choice | Graph correct | Surrogate correct | Graph twin pairs |
|---|---|---|---|---|---|
| cue v4 at scratch (reference) | 0.992 | 20/24 | 3 | 2 | 0 |
| attack map at scratch | 0.996 | 24/24 | 0 | 0 | 0 |
| attack map, gains learned on all 24 (8 rounds) | 0.999 | 24/24 | 22 | 22 | 10/12 |
| attack map, held-out family, gains learned on the other 5 (6 rounds) | 0.999 | 24/24 | 21 | 21 | 9/12 |

Mechanics (`mechanics-results.jsonl`): factory v6 builds from r12, and memory is unchanged by the check. With about 108 stimulated cells, graph KC activity is 0.993 times the surrogate's assumption. DAN factors at the registered pulse current are PAM02 -1.08, PPL103 -1.05, PAM11 -0.985 and PPL106 -1.01. The surrogate assumes -1.01 and -0.99, so the reward factor is about 7% stronger in the graph.

## Registered next step

- Factory v6 (`lichess-stage1-brain-factory-v6.mjs`, which wraps v5 with the new encoder), runtime factory v6 (copy of v5 with that one import), and registration `stage1-smoke-r12-registration.json` (r11 with only the encoder and runtime factory changed; checked by `.codebase/tests/puzzle-learning/lichess-stage1-brain-factory-v6.test.mjs`).
- Probe v8 (`stage1-retention-probe-v8-attack-map-protocol.json`; step file `python actions/stage1-retention-probe-v8-attack-map-step.json`): the v7 protocol with r12 and outcome-only teaching. It was launched detached on 2026-10-27 at 18:43 (UTC+7). The node PID is 5748, outside any job object; the run directory is `runs/stage1-retention-probe-v8-attack-map`. Predeclared limit: with this cue an A board can be correct without its own lessons, so a pass does not separate retention from transfer.

## Limits

- Surrogate and graph checks use one replica's model and graph, and 24 training boards from 6 families. The fidelity check copies surrogate-learned gains into the graph; it does not run the graph's own lesson sequence (probe v8 does).
- Held-out numbers are leave-one-family-out within training. They are not validation (D2), and they were used to choose settings, so they are not evidence for those settings.
- The attack map is restricted information chosen by the researcher. Learning which attacks matter is the Fly's job; computing the attacks is not.

## Stockfish relative signal (training rows, no graph)

`stockfish-relative-check.mjs` (output `stockfish-relative-check-results.jsonl`) compares the existing all-legal regret signal (`gradeStockfishChoice().signal`, the move against the board's best alternative) with the absolute expected score the coupled brain uses now, against the verified outcome:

| Move kind | Relative agrees / opposes | Absolute agrees / opposes |
|---|---|---|
| certified (24) | 21 / 3 | 9 / 13 (2 zero) |
| unsafe capture (28) | 9 / 19 | 15 / 13 |
| non-capture (338) | 194 / 143 | 217 / 110 |

The relative signal fixes the certified moves but rewards most unsafe captures. Stockfish scores the whole game, so losing the capturing piece in a won endgame costs little expected score (hypothesis). How Stockfish should teach Stage 1 (D9) is a researcher decision; ledger L042 lists the options.

## Probe v8 result (2026-10-27 22:48)

`runs/stage1-retention-probe-v8-attack-map/result.json`: eta-chosen, **eta 0.2**. Retained A boards (of 4) at eta 0.5/0.2/0.1/0.05/0.02: 2/3/3/3/3. The surrogate predicted 3/4 at eta 0.1 with the control also at 3/4, which fits the graph's within-training transfer at eta 0.02. f0-pin-p0a ties at the top at every eta of 0.2 or below: its certified hxg5 and the failing Qxg5 both encode to [act:capture, att:n:kline]. Ledger L045.
