# Frozen MBON-choice V1 result

Completed 2026-10-06. **All seven computational gates pass.** This new researcher-proposed engineered MBON preference condition preserves the prior GF failures; it is not verified puzzle learning, a natural action circuit, whole-model adaptation or unfamiliar-position reasoning.

Six fresh encoder seeds, four conditions, 384 presentations and 672 full-graph evaluations. The fixed choice reads `mean(MBON12)-mean(MBON01)`, larger preferred. Input, plasticity and eight-update dynamics match the original board/action assay. Experimental counterbalanced punishment is intentionally not chess truth. Nothing was refitted after results.

| Observation | Result |
|---|---:|
| Strict correct acquisition | 6/6 |
| Strict correct reversal | 6/6 |
| Acquisition-to-reversal ranking sign switch | 6/6 |
| Phase effects above absent and shuffled controls | 6/6 for all four comparisons |
| One-sided sign p for each phase/control comparison | 0.015625 |
| Old-action-unique MBON12 mean efficacy recovery | 6/6 |
| Old action's V rises from acquisition to reversal | 6/6 |
| Same-seed diagnostic GF acquisition/reversal | 4/6 and 3/6 |
| GF diagnostic choices changed after acquisition/reversal vs baseline | 0/6 and 1/6 |
| Independently audited local transitions | 384/384 |
| Software tests | 48/48 |

Exact repeat persistence, reset/restoration, disabled invariance, matched pulse counts and fixed anatomy/nonplastic hashes pass. Numerical updates and all acceptance gates are independently recomputed. Per-trial category means reconstruct from raw gain snapshots. These findings support the predicted memory-to-MBON ranking chain in this specified experiment. Descriptive mean recovery does not prove a biological omission relay or its causal necessity; no omission-only or relay perturbation condition ran.

Raw artifacts:

- [report.json](report.json): protocol/identities, full records, frozen gates, command and measurements. SHA-256 `a74bf8d7a48ff163d1905b9d0bed3c5285c9e02f377fa1c6d0389dbad2561910`.
- [audit.json](audit.json): initial full recurrence/readout/control/gate audit.
- [audit-prefix.json](audit-prefix.json): repeats all checks and confirms the resumed acquisition-boundary state plus two additional events against original scientific-state hashes.
- [recovery-diagnostic.json](recovery-diagnostic.json): action-specific efficacy trajectories, phase-end V/M, and same-seed GF comparison; it does not override gates.
- `checkpoint-00001` through final checkpoint: atomic raw states. Preserve these.
- `sources/`: exact driver/modules and auxiliary audit/diagnostic sources, plus frozen protocol. Initial auditor source is separately retained as [audit-before-streaming-fix.mjs](audit-before-streaming-fix.mjs), matching audit.json's source hash.

The prefix audit initially exhausted heap 256 because its comparison retained every growing checkpoint object. [Failure and repair record](audit-prefix-attempt-001.txt). Fixed the auditor to stream main checkpoints and retain target hashes; the successful full prefix audit measured 119.45 MiB peak RSS. Neural experiment/state/protocol/gates were unchanged. No resource improvement over another workload is claimed.

Exact commands, from repository root:

```powershell
node --max-old-space-size=256 .codebase/scripts/validate-mbon-choice.mjs --out research/reports/mbon-choice-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-mbon-choice.mjs --run research/reports/mbon-choice-v1-2026-10-06 --out research/reports/mbon-choice-v1-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/diagnose-mbon-recovery.mjs --run research/reports/mbon-choice-v1-2026-10-06 --out research/reports/mbon-choice-v1-2026-10-06/recovery-diagnostic.json
node --max-old-space-size=256 .codebase/scripts/validate-mbon-choice.mjs --out research/reports/mbon-choice-prefix-replay-2026-10-06 --cpu-duty 0.5 --max-trials 2 --resume research/reports/mbon-choice-v1-2026-10-06/checkpoint-00006/state.json
node --max-old-space-size=256 .codebase/scripts/audit-mbon-choice.mjs --run research/reports/mbon-choice-v1-2026-10-06 --prefix research/reports/mbon-choice-prefix-replay-2026-10-06 --out research/reports/mbon-choice-v1-2026-10-06/audit-prefix.json
npm test
```

Use new output paths when reproducing. The initial audit source predates the streaming fix, so its source hash differs intentionally from the final audit's hash.

Full-run peak process RSS **112.78 MiB**, elapsed **299.197 seconds**, CPU **163.469 seconds**, CPU duty 0.5, heap 256. Resume invocation: 106.43 MiB, 2.114 seconds, 1.421 CPU seconds. These cover distinct invocation workloads; they are not comparative speed/memory improvements.

Graph SHA-256 `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`; annotations SHA-256 `30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6`; protocol and every model/input/source hash are in report.json. Same board and two actions with fresh projection seeds do not establish held-out chess-family transfer. Direct KC/PPL stimulation, coarse plastic masks and unfitted kinetics remain experimental approximations. The existing puzzle receiver/browser are unchanged. Next work is a separately specified short-timed verified-consequence candidate round; biological validation, delayed credit, broader adaptation and reasoning transfer remain outstanding.
