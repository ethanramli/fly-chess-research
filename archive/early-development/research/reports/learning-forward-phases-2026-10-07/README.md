# Sparse forward phase profile

Completed 2026-10-07T02:30:12.434Z.

Diagnostic-only decomposition of the same serial sparse recurrent forward pass used for the frozen first feedback receipt. The hand-instrumented copy is checked against the production method on every sample, including every activity buffer. No learner source is changed and no learning update is applied.

The large share of time falls in the recurrent sparse-edge pass; the phase timings identify whether static per-neuron coefficients or edge traversal are the next optimization target. The hand-instrumented pass exactly matches the production pass for all sampled output and activity arrays.

No performance improvement is claimed; see `report.json` for raw measurements and pinned identities.
