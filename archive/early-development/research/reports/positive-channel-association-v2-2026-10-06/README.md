# Positive-channel V2: computational prerequisite passed

Frozen protocol: `../../data/positive-channel-association-v2/protocol.json`. All six informative seeds acquired and reversed strict correct choices, with a ranking switch. All four acquisition/reversal effect comparisons against absent and balanced-shuffled feedback had six positive differences and no ties (one-sided sign-test p=0.015625, frozen alpha=0.05). All seven recorded gates passed. V1's separate specificity failure remains preserved; no completed gate was changed.

`audit.json` independently reconstructs 480 transitions, 384 enabled local updates, cue projection, mapped population stimulation, local recurrence and gate arithmetic. `audit-prefix.json` additionally verifies exact pending-receipt recovery from checkpoint 00003. Recovery made zero new model evaluations and did not duplicate the already saved neural update. The auditors do not independently rerun full-graph inference or establish biological validity.

Report SHA-256: `910e223612751face371cc59558b737ab4e0738bfae6b89baff2705f01f2acbb`. Source/input/graph/annotation identities and Node version are pinned in `report.json`; `source/` archives source files, the independent auditor and protocol. Archived implementation hashes were checked against the report.

```powershell
node --max-old-space-size=256 .codebase/scripts/validate-positive-channel-v2.mjs --out research/reports/positive-channel-association-v2-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-positive-channel-v2.mjs --run research/reports/positive-channel-association-v2-2026-10-06 --out research/reports/positive-channel-association-v2-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/validate-positive-channel-v2.mjs --out research/reports/positive-channel-association-v2-prefix-2026-10-06 --resume research/reports/positive-channel-association-v2-2026-10-06/checkpoint-00003/state.json --max-trials 1 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-positive-channel-v2.mjs --run research/reports/positive-channel-association-v2-2026-10-06 --prefix research/reports/positive-channel-association-v2-prefix-2026-10-06 --out research/reports/positive-channel-association-v2-2026-10-06/audit-prefix.json
```

Complete uninterrupted invocation: 840 model evaluations, 104.671875 MiB peak RSS, 442.1698092 seconds elapsed and 260.265 seconds CPU. Duty 0.5 is pacing, not an OS CPU cap. Prefix recovery invocation: 96.6015625 MiB peak RSS, 0.9604071 seconds elapsed, 1.094 seconds CPU. Guards remain 768 MiB RSS and 256 MiB free system memory.

This verifies a bounded association prerequisite under an engineered balanced feedback control. Exact software persistence is not measured biological retention. Direct identified reinforcement stimulation is not a reconstructed natural chess reward pathway. No useful all-legal puzzle repair, learned strategic evaluation, delayed eligibility, visual perception or unfamiliar/counterfactual reasoning is established. The next step is a separate verified puzzle-feedback condition with matched exposure and unaided/full-root choice measurement, preserving all prior failed puzzle results.
