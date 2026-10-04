# One puzzle and feedback round

Date: 2026-09-30. Status: **task plumbing verified; biological learning is not implemented.**

Discussion context and the corrected learning objective are consolidated in [feedback-driven learning direction](feedback_learning_direction.md). The dated [research journal](../../research/journal/2026-09-30.md) preserves the reasoning, corrections and outstanding questions.

The researcher wants a teacher that provides experience and feedback while learning arises from the simulated fly's own mechanisms. The first milestone is a working puzzle/choice/feedback round. Latency optimization and scaling follow a demonstrated learning loop, not merely a successful puzzle move.

## What runs

From the repository root:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-round.mjs --out runs/puzzle-round-001 --cpu-duty 0.5
```

Equivalent: `npm run puzzle:round -- --out runs/puzzle-round-001`.

The default input is a single manually composed mate-in-one engineering fixture, streamed from `research/data/puzzle-round-fixture/puzzles.jsonl`. It is not a training corpus, validation set, or final test. No existing final-test files are opened.

1. Verify the pinned SHA-256 of `.cache/full.npz` and hash the puzzle file.
2. Initialize a sparse rate model from anatomy and seed 47, without pretrained chess weights.
3. Independently verify that the puzzle's stated forced-mate objective is achievable. Neither proof lines nor answer moves are supplied to the model.
4. Run bounded serial PUCT search on a separate chess board, preserving move history for repetition checks.
5. Commit one selected root move to the task board.
6. Independently assess whether forced mate remains possible within the remaining puzzle horizon.
7. Deliver `+1`, `-1`, or `null` to an explicitly record-only feedback receiver and atomically save the report and round state.
8. Check that hashes of every graph array and model parameter match their pre-round values.

For the one-ply fixture the assessment directly verifies checkmate after the chosen move. For longer objectives this implementation assesses the root choice with bounded exhaustive AND/OR search; it does not make the fly enact every subsequent move. Failure means the specified bounded mate objective failed, not necessarily that the move loses a complete game. Exhausted proof budgets return unknown, never an invented negative reward. An unverified starting puzzle is rejected.

## Model and search boundaries

The existing sparse recurrent equations are reused. The experimental readout has 64 origin-square logits, 64 destination-square logits, four promotion logits, and one side-to-move value output. It is initialized randomly and held fixed. This is an engineered IO mapping, not an anatomical mapping of chess concepts. The factorized move scores cannot express arbitrary origin/destination interactions; the value has no learned chess meaning.

PUCT uses legal-move-masked priors with a 15% uniform mixture. Defaults cap it at 32 simulations, eight model evaluations, six plies, 4,096 allocated nodes, and a ten-second soft deadline. Depth cutoffs receive a neutral search estimate and are separately recorded as unknown. These estimates and visit counts are never used as verified reward labels. Terminal chess rules can reveal a mate even with an untrained evaluator, so solving this fixture cannot establish learning.

The receiver is **record-only**. Both `appliedToNeurons` and `learningApplied` are false in its receipt. No reward-neuron identity, neurotransmitter action, synaptic plasticity, or persistent neural memory is simulated. Storing feedback in JSON is not the fly receiving a biological reward. The earlier unfinished generic weight-update experiment was removed before integration; it did not meet the researcher's biological-learning requirement.

The player in `npm run play` is unchanged. This command is an isolated engineering experiment.

## Memory, pacing, and recovery

One sparse model and one activity tape are reused. The graph is never densified, no workers or dependencies were added, and no complete JSONL dataset is loaded. The same soft thresholds as `train-pilot.mjs` apply: 768 MiB process RSS and 256 MiB free system memory. `--cpu-duty 0.5` provides a compute/rest schedule. Calls already running cannot be preempted, so neither the deadline nor memory guard is a hard OS limit.

Each completed round is saved by renaming a new `.partial` directory containing `result.json` and `state.json`. Output directories must be new. An `initial/state.json` is saved before the first round. Ctrl+C requests a stop after the current bounded round; a failure can be recovered from the last completed state. Partial directories are not valid checkpoints and are preserved for inspection.

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-round.mjs --resume runs/puzzle-round-001/round-000001/state.json --out runs/puzzle-round-002 --cpu-duty 0.5
```

Use the same input, seed, and search/pacing settings. Since weights never change, resume reconstructs them from the pinned graph and seed, verifies their hashes, and restores the input and feedback cursors. These are task-state checkpoints, not learned-weight checkpoints. A completed single-row fixture has no remaining work on resume; resuming its initial state replays that row.

## Observed result

The full released graph completed the command below on 2026-09-30:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-round.mjs --out research/reports/puzzle-round-2026-09-30 --cpu-duty 0.5
```

- Move: `Qh7#` (`f7h7`); independently verified feedback: `+1`.
- Search: three connectome evaluations, 32 simulations, 30 terminal leaves, 29 allocated nodes.
- Search elapsed: 2.160 seconds; round elapsed: 2.454 seconds.
- Elapsed from script measurement start through round reporting preparation: 3.514 seconds; process CPU over that interval: 2.703 seconds. Checkpoint writes after this measurement are excluded.
- Peak process RSS: 101.77 MiB; accounted numeric arrays: 79.07 MiB.
- Graph and parameters unchanged; reward recorded; no learning applied.

Raw report, exact command/configuration and input hashes: [first round](../../research/reports/puzzle-round-2026-09-30/round-000001/result.json).

Replaying from the initial checkpoint reproduced the move, reward and final state. The two final `state.json` files have SHA-256 `b914ec89583b263641072de32bf077dac504f42de419fc9c45597a9debf69dd6`. Timing varied, as expected. [Replay report](../../research/reports/puzzle-round-replay-2026-09-30/round-000001/result.json).

Verification: `npm test` passed all 17 tests, including seven new checks for outcome semantics, both colors' value backup, search limits, repetition/history isolation, unchanged model parameters, feedback cursors and final-test rejection. Chess legality and terminal detection still rely on chess.js; this is not an independent verification of that library.

## Gate before calling this training

Implement an explicitly justified feedback receiver inside the brain simulation, based on identified reward circuitry and a supported plasticity mechanism. Specify which data establish the neuron mapping, where lasting memory resides, what changes through endogenous dynamics, and what stays fixed. Validate that mechanism first on rewarded association, retention and reversal with a no-feedback control. A generic update formula labelled "internal" is not sufficient biological justification.

Then replace the record-only receiver and repeat a puzzle round, testing whether feedback changes subsequent unaided choices compared with a matched no-feedback condition. Immediate repetition is repair evidence, not transfer. Only after that gate should latency optimization and a leakage-safe puzzle curriculum be scaled.
