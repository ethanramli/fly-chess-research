# 2026-10-23: require the Lichess puzzle's first solution move

## Correction to v1

Reviewing v1 exposed a task-relevance error: it took any legal capture from a Lichess position as the focal action. That capture might not be the puzzle's prescribed move, so the v1 result (9 train roots and 8 validation roots) does not establish a suitable puzzle-derived task pool. The v1 script and report are preserved; do not use them for preparation.

## Revised feasibility result

The v2 probe requires `history.solutionMoves[0]` to be a legal capture before attempting the synthetic micro-position construction. On the same independently audited v7 package, 13 of 20 eligible rows per split have a first-solution capture. Four train roots and five validation roots produced candidate layouts for all four frozen recapture strata, using no more than six pieces. This is still too few independent train roots for the frozen 24-choice training quota. Source: `.codebase/scripts/data/probe-stage1-synthetic-microfamilies-v2.mjs` (SHA256 `00E5DF714E8CBB8F1D9B8E94B0B20AB4FCD9C7E5DE59E5317E47B1182303078E`); report: `research/reports/babysit-stage1-synthetic-microfamily-feasibility-v2-2026-10-23.json` (SHA256 `FF8D36CED53B472ECD13350A73389B5E2DC168C938FAEDD2A844B0189B06AB82`). Syntax check passed; probe used 123 evaluations, 86.4 MiB peak RSS, and 1.1 seconds. Train/validation only; final unopened. No neural events or graph launch.

## Limits and next action

The probe's candidate labels still come from the same runtime classifier, and it stores no concrete FENs. It is not independent verification, lesson production, family disjointness, or teaching authorization. Obtain a larger suitable train/validation source pool, then save exact task FENs and certificates and audit them independently. Keep the registered quotas and final seal unchanged. Do not work on G0.
