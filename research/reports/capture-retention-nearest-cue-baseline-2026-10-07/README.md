# Capture-retention nearest-cue baseline

This is the predeclared one-nearest-training-cue baseline for the frozen v2 transfer family. It predicts each final candidate's outcome from the training candidate with the greatest Jaccard overlap of selected KC indices; lexical experience ID breaks ties. It chooses a panel candidate only when exactly one is predicted successful.

Run from the repository root:

```powershell
node --max-old-space-size=256 .codebase/scripts/search-and-feedback/audit-capture-retention-nearest-cue.mjs
```

The [raw report](report.json) covers 16 final candidates in eight panels and pins the data, mapping, encoder source and chess.js version. The baseline predicts individual candidate outcomes correctly for 75% of candidates, chooses the correct candidate on 4/8 panels, and fails the `te-01`/`te-05` counterfactual pair. Final outcomes were used only to score this predeclared baseline; no neural result was observed and no encoder or model was tuned.

This does not prove that a neural learner can transfer. It shows that this simple nearest-cue rule does not already pass the counterfactual choice gate.
