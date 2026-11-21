# Graded feedback and Stockfish value teaching

Access date: 2026-10-08. This material prepares a condition that must be frozen separately. It is not evidence that neural evaluation improved.

Primary sources and adaptations:

- [Stockfish evaluation documentation](https://official-stockfish.github.io/docs/stockfish-wiki/Advanced-topics.html): modern evaluation uses NNUE. We use the idea of valuing a whole position in context; we do not import the network, its weights or its supervised optimizer.
- [Official NNUE documentation](https://official-stockfish.github.io/docs/nnue-pytorch-wiki/docs/nnue.html): architecture and evaluation training background. It does not establish that our connectome/local rule can learn the same function.
- [Stockfish WDL model](https://github.com/official-stockfish/WDL_model): expected game points are (W + D/2)/1000, using the correct actor's perspective. These estimates describe the engine population; they are not the fly's calibrated winning probability.
- [Lichess accuracy explanation](https://lichess.org/page/accuracy), and archived Advice.scala/WinPercent.scala at commit cf9e10df24b767b3bc5ee3d88c45437ac722025d: context-sensitive regret motivates graded feedback. Advice thresholds .1/.2/.3 on winningChances [-1,+1] correspond to 5/10/15 percentage points. Our use of those thresholds on expected game points is an engineering adaptation, not an exact reproduction or validated rubric. Positive tolerances .005/.025 are project hypotheses.
- [Bennett, Philippides and Nowotny 2021](https://www.nature.com/articles/s41467-021-22592-4): a computational hypothesis about mushroom-body prediction error. We accessed only the abstract and repository overview; access to the article body failed. This does not validate our specific channels or graded dose.
- [Eshel et al. 2015](https://www.nature.com/articles/nature14855): abstract coverage, mouse reward-expectation subtraction. This is comparative motivation, not fly physiology evidence.

Archived text and hashes are in [access-evidence.json](access-evidence.json). Full provenance, assumptions and test status are in the [source-to-solution register](../source-solution-register.md).

The isolated modules `stockfish-feedback-rubric.mjs` and `stockfish-value-brain.mjs` are implemented. The rubric requires all legal child positions to use matching budgets. It binds the history and engine identity, separates engine estimates from task certificates, and withholds feedback when the result is unknown or its direction is ambiguous. The budget envelope is not a statistical confidence interval. The brain uses a fixed, uncalibrated tanh MBON transform; its mapping from error to current is experimental. No graded graph experiment has run.

## How to read the thresholds, clarified 2026-11-18

For Volume 2, Chapter 2, To Teach: the [local rubric](../../../.codebase/src/search-and-feedback/stockfish-feedback-rubric.mjs) compares the engine's estimated game points for the chosen move with its best available estimate. A larger estimated loss gives less positive or more negative feedback. These are estimates from bounded engine analysis; they do not certify a consequence such as forced mate.

The constants 0.005 and 0.025 apply to estimated game-point loss on a scale from 0 to 1. A loss of 0.005 is half a percentage point; 0.025 is 2.5 percentage points. The first marks the near-best category. The second is the boundary where the shaping signal reaches zero: losses below it can produce a positive signal, and losses above it can produce a negative one. The constants are engineering choices. This note gives no source-backed reason that these exact cutoffs are biologically appropriate or improve learning.

For each legal move, the code takes the smallest and largest estimates from at least two matching computation budgets. It uses those ranges to calculate a range of possible estimated loss. If that range crosses the zero-signal boundary, feedback is withheld. The resulting envelope describes disagreement between the supplied engine estimates. It does not bound the true game outcome or give a statistical confidence interval.

This clarification describes the inspected local implementation. It adds no source verification, experiment, or biological validation.
