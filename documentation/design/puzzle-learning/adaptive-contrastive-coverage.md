# Adaptive contrastive feedback coverage

The audited single-pair screens changed selected comparisons without producing correct all-legal choices. V2's forcing-prior search succeeded in baseline and all controls but reviewed a fixed failing anchor, leaving the learner's top wrong preference untouched. The next bounded experiment addresses that coverage gap.

The fly first chooses unaided from every legal action. The teacher independently verifies that committed choice. A verified failure is paired with a separately verified success discovered through bounded investigation, and both experiences are replayed through the existing reinforcement interface. Record every legal action's score after each event. After the complete pair, repeat with the current top failing preference, up to a frozen pair budget. Stop on verified unaided success, unknown current-choice verification, or the budget. Unknown supplies no teaching event or invented negative label.

Absent, shuffled and disabled-plasticity conditions replay the informative condition's exact board/action/certificate sequence from fresh memory. Freeze the shuffle seed and require nondegenerate specificity; do not adjust it after observing results. Keep all legal moves available. Review coverage repair and interference separately: a newly exposed wrong preference differs from revival of a previously corrected action.

Every update persists memory plus a pending receipt before acknowledgment. Resume a pending receipt without replaying the update. Publish the all-legal ranking after every receipt. Final repeated/reset/restored assessments check causal persistent memory; fixed-search and counterfactual assessments remain separately required in the graph runner and auditor.

The separate [orchestration module](../../../.codebase/src/puzzle-learning/contrastive-coverage-experiment.mjs) passes software fixtures for adaptive choice targeting, matched control exposures, interruption after update, all-legal retention and unknown handling. All 107 project tests pass. No graph experiment uses this module yet; the full-graph runner, frozen protocol, independent audit and source identities remain to be prepared. Toy-fixture acquisition is orchestration evidence only.

No biological rule changes. This is an engineering feedback-selection hypothesis using the existing documented local memory mechanism. Familiar repair, if achieved, must precede disjoint unfamiliar and counterfactual transfer tests. Immediate retry success alone does not establish reasoning.

Evidence: [v1 screen](../../../archive/early-development/research/reports/contrastive-feedback-screen-v1-2026-10-07/README.md), [v2 screen](../../../archive/early-development/research/reports/contrastive-feedback-screen-v2-2026-10-07/README.md), [forcing-prior search iteration](../../../archive/early-development/research/reports/forcing-loop-v4-2026-10-07/README.md).

2026-10-07 preparation update: full-graph runner and independent auditor now exist. Protocol is frozen at research/data/adaptive-contrastive-coverage-v1/protocol.json: balanced input, four-pair cap, exact four-condition experiences, fixed shuffle seed0, teacher prior0.5 and evaluation prior0. All107 tests and pinned-source/dependency/prerequisite preflight pass. Graph outcomes and full-graph pending-receipt recovery remain pending.

2026-10-07 audited outcome: frozen acquired repair passes on one inspected development fixture after2 pairs; all controls fail, repeat/reset/restoration and fixed-budget search pass. Counterfactual fails, so no transfer or reasoning claim. [Raw outcome](../../../archive/early-development/research/reports/adaptive-contrastive-coverage-v1-2026-10-07/README.md). Pending-receipt recovery remains pending.

2026-10-07 near-transfer follow-up: the saved informative memory ranks the certified move above all three controls on five unseen positions from the same motif, but still chooses a failure on all five. This is a consistent within-motif rank shift, not correct-choice transfer. See the [audited near-transfer result](../../../archive/early-development/research/reports/adaptive-near-transfer-v4-2026-10-07/README.md).
