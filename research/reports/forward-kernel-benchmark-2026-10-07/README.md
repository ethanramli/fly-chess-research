# Sparse forward kernel benchmark

Completed 2026-10-07T02:31:20.233Z.

Interleaved A/B/C comparison on the same frozen brain state and saved teaching stimulation. Production kernel versus local-array-hoisted kernel versus precomputed signed edge magnitudes. Each candidate exactly matches production predictions and every recurrent activity buffer on every sample. No learner source is changed and no update is applied.

Follow-up: the precomputed signed-edge-magnitude kernel was adopted as a derived cache in `SparseTrainer`. Internal neural-memory, reversal-memory, circuit restore/step and Adam magnitude updates maintain it. The exact end-to-end cycle passed equivalence checks, as recorded in [the matched iteration profile](../learning-iteration-profile-signed-weights-2026-10-07/README.md). External code that mutates `params.magnitude` directly must call `setMagnitude` or `refreshSignedMagnitude` before inference.

This measured result is limited to one fixture and does not establish a full-run or Monte Carlo speedup.

See `report.json` for raw samples, exact-equivalence checks, memory cost and pinned identities.
