# neuron-reader build, 2026-10-31

The pure sampler, explicit fixed-score evaluator and streamed Eyes candidate path are implemented. Ten focused software checks and the 14-cell static identity check pass. Final repository regression: **741 pass, six existing historical-path failures of 747**, exit 1; no tests skipped. The failure names exactly match the earlier recorded six. No biological scoring contract is shipped, no production chooser is enabled, and no full-graph neural propagation or chess-learning experiment ran. [Machine-readable verification](verification.json).

## What was built

- [neuron-reader.mjs](../../../.codebase/src/neural-learning/neuron-reader.mjs): `readNeurons` copies exact endpoint activities and type means; `scoreNeurons` requires a complete reviewed evidence/compatibility contract and refuses missing/all-zero/mismatched contracts. It rechecks aggregate consistency and labels candidate preference separately from position value. A citation field or a hash is not proof that a biological claim is correct.
- [neuron-reader-cells.json](../../../.codebase/src/neural-learning/neuron-reader-cells.json): pinned released-graph roster, exact root-ID/index/type/side joins and both curated and predicted transmitter labels. Root IDs remain strings. No sign is inferred from neurotransmitter identity.
- [record-neuron-candidates.mjs](../../../.codebase/src/puzzle-learning/record-neuron-candidates.mjs): a bounded async generator using the existing Eyes renderer and rate simulator. It supplies zero transient starts, copies endpoint values, checks declared full persistent state and board/history, and streams identity-bound candidate receipts plus a final completion receipt. Failure never yields a completion record or silently restores memory. Resource guards and pacing are required caller inputs.
- [Static checker](../../../.codebase/scripts/neural-learning/check-neuron-reader.mjs): verifies input/source hashes, the actual sparse graph, every selected root ID and annotation row; creates no model and propagates no activity. It refuses an existing output directory.

## Evidence and scope

The [focused sampler/score checks](../../../.codebase/tests/neural-learning/neuron-reader.test.mjs) and [candidate-path checks](../../../.codebase/tests/puzzle-learning/record-neuron-candidates.test.mjs) use an explicitly synthetic 17-cell graph for inference. They check sampling, independent copied outputs, type-mean pooling, malformed/identity-mismatched inputs, score-contract handling, order invariance and mutations to gains, traces, slow state, clocks, pending receipts and neural parameters. They are software evidence, not biological learning or a useful full-connectome signal.

- [Initial focused failure](initial-focused-failure.txt): six pass, four fail due to a null-value fingerprint bug. [First correction check](focused-tests.txt) is also preserved.
- [Final focused check](focused-tests-final.txt): ten pass, zero fail, including changed live simulator settings. Arbitrary scoring signs are confined to a synthetic fixture.
- [Final static check](static-check-final/result.json): all 14 cells, annotations and pinned graph/input hashes match. [Earlier static revision](static-check/result.json) remains preserved. RSS is an observed snapshot, not a measured peak or performance comparison.
- [Final repository regression](npm-test-final.txt): 741/747 pass, six failures. [First complete regression](npm-test.txt) has the same counts. [Historical comparison](historical-failure-comparison.json) confirms the same six failure names in an earlier recorded run; final matching is checked in [verification.json](verification.json).
- [Runtime-identity gap reproduction](runtime-identity-before-fix.txt): a numerical fixture changed a live simulator field without changing declared config. Preserved for the correction and follow-up checks.

The score function is usable only with an externally reviewed, identity-matched contract. The code validates its structure and binding; it cannot independently prove the source interpretation or causal memory compatibility. No such production contract was selected. The sampling/candidate path can be used for separately authorized diagnostic work without selecting biological scoring signs.

`persistentState()` must expose the complete state owned by the eventual memory implementation, including slow/trace/clock/pending state. The candidate path additionally hashes graph/parameters, configuration, signed weights, gradients and optimizer state. A callback that omits physiological state is not made complete by passing these tests; its coverage requires review when integrating that mechanism.

The six repository failures reference the legacy cue mapping, Stage 1 registration, plasticity-assay protocol/anatomy CLI and six-neuron history fixture paths. These predate this build and reference artifacts moved to the archive. They were not repaired by copying old evidence back or editing unrelated tests. This is not a wholly green repository. See the exact names and prior raw-log reference in the historical comparison.

[Source manifest and seven byte-identical snapshots](source-manifest.json) preserve the built module/roster/recorder/checker and focused test sources. Final verification checks both current files and snapshots against those hashes, and checks every source hash in the final static result. [Protected source hashes](protected-source-hashes.json) confirm unchanged bytes for mushroom-body, reversal-memory, alpha-lobe-memory and Eyes v1. No other owned memory/evidence file was edited. Biological source interpretation and memory compatibility remain open; choice-policy PRNG/temperature/tie integration is deferred until an approved production scoring contract exists.

## Reproduce software checks

```powershell
node --max-old-space-size=256 --test --test-concurrency=1 .codebase/tests/neural-learning/neuron-reader.test.mjs .codebase/tests/puzzle-learning/record-neuron-candidates.test.mjs
```

The [dedicated design/interface](../../../documentation/design/neural-learning/neuron-reader.md) documents the manifest and score-contract shapes, candidate generator and static command. [Mistakes and corrections](../../journal/experiments/2026-10-31-neuron-reader-build.md) are recorded with their evidence. Frozen legacy readers and the other session's memory/evidence files remain outside the edit scope. No dependencies or package-script changes were needed.
