# Shared Wasm storage candidate v2

Status: isolated implementation and bounded equivalence checks passed; full-graph timing and production adoption pending.

The trainer owns signed weights, input drive and all retained recurrent histories directly in fixed-size WebAssembly memory. The unchanged serial kernel reads owned history pointers. Topology is still copied/validated each forward, so external graph edits remain visible. Arbitrary external inputs retain the scratch-copy fallback, including inputs aliasing the result buffer. No cache, new dependency, worker or numerical approximation.

For the registered float32 eight-step model, this removes payload copies of **4E + 36N bytes per forward**, while retaining topology copies of **4E + 4N + 4 bytes**. Construction of the drive from bias remains necessary. This is byte accounting, not a speed measurement. All nine histories and eight activities remain available to teaching and derivatives. Buffer ownership can reduce duplicated allocations; actual peak RSS still needs measurement.

[Source/candidate manifest](source-manifest.json) · [Candidate trainer](candidate-trainer.mjs) · [Candidate accumulator](candidate-accumulator.mjs) · [Registered external motivation](../../../literature/training-latency-techniques-2026-10-19.md)

Original source bytes are preserved in oracle files. The oracle trainer is an archival copy; comparisons import the pinned production trainer and assert its hash. Literal Wasm kernel bytes match the oracle. Production files and the queued v3 runner/codec/registration/checker remain unchanged.

## Bounded verification

| Check | Result | Raw output |
|---|---|---|
| Direct oracle comparison, float32/float64, 1/8/40 steps, all states/activities/gradients, SGD, actual Adam and loadCheckpoint, copy counts, malformed CSR and external/result aliases | 5/5, no skips | [log](../../../../runs/python-actions/20261019T041941-cbea045f/stdout.txt) |
| Existing trainer, accumulator, temporal session and pending-checkpoint fixtures under a test-only candidate loader | 10/10, no skips | [log](../../../../runs/python-actions/20261019T041955-4c9d3577/stdout.txt) |
| Actual v3 pipeline functions with the candidate on the archived six-neuron dataset: seven lesson pairs/all six arms/both informative valences; 294 presentations, original receipts and final states exact; independent publication decoding and corruption rejection | 1/1, no skips | [log](../../../../runs/python-actions/20261019T042100-4a118ce7/stdout.txt) |

The existing checkpoint fixture spawns its fresh resume child without propagating the test loader. That check establishes candidate-produced checkpoints can resume with the original trainer; it is not evidence that the resume child used the candidate. Direct loadCheckpoint tests above use the candidate. Candidate-only fresh-process temporal recovery and an unfiltered serial regression remain adoption requirements.

These are small software fixtures with no full connectome loaded. Their test durations are not a training speed comparison. The first v1 candidate imposed an unjustified 33-history cap; it was rejected before testing and remains preserved. V2 retains the original allocation bound without confusing episode frames with recurrent steps.

## Commands and next measurement

Use the separate [Python check configuration](../../../../python%20actions/shared-wasm-checks.json), whose paused flag prevents graph launches and does not pause the active optimization goal:

```powershell
.\fly.cmd --config 'python actions/shared-wasm-checks.json' run equivalence
.\fly.cmd --config 'python actions/shared-wasm-checks.json' run candidate-fixtures
.\fly.cmd --config 'python actions/shared-wasm-checks.json' run candidate-lessons
```

The researcher's latest direction is to quantify actual training improvement. Let the existing audit finish and obtain the already frozen v3 matched timings first. Use their phase attribution to decide whether a new separately registered combined codec/storage candidate is worthwhile. Do not edit the queued v3 pins or claim the checkpoint component gain is an overall repository gain. Any combined comparison must preserve original controls, complete teaching work, CPU pacing, resource/recovery guards and independently identical physiology/receipts.

## Candidate-only fresh-process recovery addendum

The previously stated child-coverage gap is now closed by [the test-only propagation wrapper](candidate-recovery.test.mjs): candidate-recovery2/2, no skips ([raw output](../../../../runs/python-actions/20261019T042754-aa404026/stdout.txt)). It asserts parent module identity and propagates the candidate loader through inherited NODE_OPTIONS to both fresh resume children. Both publication boundaries preserve exactly-once acknowledgement and subsequent receipt/memory equality. The earlier unpropagated run remains candidate-to-original interoperability evidence. Unfiltered serial regression, matched graph timing and adoption are still pending.
