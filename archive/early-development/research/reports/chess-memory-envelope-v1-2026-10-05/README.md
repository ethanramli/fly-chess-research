# Efficacy-floor profiles do not change GF choices

Frozen/run 2026-10-05; completion review and resumed prefix 2026-10-06.

Six previously failed informative seeds each receive seven artificial profiles: naive; A-only/B-only KC efficacy at gain 0.2; and the same unilateral floors restricted to MBON12 or MBON01. All other gains are 1. This is a numerical sensitivity diagnostic, not learning, natural forgetting, a new reward pathway or a biological bound.

**None of the 42 profiles changes a clipped or signed GF choice.** All remain 3/6 correct against the original experimental reversal contingencies. Rate differences do occur. Of 36 floor profiles, 32 select nonzero edges; four MBON01 masks are empty (10111 A, 10151 B, 10211 A, 10243 A) and therefore provide no intervention evidence. Some nonempty profiles duplicate others. These observations cannot establish that all permissible memory configurations or alternate supported mechanisms are incapable of changing choices.

`report.json` preserves every selected edge count, gain array/hash, raw/signed/clipped GF output, original baseline identity, source/input hashes, command and resource measurement. `audit.json` independently rechecks all masks, zero event counts, gain hashes, decoder arithmetic and naive baseline reproduction. `audit-replay.json` additionally checks exact record equality after one resumed nonempty intervention; its first record is retained from the checkpoint. This is not a full fresh replay. Source snapshots are archived in `sources/`.

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-chess-memory-envelope.mjs --out research/reports/chess-memory-envelope-v1-2026-10-05 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-chess-memory-envelope.mjs --run research/reports/chess-memory-envelope-v1-2026-10-05 --out research/reports/chess-memory-envelope-v1-2026-10-05/audit.json
node --max-old-space-size=256 .codebase/scripts/probe-chess-memory-envelope.mjs --out research/reports/chess-memory-envelope-prefix-replay-2026-10-06 --cpu-duty 0.5 --max-jobs 1 --resume research/reports/chess-memory-envelope-v1-2026-10-05/intervention-001/state.json
node --max-old-space-size=256 .codebase/scripts/audit-chess-memory-envelope.mjs --run research/reports/chess-memory-envelope-v1-2026-10-05 --compare research/reports/chess-memory-envelope-prefix-replay-2026-10-06 --out research/reports/chess-memory-envelope-v1-2026-10-05/audit-replay.json
npm test
```

Use new output paths when repeating. Full run: 84 forward evaluations, peak RSS 94.12890625 MiB, elapsed 48.4369274 seconds, CPU 27.453 seconds, duty 0.5. One-profile prefix: two evaluations, peak RSS 94.6484375 MiB, elapsed 2.8585037 seconds, CPU 1.953 seconds. Workloads differ; no speedup/resource improvement claim. All 46 existing tests pass. The raw interventions and independent arithmetic audit provide the specific new evidence, not the unit-test count.

Original acquisition/reversal acceptance stays failed. Whole-model adaptation, a supported neural feedback/credit interface, a working verified-puzzle learning round and unfamiliar-position transfer remain unfinished. [Design and limits](../../../documentation/design/diagnostics/efficacy-floor.md).
