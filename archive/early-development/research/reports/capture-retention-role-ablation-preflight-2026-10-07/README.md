# Capture-retention role-ablation preflight

This static check verifies that the proposed held-out role-namespace ablation changes the final cues without changing the current budget. It uses frozen final boards only as inputs; it does not use their outcome labels or run neural activity, learning, or candidate choice.

Run from the repository root:

```powershell
node --max-old-space-size=256 .codebase/scripts/search-and-feedback/audit-capture-retention-role-ablation.mjs
```

The recorded [raw report](report-v2.json) covers all 16 final candidate cues. Swapping `around-target:` and `around-origin:` on every board-piece relation token creates no duplicate token sets; every cue still stimulates 14 cells at total current 21, and all 16 stimulated-cell sets change. The script verifies the frozen protocol, mapping and cue-source hashes and the pinned `chess.js` 1.4.0 package version.

This confirms only that the ablation is mechanically testable under the declared input budget. It does not show that the intact cues encode correct neural role binding, that the learner uses the relation, or that the ablation will reduce a learned choice. Nearest-cue baseline and all runner/source audits remain pending.
