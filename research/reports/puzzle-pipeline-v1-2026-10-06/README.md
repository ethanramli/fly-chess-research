# Puzzle pipeline V1: audited orchestration, no useful acquisition

The full sparse-graph [report](report.json) completes two engineering fixtures across informative, absent, count-matched shuffled and disabled-plasticity conditions. Informative unaided KQK choice changes Qf5 to Qb3 and still fails. KRK choice remains Rb1 and succeeds both before and after. The informative searched choices succeed before and after both fixtures, as do absent and disabled controls. These results do not demonstrate useful acquisition or improved calculation from feedback.

| Condition | KQK unaided before / after | KRK unaided before / after | Searched outcomes before / after |
|---|---|---|---|
| Informative | failure / failure | success / success | success / success on both |
| Absent | failure / failure | success / success | success / success on both |
| Shuffled | failure / failure | success / failure | success / failure on both |
| Disabled | failure / failure | success / success | success / success on both |

Shuffled degradation alone does not establish informative acquisition. Second-fixture memories include first-fixture exposure within each condition; shuffled KRK starts at Rd1 rather than Rb1. This is a bounded pilot with two familiar fixtures and a neutral leaf heuristic, not a held-out curriculum or strategic evaluation test.

[Record audit](audit.json) passes 64 certificate uses and 24 enabled local updates across 32 recorded experiences, checking fixed cue projection, matched schedules, memory recurrence/continuity and causal snapshots. [Trace audit](audit-traces.json) replays nine informative investigation trajectories, eight certificate-bound explanations and two verified-defense diagnostics. It does not audit unstored post-training search trajectories or reproduce neural inference. The search has the same declared limits before/after, including a soft elapsed deadline; actual trajectories and stop reasons must be inspected rather than assuming equal completed search work.

[After-update prefix audit](audit-prefix.json) passes exact scientific-state comparison. Resuming pending receipt checkpoint 00004 into a fresh directory acknowledges one event with **zero new neural presentations**. Report SHA-256: `f7bdc60d3fe5f6003a38ee0533e2cd41825777f081abdc750a51578e3f417e60`. Frozen sources and current independent auditors are archived under source/. Graph/input identities remain pinned in report.json; graph and nonplastic-state checks pass.

Observed full invocation: **118.00390625 MiB peak RSS**, **1058.8109907 s elapsed**, **475.141 s CPU**, **1,354 neural presentations**, CPU duty 0.5. These are this workload's observations, not a resource improvement or universal guarantee. Prefix invocation: 101.0078125 MiB, 2.9218012 s elapsed, 2.204 s CPU, zero neural presentations.

```powershell
node --max-old-space-size=256 .codebase/scripts/train-puzzle-pipeline.mjs --out research/reports/puzzle-pipeline-v1-2026-10-06 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-puzzle-pipeline.mjs --run research/reports/puzzle-pipeline-v1-2026-10-06
node --max-old-space-size=256 .codebase/scripts/audit-pipeline-traces.mjs --run research/reports/puzzle-pipeline-v1-2026-10-06
node --max-old-space-size=256 .codebase/scripts/train-puzzle-pipeline.mjs --out research/reports/puzzle-pipeline-prefix-2026-10-06 --resume research/reports/puzzle-pipeline-v1-2026-10-06/checkpoint-00004/state.json --max-events 1 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/audit-puzzle-pipeline.mjs --run research/reports/puzzle-pipeline-v1-2026-10-06 --prefix research/reports/puzzle-pipeline-prefix-2026-10-06 --out research/reports/puzzle-pipeline-v1-2026-10-06/audit-prefix.json
```

Existing outputs are preserved; commands require new destinations to rerun. [Design and remaining requirements](../../../documentation/design/puzzle-learning/experience-pipeline.md). Positive-channel association and verified replay clips are separate later conditions, not installed in this frozen run. Useful learning, learned strategic assessment, delayed credit and unfamiliar/counterfactual transfer remain unproved.
