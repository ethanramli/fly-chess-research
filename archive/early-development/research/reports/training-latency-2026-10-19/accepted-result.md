## 2026-10-19 repeatability update

Three newly authorized exact repetitions independently passed, returning **58.1%,59.9%,59.5% less selected-lesson time** (mean59.2%). The historical69.1% below did not reproduce within the predeclared band. See [complete results](repeatability-v1/README.md). The new runs used the RAM-upgraded environment; implementation and runtime binaries were unchanged. The default curriculum config was not edited/launched; its paused flag was false on inspection, correcting earlier prose below.

# Accepted training latency result

2026-10-19: the researcher accepts this result, ends the search for further gains and requests removal of unused experimental code. The earlier greater-than83% target is withdrawn. No additional benchmark or simulation is authorized by this closeout.

| Matched measurement | Original | Retained setup | Less elapsed time |
|---|---:|---:|---:|
| 24 selected complete lessons, pooled across two rounds |913.802s|282.127s|69.126%|
| Complete cold benchmark processes, pooled |987.220s|327.700s|66.806%|

This is approximately3.24 times the throughput on the selected lessons. It is not a measured whole-curriculum reduction or a cross-machine comparison with another model. Round-specific lesson reductions were51.56% and75.58%; host variation remains unresolved.

## Retained setup

- Original sparse trainer and accumulator; unchanged graph, arithmetic, precision, feedback and learning.
- Portable Node26.12.0 / V8 14.6.202.34-node.39 at `.cache/latency-runtimes/v26.12.0/node.exe`, binary SHA256 `1a14457b043fe82fd2fc027959595e91d138a8185c7ca6c02c15c16632b51aa4`.
- [Native checkpoint codec](../../../.codebase/src/runtime/checkpoint-codec.mjs): lossless typed state, V8 serialization, level1 Zstandard, checksum, output limits and compatibility reader. Receipt and physiological identities remain unchanged.
- Heap256MiB, requested duty0.5, RSS768MiB and free-memory256MiB guards. Both synchronized pending/acknowledged publications remain.
- [Frozen registration](../../data/training-latency-runtime-comparison-v2/protocol.json), [independent audit](runtime-comparison-v2/timing-audit.json), and original raw reports/receipts/source archives.

The independent audit passed integrity and timing gates:2184 publications,1092 matched checkpoint pairs and546 historical receipt instances. The old failed42.2% comparison and later regressions remain preserved. Production curriculum source/configuration was not switched to an experimental engine or new checkpoint schema; its owner configuration remains paused. This stopping point accepts the measured benchmark implementation, without claiming that every runner now uses it.

## Pruned candidates

[Archive and SHA256 manifest](../../source-archives/training-latency-abandoned-2026-10-19/README.md) preserve65 exact files removed from active source/actions/tests/design navigation. These include JS and compiled dependency reuse, related observers/profilers, and the withdrawn derived-checkpoint prototype. Both reuse implementations failed timing gates; the derived prototype had bounded software/recovery checks but no graph timing. They are not part of the retained setup.

The255-test suite and9 derived-candidate checks passed before pruning. Closeout validation checks archive bytes, winning source/runtime hashes, remaining local imports and edited navigation links. No new simulation or performance result is produced by cleanup.
