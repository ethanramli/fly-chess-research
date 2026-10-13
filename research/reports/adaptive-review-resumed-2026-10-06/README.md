# Adaptive review V1: failed fixture repair

2026-10-06. Completed from the original run's recoverable resource interruption. Both frozen gates fail. This is a diagnostic prerequisite for the original reasoning objective, not a reasoning result.

All 26 legal moves remain available throughout. Each of five naive conditions has eight verified experiences, full score trajectories and repeat/reset/restoration. Adaptive and fixed sampling both end at non-mating Qd7. Absent and disabled controls remain at Qf6. Adaptive revisits already reviewed mistakes rather than discovering mate.

| Condition | Final choice | Verified outcome | External pulses |
|---|---|---|---:|
| Adaptive | Qd7 | Failure | 8 |
| Fixed schedule | Qd7 | Failure | 6 |
| Absent | Qf6 | Failure | 0 |
| Shuffled | Qd7 | Failure | 8 |
| Disabled plasticity | Qf6 | Failure | 8 |

Adaptive post-event choices: Kh6, Qf1, Qd7, Kh6, Qf6, Qf1, Kh6, Qd7. Attempts 4 through 8 return previously reviewed failures to the top. Every adaptive teaching outcome is adverse, so its count-matched shuffle is identical and uninformative. Fixed sampling differs in dose and exposure; it is a curriculum comparison. The three controls replay the exact adaptive experience sequence.

The read-only gain diagnostic finds recovery in all 7–9 permitted edges associated with each revived action's directly stimulated cells outside the current cue. Mean gain increases at the five revivals range from 0.06721 to 0.13038. This is consistent with the unchanged low-activity recovery term, not proof of causal necessity. Direct stimulation membership does not include all recurrent activity, and shared representation remains another explanation. No learning rule was changed to force a pass.

- [report.json](report.json): completed results, identity pins, proofs, all scores and gains. SHA-256 `e07b13bce300c419de97c782b1d8180f8762c8e54d749f39da4b640815feb239`.
- [audit.json](audit.json), [audit-prefix.json](audit-prefix.json): all 90 certificate checks and 40 local transitions pass; both failed gates independently reproduced; exact after-update resumed prefix.
- [recovery-diagnostic.json](recovery-diagnostic.json), [score-trajectories.csv](score-trajectories.csv): five revival decompositions and 1,170 candidate score/rank rows.
- `sources/`: SHA-verified driver/modules and frozen protocol, plus auditor and diagnostic.
- [original interruption](../adaptive-review-v1-2026-10-06/interruption.txt): preserves guard failure and the original atomic checkpoints. Resumed checkpoints continue here.

```powershell
node --max-old-space-size=256 .codebase/scripts/adaptive-review.mjs --out research/reports/adaptive-review-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/adaptive-review.mjs --out research/reports/adaptive-review-resumed-2026-10-06 --cpu-duty 0.5 --resume research/reports/adaptive-review-v1-2026-10-06/checkpoint-00126/state.json
node --max-old-space-size=256 .codebase/scripts/audit-adaptive-review.mjs --run research/reports/adaptive-review-resumed-2026-10-06 --out research/reports/adaptive-review-resumed-2026-10-06/audit.json
node --max-old-space-size=256 .codebase/scripts/diagnose-adaptive-review.mjs --run research/reports/adaptive-review-resumed-2026-10-06 --out research/reports/adaptive-review-resumed-2026-10-06/recovery-diagnostic.json --csv research/reports/adaptive-review-resumed-2026-10-06/score-trajectories.csv
node --max-old-space-size=256 .codebase/scripts/adaptive-review.mjs --out research/reports/adaptive-review-prefix-2026-10-06 --cpu-duty 0.5 --max-events 1 --resume research/reports/adaptive-review-v1-2026-10-06/checkpoint-00005/state.json
node --max-old-space-size=256 .codebase/scripts/audit-adaptive-review.mjs --run research/reports/adaptive-review-resumed-2026-10-06 --origin research/reports/adaptive-review-v1-2026-10-06 --prefix research/reports/adaptive-review-prefix-2026-10-06 --out research/reports/adaptive-review-resumed-2026-10-06/audit-prefix.json
npm test
```

The initial invocation exited at the existing resource guard during disabled attempt 4; the exception does not distinguish RSS versus free-memory trigger. No guard was relaxed. Its final resource summary was never published. Therefore full-experiment elapsed/CPU/peak RSS are unavailable, and the resumed metrics must not be presented as full-run metrics. Completed checkpointed trajectories contain 320 presentations per condition (1,600 total); rest probes and work discarded at interruption are additional.

Resumed invocation: 212 counted presentations, **120.31 MiB peak RSS**, **91.005 seconds elapsed**, **45.359 CPU seconds**, heap 256/duty 0.5. Independent after-update prefix: **110.39 MiB**, **11.228 seconds**, **6.187 CPU seconds**. Existing **52/52 tests pass**. This does not establish a resource improvement.

Graph SHA-256 `4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2`; annotations SHA-256 `30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6`. Other dataset/protocol/source/model identities and wiring invariants are in report.json.

More coverage at this frozen budget did not repair the fixture. Controlled representation/recovery comparisons remain proposed. Unfamiliar/counterfactual transfer, long calculation credit, richer verified feedback, natural interfaces and broader model adaptation remain unfinished. No test families or held-out evaluation were used. Preserve earlier failures.
