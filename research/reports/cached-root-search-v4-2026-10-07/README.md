# Cached root assessment in an all-legal Monte Carlo search

Completed and independently audited 2026-10-07. [Frozen protocol](../../data/cached-root-search-v4/README.md); audit and report hashes bind in `AUDITED.json`.

| Measure | Uncached | Cached root |
|---|---:|---:|
| Fresh assessment plus same-root two-evaluation search | 37.42 s | 27.32 s |
| Search stage only | 15.52 s | 5.42 s |
| Neural presentations | 112 | 80 |
| CPU seconds | 19.69 | 14.20 |
| Peak RSS | 109.52 MiB | 117.63 MiB |
| Verified selected move | failure | same failure |

Caching avoids32 of112 presentations and reduces this repeated assessment/search sequence by27.0%. The search phase drops65.0% because it no longer recomputes the root's32 candidates; its child assessment remains fresh. Shared setup was0.48s. A fresh repeatability assessment always runs before cache reuse. Both fresh panels and full Monte Carlo traces have exact policy parity, all32 root legal moves are included, the selected move has an independently checked failure certificate, fixed parameters and learned memory remain identical, and one exact cache hit occurs at the search root. Independent audit passes root coverage, receipts/memory and consequence certificates.

This speeds one assessment-to-search sequence. It does not improve the move, create a new neural learning event or demonstrate transfer. Both modes miss the puzzle. Wider matched time-to-quality testing is still needed to establish faster training. The cache cannot replace fresh neural activity in reset, retention or repeatability gates.

All120 software tests pass, including fresh-assessment-then-cache-hit. Heap256/duty0.5 and configured memory guards were active. Peak RSS is invocation high-water. Sequential one-board timings are engineering measurements, not an across-hardware guarantee.

Historical v1/v2/v3 setup failures and invalid runner/protocol-path output are preserved in neighboring dated paths. Those rows are explicitly excluded; the v4 source/protocol hash checks pass.
