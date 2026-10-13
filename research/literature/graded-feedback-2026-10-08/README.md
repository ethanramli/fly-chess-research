# Graded feedback and Stockfish value teaching

Access date: 2026-10-08. This is preparation for a separately frozen condition, not evidence of improved neural evaluation.

Primary sources and adaptations:

- [Stockfish evaluation documentation](https://official-stockfish.github.io/docs/stockfish-wiki/Advanced-topics.html): modern evaluation uses NNUE. We adapt the target concept of contextual whole-position value; we do not import the network, its weights or its supervised optimizer.
- [Official NNUE documentation](https://official-stockfish.github.io/docs/nnue-pytorch-wiki/docs/nnue.html): architecture and evaluation training background. It does not establish that our connectome/local rule can learn the same function.
- [Stockfish WDL model](https://github.com/official-stockfish/WDL_model): expected game points are (W + D/2)/1000, with scores interpreted from the correct actor perspective. These engine-population estimates are not the fly's calibrated winning probability.
- [Lichess accuracy explanation](https://lichess.org/page/accuracy), and archived Advice.scala/WinPercent.scala at commit cf9e10df24b767b3bc5ee3d88c45437ac722025d: context-sensitive regret motivates graded feedback. Advice thresholds .1/.2/.3 on winningChances [-1,+1] correspond to 5/10/15 percentage points. Our use of those thresholds on expected game points is an engineering adaptation, not an exact reproduction or validated rubric. Positive tolerances .005/.025 are project hypotheses.
- [Bennett, Philippides and Nowotny 2021](https://www.nature.com/articles/s41467-021-22592-4): computational mushroom-body prediction-error hypothesis. Coverage was abstract/repository overview; body access failed. This does not validate our exact channels or graded dose.
- [Eshel et al. 2015](https://www.nature.com/articles/nature14855): abstract coverage, mouse reward-expectation subtraction. This is comparative motivation, not fly physiology evidence.

Archived text and hashes are in [access-evidence.json](access-evidence.json). Full provenance, assumptions and test status are in the [source-to-solution register](../source-solution-register.md).

Implemented isolated modules: `stockfish-feedback-rubric.mjs` and `stockfish-value-brain.mjs`. The rubric requires all legal child positions at matching budgets, binds history and engine identity, distinguishes engine estimates from task certificates, and withholds unknown or directionally ambiguous feedback. Its budget envelope is not a statistical confidence interval. The brain's fixed tanh MBON transform is uncalibrated and its error-to-current mapping is experimental. No graded graph experiment has run.
