# Independent latency evidence audit v1

Audits [training latency v3](../training-latency-v3/README.md) after the exclusive comparison finishes. Uses its own gzip/native decoding implementation, without importing the candidate codec. Checks all2100 pending/acknowledged publications, signed-zero-sensitive state equality, unchanged physiology during acknowledgement, every historical receipt prefix, exact work counts, raw sample coverage, source identities and independent timing-gate arithmetic.

Checks the two warmup cases as well as all48 measured cases. Recomputes each condition's paired median and pooled reduction from raw sample files; never trusts a runner pass flag. A failed speed gate remains a valid negative result if integrity passes. Produces a new atomic `timing-audit.json`; leaves raw reports and checkpoint files unchanged.

The actual pair checker passes on seven archived six-neuron lessons/all controls/both informative outcomes (588 decoded publications), and rejects correctly checksummed altered physiology and changed receipt bytes. This validates audit software only; full-graph audit/timing remains pending.

Heap256MiB, RSS768MiB, free256MiB, CPU duty0.5. Run through the isolated Python step configuration after the graph job exits; the auditor refuses another active experiment. Its [protocol](protocol.json) pins the checker source and training registration.
