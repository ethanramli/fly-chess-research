# Repeated all-legal Monte Carlo comparison

This all-legal run used the same smothered-mate development fixture, seed, fresh naive memory, PUCT settings and two-position-evaluation limit as the forcing-mode runs. It generated 48 candidate cues (32 at root and 16 at the child), selected `c4b4`, and independently verified failure. It completed in 39.82 seconds with 20.77 process CPU seconds and 108.92 MiB peak RSS. Memory and fixed neural parameters remained unchanged.

## Repeated mode comparison

The chronological sequence was all-legal baseline, forcing v1, forcing v2, all-legal v3. Each run was a fresh process with the same model/fixture/settings and no feedback. Across two runs per mode:

| Measure | All-legal | Forcing | Difference |
|---|---:|---:|---:|
| Candidate cues across two runs | 96 | 64 | 33.3% fewer with forcing |
| Median end-to-end runtime | 32.11 s | 25.54 s | 20.5% lower with forcing |
| Median process CPU | 17.44 s | 13.70 s | 21.4% lower with forcing |
| Search choice | `c4b4` in both | `c4b4` in both | No choice change |
| Verified choice consequence | Failure | Failure | No quality gain |

This is preliminary engineering evidence from one puzzle, two repetitions per mode and separate processes. Timing varied substantially between all-legal runs; the first all-legal profile predates the explicit candidate-mode option, whose default path remains all-legal. The result supports testing forcing selection as a way to spend less neural-search compute while preserving a known successful root candidate on this fixture. It does **not** establish better decisions, learned value, a puzzle-learning round or transfer. The network still prefers a verified failure over `c4g8`.

Exact command:

```powershell
node --max-old-space-size=256 .codebase/scripts/evaluation-and-performance/profile-forcing-monte-carlo.mjs --candidate-mode all-legal --out research/reports/forcing-monte-carlo-v3-2026-10-07
```

Raw `report.json` pins the graph, model, memory, encoder, source and dependency identities. `COMPLETE` binds its report hash. The paired forcing reports are [v1](../forcing-monte-carlo-v1-2026-10-07/README.md) and [v2](../forcing-monte-carlo-v2-2026-10-07/README.md); the earlier all-legal profile is [here](../monte-carlo-neural-profile-v2-2026-10-07/README.md).
