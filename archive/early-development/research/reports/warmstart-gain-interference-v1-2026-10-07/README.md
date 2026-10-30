# Warm-start gain interference diagnostic

Offline exploratory arithmetic on the two informative receipts from the [audited warm-start repair](../adaptive-near-transfer-repair-v2-2026-10-07/README.md). No graph experiment, feedback or parameter changes occurred.

The punishment event changed gains by L1 10.98150; the reward event by L1 1.43496. Across 93 edge-associated entries, opposite movements cancelled 0.10556 of the preceding change: **0.9613%** of its L1 magnitude. During reward, 125 below-unit gains rose, with total recovery 0.52352. These counts are edge entries, not unique neurons.

This weakens a broad immediate punishment-erasure explanation. It does not exclude a small influential subset, recovery of older memory, representation overlap or nonlinear readout effects. Gain arithmetic does not establish which changes caused the observed sibling ranking deterioration. Original-puzzle retention is still unmeasured.

The [raw report](report.json) pins input receipt and diagnostic source hashes. The script verifies contiguous memory snapshots, matching lengths and finite gains. This is not an independent neural replay or causal audit.

Reproduce from the repository root into a fresh output directory by adapting the output constant in a separately saved copy of [.codebase/scripts/puzzle-learning/diagnose-warmstart-gain-interference.mjs](../../../.codebase/scripts/puzzle-learning/diagnose-warmstart-gain-interference.mjs). The original script refuses to overwrite published output.

Next discriminating measurement: evaluate the original trained puzzle under the final memory, then compare bounded diagnostic memory interventions on target and sibling rankings. Artificial interventions must remain diagnostic states, never learned checkpoints.
