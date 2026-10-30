# Matched forcing-prior ablation

This compares the same smothered-mate development position under two bounded searches. Both runs use forcing candidate mode, the same seed, three-ply task, max 16 candidates, 4 evaluator calls, 4 simulations, max depth 3, 50% CPU duty, and identical pinned source/input identities. The only declared search difference is `forcingPriorMix` (0 versus 0.5).

| Prior | Choice | Independent consequence | Simulations / evaluations | Neural candidate presentations | Wall time |
|---|---|---|---:|---:|---:|
| Neural only (`0`) | `c4b4` | Failure | 3 / 4 | 49 | 25.75 s |
| Neural + fixed forcing structure (`0.5`) | `c4g8` | Success | 3 / 4 | 26 | 21.34 s |

All root candidates in forcing mode are the same 16 legal moves. With neural-only priors, their root probabilities are nearly uniform (about 0.061–0.064). The mixed prior assigns `c4g8` 0.237 and `h6f7` 0.229 because they receive structural check/attack tags. The selected `c4g8` is independently verified as a task success. Neither search recorded a terminal leaf, so the search itself did not verify the mating line during its four evaluation calls.

This is a useful one-fixture search-policy result: the structural prior changes the selected move and halves measured candidate presentations in this particular deterministic run. Timing and presentation counts can depend on which nodes the search visits; they are not a general speedup estimate. The structural signal is hand-engineered, not learned by the connectome model. No teacher feedback was delivered and no persistent neural state changed. This therefore does not demonstrate puzzle learning, consequence understanding, transfer or reasoning.

The counterfactual profile remains a separate development observation: on the support-shifted position with neural-only priors, the system selected `h5h6` (verified failure) despite evaluating the known successful `h5e8`. See the [two-position bottleneck profile](../task-aware-forcing-profile-2026-10-07/README.md).

## Raw reports

- [Neural-only prior, smothered position](../neural-prior-smothered-task3-v1-2026-10-07/report.json)
- [Mixed structural prior, same position](../forcing-prior-task3-v1-2026-10-07/report.json)

The reports record full candidate rankings, traces, timings, resource measurements, task horizon, and hashes for source and input identities. Both are development data; the position was already inspected and cannot serve as final transfer evidence.
