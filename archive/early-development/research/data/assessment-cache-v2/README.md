# Assessment cache v2 benchmark

[Protocol](protocol.json) frozen before full-graph execution. One audited development position, 32 legal candidates, current balanced encoder, eight graph updates, unchanged MBON readout and local plasticity. For uncached then cached conditions: restore the same pre-event memory; assess all legal candidates twice; replay the same independently certified event; publish pending receipt and memory atomically; assess all candidates twice after learning; acknowledge the completed condition. Each replay must exactly match the existing published receipt and learned memory. Compare all eight panels and both receipts between modes. This is one workload observation, not learning efficacy or transfer.

```powershell
node --max-old-space-size=256 .codebase/scripts/evaluation-and-performance/benchmark-assessment-cache-v2.mjs
```

Heap256/duty0.5/RSS768MiB/free256MiB; one sparse graph shared serially. Complete source, graph, annotation, dependency, model, encoder, mapping, readout and existing audited memory/report identities are pinned. Cached identities include full fixed-state hash and persistent memory on each call. Per-mode atomic before/pending/acknowledged records preserve receipt evidence; restarting the same benchmark can skip only already acknowledged matching conditions. A pending diagnostic receipt is never imported as a new learned model.

The first [v1 protocol](../assessment-cache-v1/protocol.json) and runner remain preserved: instrumentation attempted to mutate the frozen encoder method and failed before panels or teaching. V2 wraps the encoder without mutation. [Design and fresh-gate limits](../../../documentation/design/evaluation-and-performance/assessment-cache.md). [Output](../../reports/assessment-cache-v2-2026-10-07/README.md).
