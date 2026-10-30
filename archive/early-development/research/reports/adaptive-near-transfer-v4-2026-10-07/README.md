# Adaptive near-transfer v4

Completed 2026-10-07 under the frozen [protocol](../../data/adaptive-near-transfer-v4/README.md). The run evaluates the four saved memories from the audited one-puzzle acquisition on five certified, unseen positions from the same smothered-mate motif. It sends no feedback and does not change memory.

The informative memory ranked a certified successful move higher than every matched control on all five positions, but still chose a certified failure on every position:

| Unseen development position | Informative success rank | Absent | Shuffled | Disabled | Informative top move |
|---|---:|---:|---:|---:|---|
| Queen b3, rook e8 | 24/30 | 30/30 | 30/30 | 30/30 | `a1b2` (failure) |
| Queen b3, rook f8 | 27/30 | 30/30 | 30/30 | 30/30 | `b3d1` (failure) |
| Queen d5, rook e8 | 16/34 | 34/34 | 34/34 | 34/34 | `a1a2` (failure) |
| Queen d5, rook f8 | 2/34 | 28/34 | 32/34 | 28/34 | `a1b2` (failure) |
| Queen e6, rook f8 | 17/31 | 30/31 | 30/31 | 30/31 | `a1b2` (failure) |

This is a consistent **relative-rank shift** from the learned memory on one trained fixture. It is not successful move selection. The sample is one learned memory and five related positions from one motif; it does not establish unfamiliar-family or counterfactual reasoning, strategic evaluation, robust learning, or a calibrated strength gain. The already inspected support-shift counterfactual still fails.

The main run completed 20 panels and 636 candidate presentations in 284.33 s wall time, 143.94 s CPU, and 119.55 MiB peak RSS at duty 0.5. No feedback events occurred and all panel memories remained unchanged. The [audit](audit.json) and [completion marker](AUDITED.json) bind the report/protocol hashes; the corrective audit passed 20 panels, 636 legal candidates, and 636 consequence-certificate checks. The audit validates saved neural outputs and certificates; it does not independently rerun neural evocations.

## Preserved execution history

The initial v1-v3 launches stopped during setup/certificate parsing before candidate panels or teaching; their exact protocols, runner sources and failure notes are preserved in their dated report directories. The v4 graph evaluation completed. Its first auditor attempt failed before publication because of a certificate-hash field-path mistake; that source and failure note are preserved, and the separately pinned [audit-correction protocol](../../data/adaptive-near-transfer-v4-audit-correction-v1/README.md) produced the passing audit without changing the raw report or frozen v4 protocol.
