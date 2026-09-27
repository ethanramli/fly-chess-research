# Provisional training plan: teach and test sequential position evaluation

Status: planning draft; the researcher's exact position-assessment rubric is not yet written down.

## Goal

Test whether explicit, structured position feedback helps a connectome-constrained model evaluate unfamiliar positions and choose better moves through sequential search, rather than mostly reproduce familiar moves.

Keep three things separate in the experiment:

1. **Learning:** how model parameters change during training.
2. **Thinking at play time:** how the trained model scores a position and how a search procedure uses those scores to examine candidate lines.
3. **Evaluation:** how we measure whether the frozen trained model generalizes.

Monte Carlo tree search is play-time search, not a reward signal and not training by itself. During search, it makes hypothetical board states and asks the policy/value model to assess them. Training changes the model only when a learning update is applied.

## Candidate staged approach

### Stage A: define the rubric

Write the researcher's exact position-evaluation method before coding it. Specify each criterion, how it is measured, how criteria interact, and how side-to-move perspective is handled. Candidate criteria might include material, king safety, piece activity, pawn structure, threats, and positional plans, but the researcher must choose the actual rubric.

Create a small, human-reviewed set of positions with criterion-level assessments and move comparisons. Keep a separate set of positions/puzzles held out from all tuning.

### Stage B: establish a baseline

Run the existing model without further training and record:

- Position-evaluation quality on held-out positions.
- Puzzle accuracy by theme and difficulty.
- Full-game results against fixed opponents, including colors, openings, time/compute budget, and version.
- Legal-move rate, model memory, search memory, inference time, and search simulations.

Freeze the baseline checkpoint and evaluation set before experiments.

### Stage C: teach position assessment

Compare at least two training signals under matched data and compute budgets:

- Existing imitation/self-play baseline.
- Structured rubric supervision: train the model to predict the rubric's position score and, if useful, its criterion-level components.

Possible later comparison: use Stockfish score targets. Keep these targets distinct from the human-style rubric; they answer a different question.

### Stage D: optional outcome/reward learning

After the assessment model is stable, test game outcome learning. A principled move should receive positive feedback only relative to an explicit criterion or improved position assessment, not just because the game was eventually won. A blunder penalty should be tied to a defined event, such as an independently measured loss of position value or a missed forced tactic.

One candidate signal combines the final game result with the change in a frozen position-evaluation function from one state to the next. The final win/draw/loss remains the anchor; the per-move signal helps assign credit. Evaluate for reward hacking and myopic play. Use the exact move and side-to-move perspective consistently.

In an RL implementation, a dopamine-like signal could be modeled as a reward-prediction error: compare expected reward with actual reward. To assign delayed outcomes to earlier active connections, a model may need an eligibility trace or another explicit credit-assignment mechanism. This is a computational analogy; it is not automatically biological dopamine or literal pain. Alternatively, use ordinary supervised losses and call them supervised training rather than dopamine learning.

### Stage E: targeted puzzle curriculum and search

If the researcher keeps the puzzle-training idea, compare uniform puzzle practice with the proposed weakness-targeted sampling. Identify weak themes using a validation set, not the final test set. Apply the trained evaluator within MCTS and compare one-shot move selection against search at fixed budgets.

### Stage F: final frozen evaluation

Do not tune on the final test set. Evaluate:

- Held-out positions and puzzle families, including novel combinations of familiar motifs.
- Tactical blunders and criterion-level position assessment.
- Paired full games against fixed Stockfish versions/compute and selected human-level baselines, balancing colors/openings.
- Multiple training seeds, confidence intervals, parameter counts, total compute, peak RAM, and speed.

This tests a fly-guided computational system. Attribute sequential computation carefully: MCTS itself performs external lookahead, while the model supplies priors and position values. Use ablations to show whether the model evaluation contributes beyond search mechanics.

## Public website and learning from players

The researcher's goal is for games against people to contribute to the fly's continuing improvement. Build the website around that learning loop from the start, with each completed game producing a training record. “Every game contributes” does not require allowing each raw result to overwrite the live model immediately: store each game, derive labeled training examples, update a candidate model, then promote a new public version only after checks. This gives real continual learning while preserving reproducible model versions.

### Per-game learning pipeline

1. **Record the game:** store the board position, fly move, human reply, whose turn it was, model version, search settings, and final result. Collect games only with a clear consent and data policy; remove player identifiers unless they are needed and explicitly consented to.
2. **Review positions:** run a fixed, documented Stockfish version and the researcher's explicit assessment rubric over positions before and after moves. Produce distinct labels for the engine score, rubric criteria, and eventual game outcome.
3. **Assign credit:** mark specific fly decisions as sound, missed opportunity, tactical error, or unclear, using a predefined rubric and evaluation thresholds. A win/loss alone is not a reliable per-move label. Do not treat human moves as correct answers merely because a human played them.
4. **Add examples to replay:** mix new human-game examples with prior strong-game, puzzle, and self-play examples. Prioritize positions the fly repeatedly mishandles, while retaining older examples to reduce forgetting and overfitting to recent opponents.
5. **Train a candidate:** update a separate candidate checkpoint using rubric/engine position targets, move-policy targets where justified, and the final game outcome. A dopamine-like reward-prediction-error update is a possible experimental arm, not an assumed correct mechanism.
6. **Evaluate and promote:** compare the candidate with the current live checkpoint on untouched positions, puzzles, fixed-engine matches, and prior challenge games. Promote only if it passes predefined criteria; otherwise keep the examples and try a different update. Record the dataset window, code/configuration, random seeds, and metrics for every version.

This supports both global learning across all players and, if desired, a separate personalized model for one player. Keep these as distinct modes: a global model aggregates consented examples across games; a personal model can adapt to one user's play without changing the global opponent. The public site can show its current model version and publish improvement history so visitors can see that games contribute.

Human games are useful but biased feedback. Opponent strength and style vary; users may intentionally exploit the bot; a win can result from the opponent's mistake; and a loss does not mean every fly move was wrong. Independent analysis, replay data, held-out tests, and gated promotion are what turn those games into useful learning rather than noisy online drift. Consult a mentor/institution about research ethics and privacy requirements before collecting or analyzing visitor data.

## Reusing `vietan0/chess-game-review`

The researcher identified https://github.com/vietan0/chess-game-review as a codebase to build on. Its repository is MIT licensed and is a game-review application inspired by Chess.com-style review. Its `classify.ts` derives labels such as best/excellent/good/inaccuracy/mistake/blunder mainly from the change in Stockfish evaluation before versus after a move, with special handling for opening-book and forced moves. That makes it useful as a move-review interface and as a baseline for engine-based feedback; the move categories are not, by themselves, an explicit grandmaster reasoning rubric.

For the research, keep three targets distinct: (1) this project's Stockfish-centipawn-loss categories; (2) the researcher's explicit human-style position-assessment rubric; and (3) actual game outcomes. Compare whether training on each signal produces different generalization. If reusing code in a distributed website or paper artifact, preserve the MIT copyright/license notice, document modifications, and check licenses for bundled or externally loaded dependencies and engine binaries separately. Pin the upstream commit used so the experiment can be reproduced.

Primary repository links:

- Project and MIT license: https://github.com/vietan0/chess-game-review
- Move-classification implementation: https://github.com/vietan0/chess-game-review/blob/main/src/utils/classify.ts
- Repository Stockfish worker hook: https://github.com/vietan0/chess-game-review/blob/main/src/queries/useStockfish.ts

## Review features beyond move labels

The researcher noticed two missing review features: an Elo estimate and useful qualitative explanations.

### Rating estimate

Keep these two numbers separate:

- **Fly's playing rating:** estimate from many paired games against a fixed benchmark pool, with colors/openings and time/compute budgets controlled. This is a property of the evaluated bot version and conditions.
- **Human player's estimated rating from one game:** a noisy prediction. The move-category labels alone do not establish Elo. To build this, use a dataset of rated games, train/calibrate on one subset, then evaluate on games and players held out from training. Report an uncertainty range and calibration error rather than presenting an exact-looking number as ground truth.

Do not use the same rating-estimation data to both tune and claim accuracy. Puzzle rating is not a direct substitute for a player's chess rating.

#### Chess.com reference and a reproducible calibration plan

Chess.com's published description says its per-game Performance Rating compares the quality of a player's moves with what is expected for a player at that player's existing rating. It explicitly distinguishes this one-game estimate from the player's ongoing account rating and warns that single-game estimates fluctuate. Chess.com also says its Accuracy score (CAPS2) measures closeness to engine-preferred play, and is not itself a playing rating. The public help pages describe the principle but do not provide the complete performance-rating equation, fitted parameters, or training data; this project should therefore call its implementation “Chess.com-inspired,” not a reproduction.

For a transparent first version, collect a large, appropriately licensed corpus of games with player ratings recorded at game time and a consistent time control. Analyze all games with one pinned engine version/settings. Split data by player (and preferably by time period) before fitting anything, so games from one person's history cannot leak between training and test sets. Fit a model that maps move-quality evidence over a game—such as evaluation loss, error severity, game phase, and number of decisions—to that player's contemporaneous rating, with the current rating as the baseline/context. Calibrate the output on a separate validation set, then report held-out error, bias across rating bands/time controls, calibration plots, and prediction intervals. Compare against the simple baseline “predict the player's current rating.”

This estimates a player's game-level performance from historical rated-game data; it does not estimate the fly's stable strength. Estimate the fly's playing strength separately from many paired games against a documented rating ladder, under fixed time/compute conditions. Label both numbers clearly, include uncertainty, and do not present a game-level estimate as an official or persistent Elo.

#### Longitudinal fly-strength calibration

Use a two-part measurement: (1) a stable benchmark rating for each frozen fly checkpoint, and (2) an optional live-site rating that updates as it plays humans. Do not treat a live rating as a clean training-progress measure: opponent pool, openings, time controls, and site population can drift.

For the stable benchmark, define a permanent pool of reference opponents spanning weak to strong play, pin their versions/settings, and preserve their ratings/provenance. Each checkpoint plays a pre-registered batch against the same pool, pairing each opening/position and color as evenly as practical. Use the same clock or node budget and hardware policy. Include wins, draws, and losses; record all game metadata. Estimate strength from the outcome data (for example, with an Elo-style paired-outcome model or Glicko-2 if uncertainty/volatility tracking is useful), and report a confidence/credible interval. Never infer the fly's rating from one game, game accuracy, Stockfish centipawn loss, or a single opponent.

To make ratings comparable across checkpoints, include stable anchor opponents in every evaluation wave and maintain a frozen held-out game suite. If reference-opponent strength is itself uncertain, estimate all checkpoint and opponent strengths jointly from the cross-play results rather than assuming vendor/platform rating numbers are interchangeable. Keep a fixed, labeled external scale (such as a particular platform/time-control pool) only if its ratings are documented; report that scale and time control, not “Elo” without qualification. Compare versions using both rating difference/uncertainty and direct paired win-draw-loss results. Use multiple training seeds and repeat evaluation batches so apparent gains are not a lucky sample.

For the public human-play site, keep a separate Glicko-2 (or similarly uncertainty-aware) rating per model version and time control, initialize it with broad uncertainty, and update on completed games. The rating should be described as an internal site estimate, not Chess.com or FIDE Elo. Log the checkpoint on every game so historical results remain attributable after deployment changes. A promotion decision should rely on the stable benchmark suite, not the live rating alone.

Chess.com's review categories and its CAPS2 accuracy score are also separate outputs. The open `vietan0/chess-game-review` code can supply engine-based move labels/UI, but does not supply Chess.com's proprietary performance-rating calibration. Avoid reverse-engineering or claiming parity based only on the high-level help description.

### Qualitative feedback

Start with deterministic, evidence-backed explanations generated from the engine's evaluation and principal variation plus the researcher's structured rubric. Example: identify the piece that became undefended, the opponent's forcing continuation, and the evaluation swing. This gives a trustworthy baseline and can expose exactly which rubric criteria the fly missed.

A small language model such as Gemma can be considered later as a wording layer. It should receive structured verified facts (position, chosen move, engine line, evaluation change, detected tactical/positional features) and turn those facts into readable prose; it should not independently decide what is true about the position. Check explanations against engine lines and human review, and report error/hallucination rates. Keep generated prose out of the model's training reward unless each claim is verified.

For a research paper, evaluate the rating estimator separately (calibration, error, uncertainty coverage) and the explanation feature separately (factual correctness, completeness, usefulness). Neither feature should be allowed to obscure the central experiment on sequential position evaluation.

## Opponent-time thinking: pondering and cache reuse

The researcher proposes having the fly search while a human considers a move. The fly predicts likely human replies and explores its own continuations from those candidate positions. If the human plays one of the predicted moves, the fly verifies the actual resulting position and resumes from the cached analysis instead of starting over. This is the established chess-engine technique called pondering; Stockfish's search code explicitly supports pondering until the interface reports `ponderhit` or stops the search.

This is an efficiency/interaction feature, distinct from the training method. It shifts computation into the opponent's clock and can reduce perceived reply time when the prediction is right. It does not inherently reduce total computation or make the position evaluator better; if the human chooses an unpredicted move, some work is wasted. A bounded design should rank candidate replies, allocate a capped search budget across them, stop or reprioritize when the game state changes, and measure both useful and wasted work.

Implementation outline:

1. At the start of the human turn, use the fly's opponent-move model or a documented candidate-generation method to rank likely replies. Avoid treating one guessed reply as certain.
2. Allocate a fixed pondering budget across the top candidate replies and search continuations using the same fly evaluation used during normal play.
3. Store results under an exact position key that includes side to move, castling rights, en-passant state, and any history needed for repetition/draw handling. A transposition table can reuse equivalent positions reached through different lines.
4. When the human move arrives, validate it against the authoritative game state. If the resulting state matches a cached child, reuse its subtree and continue search from there; otherwise cancel speculative work and search the actual state, reusing only independently valid transpositions.
5. Namespace cached evaluations by model checkpoint/configuration. If online learning changes the weights, old network scores are stale; clear or segregate them. Keep generic position features/transposition metadata separate from version-dependent neural values.
6. Respect a hard CPU/GPU and memory budget, and never delay a legal response while waiting for an optimistic prediction to be confirmed.

Suggested experiment: compare pondering off versus on at the same total compute allowance. Measure median and tail response latency after the human move, prediction hit rate, useful fraction of speculative evaluations, total compute, memory, and playing strength. Also compare a fly-predicted reply distribution with an uninformed/top-legal-move allocation. Report results across varied human styles and opening/middlegame/endgame positions. A contribution could be a careful evaluation of whether opponent-aware pondering makes a connectome-constrained search system more responsive under a fixed budget; the broad pondering idea itself is established engine practice.

Primary implementation reference: Stockfish search code and its ponder handling: https://github.com/official-stockfish/Stockfish/blob/master/src/search.cpp

## Current open decisions

- Exact rubric: researcher to specify.
- Position labels: researcher rubric, expert annotation, engine score, or combinations.
- Whether the first study includes a dopamine-like RL update or only structured supervised training.
- Whether MCTS is fixed at one budget for comparison or is itself an experimental variable.
- What constitutes a “principled move” and a “blunder” operationally.
- Which connectome and simulator/version will be used.
- Online play data: defer until offline benchmark and consent/data plan exist.

## Scientific basis to read

- Fly Chess implementation and reported evaluation: https://github.com/cesp99/fly-chess
- Drosophila mushroom-body model with reinforcement prediction-error learning: https://pmc.ncbi.nlm.nih.gov/articles/PMC8105414/
- Ng, Harada & Russell (1999), *Policy Invariance Under Reward Transformations: Theory and Application to Reward Shaping*: https://ai.stanford.edu/~ang/papers/shaping-icml99.pdf
