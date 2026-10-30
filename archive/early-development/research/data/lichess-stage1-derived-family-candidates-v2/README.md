# Stage 1 derived capture family candidates v2

Training-only grouping of the already-audited static consequence flips. This package is diagnostic; it is not a production lesson set and does not authorize neural teaching or a graph launch.

## Inputs and method

- Source report: `research/reports/babysit-stage1-direct-counterfactual-feasibility-2026-10-23.json`.
- Source replay audit: `research/reports/babysit-stage1-direct-counterfactual-feasibility-audit-v2-2026-10-23.json`.
- Registered preparation and independent audit: `python actions/lichess-derived-capture-families-v2-step.json`.
- Proposed family key: outcome transition, actor/target roles, legal recapturer types, and coarse capture/mover geometry. Exact board coordinates are omitted.

## Result and limits

The producer grouped 1,653 pairs into 613 proposed signatures; 110 signatures recur across at least two source games. The independent auditor passed and independently replayed the 1,653 legal outcomes. This is a more useful grouping frequency than v1's exact-geometry key, but recurrence alone does not establish semantic family diversity or a valid disjoint split. The auditor leaves `semanticFamilyDiversityEstablished`, `relationFamilyDisjointnessEstablished`, `eligibleForNeuralTeaching`, and `graphLaunchAuthorized` false. Validation and final data were not inspected.

The positions are derived static boards; this package does not establish authentic post-move game history or a runtime-compatible lesson context. Do not train from it or count these signatures as accepted Stage 1 families.

Raw records: `families.jsonl`; manifest: `manifest.json`; independent audit: `research/reports/babysit-stage1-derived-capture-families-audit-v2-2026-10-23.json`.
