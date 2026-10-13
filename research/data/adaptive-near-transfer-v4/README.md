# Adaptive near-transfer v4 protocol

Frozen 2026-10-07. This is a read-only all-legal evaluation of the four saved memories from the audited adaptive contrastive acquisition, across five certified same-motif positions that were not used for neural training. All positions remain training/development examples and are explicitly ineligible for final testing.

The four conditions are the informative learned memory and its saved absent, shuffled, and disabled-plasticity controls. Each condition assesses every legal move from each position with the same graph, encoder, readout, and eight-step neural forward pass. Memory must remain byte-equivalent across each panel. There are no feedback events, updates, external engine calls, or search actions during this evaluation.

The frozen protocol pins the graph, annotations, mapping, acquisition and variation reports/audits, condition memories, chess dependency, and runner/auditor sources. The accepted positions and their all-legal mate certificates come from the audited smothered-variation screen. The v4 launch command is:

```powershell
node --max-old-space-size=256 .codebase/scripts/puzzle-learning/evaluate-adaptive-near-transfer.mjs --protocol research/data/adaptive-near-transfer-v4/protocol.json --out research/reports/adaptive-near-transfer-v4-2026-10-07 --cpu-duty 0.5
```

An interrupted invocation can resume from its latest `state-NNNNN.json` into a new output directory with `--resume PATH_TO_STATE_JSON`. The result requires the separately frozen [audit-correction protocol](../adaptive-near-transfer-v4-audit-correction-v1/README.md), which preserves the first auditor defect and pins the corrected proof/record audit.

**Interpretation ceiling:** the five positions vary queen/rook placement within the same smothered-mate motif. Ranking transfer across these examples is developmental near-generalization, not disjoint-family transfer or reasoning. A correct first move on every position, replicated memories/seeds, broader motifs, and counterfactual support-shift tests are still needed.
