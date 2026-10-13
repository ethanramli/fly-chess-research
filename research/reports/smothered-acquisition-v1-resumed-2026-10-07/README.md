# Smothered acquisition: resumed run and audited result

2026-10-07. This report completes the original five-condition, single-development-position diagnostic after recovering from a checkpoint-publication failure. The original run at [smothered-acquisition-v1-2026-10-07](../smothered-acquisition-v1-2026-10-07/) failed while renaming `checkpoint-00167.partial`; that partial and its `interruption.json` are preserved. Recovery used only published checkpoint 166 and wrote to this new directory. The partial checkpoint 167 was not acknowledged or resumed.

## Audited outcome

The runner completed all 40 scheduled condition-level experiences. The independent audit passed **114 certificate checks and 32 local-update recurrence checks**, and is bound to the final report SHA-256 in `audit.json`.

| Condition | Verified success experiences | Failures | Final unaided choice | Fixed-search choice |
|---|---:|---:|---|---|
| Adaptive | 0/8 | 8 | `a1b2` failure | `c4c1` failure |
| Fixed | 2/8 | 6 | `c4b4` failure | `c4h4` failure |
| Absent feedback | 0/8 | 8 | `c4b4` failure | `c4b4` failure |
| Shuffled feedback | 0/8 | 8 | `a1b2` failure | `c4c1` failure |
| Disabled plasticity | 0/8 | 8 | `c4b4` failure | `c4b4` failure |

The two fixed-condition successes are repeated presentations of the same `c4g8` mate line. They are teacher-provided fixed experiences, not model-selected successful solutions. The adaptive condition's eight model-selected moves all fail the bounded mate objective. Every final unaided choice and every fixed-search choice also fails. There are 2 success and 38 failure receipts across conditions, with no unknowns; these are repeated condition-level experiences on one fixture, not 40 distinct puzzles.

`usefulChoices`, `repairAboveAbsentDisabled` and `shuffleSpecificity` all fail. `persistenceAndReset` and `fixedState` pass. Shuffle specificity is unidentifiable because the adaptive experience sequence contains only failures, so all shuffled deliveries remain PPL103. This experiment does not establish useful learning, transfer or reasoning. The verified objective is bounded mate, not a game win or measured chess rating.

## Recovery and provenance

- Original publication failure: `../smothered-acquisition-v1-2026-10-07/interruption.json`; last acknowledged input was `../smothered-acquisition-v1-2026-10-07/checkpoint-00166/state.json`.
- Resume sources: [pre-relocation source archive](../../source-archives/codebase-before-2026-10-07/README.md), with its `.codebase` exposed as a junction in the isolated temporary execution root. The graph, annotation and research inputs were junctioned to the pinned workspace. All eight input hashes and 27 source hashes in checkpoint 166 were checked before resuming; Node was `v22.23.2`.
- Successful resume command, from `C:\Users\ethan\AppData\Local\Temp\flychess-smothered-resume-2026-10-07`:

  ```powershell
  node --max-old-space-size=256 .codebase/scripts/train-smothered-acquisition.mjs --out research/reports/smothered-acquisition-v1-resumed-2026-10-07 --resume research/reports/smothered-acquisition-v1-2026-10-07/checkpoint-00166/state.json --variant original --cpu-duty 0.5 --max-events 40
  ```

- Independent audit command, same working directory:

  ```powershell
  node --max-old-space-size=256 research/reports/smothered-acquisition-v1-2026-10-07/frozen/.codebase/scripts/audit-relocated-run.mjs --run research/reports/smothered-acquisition-v1-resumed-2026-10-07 --out research/reports/smothered-acquisition-v1-resumed-2026-10-07/audit.json
  ```

The report's resource measurements cover the resumed invocation only. The original interrupted invocation records its own metrics in `interruption.json`; do not treat either invocation's metrics alone as whole-run measurements. The separate positive-eligibility probe remains unrun and requires the corrections in [its review](../smothered-probe-review-2026-10-07/README.md).
