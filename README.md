# Fly-chess research

This repository is a research workspace for studying whether a connectome-constrained model can learn strategic evaluation from structured position feedback in chess. Chess is used as a controlled testbed for a broader cognitive-science question about how compact, biologically inspired architectures acquire task-relevant strategic representations.

The project is not claiming that a biological fly understands chess. The goal is to test whether a fly-inspired model, under explicit engineering assumptions, can learn to evaluate positions in a way that generalizes beyond the training set.

## Current status

The project is in the early-to-mid research-planning phase:

- Research framing, datasets, reports, literature, and decisions are in `research/`
- The minimum experiment and documentation are in `documentation/`
- Executable scripts, source modules, and tests are in `.codebase/`

The current focus is to validate how experience and feedback can produce persistent learning inside the simulated fly. A [mapped gamma4 conditioning prototype](documentation/design/mushroom_body_learning.md) now implements a reduced local plasticity rule: synthetic paired stimulation changes a neural response, retains that state and reverses it when timing reverses; two controls stay unchanged. This is an engineering check of an unfitted model, not validated biological or chess learning. The puzzle receiver remains record-only. The rubric, biological sensory/reward interfaces and transfer evaluation still need refinement. See the [current learning direction](documentation/design/feedback_learning_direction.md) and [research journal](research/journal/README.md).

[Controlled choice experiments](documentation/design/association_validation.md) now provide evidence of basic association: the balanced six-seed follow-up strengthened preference for the rewarded cue in 6/6 runs, while memory erasure/restoration removed/recovered the changes and nonlearning controls stayed fixed. Only 3/6 selected the new target after reward reversal, so the complete acceptance test failed. These are choices from an engineered decoder in a simplified stimulation model; reliable adaptation and chess transfer remain open.

### Laptop training feasibility

The [from-scratch training design](documentation/design/low_memory_training.md) addresses the 8 GB laptop constraint with roughly 3 GB or less available. A dependency-free sparse-gradient prototype trained through the actual released 134,209-neuron graph at **130 MiB peak process RAM** in a bounded engineering test. This is not yet a trained chess evaluator or evidence of reasoning. CPU time and sample efficiency are the next constraints.

With Node 22 or newer:

```powershell
npm run fetch:graph
npm test
npm run benchmark
```

The graph download is about 40 MB; no pretrained chess weights are used. See [recorded measurements](research/reports/lowram-feasibility.json), the reference kernel in `.codebase/src/lowram/`, and the design's explicit limitations. The cache is excluded from Git.

## Core research question

Can a connectome-constrained model acquire task-relevant strategic evaluation from explicit position-assessment supervision and generalize to previously unseen chess positions?

This project is intentionally narrow and conservative:

- It studies a model constrained by a fly connectome, not a claim about fly cognition.
- It emphasizes interpretable position evaluation rather than raw game-playing strength alone.
- It separates the minimum scientific claim from later extensions such as a public website, explanation systems, or online learning.

## Repository structure

- `project/` — project framing, ethics, decisions, mentoring, and planning materials
- `design/` — training and evaluation protocol, data dictionary, and experimental plan
- `literature/` — search log, reading notes, and evidence map
- `idea/` — candidate hypotheses, experiments, and future directions
- `data/` — approved shareable or de-identified materials and governance guidance
- `writing/` — manuscript structure and submission checklist
- `README.md` — high-level project overview

## How to use this workspace

To play in a local browser, run `npm run play` and open `http://127.0.0.1:4173`. Choose White or Black, then click your piece and its destination square. The untrained connectome-constrained model scores every legal successor position; a one-ply policy chooses the highest score for White and lowest for Black. Its score has no established chess meaning. The interface reuses board and piece assets and ports display code from vietan0/chess-game-review; see `.codebase/src/browser/REUSE.md`. It includes move history, board themes, promotion, and PGN export. To request a pawn-only model move from a FEN in the command line, use `npm run fly:pawn -- --fen "FEN"`.

1. Start with `research/project/project_overview.md` for the research framing and scope.
2. Review `documentation/design/training_plan.md` for the current experimental plan and constraints.
3. Use `research/literature/` to record evidence, notes, and relevant comparisons.
4. Keep the minimum experiment separate from optional extensions.
5. Record major decisions in `research/project/decision_log.md`.
6. Preserve held-out evaluations and report limitations transparently.

## Scope and constraints

This repository is not a product repo or a chess engine implementation. It is a research workspace for a computational cognitive-science study.

The project intentionally does not prioritize:

- public demos or a user-facing website
- online learning from human games
- rating estimates or live skill prediction
- qualitative explanation generation for end users
- broader software features unrelated to the core experiment

These may become relevant later, but they are treated as separate work streams and should not be confused with the minimum experiment.

## Key research principle

A strong playing rating by itself is not sufficient evidence of strategic cognition. The meaningful claim requires transfer to unfamiliar positions, interpretable evaluation behavior, and controlled comparisons against appropriate baselines.

## Recommended next step

### Puzzle and feedback integration (2026-09-30)

Run `npm run puzzle:round -- --out runs/puzzle-round-001` for one bounded puzzle/search/feedback-recording round on the full graph. The teacher verifies the outcome after the chosen move; graph and parameter hashes must stay unchanged. **The feedback receiver is currently record-only, so this does not train the fly.** A justified biological reward/plasticity receiver remains the next gate before latency optimization and scaling. See the [implementation, measured result, and limits](documentation/design/puzzle_feedback_round.md).

### Resumable CPU training pilot

For datasets with additional position criteria, use `--dataset PATH`; see the [dataset contract](documentation/design/dataset-format.md). The trainer derives its output count from the manifest and saves the ordered criterion schema in checkpoints. This generic dataset path is newly implemented; existing measurements use the two-criterion pilot.

`research/data/coverage-pilot-v2` adds early and quiet positions to the same two rule-defined criteria: 169 training pairs, 56 validation pairs and 55 reserved test pairs. Its [integrity audit](research/reports/coverage-pilot-v2-audit.json) checked split separation, legal parent/child relationships and independently calculated material labels. The subsequent independent capture-label audit is linked below. This is broader development coverage, not a full strategic rubric; losses on its new validation set cannot be directly compared with pilot-v1 losses.

One paced Adam pass over coverage-pilot-v2 completed in 486 seconds at **174.53 MiB peak RSS**. Both criteria beat their training-mean constant predictors on the 56-pair validation set. The model beat the constant pair-difference baseline for all 8 validation families on material and 5 of 8 on capture; a side-to-move-only baseline gives a stricter comparison and the model beats it on pair differences for all 8 material families and 7 of 8 capture families. This is evidence of position-dependent signal on this development set, not strategic-chess or final-test evidence. See [family summary](research/reports/coverage-family-summary.json).

The frozen checkpoint was then evaluated once on the reserved 55-pair/8-family test split: material MSE 0.032032, capture MSE 0.040906; pair-difference MSE 0.022159 and 0.109845. These raw held-out metrics are recorded without a baseline or any tuning from test results. They do not establish strategic chess ability. See [test evaluation](research/reports/coverage-test-evaluation.json).

A resumed second epoch completed at 175.4 MiB peak RSS and slightly lowered validation loss, but its held-out material MSE rose to 0.039981 while capture MSE fell to 0.034796. The first epoch is therefore retained by the per-criterion validation gate; the second-epoch report is an audit artifact, not evidence of a generally better evaluator. See [second-epoch test evaluation](research/reports/coverage-test-epoch2.json).

An independent capture-label audit recomputed the board material and capture/recapture traversal over all 560 positions in coverage-pilot-v2, with zero mismatches. It still validates implementation consistency rather than the scientific usefulness of this bounded label. See [label audit](research/reports/coverage-capture-label-audit.json).

After fetching the graph, run the streamed paired-position baseline:

```powershell
node --max-old-space-size=256 scripts/train-pilot.mjs --out runs/pilot-001 --max-pairs 72
```

Resume with the same seed and learning rate into a new output directory:

```powershell
node --max-old-space-size=256 scripts/train-pilot.mjs --out runs/pilot-002 --resume runs/pilot-001/final --max-pairs 72
```

The command trains all parameters from scratch unless resuming its own checkpoint. It streams training rows, evaluates the validation split before and after training, saves every 72 updates (configurable with `--checkpoint-every`) and on normal completion, and records metrics in the output directory. Ctrl+C requests a stop at an optimizer boundary. Abrupt termination or a memory-guard exception requires resuming the last completed checkpoint. Dataset and graph checksums are verified. The final test split is not read. Validation reports each criterion's MSE and pair-difference MSE against a constant predictor fitted only on training labels.

This is an exact-gradient baseline for comparing faster algorithms. Its two labels cover material and a bounded capture/recapture calculation, not full strategic evaluation. File order is fixed. The 768 MiB RSS guard is a soft check; the Node heap setting does not enforce a total process memory limit.

The experimental rotating circuit mode is available with:

```powershell
node --max-old-space-size=256 scripts/train-pilot.mjs --mode cached-hybrid --out runs/circuit-001 --max-pairs 72 --checkpoint-every 18
```

It performs one exact all-parameter update per pair, then twelve cached updates of a rotating circuit, accepting the local burst only after a full paired-loss check. The partition covers every neuron once per rotation. This spends more computation per pair than the exact baseline; only a time-to-validation-quality comparison can show whether it helps. Resume with the same mode and `--local-steps` setting. Checkpoints contain the rotation cursor through the completed pair count.

For responsiveness while using other applications, add `--cpu-duty 0.5`. The worker rests approximately as long as each measured computation segment takes, including validation. This is a compute/rest schedule, not a limit on total system CPU percentage, and it increases wall-clock training time. Graph loading and checkpoint I/O are not paced. The default is `1` (continuous computation). One resumed Adam run measured 104.05 process CPU seconds over 223.44 elapsed seconds between its start and finish events, approximately 47% of one core on average, at 172.05 MiB peak RSS. This is an observation, not a guaranteed ceiling. See [profile](research/reports/adam-resume-profile.json).

An exact Adam baseline is also available:

```powershell
node --max-old-space-size=256 scripts/train-pilot.mjs --optimizer adam --learning-rate 0.001 --cpu-duty 0.5 --out runs/adam-001 --max-pairs 72
```

This uses standard first and second gradient moments with bias correction, global gradient clipping, and positive-magnitude projection. The two moment arrays add about 42.7 MiB for the two-output model. Adam checkpoints use format v2 and include both moments and their step counter; existing SGD v1 checkpoints remain supported. Resume with the same optimizer and learning rate. Adam is currently supported only in exact mode. It is a comparison baseline, not a novelty claim.

Use `npm run evaluate -- --checkpoint DIRECTORY --fen "FEN"` to obtain criterion predictions from saved weights. This path has been run on the real graph at about 161 MiB peak RSS. The pilot checkpoint gives incorrect scores even for the starting position, so successful execution is not evidence of a useful chess evaluator.

Optional `--shuffle-buffer 24` mixes a bounded window of training rows with a deterministic seed for each epoch. It is not a uniform shuffle of a larger corpus. Resume replays the same order up to the saved cursor, without storing the dataset in RAM; use the same buffer size on resume. One development run lowered aggregate loss but worsened material error, so shuffling has not established an across-criterion benefit. Multi-epoch runs now record validation at each completed epoch as well as at their endpoints.

Optional `--balance-criteria` weights both parts of each criterion's paired training loss by inverse training-label variance, normalized to mean weight one. The statistics come only from the training file and are saved in checkpoints; validation retains the original equal-weight objective and original label units. This changes the training objective and is an experimental option for exact mode. It adds scalar arithmetic rather than more model evaluations.

Define the rubric, freeze the minimum experiment, and establish leakage-safe held-out tests before training or tuning.

For the current project context and constraints, see:

- `project/project_overview.md`
- `design/training_plan.md`
- `project/cognitive_science_framing.md`
