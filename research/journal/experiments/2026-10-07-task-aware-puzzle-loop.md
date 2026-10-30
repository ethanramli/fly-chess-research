# 2026-10-07: task-aware puzzle -> profile -> improve loop

Corrected Monte Carlo search so the declared puzzle horizon reaches each neural candidate assessment. The task-aware smothered development profile selected `c4g8`, an independently verified success, under a forcing structural prior. On a separate support-shift counterfactual, the neural-only prior selected `h5h6`, a verified failure, although it evaluated the known successful `h5e8`. These are two different positions and conditions, not a matched prior experiment. Neither run delivered feedback or changed persistent memory.

Timing identifies full-graph evocation as the dominant cost: 18.04/18.87 seconds in the smothered profile and 45.82/47.70 seconds in the counterfactual profile. Encoding was about 29-31 ms per candidate; 50% duty pacing added about half of active time. The next loop should measure a semantics-preserving sparse-forward optimization with exact output checks and paired time-to-quality, then return to the same puzzle/counterfactual choices. The main scientific gate remains useful learning through verified feedback and persistent neural state.

See [the profile report](../../../archive/early-development/research/reports/task-aware-forcing-profile-2026-10-07/README.md).
