# Sparse forward kernel benchmark

Completed 2026-10-07T03:00:03.779Z.

Interleaved A/B/C/D comparison on the same frozen brain state and saved teaching stimulation. Production kernel versus local-array-hoisted kernel versus precomputed signed edge magnitudes versus a four-edge-unrolled signed kernel. Each candidate exactly matches production predictions and every recurrent activity buffer on every sample. No learner source is changed and no update is applied.

The candidate kernels are diagnostic hypotheses. A faster microkernel is not adopted until the persistent-learning path refreshes all derived state and an end-to-end matched cycle shows a real benefit.

See `report.json` for raw samples, exact-equivalence checks, memory cost and pinned identities.
