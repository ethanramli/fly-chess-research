# Matched representation learning V1: failed full-root choices

2026-10-06. Two encoders × four controls, four known experiences each; all 26 legal moves available. Exact physical matching: 14 KC cells at 1.5 each, total 21. Original graph/readout/dynamics/plasticity preserved. **Both fixture-repair and feedback-specificity gates fail for both encoders.** No unfamiliar reasoning or universal volume failure is established.

| Encoder | Informative choice after | Reviewed margin before | Reviewed margin after | Informative-minus-absent margin change |
|---|---|---:|---:|---:|
| Absolute | Kf5, non-mating | -0.00174881 | +0.00086994 | +0.00263023 |
| Relational V2 | Qf5, non-mating | -0.00006325 | +0.00348728 | +0.00354534 |

Descriptive paired representation difference +0.00091510 does not establish useful complete-root choice. Absolute absent/disabled retain Qf2; relational absent/disabled retain Qf5. Frozen four-event shuffled flags happen to equal the informative order despite mixed outcomes, so those controls are identical and uninformative. This is preserved rather than retrying a shuffle seed. Both informative conditions receive three external pulses; absent zero; disabled/shuffled three. No new success reinforcement mapping.

- [report.json](report.json): SHA-256 `7c49a3a245e0a6078320b33fc48e7e55f245958f134dac70824c295ba0379d44`.
- [audit.json](audit.json), [audit-prefix.json](audit-prefix.json): independent 32 local recurrences, 84 certificate uses, exact input matching, all roots, reset/restoration and exact after-update resumed prefix.
- `sources/`: SHA-verified driver/modules, protocol, auditor and V2 tests.

```powershell
node --max-old-space-size=256 .codebase/scripts/compare-representation-learning.mjs --out research/reports/representation-learning-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-representation-learning.mjs --run research/reports/representation-learning-v1-2026-10-06 --out research/reports/representation-learning-v1-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/compare-representation-learning.mjs --out research/reports/representation-learning-prefix-2026-10-06 --cpu-duty 0.5 --max-events 1 --resume research/reports/representation-learning-v1-2026-10-06/checkpoint-00004/state.json
node --max-old-space-size=256 .codebase/scripts/audit-representation-learning.mjs --run research/reports/representation-learning-v1-2026-10-06 --prefix research/reports/representation-learning-prefix-2026-10-06 --out research/reports/representation-learning-v1-2026-10-06/audit-prefix.json
npm test
```

Main: **1,696 full-graph presentations**, **111.19 MiB peak RSS**, **669.727 seconds elapsed**, **335.625 CPU seconds**, heap 256/duty 0.5. Prefix: 26 presentations, 111.59 MiB, 13.978 elapsed seconds, 7.828 CPU seconds. **57/57 tests pass**. No resource-improvement claim.

Graph SHA-256 `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`; annotations SHA-256 `30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6`. All source/input/model identities are in report.json.

This is fixed small coverage, not the adaptive curriculum, biological validation, actual Monte Carlo training or reasoning transfer. Both encoders bypass modeled eyes. Increased-volume learning remains unresolved; its frozen extended runner is implemented but not started. Future Stockfish-calibrated snapshot evaluation is documented separately and is not an added completion gate for the current goal.
