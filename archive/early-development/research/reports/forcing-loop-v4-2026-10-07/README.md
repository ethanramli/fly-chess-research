# Puzzle loop v4: forcing prior comparison

This is a same-puzzle search iteration following the audited contrastive feedback screen. The screen showed that neural-only PUCT still missed the verified move and spent most of its search time presenting candidate cues to the full graph. The v4 comparison changes only the fixed, teacher-side forcing-prior mix; graph, initial memory, encoder, legal root shortlist, random seed, task, evaluation/simulation budgets, runtime and source/input hashes match.

| Forcing-prior mix | Chosen move | Checked consequence | Neural presentations | Search wall time | Invocation wall / CPU |
|---:|---|---|---:|---:|---:|
| 0.0 | `c4b4` | Failure | 49 | 16.76 s | 18.17 s / 10.36 s |
| 0.5 | `c4g8` | Success | 26 | 8.00 s | 9.20 s / 6.06 s |

On this fixture, the 0.5 condition reduced presentations by 46.9%, search wall time by 52.3%, and invocation CPU time by 41.5%, while selecting the independently verified success. Both searches used four neural position evaluations and completed three simulations; neither reached a terminal leaf. The difference comes from exploration visits under an engineered forcing prior, not from learned chess reasoning. This is a one-puzzle engineering result, not a general speed guarantee or learning result.

The full-graph contrastive screen remains a learning failure: after informative replay, both input variants still choose verified failures unaided and under fixed-budget search. Thus the forcing prior is currently a teacher-search optimization candidate. The next learning iteration must test whether better-selected, verified experiences can change the fly's own all-legal choice against matched controls, then evaluate unfamiliar and counterfactual positions.

Raw, separately preserved runs:

- [Neural-only forcing prior](../forcing-loop-v4-neural-2026-10-07/report.json) — SHA-256 `882cce36c5e32e20560bb9593dde5aacc3c25bb3178949a3b2e4e67c00c91592`
- [Mixed forcing prior](../forcing-loop-v4-prior-2026-10-07/report.json) — SHA-256 `323d27bb12f655f652ba618ec66b9ae683d9cd150bd24098d034a5de1090da20`
- [Audited contrastive feedback screen](../contrastive-feedback-screen-v1-2026-10-07/README.md)

Both raw reports record identical graph, mapping, puzzle, prerequisite, source and dependency hashes. The active signed-edge cache is included in the current trainer identity. Resource limits stayed within the declared 768 MiB RSS and 256 MiB free-memory guards.
