# Memory ablation: causal replay after failed choices

2026-10-05. Diagnostic interventions only; no learning rule is changed.

The [overlapping board/action association](../chess-input/board-action-association.md) failed acquisition and reversal choices despite causal response changes. Shared directly stimulated KCs were one possible source of interference. This [frozen replay specification](../../../research/data/chess-memory-ablation-v1/protocol.json) tests whether removing their *stored efficacy changes after training* rescues choice. It does not test what would happen if common-cell activation or plasticity were absent during acquisition.

Each original informative seed's acquisition and reversal state is replayed under five interventions: all saved efficacy; only action-unique cells' changes; only shared cells' changes; only other cells' changes; and naive memory. Categories depend solely on presynaptic KC membership in the original directly stimulated A/B sets, not outcomes. Existing plastic edges may share a KC, so mask counts refer to edges. Other KCs can be activated recurrently; membership does not claim to classify natural sensory representations or all active cells.

Interventions restore saved gains in selected categories and reset the remainder to 1. They preserve identities/topology/signs and every nonplastic parameter. Event metadata remains from the source snapshot except naive memory, which has zero events. These are artificial causal resets, not teacher feedback, natural forgetting, a biological eligibility mechanism or trained checkpoints for deployment. No gradients, new rewards or `memory.observe` calls run. Do not turn an intervention mask into a plasticity rule without independent mechanistic evidence.

The original GF calibration and clipped decoder stay fixed; all raw/signed signals and MBON diagnostics remain available. Every all-memory and naive-memory replay must reproduce original responses exactly. Each completed intervention has an atomic checkpoint and immutable input/source/model/mapping/calibration identity. The sparse serial driver uses heap 256, RSS/free-memory guards and duty pacing; resume requires a new directory and matching identities.

```powershell
node --max-old-space-size=256 .codebase/scripts/ablate-chess-memory.mjs --out research/reports/chess-memory-ablation-v1-2026-10-05 --cpu-duty 0.5
```

Completed [raw result and independent mask audit](../../../research/reports/chess-memory-ablation-v1-2026-10-05/README.md): 60 interventions, 120 read-only cue presentations. **No intervention changes a decoded choice in either phase for any seed.** Every subset and naive control remains 3/6 correct per phase. All/naive responses match exactly; every gain-reset mask and readout computation audits correctly. One resumed intervention reproduces its original record exactly. All 46 existing tests pass.

This rejects a rescue by these specific post-training shared-state resets, not every causal role of overlap. Shared activation during learning may already have affected other stored states. The intervention does not establish why the GF preference remains fixed, which upstream pathway needs repair, or whether another encoder/physiology would learn. The original failed gates remain unchanged. Further sensitivity tests must distinguish available memory-to-GF control from the changes actually produced by the learning rule, with source-supported physiological predictions before enabling verified puzzle learning.

2026-10-06 follow-up review: [fixed unilateral efficacy-floor profiles](efficacy-floor.md) also produce no clipped or signed choice changes. Thirty-two profiles have nonempty masks; four empty masks are explicitly controls rather than evidence of intervention. This narrows the tested sensitivity, but cannot establish universal lack of control or justify changing a learning rule. The complete objective remains unsatisfied.
