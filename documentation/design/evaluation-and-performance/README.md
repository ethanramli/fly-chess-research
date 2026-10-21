# Evaluation and performance

The first equivalent sparse-forward optimization, full-graph Monte Carlo profiles, and a paired forcing-shortlist probe have been measured. A matched one-position ablation changes a verified failure to a verified success when a fixed structural forcing prior is mixed into the nearly uniform neural priors; this is search engineering, not learning. A separate neural-only support-shift profile misses a known success. Broader time-to-quality and multi-position evaluation remain open. No calibrated Elo predictor, Stockfish evaluation pipeline or pondering speedup is established.

- [Future evaluation: Stockfish reference-pool Elo calibration](elo-calibration.md)
- [Fly versioning and rollback](fly-versioning.md)
- [Future implementation roadmap: inference, search and evaluation](implementation-roadmap.md)
- [Future performance: thinking during the opponent turn](pondering.md)
- [Task-aware Monte Carlo bottleneck profile](../../../research/reports/task-aware-forcing-profile-2026-10-07/README.md)
- [Matched forcing-prior ablation](../../../research/reports/matched-forcing-prior-ablation-2026-10-07/README.md)

[Current status](../../current-status.md) · [All design topics](../README.md)

- [Bounded assessment summary cache: matched development speed/equality test](assessment-cache.md)

## 2026-10-10: FlyBench implementation

[FlyBench v1](flybench.md) now implements adaptive Stockfish games, provisional Glicko ratings and recovery/audit. The measured reference ladder, external calibration and predictor remain unimplemented; no fly strength has been measured.

- [Current move-latency candidate: exact zero-reset first step, staged while frozen evaluation is live](../../../research/reports/move-latency-zero-reset-2026-10-10/README.md)

- [Phalanx XXV easy-level candidate for a lower reference](flybench.md)

- [Nova hosted 500 preset and calibration caveat](flybench.md)

- [Nova v3b raw-policy FlyBench integration and scale caveat](flybench.md#2026-10-10-nova-raw-policy-integration)

- [Exact WASM accumulation candidate and matched full-move timing](../../../research/reports/move-latency-wasm-2026-10-10/README.md)

## 2026-10-11: Replacement Stockfish-only calibration proposal

[Fresh local reference-pool proposal](stockfish-only-calibration-proposal.md): excludes the original 13 games and flawed seed-48 continuation; proposes measured Stockfish/error-policy references, separate player/RNG identities, 10 placement plus 40 scoring games, joint W/D/L fitting and pair-aware uncertainty. Proposal only; native-only evaluation may supply bounds rather than a finite rating.

- [Current training latency investigation](training-latency.md).
- [Accepted latency result and stopping point](../../../research/reports/training-latency-2026-10-19/accepted-result.md).
