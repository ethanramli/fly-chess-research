# Post-training memory subsets do not rescue GF choice

2026-10-05. Sixty artificial causal interventions on the failed association model. No learning occurred.

For six informative seeds, acquisition and reversal memories were replayed intact, with only unique/shared/other KC efficacy changes retained, and with naive gains. Membership is defined by the directly stimulated cue sets. Resetting a subset after learning cannot establish what its removal during learning would do.

| Retained memory | Acquisition correct | Reversal correct | Choices changed from intact |
|---|---:|---:|---:|
| All | 3/6 | 3/6 | 0 |
| Action-unique only | 3/6 | 3/6 | 0 |
| Shared only | 3/6 | 3/6 | 0 |
| Other directly un-stimulated KCs only | 3/6 | 3/6 | 0 |
| Naive | 3/6 | 3/6 | 0 |

All intact/naive responses reproduce exactly. No intervention changes any seed's decoded choice in either phase. This result limits the post-training shared-memory-rescue hypothesis; it does not rule out overlap during acquisition, nonlinear pathway interactions or insufficient action-specific efficacy changes. Original choice failures remain failures. Artificial gain resets are diagnostic interventions, not endogenous learning or biological forgetting.

`report.json` preserves all 60 gain arrays/hashes, category counts, raw/readout responses, original source-state hashes, commands and measurements. `audit.json` independently reconstructs every reset mask, source event count, memory hash, GF arithmetic, original intact/naive responses and summary counts. It also checks exact record equality for a one-intervention resumed prefix; six earlier records come from the checkpoint, not a fresh replay. Atomic `intervention-NNN/state.json` files retain resumable progress. Executable source snapshots are in `sources/`.

```powershell
node --max-old-space-size=256 .codebase/scripts/ablate-chess-memory.mjs --out research/reports/chess-memory-ablation-v1-2026-10-05 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/ablate-chess-memory.mjs --out research/reports/chess-memory-ablation-prefix-replay-2026-10-05 --cpu-duty 0.5 --max-jobs 1 --resume research/reports/chess-memory-ablation-v1-2026-10-05/intervention-006/state.json
node --max-old-space-size=256 .codebase/scripts/audit-chess-memory-ablation.mjs --run research/reports/chess-memory-ablation-v1-2026-10-05 --compare research/reports/chess-memory-ablation-prefix-replay-2026-10-05 --out research/reports/chess-memory-ablation-v1-2026-10-05/audit.json
npm test
```

Use new output paths when repeating. Full run: 120 forward evaluations, peak RSS 99.24609375 MiB, elapsed 71.3254115 seconds, CPU 39.922 seconds, duty 0.5. One-intervention resume: two evaluations, peak RSS 93.18359375 MiB, elapsed 2.3556085 seconds, CPU 1.516 seconds. Workloads differ; no resource improvement or speedup claim. All 46 existing tests pass; the new audit and raw interventions provide the specific diagnostic evidence.

The verified puzzle receiver remains record-only. Natural interfaces, biological predictions, whole-model adaptation, delayed credit and unfamiliar-position reasoning remain outstanding. [Design and limits](../../../documentation/design/diagnostics/memory-ablation.md).
