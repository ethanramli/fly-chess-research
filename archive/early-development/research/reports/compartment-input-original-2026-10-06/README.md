# Original relational input: association prerequisite passed

Report SHA-256: `9647b9c1cd0311a237c7ddd38691a88b07754de19331c4a5240388f3d2e5fdd8`. All seven frozen computational association gates pass on six fresh seeds. Informative acquisition/reversal choices and ranking switches succeed in 6/6; every absent/shuffled phase-effect comparison has six positives and p=0.015625 at frozen alpha=0.05. This is experimentally assigned cue valence, not verified chess truth or unfamiliar reasoning.

`audit.json` and `audit-prefix.json` independently verify 480 transitions, 384 enabled local updates, cue geometry/projection, reinforcement population counts, local recurrence and gates. Pending-receipt recovery is exact and performs zero new model evaluations. These audits do not independently rerun full neural propagation or establish biological validity. Frozen sources/protocol and auditor are archived in `source/`; source hashes were checked against the checkpoint identity.

The input matches original relational V2 stimuli, with 14 distinct KCs/current1.5/total21. The current puzzle failures therefore cannot be attributed to universal two-cue learning incapacity at this dose. A two-cue pass does not resolve all-legal competition, feedback coverage, sparse positive eligibility, interference, learned leaf evaluation or unfamiliar transfer.

```powershell
node --max-old-space-size=256 .codebase/scripts/validate-compartment-input.mjs --variant original --out research/reports/compartment-input-original-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-compartment-input.mjs --run research/reports/compartment-input-original-2026-10-06 --out research/reports/compartment-input-original-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/validate-compartment-input.mjs --variant original --out research/reports/compartment-input-original-prefix-2026-10-06 --resume research/reports/compartment-input-original-2026-10-06/checkpoint-00003/state.json --max-trials 1 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-compartment-input.mjs --run research/reports/compartment-input-original-2026-10-06 --prefix research/reports/compartment-input-original-prefix-2026-10-06 --out research/reports/compartment-input-original-2026-10-06/audit-prefix.json
```

Complete invocation: 102.96484375 MiB peak RSS, 632.5162998 seconds elapsed, 337.078 seconds CPU, 840 model evaluations. Prefix recovery invocation: 98.66796875 MiB RSS, 1.0046414 seconds elapsed, 1.156 seconds CPU, zero evaluations. Graph/annotation/model/source identities and Node version are in the report; duty0.5 is pacing, not an OS CPU cap or biological timing.

The other three variants must remain in the frozen comparison. No between-variant significance, selected winner, useful puzzle learning or transfer is established from this first passing condition. Prior failures remain preserved.
