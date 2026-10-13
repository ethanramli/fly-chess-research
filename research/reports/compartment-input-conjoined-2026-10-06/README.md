# Candidate-conjoined input: association prerequisite passed

Report SHA-256: `ae32b40ae6388c31fcee5f845d49f2344aed321a13967f499f3807f2a47852a9`. All seven frozen association gates pass on six fresh seeds. Acquisition/reversal and strict ranking switches succeed in 6/6. All absent/shuffled phase-effect tests have six positive differences, p=0.015625 at frozen alpha0.05. This is engineered two-cue association under experimental contingency reversal, not a verified chess consequence or unfamiliar reasoning.

`audit.json` and `audit-prefix.json` independently verify 480 transitions, 384 enabled updates, candidate-conjoined geometry, schedules, actual feedback populations, recurrence, gates and exact pending-receipt recovery. The prefix replay produces zero evaluations. These audits check recorded arithmetic/identity, not independently rerun the graph. Frozen source/protocol/auditor copies are in `source/` and are hash-bound by the run identity.

The physical dose matches baseline: 14 existing KCs, 1.5 each, total21. No wiring, sign, plasticity rule, readout or network state adaptation rule changed. Candidate conjunction reduces direct two-cue KC overlap in the separately audited preflight panel; this association result alone cannot establish that overlap caused the earlier chess-choice failure.

```powershell
node --max-old-space-size=256 .codebase/scripts/validate-compartment-input.mjs --variant conjoined --out research/reports/compartment-input-conjoined-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-compartment-input.mjs --run research/reports/compartment-input-conjoined-2026-10-06 --out research/reports/compartment-input-conjoined-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/validate-compartment-input.mjs --variant conjoined --out research/reports/compartment-input-conjoined-prefix-2026-10-06 --resume research/reports/compartment-input-conjoined-2026-10-06/checkpoint-00003/state.json --max-trials 1 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-compartment-input.mjs --run research/reports/compartment-input-conjoined-2026-10-06 --prefix research/reports/compartment-input-conjoined-prefix-2026-10-06 --out research/reports/compartment-input-conjoined-2026-10-06/audit-prefix.json
```

Complete invocation:107.54296875 MiB peak RSS,665.8821585 seconds elapsed,363.047 seconds CPU,840 model evaluations. Prefix recovery:98.375 MiB RSS,1.3222309 seconds elapsed,1.313 seconds CPU,zero evaluations. Duty0.5 is pacing, not OS CPU control or biological time.

This is exploratory input evidence. It does not statistically establish superiority over baseline, repair a puzzle choice, learn a strategic leaf value, or demonstrate transfer. Continue all predeclared variants and report them regardless of outcome.
