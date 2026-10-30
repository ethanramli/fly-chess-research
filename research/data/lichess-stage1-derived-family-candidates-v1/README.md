# Stage 1 derived capture family candidates v1

Training-only data organization from the previously replay-audited static counterfactual report. This is not a Stage 1 lesson package and does not authorize teaching.

## Inputs and method

- Counterfactual report: `research/reports/babysit-stage1-direct-counterfactual-feasibility-2026-10-23.json` (SHA256 `107c56b0ad70aeefc2e271aa09a31b6270304a4abd4eaf631a982b88589e2a9e`).
- Independent recapture replay: `research/reports/babysit-stage1-direct-counterfactual-feasibility-audit-v2-2026-10-23.json` (SHA256 `1c048e484cf74df1bdcd51da98a33a07f06218885968d17e7d5ba220be9ba3c3`).
- Registered action: `python actions/lichess-derived-capture-families-v1-step.json`.
- Producer: `.codebase/scripts/data/prepare-lichess-derived-capture-families-v1.mjs`.
- Independent auditor: `.codebase/scripts/data/audit-lichess-derived-capture-families-v1.mjs`.

The proposed family signature canonicalizes board symmetries and includes focal actor/target roles, the relocated piece, legal recapturer roles, king squares, and flip direction. Other pieces are treated as distractors. This is an exploratory grouping rule, not an established cognitive primitive.

## Result

The producer grouped 1,653 previously audited consequence-flipping pairs into 1,650 candidate signatures. Only 3 signatures recur across two or more source games. The independent auditor recomputed every signature and replayed all 1,653 legal capture/recapture outcomes; its mechanical audit passed. It also confirms this package is training-only.

The result does **not** establish useful structural-family diversity, split disjointness, authentic history for derived positions, neural-training eligibility, graph authorization, learning, or reasoning. Validation and final data remain unopened. The high number of one-off signatures shows this grouping is too specific to populate the frozen family quotas. Do not relax quotas or treat this candidate audit as authorization.

Raw output is `families.jsonl`; the producer receipt is `manifest.json`; the independent audit is `research/reports/babysit-stage1-derived-capture-families-audit-v1-2026-10-23.json`.
