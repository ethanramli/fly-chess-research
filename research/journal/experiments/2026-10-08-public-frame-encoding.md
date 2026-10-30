# Public frame endpoint encoder

2026-10-08. Added a separate answer-free public frame encoder because existing candidate encoders require legal actions and cannot express terminal endpoints. Absolute occupancy/history/action projection is an explicit engineering choice; do not imply symmetry-invariant reasoning. Kept original encoders and prior reports untouched.

The initial preflight used the wrong report level for the historical mapping and failed closed; inspecting `.mapping` corrected the invocation. Successful reproducible preflight: failure/success changed-blocker contexts produce different root cues, with zero collisions/drops in all six frames on the 693-cell pool. Synthetic terminal-board and forged-input tests pass; full suite174/174. No graph training.

See [report, command and raw evidence](../../../archive/early-development/research/reports/public-frame-encoding-preflight-2026-10-08/README.md). Delayed physiological credit, reversible learning, pre-feedback ranking, persistent publication and causal controls remain incomplete. Goal active.
