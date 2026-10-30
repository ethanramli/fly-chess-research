# Stage 2 readiness (2026-10-29)

Written while the full-r14 Stage 1 audit was running. This is planning only; nothing here is registered or run. Stage 2 starts only if full-r14 is accepted. Otherwise the Stage 1 barrier loop continues (r15).

## What Stage 2 is

Stage 2 is king safety, check and mate ([curriculum](../design/puzzle-learning/principles-curriculum.md#stage-2-king-safety-check-and-mate)). Positions have at most 6 pieces and a consequence horizon of up to 3 plies. Tasks are forced mate and avoid-loss, with F0 feedback. The gate is D1-D8 plus at least 12/16 in each of four strata: actual mate, escapable check, mandatory defense, misleading improving move.

Stage 2 also runs Stage 1's deferred **D7** (policy B): after Stage 2 learning and interference, Stage 1 validation counts must not fall, and all four Stage 1 sentinels must stay correct.

## What exists

- `.codebase/scripts/puzzle-learning/lichess-stage2-runtime-factory.mjs`, `lichess-stage2-brain-factory.mjs` and `lichess-stage2-avoid-mate-panel.mjs`. These were built for the Stockfish-assisted protocol (they consume pre-collected Stockfish reviews), which was set aside on 2026-10-27.
- A bounded three-ply avoid-mate verifier ([domain](../design/puzzle-learning/stage2-avoid-mate-domain.md)). It checks only whether the selected move permits an opponent-forced mate within the remaining two plies. It is not a general avoid-loss verifier.
- A validation-only checkpoint selector, with Python check steps `babysit-stage2-checkpoint-selection-checks-v6/v7`.
- The retention-promotion machinery (`curriculum-retention-promotion.mjs`), used by the v1 matrix audit for stage > 1.

## What is missing (campaign builder: "no audited mate-family train/validation/final data, final evaluator or registration")

1. **Data.** Audited, disjoint train, validation and final mate families in the four strata, with verifier certificates and counterfactual pairs (change one escape square, supporting piece or interposition route). Stage 1's chain (`python actions/stage1_synthetic_data.py` plus the bind/produce/audit scripts) is the template.
2. **Input representation.** Attack-map cue v2 encodes which enemy pieces attack the move's landing square. It carries no fact about check, the king's escape squares, interpositions or mating threats. So Stage 2 needs a representation-ceiling check on the Stage 2 training families first, then a cue extension if the ceiling is at chance.
3. **Outcome-only Stage 2 factory.** The Stage 1 v7/v8 pattern, replacing the Stockfish receiver with verified-outcome pulses.
4. **Stage 2 acceptance evaluator.** It needs `deriveStage2AcceptanceObservations`, `evaluateStage2ReplicasAcceptance` and `selectStage2TrainingCheckpoint`, the four strata, and cumulative D7 over Stage 1.
5. **Registration and parallel steps** (runner v5, cpuDuty 0.75). Merge and the replay-split audit currently cover stage 1 only. Stage 2 adds retention training phases (`completeTraining`), so both need extending.

## Decision for the researcher (raise before building item 2)

Red flag 1 (the input may be doing the reasoning) grows here. Any cue that states "this move allows mate" or "this king has no escape" would hand the Fly the Stage 2 answer. A defensible extension states only local, public facts at the resolution Stage 1 uses: which squares around each king are attacked, and whether a move gives check. The consequence (mate or no mate) would still come only from verified feedback. How much engineered input Stage 2 may use is the researcher's call, because it sets what a Stage 2 pass can claim.

## Order of work if full-r14 passes

1. Data chain for the mate families, with an audit. No graph is needed.
2. Representation-ceiling check of cue v2 on the Stage 2 training families, using the existing ceiling tool.
3. Researcher decision on the cue, then the cue extension and its tests.
4. Outcome-only factory and evaluator, with tests.
5. Surrogate screen, then smoke (parallel, 0.75), then full Stage 2.

## Researcher decision 2026-10-29: option A

The cue extension states local, visible facts only (gives check, attacked king-zone squares, attackers of a square), never consequences (allows mate, no escape, defends mate). Mate comes only from verified feedback. Decision log entry of this date.
