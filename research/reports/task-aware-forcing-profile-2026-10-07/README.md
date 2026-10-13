# Task-aware Monte Carlo bottleneck loop

This is a two-position development diagnostic in the puzzle -> profile -> improve loop. It verifies that task horizons reach neural candidate assessments, compares a forcing structural prior on the smothered mate with a neural-only prior on a support-shift counterfactual, and locates time spent inside the current bounded profile. It is not an acquisition test, a matched prior comparison, or evidence of learned reasoning.

## Results

| Position/condition | Search budget | Selected move | Verified consequence | Elapsed | Neural presentations | Mean evocation |
|---|---:|---|---|---:|---:|---:|
| Smothered mate, forcing prior mix 0.5 | 4 evaluations, 4 simulations, depth 3 | `c4g8` | Success | 21.34 s | 26 | 694 ms |
| Support-shift counterfactual, forcing mode with neural-only prior mix 0 | 4 evaluations, 4 simulations, depth 3 | `h5h6` | Failure; known successful candidate `h5e8` was evaluated and found a terminal win | 50.33 s | 64 | 716 ms |

Both profiles passed with 109.5 MiB peak RSS and the configured 50% CPU duty. Their task traces record `forced-mate`, 3 plies. In the first run, evaluator calls used the smothered puzzle's three-ply objective and independently verified choice `c4g8`; there were no terminal leaves in search, so the external proof—not the search trace—establishes the consequence. In the counterfactual, the search encountered `h5e8` as a terminal win but selected `h5h6` overall. These are different positions and prior conditions; do not interpret their outcomes as a causal comparison of priors.

The largest measured cost is graph evocation: 18.04 s of 18.87 s evaluation time in the first run and 45.82 s of 47.70 s in the second. Candidate encoding averages 29–31 ms. At the required 50% duty, pacing adds roughly half of active compute time. The current profile is therefore dominated by full graph evocation per candidate, not symbolic encoding. Because the number of neural presentations and board positions differs, elapsed times are not a controlled speed comparison.

## Interpretation and next loop

The forcing prior can guide bounded search to a verified success on this one development fixture. The neural-only ranking failed on the support-shift diagnostic even though the successful candidate entered its evaluated set. This points to evaluation/ranking and per-candidate full-graph cost as the next measured bottlenecks; it does not show the fly learned either position. No feedback was delivered and no persistent memory changed.

The next step is a learning round, not another forward-kernel rewrite: the signed-cache sparse-forward optimization is already measured in a separate exact-output, matched-cycle comparison. The new isolated [contrastive review component](../../../documentation/design/search-and-feedback/contrastive-choice-feedback.md) now prepares checked chosen-action/alternative outcomes, but it is not integrated into a training runner. Freeze a matched-control protocol and connect these experiences to the existing receiver before claiming any learning improvement. Later latency work must be assessed alongside neural-choice quality and learning per verified experience; a handcrafted forcing prior cannot substitute for the trained fly policy.

## Raw evidence

- [Task-aware smothered profile](../forcing-prior-task3-v1-2026-10-07/report.json)
- [Neural-prior counterfactual profile](../neural-prior-counterfactual-task3-v1-2026-10-07/report.json)
- [Smothered puzzle protocol](../../data/smothered-acquisition-v1/protocol.json)
- [Counterfactual delayed puzzle rows](../../data/counterfactual-delayed-v1/puzzles.jsonl)
- [Independent solvability audit](../delayed-transfer-solvability-2026-10-07/README.md)
- [Matched forcing-prior ablation](../matched-forcing-prior-ablation-2026-10-07/README.md)

These profiles hash-bound source and input identities in their reports. Both are single-run development observations; no uncertainty interval or generalization estimate is available.
