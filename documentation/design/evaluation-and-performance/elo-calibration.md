# Future evaluation: Stockfish reference-pool Elo calibration

Date: 2026-10-06. Status: researcher-approved future design, not an implemented evaluator or frozen experimental protocol. The researcher accepted the two-stage proposal and requested documentation. Implementation remains future scope after the current learning goal; this adds no gate to that goal and establishes no chess strength or reasoning result.

## Two stages

First measure frozen FlyChess snapshots through complete games against a measured reference pool. Then learn and independently validate a cheaper mapping from benchmark features to that measured strength. Puzzle accuracy, centipawn loss and configured Stockfish strength alone are not calibrated Elo measurements.

## Stage 1: game-based strength

1. Define the initial scale as **FlyChess reference-pool Elo**, valid for the published opponent pool, opening distribution and playing conditions. Assign one reference a declared conventional rating anchor; absolute numbers on this local scale are not FIDE, Chess.com or Lichess ratings. A connection to an external scale requires additional reference evidence under compatible conditions.
2. Build a ladder from several pinned Stockfish strength settings, adding weaker reference players if necessary to obtain informative results near FlyChess's strength. Measure reference-versus-reference games under the same conditions and fit relative ratings jointly. Stockfish's configured `UCI_Elo` is an input setting, not a measured rating for our conditions. Keep the comparison graph connected to the anchor.
3. Freeze each FlyChess snapshot and disable learning for the entire evaluation. Pin graph, model, persistent memory, encoder, readout, policy, source and benchmark identities, training exposure count and seeds. Check memory identity before and after evaluation. Reset transient state consistently between games; preserve board history within each game.
4. Evaluate two separate modes: unaided all-legal move selection and selection with a fixed Monte Carlo investigation budget. Publish model-evaluation, node, depth and time limits and which limits fired. Stockfish acts as opponent or offline analyst, never as assistance to FlyChess's move selection.
5. Use a predetermined opening sample with two games per opening, swapping colours. Freeze opponent selection, opening families, seeds, time/compute controls, draw/claim rules, timeout handling and adjudication rules before the scored run. A resource interruption or artificial move cap must not silently become a chess loss or draw. Full-game legality, repetition and termination support are prerequisites for the runner.
6. Fit ratings from wins, draws and losses using an explicitly specified statistical model. Report uncertainty that accounts for paired openings and estimated reference ratings. Keep paired games together when resampling. All losses or all wins may only support a bound; expand the ladder in a separately declared follow-up rather than manufacture a precise finite rating.

An initial **100 games per snapshot per mode** is a proposed pipeline pilot, not a precision guarantee. Prespecify the final sample or a statistically justified sequential stopping rule before reporting confirmatory intervals. Exact ladder, anchor, openings, estimator and precision target remain to be selected and frozen; they have not been validated.

## Stage 2: benchmark-to-Elo prediction

For multiple frozen snapshots, collect both game-based ratings and a versioned benchmark feature vector. Candidate features include tactical accuracy, handling of defensive replies, endgame performance and position-assessment errors. Record each criterion and evaluation budget separately. These features are proposals, not evidence that the current model supports every task.

Start with a simple predictor of reference-pool Elo, accounting for uncertainty in the game-based targets. Keep unaided and searched targets separate. Compare predictions with a simple constant baseline before adopting a more complex model.

Split by independent training run/snapshot lineage and position family: neighbouring checkpoints from the same run stay in the same partition. Separate calibration fitting, model selection and disjoint validation. Final research test families must never supply fitting, sampling, tuning or checkpoint-selection evidence. Validate on FlyChess snapshots; success on a Stockfish-only benchmark does not establish transfer to FlyChess.

Publish held-out prediction error, bias and prediction-interval coverage, along with the range of strengths represented in calibration. Do not extrapolate a precise rating beyond that range. Retain occasional complete-game evaluations to detect drift when the encoder, readout, policy or benchmark changes. A cheaper benchmark is useful only if its held-out accuracy and evaluation cost justify replacing some game runs.

## Laptop execution and evidence

- Run one game and one sparse FlyChess instance at a time. Start with one Stockfish thread and 32–64 MiB hash as an engineering proposal; measure actual combined process memory rather than treating hash size as total engine memory.
- Retain `node --max-old-space-size=256`, the 768 MiB runner RSS guard, at least 256 MiB free system memory and `--cpu-duty 0.5`. Bound the child process too and record combined memory. Freeze pacing and clock accounting in the protocol; CPU rest is not biological consolidation. Do not infer external rating equivalence from our compute budget.
- Pin Stockfish version, executable and network hashes, all strength settings, threads, hash, engine options and per-move/game compute or time limits. Record hardware, elapsed/CPU time, peak RSS and exact commands.
- Stream PGN plus structured game/move records. Atomically checkpoint game schedules, completed results, snapshot identities and any resumable current-game state, including history, clocks and RNG state. Prevent duplicate result acknowledgements. If exact mid-game recovery is unsupported, retain the interrupted record and restart under a declared policy.
- Preserve raw outcomes, protocol, manifests, rating fit inputs/results, uncertainty calculations and predictor validation artifacts. Engineering/resume audits cannot substitute for measured strength or unfamiliar/counterfactual reasoning evidence.

## Source and assumptions

Primary source: [Stockfish official FAQ, “The Elo rating of Stockfish”](https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html#the-elo-rating-of-stockfish), accessed 2026-10-06. Coverage: official HTML FAQ, particularly its rating-context section; no engine binary or calibration experiment was inspected or run. It supports the dependence of Elo on the opponent pool, openings and playing conditions and the need for an anchor. It does not validate our proposed ladder, sample size, predictor or a conversion to human ratings.

The two-stage architecture, paired schedule, conventional local anchor, pilot size, resource settings and validation partitioning are project design choices accepted by the researcher, not findings attributed to Stockfish. No raw game/calibration evidence exists for this proposal. See the [source register](../../../research/literature/source-solution-register.md) and [accepted scope](../../../README.md).

## First implementation deliverable

Prepare and freeze the match protocol, then implement a resumable complete-game runner with independent legality, outcome, frozen-memory and recovery checks. Collect measured snapshot ratings before fitting the faster predictor. This document authorizes no claim that the evaluator, calibrated predictor or original learning objective is complete.

## 2026-10-06: Pondering condition

The researcher also requests [pondering](pondering.md). Calibrate search with and without pondering separately from unaided play. Freeze permissions for both players, record opponent-time computation and total compute, and control shared-hardware contention. Compare equal-total-compute performance as well as realistic game-clock performance; post-move latency alone hides work performed during the opponent's turn. No ponder-enabled rating or predictor exists yet.

## Detailed implementation roadmap

See [performance and evaluation implementation](implementation-roadmap.md) for proposed modules, state contracts, build order, recovery rules and acceptance checks. All new APIs/scripts there are proposals, not available commands.

## 2026-10-10: FlyBench first implementation

The researcher now requests implementation. [FlyBench v1](flybench.md) implements 50 adaptive colour-paired Stockfish games, frozen player adapters, nominal/reference-supplied Glicko estimates, game-boundary recovery and replay audit. This advances runner infrastructure; it does not establish the measured reference pool or decimal accuracy. Earlier future-scope statements remain historical. See the [software record](../../../archive/early-development/research/reports/flybench-software-2026-10-10/README.md).

## 2026-10-11: Revised Stockfish-only proposal

The researcher requests a better proposal and excludes the original 13 games. See the [replacement specification](stockfish-only-calibration-proposal.md) for a measured local ladder, an explicitly custom error policy below native strength, fresh snapshot identity and scoring, and uncertainty/failure gates. The [mistake record](../../../research/journal/discussions/2026-10-11-stockfish-calibration-revision.md) records the seed-change and RD-reset errors. This supersedes loss-count extrapolation; no human-scale or decimal-accuracy claim is established.
