# Capture-retention family v2

This frozen dataset and input protocol prepare a narrow consequence-transfer assay; they are **not a neural experiment protocol**. It contains 8 training panels, 4 validation panels and 8 final panels. Each panel compares two legal captures with one verified immediate recapture failure and one success, for 16/8/16 candidate experiences. The final family shifts candidate squares and includes a diagonal bishop recapture relation absent from the training family.

The [independent dataset audit](../../reports/capture-retention-transfer-audit-v1-2026-10-07/README.md) verifies all 20 distinct positions and 40 certificates. Under the pinned encoder and actual mapping, all 40 inputs have distinct 14-cell patterns; there are no exact input collisions or conflicting labels. Mean train-to-final input overlap is 4.33 of 14 stimulated KC indices (range 3–7) and 9.05 tokens (range 7–13). This supports possible shared coding while retaining contextual differences; it does not demonstrate neural activity or relational composition.

The `final.jsonl` positions and checked consequences are now frozen. Do not teach from them, inspect model performance on them during checkpoint selection, or tune the encoder using them. The audit examined only input patterns and certificates, not a learner's output. Training and validation positions are disjoint from final positions.

`protocol.json` pins the task data, cue, mapping, source hashes and dependency. The exact generator inputs are preserved in [the source archive](../../source-archives/capture-retention-transfer-v2/manifest.json). This package does not yet pin a full-connectome training runner, initial memory, search budget, checkpoint gates, reset/restoration protocol or statistical analysis; no graph run should be launched from this data package alone.

The teacher exhaustively verifies one opponent reply for a particular recapturability consequence. This is not Monte Carlo puzzle investigation, all-legal move quality or strategic move evaluation. Those remain part of the original research goal and must be integrated after this mechanism assay.
