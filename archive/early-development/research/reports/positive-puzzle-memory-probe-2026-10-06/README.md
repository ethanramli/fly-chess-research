# Positive-puzzle saved-memory probe: complete and independently audited

Report SHA-256: `496e80a914ba49db835ed1c5033a73caf9f0614419b6423b8f30411de755ff74`. Source pilot and its receipt/trace/prefix audits are complete; this diagnostic changes no learning rule or success gate. `audit.json` verifies six intervention masks, 156 candidate records, full legal sets, score arithmetic and exact original baseline/final/restored assessments. Source files and independent auditor are archived under `source/`. The audit does not independently rerun full neural dynamics.

| Saved memory | Choice | Qh7# rank | Qh7# margin against strongest rival |
|---|---|---:|---:|
| Baseline | Qf5 | 3 | -0.0007143206894 |
| After first positive event, all gains | Qf5 | 3 | -0.0007560602389 |
| First event, PAM02 gains only | Qf5 | 3 | -0.0007143099792 |
| First event, PPL103 gains only | Qf5 | 3 | -0.0007560690865 |
| Final | Qb3 | 4 | -0.0005028378218 |
| Final restored | Qb3 | 4 | -0.0005028378218 |

The isolated PAM02 gain change raises Qh7#'s score by 0.0004179924726, but its advantage relative to the leading Qf5 improves by only 0.0000000107102. Across all 26 candidates, PAM-only score increases range from 0.0004178909585 to 0.0004180357791: almost a common offset. This explains why a larger positive score does not yield a different choice in this intervention. Do not infer biological incapacity or absence of all action-specific information from a single fixture.

The complete first event includes 57 PPL103-associated gain changes in addition to one PAM02 change; isolating the PPL103 gains worsens the target margin. Later net changes narrow the margin but expose an unreviewed failing leader. These artificial subset interventions separate recorded memory contributions in the modeled system; they are not natural pathway silencing or a biological necessity result. Score effects need not add exactly through nonlinear propagation.

```powershell
node --max-old-space-size=256 .codebase/scripts/probe-positive-puzzle-memory.mjs --run research/reports/positive-puzzle-pipeline-v1-2026-10-06 --out research/reports/positive-puzzle-memory-probe-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-positive-puzzle-memory.mjs --run research/reports/positive-puzzle-memory-probe-2026-10-06 --out research/reports/positive-puzzle-memory-probe-2026-10-06/audit.json
```

Complete invocation: 101.0859375 MiB peak RSS, 109.4277453 seconds elapsed, 49.719 seconds CPU and 156 neural presentations, duty 0.5. Original wiring/sign/nonplastic invariants are checked after each sweep. No observation/update occurs. Every gain state is retained; baseline/final exact reproduction and final restoration pass.

This supports investigating action-specific input eligibility in a separately frozen, dose-matched encoder comparison, while retaining incomplete coverage as a competing explanation. No new encoder has been validated from this result. Familiar puzzle learning and unfamiliar/counterfactual reasoning remain unproved; this probe is not a substitute for them.
