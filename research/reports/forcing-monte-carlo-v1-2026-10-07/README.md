# Forcing-candidate Monte Carlo run

This run used opt-in `candidateMode: "forcing"` in the seeded serial PUCT search on the smothered-mate development fixture. It used the same two-position-evaluation limit as the all-legal profile, a 16-candidate cap, four reserved quiet moves, seed 14009, 50% presentation pacing, and the same fresh naive memory. Search did not update memory or fixed model parameters.

The tree expanded 32 candidate-action cues across two positions: 16 of 32 legal moves at the root, then all 16 replies at the child. The shortlist included `c4g8`, tagged as check, double attack and newly created attacks. Search selected `c4b4`; independent bounded verification classified that choice as failure. The search completed one simulation and stopped at its two-evaluation limit. Peak RSS was 109.42 MiB; process CPU was 13.44 seconds; end-to-end time was 24.89 seconds.

This run alone is not a timing comparison. The chronological comparison is summarized in the later [v3 all-legal report](../forcing-monte-carlo-v3-2026-10-07/README.md), with the [repeated forcing run](../forcing-monte-carlo-v2-2026-10-07/README.md) and the earlier all-legal [baseline profile](../monte-carlo-neural-profile-v2-2026-10-07/README.md). Across two runs per mode, forcing used one-third fewer candidate cues and had lower median time, but all four choices remained the same verified failure. This does not show better move quality, neural learning, puzzle transfer or reasoning.

The raw `report.json` pins graph, annotations, model, memory, encoder, protocol, source and dependency identities. `COMPLETE` binds the report hash. Exact command:

```powershell
node --max-old-space-size=256 .codebase/scripts/evaluation-and-performance/profile-forcing-monte-carlo.mjs --candidate-mode forcing --out research/reports/forcing-monte-carlo-v1-2026-10-07
```
