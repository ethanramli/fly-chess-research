# Capture-retention dataset audit

[Full dependency-bound audit](audit-v2.json) binds the dataset protocol, data/source hashes and resolved `chess.js` package entrypoint. The [initial audit](audit.json) is preserved. Run from the repository root:

```powershell
node --max-old-space-size=256 .codebase/scripts/search-and-feedback/audit-capture-retention-dataset.mjs research/data/capture-retention-transfer-v2 research/reports/capture-retention-transfer-audit-v1-2026-10-07/reproduction.json
```

The receiver checker verifies all 40 success/failure certificates, the 20 split-disjoint boards and one-success/one-failure balance in every panel. The cue audit finds 40 distinct inputs, no exact cue collisions, no opposite-label cue aliases, and no outcome tokens. The 16×16 train-to-final comparison has 3–7 shared KC indices per pair (mean 4.33/14) and 7–13 shared input tokens (mean 9.05). Resolved dependency identity is `chess.js` 1.4.0 with the exact entrypoint and package hashes in the raw report. These are static features, not evoked neural activity.

V1's nominal final set had two duplicated cue patterns. That preflight failure is preserved in [v1's record](../../data/capture-retention-transfer-v1/README.md). V2's family addresses those exact aliases, but neither dataset is evidence of learned transfer. No neural run, choice evaluation, or Monte Carlo search occurred.
