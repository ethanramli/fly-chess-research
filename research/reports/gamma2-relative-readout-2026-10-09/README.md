# Baseline-relative readout hypothesis test

## Preregistered question

Does the fixed, label-blind per-action score change expose the verified success that the absolute MBON score misses after selective feedback?

For each legal move, calculate `delta(move) = final absolute MBON score(move) - initial absolute MBON score(move)` on the same position, action cue and fresh model. This formula is fixed before these runs. It uses no labels, fitted coefficient, extra repetition or new parameter update. The plasticity mechanism, encoder, schedule, task and controls are inherited unchanged from the audited adaptive-target protocol.

Two fresh random initializations (seeds 48 and 49) each run informative, fully swapped, absent and disabled-plasticity arms. The predeclared prediction is that informative delta uniquely ranks certified Qh7 first while absolute scores still rank the measured failure first; swapped feedback removes or reverses Qh7's delta advantage; absent and disabled arms have per-move deltas within `1e-12` of zero. Both seeds must meet the prediction for replication support. A failed seed is retained and reported as a failure. If the absolute final choice is Qh7, the specific “masked by baseline bias” prediction is falsified for that seed.

This tests only the decoder hypothesis on the already studied position under new model initializations. It is not a test of disjoint-position transfer, a calibrated action-value circuit, biological validity or a solution to plasticity. No learned weights are frozen; initial and final scores are measured within each same training arm.

## Frozen protocols

- [Seed 48 protocol](../../data/gamma2-relative-readout-seed48-v1/protocol.json)
- [Seed 49 protocol](../../data/gamma2-relative-readout-seed49-v1/protocol.json)
- [Prior adaptive-target result motivating this test](../gamma2-adaptive-target-v1-2026-10-09/README.md)

The inherited runner and independent auditor are pinned inside each protocol. Raw receipts, checkpoints, result and audit are preserved under `runs/gamma2-relative-readout-seed48`. Seed 49's protocol remains frozen but was not run after seed 48 showed that changing the configured seed does not change this MBON readout path.

## Seed 48 outcome and correction

The informative arm's per-action delta has a unique all-legal maximum at Qh7 (`+9.7473152e-5`); its absolute final choice remains Qg8, a certified failure. Under swapped feedback, Qg8 is the unique delta maximum (`+1.0171905e-4`) and Qh7 changes by `-2.1349266e-4`. Absent and disabled conditions have exactly zero delta for every action. The directional, specificity and disabled-isolation audit gates pass. The bounded decoder prediction therefore reproduces on this deterministic fixture.

However, this does **not** provide independent seed replication. Comparing seed 48 with the prior seed 47 found zero differences in all 208 initial/final all-legal score rows. Source inspection explains why: the seed randomizes input and output-head arrays, while this experiment calls `forward([0], directStimulation)` and reads MBON activity directly; those randomized arrays do not affect the measured path. The fresh-seed assumption was wrong. Seed 49 was withheld, and the preregistered multi-seed replication gate is unresolved, not passed. This exposes a model/readout independence limitation; it does not invalidate the original seed-47 observations or establish transfer.

The first audit attempt failed because the pinned auditor does not strip a UTF-8 BOM from JSON. The protocol was accepted by the runner, which recorded its exact byte hash. A dated BOM-tolerant auditor correction then passed all source/pin, certificate, receipt and 152-frame replay checks; the original pinned auditor and failed attempt are preserved. See [failed audit record](audit-bom-failure.txt), [corrective auditor](audit-relative-readout-bomfix.mjs), and [derived delta analysis](seed48-decoder-analysis.json). The correction is an audit-tool fix, not a change to training or the frozen protocol.

Runner result: peak RSS 189.41 MiB, elapsed 468.92 s, under the registered heap, duty and resource guards. The run used informative, swapped, absent and disabled arms; it did not freeze learned weights. No second seed, new puzzle, transfer, retention, reversal or biological claim is supported.
