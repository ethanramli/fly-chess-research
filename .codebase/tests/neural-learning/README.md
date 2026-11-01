# Neural Learning tests

[Tests guide](../README.md) · [Code guide](../../README.md)

[Design and scientific boundaries](../../../documentation/design/neural-learning/README.md)

- [association-validation.test.mjs](association-validation.test.mjs)
- [balanced-valence-schedule.test.mjs](balanced-valence-schedule.test.mjs)
- [dual-valence-interface.test.mjs](dual-valence-interface.test.mjs)
- [gf-readout.test.mjs](gf-readout.test.mjs)
- [mbon-readout.test.mjs](mbon-readout.test.mjs)
- [mushroom-body.test.mjs](mushroom-body.test.mjs)
- [reversal-memory.test.mjs](reversal-memory.test.mjs)

Run `npm test` from the repository root. Software checks do not establish biological validation or useful learning.

- [curriculum-g0.test.mjs](curriculum-g0.test.mjs): neutral evidence, cue isolation, matched controls and inert pending-frame recovery.
- [Restart memory-fixture focused checks](../../../python%20actions/memory-assay-v10-step.json):93 passing tests for candidate math, state contracts, fixture controls and the [readout-capacity checks](memory-assay-readout-bound.test.mjs); fixture success does not imply useful graph learning.
- [Recorded-feedback repair checks](memory-assay-recorded.test.mjs): schedule/choice binding, replay corruption, unknown/rejected events, sink failure, disk-level source/config identity and overwrite protection. The CLI retains its300s guard; the harness leaves that guard time to return a result. Failed temporary fixtures are preserved.

- [Coupled](local-coupled-memory.test.mjs), [cascade](local-metaplastic-memory.test.mjs), [reservoir](local-reservoir-memory.test.mjs) and [fixed-rate integration](memory-assay-reservoir-rate.test.mjs): candidate math, bounded state, persistence and all-arm replay checks. [Continuation evidence and limits](../../../research/reports/memory-retention-continuation-2026-10-31/README.md). Passing implementation checks is not a joint memory pass.
- [neuron-reader.test.mjs](neuron-reader.test.mjs): exact cells, copied endpoint values, type means, malformed inputs and explicit score-contract validation. Arbitrary scoring signs are synthetic fixtures only.

- [local-cubic-reservoir-memory.test.mjs](local-cubic-reservoir-memory.test.mjs) and [eye-memory-audit.test.mjs](eye-memory-audit.test.mjs): five math, fresh-model state, independent replay and altered-evidence rejection checks; no biological validation.

- [eye-memory-recovery.test.mjs](eye-memory-recovery.test.mjs): receipt-prefix integrity, wrong/missing checkpoint rejection, explicit NUL-tail handling and exact first resumed update. This is execution recovery, not a biological-memory gate.

- [eye-readout-capacity.test.mjs](eye-readout-capacity.test.mjs) and [eye-readout-offset.test.mjs](eye-readout-offset.test.mjs): fixed-readout bounds, offset algebra and rejection of active source runs before graph access. These instruments do not establish a biological memory result.
