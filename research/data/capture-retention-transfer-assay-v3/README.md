# Frozen capture-retention assay v3

This version freezes one scratch-memory pass over 16 independently checked capture/recapture experiences, four matched feedback conditions, five declared seeds, eight untouched final panels, and the preregistered analysis. Its SHA-256 is `abb80b8c33e7e0204b8bb141fcfa3f23f81dcce6a546622bdebca054fdf2f279`. Source and input copies are in `research/source-archives/capture-retention-transfer-assay-v3-frozen/`.

The resource-guarded preflight performs no graph inference:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-capture-retention-assay.mjs --preflight --cpu-duty 0.5
```

Each seed-condition pair is one serial invocation with a fresh output directory. For example:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/train-capture-retention-assay.mjs --out research/reports/capture-retention-assay-v3-2026-10-07/seed-47-informative --seed 47 --condition informative --cpu-duty 0.5
```

The independent auditor runs after each condition. Once every frozen combination is complete, the analyzer reruns the auditors and publishes the paired-control aggregate and completion hash:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/analyze-capture-retention-assay.mjs research/reports/capture-retention-assay-v3-2026-10-07
```

All combinations have already been run and audited. The transfer gate failed; see the [completed report](../../reports/capture-retention-assay-v3-2026-10-07/README.md). This is a narrow one-ply consequence-choice assay, not Monte Carlo training or evidence of broad reasoning. Preserve this frozen protocol, its runner/archive, and all failed results unchanged.
