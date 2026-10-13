# Monte Carlo consequence-review software probe

**Synthetic-policy engineering evidence only.** No graph was loaded and no fly inference, teaching pulse, physiological memory update or held-out transfer ran.

Commands:

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-monte-carlo-review.mjs --out research/reports/monte-carlo-review-software-2026-10-06
node --max-old-space-size=256 .codebase/scripts/audit-monte-carlo-review.mjs --run research/reports/monte-carlo-review-software-2026-10-06
```

[Report](report.json), [independent audit](audit.json), three bounded trace JSONL files and pinned source copies in `source/` preserve this run. Report SHA-256: `ae77f2ef44e41fec96b0985240dcaa5b23e8df9306ccd01d7532981705e2fe3a`.

Audit passes: 79 trajectories, 12 certificate checks and four verified defense diagnostics. One initial audit failure concerning JSON signed-zero normalization is preserved in [audit-correction.txt](audit-correction.txt); raw evidence and search/review math were unchanged. All 64 project tests pass.

Peak process RSS 51.59765625 MiB; elapsed 0.8319413 s; CPU 1.001 s. Heap bound 256 MiB, 768 MiB RSS/256 MiB free-memory guard; no duty schedule needed for this subsecond software probe. These are not full-graph performance measurements or a comparative resource improvement.

The [design](../../../documentation/design/search-and-feedback/monte-carlo-traces.md) records behavior and unfinished integration. The API reviews at most a bounded complete trace panel; a larger streaming review summary and search checkpoint protocol are future work. Sampled continuations do not prove success against best defense. Calibrated evaluation error, exchange feedback, delayed neural credit and unfamiliar-position learning are unproved.
