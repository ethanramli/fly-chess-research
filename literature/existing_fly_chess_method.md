# Existing fly-chess method: first-pass notes

Date reviewed: 2026-09-28

## Main source

- Project/code and detailed README: https://github.com/cesp99/fly-chess
- Playable version: https://fly.eyed.to/
- The repository identifies itself as a research toy / working pipeline, rather than a peer-reviewed study.

These notes summarize the repository's documented method as checked on 2026-09-28. It has evolved through several model generations; check the exact code commit and checkpoint used before citing numerical details in a paper.

## What the model is

The project turns the adult female FlyWire wiring diagram into a recurrent neural network. In this simplified computational model, neurons are leaky rate units that pass activity along the network for eight steps. A chessboard is encoded and injected into selected sensory/ascending neurons. Activity from descending/motor neurons is decoded into a move policy and a position-value estimate.

The biological wiring constrains which neuron pairs connect and the excitatory/inhibitory sign of each connection. Training can change connection-strength magnitudes, neuron biases and leak/time constants, and the input and output mappings. So “the fly plays” means a trained computer model constrained by the fly's connectome; the fly has not biologically learned chess, and the connectome alone is not a running brain.

## Training stage 1: imitation learning

The model is shown positions from strong human chess games in the Lichess 2014 database. According to the README, both players in the selected games have ratings of at least 1800, giving about 58 million positions.

For each position, it learns two things:

- **Policy:** predict the human player's move. The loss is cross-entropy, which penalizes probability assigned away from the recorded move.
- **Value:** predict the eventual game result. The loss is mean squared error between its estimate and the result label.

In everyday terms, this stage is “watch strong players and learn to copy their moves, while also learning whether positions tend to end in a win, draw, or loss.”

## Training stage 2: self-play

The model uses its policy and value estimates to play games against itself. A tree-search method called PUCT MCTS explores possible continuations: the policy guides which moves to examine, while the value head estimates how promising resulting positions are. Randomized exploration is added at the root and early moves. Game outcomes and explored positions are stored in a replay buffer and used to further train the model. The repository documents periodic Elo evaluation against earlier model versions and a random player.

At game time, the site has modes that use the policy directly, add a shallow check, or add more Monte Carlo tree search. The search is extra computation wrapped around the network. It should be reported separately when measuring how much chess strength comes from the learned network itself.

## What is and is not learned

| Part | How this project handles it |
|---|---|
| Which neurons connect | Fixed from the connectome |
| Excitatory/inhibitory sign | Fixed from predicted neurotransmitter labels |
| Strength of existing connections | Trainable, initialized using synapse counts |
| Neuron bias and leak/time constant | Trainable |
| How the board reaches sensory neurons | Trainable input projection |
| How activity becomes moves and position values | Trainable output heads |
| Search at play time | PUCT Monte Carlo tree search; not itself a change to the connectome |

The README reports roughly 11.9 million trainable values in the full model, including about 2.7 million connection-strength magnitudes. This is a useful reminder that connectome-shaped connectivity does not mean every parameter is fixed by biology.

## Reported caveats and opportunities to investigate

The project README calls the player weak and notes that its recurrent rate model is a simplification, not a biological simulation. The chessboard input and move readout are engineering choices. The authors also report that one short self-play experiment improved the value loss but made the search-based player perform worse against the imitation checkpoint; the released player therefore uses the imitation checkpoint. A later self-play plan adds a human/engine-data mixture and only promotes candidates that beat the current best model.

The current README also reports later generations (`fly1`, `fly2`, `fly3`). The `fly3` summary lists additions including retina-style board input, homeostatic gains, multi-timestep readout, neuromodulatory gating, central-brain readout, Stockfish-evaluated positions, and gated self-play v2. It reports that gated self-play promoted 5 of 9 iterations in the reference run. The README describes head-to-head search games with 100 simulations. These results are repository-reported and should be independently reproduced before being treated as validated findings.

That is a promising place to learn from before proposing a new training method: find out why the earlier run regressed, then design a controlled test of a specific remedy. Possibilities to investigate—not recommendations yet—include replay-data balance, catastrophic forgetting, policy/value target quality, search budget, promotion criteria, and evaluation uncertainty.

The researcher's initial proposal is adaptive training on Lichess puzzles, with extra practice concentrated on puzzle patterns where the fly performs poorly, followed by repeated games involving Stockfish. The repository documents training on human games and MCTS self-play, Stockfish-evaluated positions in the newer fly3 recipe, and promotion gates. Its README does not describe the proposed weakness-targeted puzzle curriculum as a core method. The proposed separate chess board plus MCTS position evaluation is already part of the project's search approach, so it should be treated as background implementation, not the research novelty. Whether adaptive puzzle sampling is a distinct contribution needs a literature search; curriculum learning and hard-example mining are established ideas in machine learning and may have prior chess applications.

Lichess's official open database page: https://database.lichess.org/ . It explains the puzzle fields and how puzzle lines/solutions are represented. Preserve a dated snapshot and split by puzzle ID before training to avoid evaluating on examples or near-duplicates used during training.

Stockfish source and license: https://github.com/official-stockfish/Stockfish . Stockfish is GPL v3. Using it as a local opponent or source of analysis is different from redistributing a Stockfish binary or modified Stockfish source; check the license obligations for the planned distribution.

## Candidate biological inspiration: looming-threat / escape pathway

The researcher proposes recruiting an existing fly danger/escape pathway as a chess-threat signal, while retaining the rest of the connectome. Relevant primary research is specific: in the adult visual escape circuit, LPLC2 contributes looming-object size information, LC4 contributes looming speed information, and both provide major direct input to the Giant Fiber (GF) escape neuron. This supports the existence of identified visual threat/escape circuitry; it does not establish a general-purpose, abstract “danger instinct” module that can directly recognize chess tactics.

Chess danger would need a defined representation (for example, an immediate attack on a valuable piece, a king threat, or a forced tactical sequence) and a specified mapping into the model. If Stockfish supplies threat labels, that is engine-supervised information. Reusing pathway neurons may avoid adding a large separate evaluator, but any new input mapping or readout can add trainable parameters. Use parameter-matched controls and report parameter counts, fixed/learned connectome components, and whether other pathways are preserved.

Primary sources:

- Ache et al. (2019), *Neural Basis for Looming Size and Velocity Encoding in the Drosophila Giant Fiber Escape Pathway*: https://doi.org/10.1016/j.cub.2019.01.079
- von Reyn et al. (2017), *Feature Integration Drives Probabilistic Behavior in the Drosophila Escape Response*: https://doi.org/10.1016/j.neuron.2017.05.036

## Questions for a deeper code reading

1. What exact code path builds the human-game targets and excludes held-out games?
2. Which parameters are updated at each stage, with what optimizer, learning rate, and stopping rule?
3. How are self-play positions and targets generated from MCTS visits and game outcomes?
4. How does evaluation control colors, openings, seeds, opponent versions, and game count?
5. Does the benchmark distinguish raw policy strength from the added search procedure?
6. What exact software commit, dataset snapshot, compute, and random seeds are needed to reproduce the released checkpoint?

## Reuse and attribution notes

The repository states that its code is MIT licensed. It states that its FlyWire connectome data and derived brain models are CC BY-NC 4.0 (noncommercial), Lichess games are CC0, and bundled `chess.js` is BSD-2-Clause. Treat these as separate materials with separate terms. The README recommends citing the FlyWire primary papers and the project credits. Recheck the applicable licenses and institutional guidance before distributing a derived model or choosing a publication route.

## References

- Fly Chess source and method: https://github.com/cesp99/fly-chess
- Fly Chess interactive demo: https://fly.eyed.to/
- Dorkenwald et al. (2024), *Neuronal wiring diagram of an adult brain*: https://doi.org/10.1038/s41586-024-07558-y
- Schlegel et al. (2024), *Whole-brain annotation and multi-connectome cell typing of Drosophila*: https://doi.org/10.1038/s41586-024-07686-5
