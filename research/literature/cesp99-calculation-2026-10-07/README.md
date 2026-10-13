# cesp99 calculation review

Accessed2026-10-07, Asia/Jakarta. User called the author cesp6; search located cesp99/fly-chess, matching the previously discussed fly/Lichess project. Identity match is an inference. Static source review, no upstream code execution, model download, speed benchmark or learner change.

Pinned commit:3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf. Five full source files are archived below this directory; manifest.json records URLs and byte hashes. Reviewed play/engine.py, train/mcts.py, web/engine/mcts.js, web/engine/flybrain.js and model/flybrain.py. Browser/Python paths differ in batching and tie-breaking; do not assume identical full search trajectories.

## How calculation works

The neural input is a board, rather than a separate board-action cue for each move. A recurrent sparse brain pass produces a full policy vector and a position value. The legal mask restricts that vector to available moves. Thus ranking all legal actions does not require one graph pass per action. The learned policy/value heads and input projections are trainable engineering interfaces.

Python play/engine.py has three modes: larva samples the legal policy without search; fly takes the top3 policy candidates, plays each on a scratch board, and evaluates nonterminal resulting boards in a batch, choosing the lowest opponent value; superfly uses PUCT, default200 simulations. Browser mcts.js accepts a simulation budget (default200 in this module; website configuration may override it).

Each nonterminal MCTS expansion calls brain.forward once for the current board, creates children for ALL legal moves, and stores policy priors/value. Selection maximizes Q plus cPuct*prior*sqrt(parent visits)/(1+child visits). Backup alternates player perspective. Terminal game outcomes bypass the network; visits select the final move. The search does not restrict candidates to checks/captures/attacks. It explores unevenly through policy priors and accumulated outcomes. A poor learned prior/value can still miss a tactic; this is not verified best-defense proof.

Python training search batches one leaf from each active game per simulation step and supports subtree reuse. Browser forwardBatched loops over inputs; it is not equivalent to GPU parallel batching. Browser recurrence uses sparse CSR loops and reused typed-array buffers. Forward produces the whole policy/value from a shared neural feature vector.

The live README and model card describe supervised imitation, later self-play, and learned neural projections/readouts. Dataset descriptions vary across versions (README about58M positions for2014; model card229M human positions plus30M engine-evaluated positions). These are positions, not a verified52M-game count. Training dataset size does not by itself reduce inference cost.

## Implications for this project

Our MappedPuzzleBrain.assess currently evokes the graph once per candidate. The useful architectural question is whether a shared board-state representation can support multiple candidate preferences without repeated full propagation. Importing cesp99's trained policy/value heads, supervised fitting or pretrained weights would violate our endogenous-learning boundary. A replacement interface needs independent biological justification, causal persistent learning and transfer controls; one successful external architecture does not provide that justification.

Potential engineering comparisons: sparse buffer reuse, exact inference parity, memory-light trees, and learned-prior-guided exploration retaining all legal alternatives. No solution is adopted here, and no speed claim is made from static inspection. Preserve our serial sparse/resource guards and frozen learner artifacts. A one-pass endogenous candidate readout remains an open design problem.

Primary sources:
- [Pinned move chooser](https://github.com/cesp99/fly-chess/blob/3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf/flychess/play/engine.py)
- [Pinned browser search](https://github.com/cesp99/fly-chess/blob/3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf/web/engine/mcts.js)
- [Pinned browser neural forward](https://github.com/cesp99/fly-chess/blob/3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf/web/engine/flybrain.js)
- [Pinned Python search](https://github.com/cesp99/fly-chess/blob/3c83567dfb6fa71cecc1556c75f17c8bb38fd5cf/flychess/train/mcts.py)
- [Model card](https://huggingface.co/cesp99/fly-chess)
