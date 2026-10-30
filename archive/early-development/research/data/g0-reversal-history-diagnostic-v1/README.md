# G0 reversal history diagnostic v1

2026-10-13. [Frozen protocol](protocol.json) implements the [paired history diagnostic](../../../documentation/design/neural-learning/g0-reversal-history-diagnostic.md). One projection, retained/reset memory intervention and three fixed shuffled histories diagnose the replay-verified G0 reversal failure. This study cannot pass G0 or authorize C01.

31 source/data files, runtime dependencies, original failure and completed fixture audit/recovery evidence are pinned. Released graph endpoint/sign/root/annotation checks passed for 122 plastic edges and six readout cells. Model, memory mechanism, timing, encoder, readout and original thresholds are unchanged. Full-memory reset is an explicit causal intervention, not biological forgetting or a proposed mainline repair.

```powershell
node --max-old-space-size=256 .codebase/scripts/neural-learning/run-g0-reversal-history-diagnostic.mjs --protocol research/data/g0-reversal-history-diagnostic-v1/protocol.json --out runs/g0-reversal-history-diagnostic-v1 --cpu-duty 0.5
node --max-old-space-size=256 .codebase/scripts/neural-learning/audit-g0-reversal-history-diagnostic.mjs runs/g0-reversal-history-diagnostic-v1 --cpu-duty 0.5
```

Graph execution and its results are recorded in [current status](../../../documentation/current-status.md) and the [dated journal](../../journal/experiments/2026-10-11-curriculum-g0-receiver.md). Resume only a complete published checkpoint into a fresh directory under identical pins; preserve pending receipts and every prior invocation. Keep logs outside the runner-owned output directory. Full recurrence/branch audit is required before interpretation.


Supplementary audit after the frozen auditor encountered host-memory guard interruptions: [resource-wait replay package](../g0-reversal-history-audit-wait-v1/README.md). This preserves this diagnostic protocol and result unchanged.
