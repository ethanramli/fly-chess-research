# Balanced eligible-pool input: association prerequisite passed

The frozen balanced-only variant passes all seven computational gates on six fresh seeds: 6/6 informative acquisition and reversal choices with ranking switches, and all absent/shuffled effect comparisons pass the preregistered sign test (p=0.015625). The independent record audit and after-update recovery audit pass 480 transitions and 384 enabled local updates; the replay is prefix-exact and performs zero new model evaluations. Report SHA-256: `599af4ca2cb3087fac4a2a0608e10aa2dafe4ed3d5202bdaa909ced969fb01da`.

This shows the engineered local plasticity can learn the controlled two-cue association with the balanced KC eligibility pool at the fixed 14-cell/current-1.5 dose. It does not establish biological validity, a natural reinforcement route, full chess learning, unfamiliar-position transfer, or reasoning. A per-variant pass is not a statistical comparison against other variants. The frozen conjoined-balanced variant remains to be run before interpreting the input comparison.

Full run: 107.6484375 MiB peak RSS, 497.6856848 seconds elapsed, 283.938 seconds CPU, 840 evaluations. CPU duty 0.5 is pacing, not a hard CPU cap or biological timing. The report records graph, annotation, model, protocol and source identities. The frozen source files and independent auditor are archived under `source/`; all checkpoint-pinned source hashes were verified during archival.

```powershell
node --max-old-space-size=256 .codebase/scripts/validate-compartment-input.mjs --variant balanced --out research/reports/compartment-input-balanced-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-compartment-input.mjs --run research/reports/compartment-input-balanced-2026-10-06 --out research/reports/compartment-input-balanced-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/validate-compartment-input.mjs --variant balanced --out research/reports/compartment-input-balanced-prefix-2026-10-06 --resume research/reports/compartment-input-balanced-2026-10-06/checkpoint-00003/state.json --max-trials 1 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-compartment-input.mjs --run research/reports/compartment-input-balanced-2026-10-06 --prefix research/reports/compartment-input-balanced-prefix-2026-10-06 --out research/reports/compartment-input-balanced-2026-10-06/audit-prefix.json
```

The only trained construct here is a two-choice contingency, not the requested puzzle-and-consequence decision process. Prior puzzle-choice failures remain in force.
