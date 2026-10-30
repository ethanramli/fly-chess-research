# Compiled exact classification candidate v2

2026-10-19: software gates pass; graph timing/adoption pending.

The [previous prototype](../exact-frame-reuse-v1/README.md) preserved exact
trajectories but its independently audited ablation was3.42% slower overall.
Its JavaScript dependency checks cancelled the saved accumulation work.
Original files and all failed results remain preserved.

V2 moves topology, weight-bit and dependency comparisons into WebAssembly.
The original per-row scalar sums, activation, retained histories and plasticity
remain. Drive/alpha/saturation row flags are prepared once per forward.
The compiled classifier supplies masks directly to the selective accumulator;
previous-state scratch is not recopied or masks reinitialized for that call.
Reference copies and bounded canonical scratch are counted. Mixed history
dtypes use the original full computation. No SIMD, approximation or dependency
was added.

## Completed software evidence

| Check | Pass | Raw log directory under `runs/python-actions/` |
|---|---:|---|
| Direct original comparison, Float32/Float64,1/8/40 steps, histories/gradients/SGD, mutations, actual reuse, clear/bounded fallback |3/3|20261019T084526-39024a82|
| `npm test` |255/255|20261019T084550-5d97705b|
| Existing trainer and temporal-session fixtures under the candidate loader |8/8|20261019T084923-33ca0ee6|
| Actual seven paired feedback lessons,294 presentations, native/legacy publications and archived receipts |1/1|20261019T084931-ed51f433|
| Candidate-only fresh-process pending/acknowledged recovery |2/2|20261019T085116-ea7d5e60|

[Source manifest](source-manifest.json) · [Check configuration](../../../../python%20actions/exact-frame-reuse-wasm-checks-v2.json)

## Next measurement

[Registered ablation](../../../data/wasm-reuse-latency-v2/protocol.json) compares
four fresh serial ABBA batches on the same Node26/native checkpoint path.
The selected12 early-acquisition lessons per process are an intermediate
candidate test, not an entire curriculum timing. Both publications, original
feedback/control work, hashing and duty0.5 remain; heap256MiB,
RSS768MiB/free256MiB guards apply. Independent decoding compares all2184
publications. The>5% pooled/cold/no>5% arm-regression selection gate is unchanged
from v1 and does not replace the researcher's current>83% full-workload target.

No tests, bulk analysis or competing graph work during timing. Follow the
[current handoff](../../../../documentation/handoffs/training-latency-state.md)
for the actual driver/handle; a timeout is not termination and never authorizes
a duplicate launch. Complete-workload comparison and adoption remain required.
