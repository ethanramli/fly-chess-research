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

## Addendum 2026-10-28: board input encoding (researcher question)

Read from the pinned commit's `flychess/chessenv/encoding.py` (fetched 2026-10-28; not archived here) and the archived `flybrain.py`. Input: 20 planes x 64 squares (1280 values), always from the side to move, with the board mirrored when Black moves:
- planes 0-5 and 6-11: the mover's and the opponent's P, N, B, R, Q, K;
- 12-15: castling rights;
- 16: legal en-passant square;
- 17: constant ones;
- 18: halfmove clock / 100;
- 19: repetition flag.

The planes are injected at every timestep through two trainable projections: a dense `w_in` into sensory neurons, and a per-photoreceptor `w_ret` in which each retina neuron sees the 20 planes of one assigned square. Output: a policy over 4168 from-to moves plus a value, both from trainable heads on descending, motor and central neuron activity.

The input carries no attack or relation facts. Those are discovered by backpropagation through the whole recurrent network on millions of human and engine positions. Implication for FlyChess: our learner changes only KC-to-MBON gains with a dopamine-gated local rule. A plain occupancy cue is at chance on held-out families for such a learner (`research/reports/stage1-representation-ceiling-2026-10-27`), which is why the researcher chose the engineered attack map. Adopting cesp99's raw-plane input would need a learned input transform, which our endogenous-learning boundary excludes. Their retina mapping (photoreceptor-to-square assignment) is a possible reference for a later natural-vision input, but its square weights are trained by backpropagation.

## Addendum 2026-10-28 (b): his actual input routes (repository master, read 2026-10-28)

Sources: `docs/RETINA.md`, `configs/v3.yaml`, `flychess/connectome/graph.py` and the README, from https://github.com/cesp99/fly-chess (branch master; not archived here).

- **Sensory path (fly1, fly2; kept in fly3).** The board goes into the 2,048 best-connected (by out-degree) of the 14,663 FlyWire neurons of super class sensory, ascending or sensory_ascending, through a dense learned `W_in` (2048 x 1280). Per RETINA.md these are olfactory receptor neurons, Johnston's organ cells and taste bristles, "none of them visual". The README says: "A fly has no chess-board sensory organ; W_in is where most of the 'chess' is learned."
- **Retina (fly3, `vision: true`).**
  - 5,543 photoreceptors (R1-6, R7, R8) are placed on ommatidial columns using the FlyWire optic-lobe column assignment (Matsliah et al. 2024; 785 left and 796 right columns). R7 and R8 are placed directly; each R1-6 is placed through its strongest L1/L2/L3 lamina partner.
  - Columns are binned onto squares. The left eye sees files a-d and the right eye e-h, with rank 1 ventral and rank 8 dorsal. The default `weighted` binning gives 67-107 photoreceptors per square.
  - Each photoreceptor sees the 20 planes of its one square through 20 learned weights (`w_ret`) plus a bias. The signal then travels lamina, medulla, lobula and central brain through the connectome.
  - fly3 also uses 16 steps, neuromodulatory gating, a central-brain readout and "homeostatic gains calibrated on data at init (visual pathway needs it)".
  - Everything is trained by backpropagation (imitation on about 100M positions, then gated self-play).
- **Reusable within our boundary.** The photoreceptor-to-square placement is anatomy plus a deterministic binning, with nothing learned. A fixed (untrained) rendering of the board onto those photoreceptors would be a biologically grounded input route.
- **Not reusable.** `w_ret`, `W_in`, the heads and the homeostatic calibration are fitted by the trainer (excluded by AGENTS.md).
- **Risk flagged by his own config.** The visual pathway needed data-calibrated gains to carry signal. With fixed weights, the signal may die or saturate before it reaches our KCs; this is untested.
- Licences: code MIT; FlyWire-derived data CC BY-NC 4.0. Register in the source-to-solution register before any experimental use.
