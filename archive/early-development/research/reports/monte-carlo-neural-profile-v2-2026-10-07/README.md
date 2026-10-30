# Bounded full-graph Monte Carlo profile

This read-only diagnostic ran seeded PUCT on the smothered-mate development position using the current sparse full-connectome policy and its frozen original-input identities. The command was:

```powershell
node --max-old-space-size=256 .codebase/scripts/evaluation-and-performance/profile-monte-carlo-iteration.mjs --out research/reports/monte-carlo-neural-profile-v2-2026-10-07
```

It stopped at the declared limit of two neural-backed position evaluations. Those two board assessments covered 48 legal candidate-action cues (24 per position on average) and took 22.68 seconds of search time, 22.66 seconds across candidate assessment, and 14.11 seconds of process CPU time. Peak RSS was 118.38 MiB. Every candidate required a separate full-graph presentation. Evaluation work dominated: cue encoding took 1.37 seconds total, while neural presentations took 21.28 seconds including the runner's 50% pacing. The memory snapshot and fixed-parameter identity were unchanged, and the task board was restored exactly.

The position budget was deliberately tiny. Root expansion plus one child expansion consumed both evaluations, allowing one completed PUCT simulation; the search stopped on its evaluation cap. The reported root move is not teacher-verified and receives no learning credit. This did not run proof review, feedback, plasticity, transfer or a training round. It measures the existing architecture's cost, not a solution to scale.

The first timing artifact in the neighboring v1 directory is preserved but invalid for timing because the harness applied the pacing delay twice. The corrected harness matches the acquisition runner: pace each neural presentation and leave search-level pacing at its no-op default.

The next useful optimization study should target repeated full-graph forward work per legal action while retaining the all-legal choice and omission diagnostics, fixed neural identities, sparse one-position-at-a-time resource contract, and exact output equivalence. A shortlist that silently drops legal candidates would reduce the count while changing the reasoning task, so it is not an acceptable speed claim.

See `report.json` and `COMPLETE` for the raw result and completion hash. Source/input/dependency identities, limits and CPU/RSS measurements are pinned there.
