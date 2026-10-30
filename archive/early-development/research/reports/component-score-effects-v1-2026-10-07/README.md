# Component score effects

[Hash-bound reanalysis](report.json) of the audited component probe finds distinct neural score records despite identical failing choices/ranks. Static inspection confirms memory restoration calls `setMagnitude`, refreshing both magnitudes and signed forward weights; each forward pass clears initial activity. This is not an independent neural replay or exhaustive implementation proof.

| Memory | Best-success minus best-failure score |
|---|---:|
| Before | +0.00009788 |
| Full punishment | -0.00350395 |
| Decreases only | -0.00078544 |
| Increases only | -0.00235052 |

The original acquisition crossed the boundary by a narrow margin. Gain decreases lower the solution score, while increases raise both solution and strongest failure, with the failure rising more. Both components are sufficient to lose choice in this intervention. This motivates a separately registered multi-context stability experiment; it does not establish more training will cure interference or transfer.

[Script](../../../.codebase/scripts/puzzle-learning/diagnose-component-score-effects.mjs). No graph simulation or feedback occurred in this reanalysis.
