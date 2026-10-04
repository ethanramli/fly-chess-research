# Provisional training and evaluation plan

**Status:** Draft; the exact rubric, labels, and model configuration are not yet specified.

**Direction clarified (2026-09-30):** The researcher intends the rubric as feedback on experience, with adaptation arising from a justified learning mechanism inside the simulated fly. The supervised conditions below remain baseline/protocol-draft material; they do not yet specify this revised experiment. The immediate gate is reward-pathway, plasticity and persistent-memory specification followed by basic association/retention/reversal checks. The completed puzzle round only records feedback. See [the consolidated discussion and design direction](feedback_learning_direction.md) and [implementation evidence](puzzle_feedback_round.md). A working learning round precedes latency optimization and scaling.

**Laptop constraint and initialization (2026-09-29):** Start learning from scratch; do not import pretrained chess weights. Use the [low-memory training design](low_memory_training.md), which includes a measured full released-graph training kernel, CPU projections, proposed changed-position supervision, and remaining experiment gates. Serial sparse gradient updates have been measured below 3 GB; useful chess transfer has not yet been demonstrated. Budget every position pass, including repeats and paired examples.

## Scientific aim

Test whether explicit, structured position feedback helps a connectome-constrained model acquire strategic evaluation and generalize to unfamiliar chess positions. Chess is the testbed for a cognitive-science question, not the sole object of interest.

Keep separate:

1. **Learning:** how parameters and representations change during training.
2. **Decision computation:** how the frozen model evaluates a position and how optional search uses that evaluation.
3. **Evaluation:** whether the frozen system transfers to positions and motif combinations absent from training.

## Minimum experiment

### Stage A: define the rubric

Specify each criterion, its scale, perspective, aggregation, label source, and reliability before coding or tuning. Candidate criteria may include king safety, material, activity, space, pawn structure, threats, and tactical vulnerability, but the final list must be justified and operationalized.

Create training, validation, and final test sets with puzzle IDs and motif leakage controlled. Include novel combinations of familiar motifs in the final test where feasible.

### Stage B: establish baselines

Freeze the existing model and record position-evaluation quality, move quality, puzzle performance, legal-move rate, inference time, model/search memory, and search simulations. Establish a one-shot baseline and a sequential-search baseline under matched budgets.

### Stage C: test the training signal

Compare at least:

- existing imitation/self-play or move-prediction training;
- rubric-supervised position evaluation; and
- optional Stockfish-target supervision, clearly distinguished from human-style rubric supervision.

Match data, parameter, and compute budgets as far as possible. Freeze checkpoints before final evaluation.

### Stage D: isolate search and architecture

Run ablations with search disabled or held constant. Report whether improvements remain in the evaluator itself, rather than attributing the performance of a model-plus-search system to the connectome-constrained model alone. Report the input encoding, readout, trainable parameters, simulator, and all engineered components.

### Stage E: frozen evaluation

Evaluate held-out positions, novel motif combinations, tactical blunders, criterion-level assessments, and full games against documented fixed opponents. Use multiple seeds and report uncertainty, compute, peak RAM, latency, and legality handling.

## Out-of-scope extensions

The following may be valuable later but are not evidence for the core cognitive claim:

- public website and online learning from human games;
- live rating estimates;
- qualitative explanation generation;
- opponent-time pondering and cache reuse;
- personalized models;
- threat/escape-circuit routing as a separate hypothesis;
- adaptive puzzle curricula beyond the controlled training-signal comparison.

If pursued, each extension needs its own question, baseline, evaluation, and decision log entry. Human-game data require consent, a data policy, and appropriate permissions.

## Interpretation rule

A high playing rating alone does not establish strategic cognition. The strongest claim requires transfer to unfamiliar positions, interpretable criterion-level behavior, and evidence that the result is not primarily caused by external search, legality filtering, teacher labels, or uncontrolled engineering.
