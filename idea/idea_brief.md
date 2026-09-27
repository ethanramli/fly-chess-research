# Idea brief: Can a connectome-constrained fly model think sequentially?

- Date started: 2026-09-28
- Candidate topic: Sequential position evaluation and generalization in a fruit-fly connectome-constrained model, using chess as a testbed
- Status: Initial idea; literature and existing implementations need a systematic check

## The idea, in plain language

The researcher is not asking whether a fly model can be made to play chess. They want to test whether a model constrained by a fly connectome can use sequential evaluation to solve unfamiliar problems: consider a position, examine consequences of candidate moves, evaluate resulting positions, and choose well beyond memorized examples. Chess is a demanding, measurable testbed for this question.

Important distinction: a connectome is a map of neural connections, not a complete, ready-to-run working brain. A playable agent also requires choices about neuron dynamics, input encoding, output decoding, learning, and possibly external search. Those choices are part of the experiment and must be described and tested.

## Preliminary landscape check

This exact broad demonstration appears to exist already. A public project, [Fly Chess](https://fly.eyed.to/), describes a recurrent network constrained by an adult female fly connectome, trained by imitation on chess games, and evaluated with several play modes. Its methods page says the model learned from 57 million positions from roughly 780,000 human games rated 1800+, and that its strongest mode uses Monte Carlo tree search whose evaluations come from the network. A separate [GitHub project](https://github.com/AdilSiddiquiHQ/fly-connectome-chess) also presents a connectome-based chess agent, though its own claims need independent verification.

So “make a fly play chess” is a compelling starting point, but a demo alone is unlikely to be a new publishable contribution. A stronger contribution could be a careful, reproducible benchmark: measure the effect of learning, search, connectome constraints, and training data on playing strength, with baselines and held-out positions. First determine what is already implemented and whether the code and claims are reproducible.

The [FlyWire whole-brain connectome paper](https://www.nature.com/articles/s41586-024-07558-y) describes the adult female fly wiring diagram. The recent [MaleCNS v1.0 map](https://male-cns.janelia.org/) is a separate adult male central nervous system resource, with 166,700 neurons across the brain and ventral nerve cord. Google Research and Janelia describe it as a structural map; it is not, by itself, a complete biological simulation. Check the [official dataset details](https://sites.research.google/gr/neural-mapping/datasets/), license, and coverage before choosing which connectome to use.

## Researcher's central idea: sequential evaluation of unfamiliar positions

The researcher wants to give the fly an explicit method for evaluating a chess position, based on how a grandmaster would assess it, instead of relying mainly on memorized moves. It would then examine candidate continuations on a chess board and evaluate the resulting positions, with the aim of handling positions it has not seen before. The exact evaluation criteria and training method are still to be specified by the researcher; preserve that method in their own words before translating it into features, labels, or code.

This is distinct from simply having Stockfish score positions. The current Fly Chess project reports using Stockfish-evaluated positions in a later model generation, but that is not evidence that it uses this researcher's proposed human-readable, structured grandmaster assessment procedure. We should compare the exact proposed rubric and its training mechanism with the repository and prior literature before making a novelty claim.

Working research question (drafted 2026-09-28):

**Does training a connectome-constrained fly model with an explicit chess-position evaluation method improve its move selection on previously unseen positions, compared with the existing training method, when data, search, and compute are held constant?**

The main comparison is the proposed position-evaluation training signal versus the existing training method. “Previously unseen,” the rubric, primary move-quality measure, and matched compute/search budgets must be operationally defined before training or final testing. The fly's calibrated playing rating across many controlled games is a secondary measure of whether any improvement transfers to full games; it is not, by itself, evidence of generalization or reasoning.

Potential components raised so far:

- An explicit position-assessment method inspired by grandmaster reasoning (criteria not yet supplied).
- Lichess puzzles, with extra practice on patterns where the model is weakest.
- A fly threat/danger signal that may use existing threat/escape circuitry (hypothesis to test).
- Monte Carlo tree search to explore candidate continuations using the fly's evaluations (search itself is already present in the existing project).
- Stockfish matches as one measure of playing strength.
- A Capablanca-inspired goal for economical, sound positional decisions (must be defined in measurable terms).

These pieces need not all be in the first experiment. The main contribution could be a rigorous test of sequential generalization and the structured assessment/training method; puzzle curriculum, danger-circuit mapping, and MCTS can be separate components or later stages. An engine score is a useful comparator, but the research question is whether the fly-guided system applies its assessment to held-out positions and games.

## What scientific contribution could result?

If experiments support the hypothesis, the work could contribute:

- A reproducible method and benchmark for measuring whether a connectome-constrained model can iteratively assess novel chess states rather than merely copy familiar moves.
- Evidence about which training signals help such a model generalize to unseen positions and game situations.
- A component-level account of where the capability comes from: the trained fly-constrained network, repeated application/search, the explicit assessment rubric, and any engine-derived supervision.
- A documented limitation or negative result if sequential evaluation does not improve generalization, or if performance depends mainly on external search or teacher labels.

The strength of the claim depends on the design. If external Monte Carlo tree search generates candidate lines and the fly scores them, the result supports sequential reasoning in a **fly-guided computational system**. To claim that sequential reasoning is carried by the fly network itself, compare with controls that remove or replace the fly evaluation, and specify what internal state or computation is attributed to the network. Since the connectome is trained and connected to an artificial chess interface, results would not by themselves show that a biological fly can reason about chess.

## Researcher's proposed training idea (2026-09-28)

The proposed method is to train on Lichess puzzles, identify puzzle patterns the fly handles poorly, sample or generate more practice around those weak patterns using a Monte Carlo process, and then train/evaluate repeatedly against Stockfish with the long-term ambition of reaching grandmaster-level playing strength.

This is a promising direction to formalize as **adaptive, weakness-targeted puzzle training followed by engine-based training or evaluation**. The precise algorithm is not specified yet; keep the researcher's detailed method in their own words before translating it into code or a protocol.

### What is distinct from the existing project?

The current Fly Chess repository already uses an imitation-learning stage, then PUCT Monte Carlo tree search self-play with replay data and evaluation against prior versions/random play. Its newer `fly3` recipe additionally documents retina-style input, homeostatic gains, multi-timestep readout, neuromodulatory gating, Stockfish-evaluated positions, and gated self-play. Its search evaluates candidate board positions with the fly network. Therefore, making a separate chess board, using Monte Carlo tree search, and adding Stockfish positions are not by themselves new relative to the current repository. The proposed potentially distinguishing element is an adaptive puzzle curriculum based on measured weaknesses, possibly combined with a defined strategy/style objective and a connectome-grounded threat signal, then tested for transfer to full games. We must inspect exact code and literature before claiming this is novel.

### Questions to pin down with the researcher

- What counts as a “puzzle pattern”: Lichess theme tags, tactical motifs, board features, or clusters learned from model errors?
- How is weakness estimated: solve accuracy, policy loss, blunder type, or performance on a held-out set?
- What exactly does the Monte Carlo procedure sample or optimize? Does it search candidate puzzle positions, game continuations, or training schedules?
- What is one training example and its target: the puzzle's solution move(s), engine analysis, game outcome, or a reward signal?
- What are the researcher's exact criteria for evaluating a position, and how are they combined or prioritized?
- How will a position be labeled according to those criteria: expert annotations, derived features, explanation/rubric labels, or a combination?
- Does the model need to produce criterion-level assessments, or only use them internally to choose a better move?
- Does “Stockfish training” mean learning from Stockfish-selected moves/positions, self-play with Stockfish as opponent, or only evaluation? These are different interventions.
- What operational, measurable behaviors define the desired Capablanca-like style?
- What memory is meant to be reduced: model weights/connectome in RAM, or search-tree state? Measure these separately.
- How will training stop or reject a weaker model, and how will checkpoints be compared?

### A fair first experiment to develop

Once the rubric is specified, compare under matched compute and data budgets: (A) one-shot move prediction; (B) sequential search with the existing fly evaluator; and (C) sequential search using the researcher's structured human-style assessments. If feasible, separately compare uniform puzzle practice with weakness-targeted practice. Evaluate on positions and puzzle families held out before training, including deliberately unfamiliar/shifted positions, then test transfer in paired full games against fixed Stockfish versions/think budgets with colors and openings balanced. Add controls for search alone, fly evaluation alone, and matched alternative evaluators. Report uncertainty, compute, model and search memory, and results across multiple random seeds. Keep a separate final test set untouched while tuning.

Puzzles can teach tactical motifs, but solving them does not by itself demonstrate general chess reasoning. Strong transfer to unseen puzzles and whole games is the central claim to test. Playing millions of games is not automatically better: repeated games can overfit, and outcomes must be compared fairly at a fixed engine version and compute budget. An estimated engine rating is also not the same thing as earning the official FIDE Grandmaster title.

Lichess provides a downloadable puzzle database; its official database page documents puzzle fields and construction. Record the database snapshot/date, use puzzle IDs to make a reproducible train/validation/test split, and check the data terms. Stockfish is GPL v3 software; cite it and comply with its terms if distributing Stockfish binaries or modified code.

## Additional hypothesis: recruit threat/escape circuitry as a danger signal

The researcher proposes using existing fly threat/escape circuitry as an internal chess-danger evaluator, rather than enlarging the model with a separate evaluator or removing other neural systems. The motivation is to use the fly's existing circuitry and preserve its other functions while extending chess decision-making. They also propose a separate chess-board state on which candidate moves can be played out and evaluated, aiming to let the fly judge positions in a human-like way and reduce memory pressure.

This can be tested, but “dormant instinct” should be treated as a metaphor, not an established property of the connectome. The wiring map does not mark a ready-made chess-threat module, and a simulator may not implement or naturally activate all biological functions. Adult Drosophila research identifies visual looming-threat pathways: LPLC2 carries looming-size information and LC4 carries looming-speed information; these pathways converge on the Giant Fiber (GF) escape circuit. This is a specific visual threat/escape circuit, not a general abstract danger detector.

Chess danger is an abstraction (for example, a piece is en prise, the king is exposed, or a forced tactic is imminent), unlike a rapidly expanding visual object. A possible hypothesis is that mapping an explicit chess-danger signal onto a known threat/escape pathway—or reusing activity in that pathway as an auxiliary signal—helps the agent prioritize tactical threats. Whether this mapping is meaningful is itself something to test.

The separate-board/search proposal is essentially Monte Carlo tree search: keep a chess state, apply candidate legal moves to make child states, and ask the evaluator to score positions encountered in rollouts. This is already how the current Fly Chess search works. The current README describes PUCT search where every leaf is evaluated by the fly; its `fly3` summary reports 100 simulations in one head-to-head setup, while older/live versions describe other budgets. Confirm the exact deployed commit and budget. “400 simulations” means 400 search rollouts/node visits as configured, not necessarily 400 unique root moves; many visits revisit promising branches. The fly's learned policy/value guides search, while the search tree and rules engine provide much of the multi-ply lookahead.

This search can preserve candidate board states in software, but that does not solve the main model-memory cost: the connectome graph and parameters dominate. The repository reports a roughly 30 MB compressed browser model and around 11.9 million trainable values in its full model. A bounded search can limit search-memory growth without deleting biological components; benchmark peak RAM separately from playing strength and speed. The board representation supplies the current position directly to each evaluation, so persistent biological working memory is not required for ordinary position evaluation, although repetition/history and learned long-horizon strategy may need explicit handling.

“Capablanca style” needs a measurable definition before it can be trained: for example, a target distribution over choices from annotated games, objectives for low blunder rate and positional evaluation, or constraints on search width/depth. The characterization that Capablanca “just saw what was in front of him” is an appealing intuition, but not yet a scientific target. A style objective should be tested for strength and generalization, and should not simply narrow search in a way that loses tactical coverage.

### Keep parameter budget and biological claims clear

- Reusing an existing pathway does not automatically add zero parameters. A new signal mapping, readout, or trainable head may add parameters. Count all trainable parameters and match budgets between conditions.
- Preserve the connectome topology and non-chess pathways if that is part of the research goal. Report which edges/signs are fixed and which strengths/mappings are trained.
- Compare an ordinary model, a danger-circuit model, and a parameter-matched control that routes the same signal through a matched non-threat circuit or shuffled neurons.
- Report the source of the danger labels. If Stockfish defines them, this is engine-supervised training; it should not be described as danger knowledge emerging from fly instincts alone.
- Measure a targeted outcome (such as missed immediate threats / tactical blunders) and transfer to held-out puzzles and full games. A lower danger-classification loss alone does not establish stronger chess play.

### Candidate experimental question

**Does routing chess-threat information through an identified Drosophila looming/escape pathway improve tactical performance and transfer to full games, compared with ordinary and parameter-matched control mappings?**

This is a candidate extension, not yet a claim of novelty. Review existing connectome-based models and threat-circuit papers, then verify that the exact neurons/pathway are present and represented appropriately in the chosen male or female dataset and simulator.

## Define “how good” before training

Use more than entertaining games or a single claimed rating. Candidate measures include:

- Win/draw/loss and rating estimate over many games against fixed, documented opponents at multiple strengths, with color and opening balanced.
- Legal-move rate before any legality filter; report separately how the interface handles illegal outputs.
- Tactical and strategic test performance on a held-out position set.
- Performance across seeds and training runs, with uncertainty intervals.
- Compute, training data, and wall-clock budget.

If a move-filtering or search component is used, report results both with and without it where feasible. Otherwise strength may come mostly from the surrounding software rather than the connectome-constrained model.

## What would make the work useful

- A precise account of which components are biologically constrained and which are engineered or trained.
- Strong baselines, ablations, held-out testing, and reproducible code/configuration.
- Transparent reporting of failures and limitations, not just a high score or selected games.
- An appropriately modest claim: this tests a computational model inspired by a fly connectome, not whether a biological fly understands or plays chess.

## Feasibility and supervision

- Likely fields: computational neuroscience, machine learning, connectomics, and game-playing benchmarks.
- Skills to learn or collaborators to find: Python, neural network training, chess-engine evaluation, experimental design/statistics, and connectome data formats.
- First mentor target: someone with computational neuroscience or ML research experience; ideally a collaborator familiar with connectomics and chess-engine benchmarking.
- Feasibility questions: Can the existing fly chess code be run and audited? Which fly connectome is legally usable for the intended purpose? What compute is available? Can the model be benchmarked independently of its UI?
- Ethics: a simulation using published connectome and public chess data may not involve new human/animal subjects, but check data licenses, privacy, institutional rules, and research supervision before proceeding.

## Immediate next actions

1. Write down the position-assessment rubric in your own words, including exactly what you look at and how it affects a move choice.
2. Write down the proposed puzzle-selection/training algorithm in steps, including how it detects a weakness and what learning signal it applies.
3. Read the Fly Chess training implementation and record exactly what is already human-game imitation, MCTS self-play, replay, engine data, and evaluation.
4. Read the Lichess puzzle database documentation and define a leakage-safe split by puzzle ID and motif/difficulty.
5. Search prior work on structured chess evaluation, human/engine evaluation targets, curriculum learning, hard-example mining, chess tactic training, and adaptive sampling. Log exact searches in `../literature/search_log.md`.
6. Draft a one-page experiment comparison and discuss feasibility with a mentor before extensive training.

## Sources to verify and annotate

- Fly Chess, methods and source links: https://fly.eyed.to/ (project page; not itself evidence of peer-reviewed validation)
- Fly Chess source repository: https://github.com/cesp99/fly-chess
- Dorkenwald et al. (2024), *Neuronal wiring diagram of an adult brain*, Nature: https://doi.org/10.1038/s41586-024-07558-y
- Schlegel et al. (2024), *Whole-brain annotation and multi-connectome cell typing quantifies circuit stereotypy in Drosophila*, Nature: https://doi.org/10.1038/s41586-024-07686-5
- Google Research, Connectomics: https://sites.research.google
- Google Research, male fruit fly connectome announcement (2026-09-03): https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/
- MaleCNS v1.0 project and data: https://male-cns.janelia.org/ and https://male-cns.janelia.org/download/
- Male CNS connectome paper, Cell (2026): https://doi.org/10.1016/j.cell.2026.08.015
- Lichess open database, including puzzles: https://database.lichess.org/
- Stockfish source, documentation, and GPL v3 license: https://github.com/official-stockfish/Stockfish
- Ache et al. (2019), *Neural Basis for Looming Size and Velocity Encoding in the Drosophila Giant Fiber Escape Pathway*: https://doi.org/10.1016/j.cub.2019.01.079
- von Reyn et al. (2017), *Feature Integration Drives Probabilistic Behavior in the Drosophila Escape Response*: https://doi.org/10.1016/j.neuron.2017.05.036
