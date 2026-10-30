# Original-puzzle retention certificate preparation

The original trained c4/f8 smothered-mate position has 32 legal moves. Bounded verification found one success and 31 failures, with no unknowns. Every generated certificate was checked by the separate certificate checker. No neural evaluation or feedback occurred, so retention remains unmeasured.

[Report](report.json) · [Plan and source hashes](plan.json) · [Streamed certificates](certificates.jsonl) · [Preparation script](../../../.codebase/scripts/puzzle-learning/prepare-original-puzzle-retention.mjs)

Command: `node --max-old-space-size=256 .codebase/scripts/puzzle-learning/prepare-original-puzzle-retention.mjs`. The script uses equal work/rest pacing and 768 MiB RSS / 256 MiB free-memory guards. Invocation terminated successfully. Certificate generation and checking are software evidence about the bounded chess objective, not biological or learning evidence.

Next: freeze a separate read-only evaluation protocol using the final warm-start informative and matched-control memories, this certificate corpus, the existing encoder/model/readout and unchanged memory assertions. Evaluate all legal moves; audit score publications and certificates before claiming retained first-puzzle performance. Preserve the original acquired checkpoint as the comparison. No final-test family is involved.
