# Portable runtime: canonical neural-state hashing

Scope: offline state-hash component only, measured alongside the live curriculum audit. No overall training speed result or runtime adoption.

Installed Node22.23.2 uses V8 12.4.254.21-node.56. [V8's implementation account](https://v8.dev/blog/json-stringify) documents faster JSON conversion from V8 13.8, including Dragonbox number conversion. The portable [registered Node26.12.0 runtime](../../../data/training-latency-runtime-v1/runtime.json) uses V8 14.6.202.34-node.39. Its official binary hash and license are preserved; PATH, default runtime and queued v3 pins are unchanged.

## Component measurements

Six pinned134209-neuron checkpoint arrays; one warmup and seven timed hashes in each runtime,84 timed hashes total. Runtime order alternates by input. The operation is exactly SHA256(JSON.stringify([...Float32State])), including array expansion. All six canonical JSON byte streams match literally across runtimes. Raw samples, commands and input/runtime/source identities: [protocol](protocol.json), [report](report.json), and per-input files in this directory.

| Checkpoint | Current median | Candidate median | Reduction |
|---|---:|---:|---:|
|22000|64.38ms|47.06ms|26.90%|
|22001|78.31ms|35.15ms|55.11%|
|25000|82.99ms|42.48ms|48.82%|
|25001|79.32ms|63.01ms|20.56%|
|28300|87.59ms|32.49ms|62.91%|
|28301|64.71ms|31.99ms|50.56%|

Median of six paired reductions: **49.69%**. Observed peak RSS94.98MiB. Concurrent timings vary substantially; these medians neither predict an overall training percentage nor establish stable tail latency. Never add this percentage to the checkpoint publication percentage.

## Compatibility evidence

- Node26 actual trainer/gradient/accumulator/codec/fresh-process recovery fixtures:9/9, no skips; [raw output](../../../../runs/python-actions/20261019T044042-c8f57b46/stdout.txt).
- Node26 actual v3 pipeline functions on seven archived six-neuron paired lessons:1/1, no skips;294 presentations, historical receipts and final states exact, with independent publication decoding/corruption rejection; [raw output](../../../../runs/python-actions/20261019T044050-7d1c0dac/stdout.txt).
- Current Node22 metadata bridge parses a real full-state checkpoint encoded by Node26: [commands and raw reader output](native-reader-compatibility.json). This proves parsing compatibility on that sample; it is not a full-graph cross-runtime recovery result.

Node26's default test output uses the spec reporter, so the Python TAP counter returned an empty count object despite successful tests. The raw logs above contain their counts. The separate [runtime check configuration](../../../../python%20actions/latency-runtime-checks.json) now explicitly selects TAP for future checks; existing logs/config snapshots remain preserved.

An initial repeated-value inspection found roughly88–90% distinct numbers in these states, which weakened the proposed repeated-number string cache. [Evidence](../neural-value-inspection.json); no cache was implemented.

Next: obtain the queued Node22 complete-lesson comparison and independent audit first. If another candidate is needed to meet the whole-pipeline target, register a direct current-Node22/JSON versus Node26/native comparison with unchanged model code, counterbalanced process order, cold/setup accounting and exact historical feedback/state checks. Full-graph arithmetic and adoption remain unverified. No scientific gate advanced.
