# Near-transfer score-margin diagnostic

This exploratory, read-only reanalysis asks whether the saved learned memory narrows the gap between the best certified success and the best certified failure on the five same-motif development positions. It uses the already independently audited near-transfer scores; it performs no graph inference, learning, feedback or parameter update.

For each condition and position, the margin is the highest fixed MBON score among certified successes minus the highest score among certified failures. Positive means the readout would choose a certified success. The reported lift subtracts the mean margin across absent, shuffled and disabled-plasticity controls from the informative margin.

The informative memory improves this margin relative to matched controls on **5/5 positions**, by a mean of **0.00491 score units**. Yet every informative margin remains negative, so it still chooses a certified failure on **5/5**. The queen d5 / rook f8 position rises to rank 2, while the other successes rank 16–27.

This sharpens the existing result: learned memory shifts relative preference toward the certified success, rather than merely increasing all move scores, but the shift is too small to overcome the remaining all-legal alternatives. It is a descriptive reanalysis of one learned memory on one motif family, not independent replication, disjoint transfer, strategic-value learning or reasoning.

`report.json` records each margin, the input/audit/protocol hashes and the analyzer hash. Reproduce with:

```powershell
node .codebase/scripts/puzzle-learning/diagnose-near-transfer-margin.mjs
```

The script refuses to overwrite the report directory. The source evidence and its limits are documented in the [audited near-transfer report](../adaptive-near-transfer-v4-2026-10-07/README.md).
