# G0 reversal history replication v1 (projection seed 20261012)

2026-10-20. [Frozen protocol](protocol.json) replicates the audited retained-versus-reset diagnostic on the second predetermined effective projection seed. The first seed's diagnostic and its independent audit are preserved unchanged; this package adds no new mechanism, gate or threshold.

The [completed diagnostic](../g0-reversal-history-diagnostic-v1/README.md) found that complete-memory reset passes the original reversal thresholds on seed 20261011 while retained memory fails, with a recorded shuffle-seed limitation. This replication asks whether that branch pattern reproduces on seed 20261012. Schedule, model, memory, timing, encoder, readout, three pre-frozen shuffle seeds, conditions, exposure and gates are identical; only the projection seed differs. The plan module is a separate copy so the original pinned source stays unchanged.

```powershell
node --max-old-space-size=256 .codebase/scripts/neural-learning/run-g0-reversal-history-replication.mjs --protocol research/data/g0-reversal-history-replication-v1/protocol.json --out runs/g0-history-replication-20261012-v1 --cpu-duty 0.5
node --max-old-space-size=256 research/data/g0-reversal-history-replication-v1/audit.mjs runs/g0-history-replication-20261012-v1 --cpu-duty 0.5
```

This is synthetic neutral association and a one-projection causal intervention. It cannot pass G0 or authorize C01, and it does not identify a memory component, biological forgetting, chess learning or reasoning. Predeclared interpretation: the same branch pattern (reset passes, retained fails) supports a replicable history-dependent limitation for this configuration; a different pattern limits the generalisation and must be reported as such. No branch result is selected after inspection.
