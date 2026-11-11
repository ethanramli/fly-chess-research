# Fly connections memory v1: run protocol and gates (2026-11-08)

**Draft for strict code-and-protocol review. Written before any dry-run or full-run data.** Volume 2, chapters 3 (To Learn) and 5 (Evidence for Learning). Properties P1, P2, P3 of the [memory handoff](../research-goals/memory-handoff-2026-11-07.md). Design: [revision 2](fly-connections-memory-v1-revision-2-2026-11-07.md) ([BUILD ALLOWED](../../../research/reports/fly-connections-memory-v1-2026-11-07/design-review-r2.md)). This file fixes the numbers revision 2 left open. Where it conflicts with revision 2, revision 2 wins unless a line below says "changes revision 2" and gives the reason.

## 0. Clues and help, first

1. **Board selection.** Every A, B and test board is chosen to contain at least one safe and one unsafe non-king capture, all with complete certificates. The fly is told nothing about this, and it ranks **all legal moves**, but a safe answer always exists on the board. Uniform-random baselines (all legal, all captures, non-king captures) are reported beside every score to show how much this selection helps.
2. **Teacher-chosen practice.** On each training board the teacher picks two safe and two unsafe captures to replay. The fly's own ranking is recorded before each event but does not choose the practised move. This is a fixed curriculum, not exploration.
3. **Positive valence only.** A verified safe capture gets a +0.75 current into the 18 PAM07 cells. Unsafe captures get no external current. Unknown certificates produce no event.
4. **Success criterion.** Success is choosing a safe non-king capture. Quiet and king moves are legal choices that count as failures.
5. **Shared data.** All three seeds use the same boards; only the order of experience differs. Seeds are not independent replications.
6. **Status.** First data for this design. The full run is confirmatory for this design only if no gate below changes after the dry run; any change is recorded as a pivot and named in the report.

## 1. Data

| Group | Full run | Dry run | Source |
|---|---|---|---|
| A (learn first) | 32 boards | 8 | train-bucket games 901-1200 (full) / 601-900 (dry) |
| R (contingency probes) | 4 | 2 | same pool as A, disjoint games |
| B (learn second) | 32 | 8 | same pool, disjoint games |
| testA, testB | 60 + 60 | 10 + 10 | **development bucket**, first 300 games of the fixed sample order, fetched fresh and never used by any experiment (full) / train games 301-600 (dry) |

One board per game: the first eligible board per game in preserved source order. Group membership is fixed by a hash of the game ID before any neural pass. Test boards whose board key (FEN without move counters) or rendered Eyes input equals any training board's are excluded and listed. The dry run never reads development-bucket games.

## 2. Arms (all receive the identical experience tape in each seed)

Neural, local APL unless named: **informative** (primary), **absent** (no external current), **off** (all persistent memory held fixed), **shuffled** (same pulse count, permuted within each phase), **informative-matched** (strength-matched nonlocal APL), **informative-global** (original scalar APL). Engineered comparisons, graph-free: **raw-pc** and **random-pc** nearest-episode stores (v5 transforms, capacity 4096, k 3) fed the same tape with the delivered pulse code, each also with the shuffled code. Uniform-random baselines.

Seeds (experience order): full 7301, 7302, 7303; dry 7300. Naive model seed 47 for every arm. Bootstrap seed 20261109, 10,000 paired resamples over games, lower quantile 0.025.

## 3. Checkpoints

T0 (naive), A8, A16, T_A (A end), T_B0 (after R1, before B), B8, B16, T_AB (B end), final (after R2). Test boards are ranked at T0, T_AB and final. Training boards are ranked at every checkpoint where revision 2 needs them. Every arm, the off arm included, ranks at every checkpoint, so pass counts are equal (changed after code review r1, before data; the earlier off-arm reuse of T0 rankings is withdrawn).

## 4. Gates (every one must pass in every seed)

**P1, fly connections** (informative arm):
1. The only persistent state that changes is the ReversalMemory gain on the registered gamma-KC-to-MBON05 mask edges. Every other parameter, magnitude outside the mask, sign and topology keeps its T0 fingerprint at every checkpoint.
2. Every update is recomputed by the auditor from its receipt (actual KC rates, actual PAM07 rates, the Gkanias rule with eta 0.5, gain bounds 0.2-1.8, activity scale 1.5) and matches bit for bit.
3. The teaching pathway works: over all A and B events, the mean measured D on pulse events is lower (more depressing) than on no-pulse events by more than 1e-6, in this arm.
4. No engineered store, label, task ID or selected-action list enters the primary arm's scores (code review and auditor static check).

**P2, lasts while learning** (informative arm):
1. `judgeRetention` passes with minAcquired 24 (dry 6), retention 0.70, epsilon 1e-6: at least 24 of 32 A boards acquired at T_A; every acquired A board still successful (s/c >= 0.75) with learned-margin ratio >= 0.70 at T_AB **and** at final; the all-32-board group ratio >= 0.70 at both; at least 24 of 32 B boards acquired at T_AB against T_B0 and still successful at final.
2. A and B learning is caused by teaching: per-board success over A and B at T_AB beats absent, off and shuffled, each with a game-clustered lower bound above 0.
2b. A and B success improves from each group's own baseline (added after code review r1, before data): per-board success of A at T_AB beats A at T0, and per-board success of B at T_AB beats B at T_B0, each paired by game with a lower bound above 0.
3. Pressure was real: `summarizePressure` passes (B writes change at least 25% of A-written edges by at least 1% of naive magnitude, and at least 25% of the mask changes by at least 1% by T_AB). If this fails, P2 is untested, which counts as not passed.
4. Correction works: on every R board, the phase-1 target is acquired after R1 (s/c >= 0.75, margin above the tie tolerance, improved from before R1) and still holds at T_AB; after R2 the phase-2 target has s/c >= 0.75 and a positive margin, and the phase-1 target is no longer the sole top choice.
5. Reported, not gated: capacity (mask size), every effective overwrite with old and new Float32 values, losses and effective writes at loads 8, 16 and 32 per group.

**P3, new positions, no clues** (informative arm, test boards, all legal moves, final checkpoint):
1. Per-board success beats off and beats shuffled, each with a game-clustered lower bound above 0.
2. Per-board success improves from its own T0, paired by game, lower bound above 0.

**Fair and checked:**
1. Identical tape in all arms of a seed (tape SHA-256 in every job).
2. Peak RSS <= 2048 MiB in every process; free memory >= 256 MiB at every guard check. A guard failure fails the run; no silent retry.
3. Independent audit PASS, with all pins matching.

**Done** = all of the above in every seed of the one registered full run.

## 4b. Scope changes from revision 2 (declared before data, code review r1)

1. **No v8-style KC-key store.** Revision 2 section 6 listed it as a comparison. It is dropped: goal condition 5 names only the raw-input and random-feature arms, and in v8 both of those beat the KC key with the same store. The report may not say how a fly-key engineered store compares here.
2. **No second-branch APL geometry.** Only the primary midpoint geometry is run. Claims about local APL are limited to that geometry, and the run says nothing about dependence on attachment uncertainty.
3. **Test boards are task-selected.** P3's "new positions" means boards from unseen games that contain a safe and an unsafe non-king capture, not an unrestricted sample of unseen positions.
4. **No APL attribution arms in the full run** (declared after the dry run's cost measurement, before any full-run data). The strength-matched and global APL arms run in the dry run only. Measured cost was about 0.73 CPU-s per pass, so six arms would need about 160 CPU-hours. They are not gates (section 2 and revision 2 section 2: locality's causal contribution is a separate question). The full run therefore cannot say whether local APL inhibition caused any result.

## 5. What a pass would and would not show

Would show: lasting, teaching-dependent changes in modelled fly synapses, driven through identified dopamine neurons by a published rule, that keep earlier lessons under measured overwrite pressure and improve all-legal choices on boards from unseen games. Would not show: biological fidelity (timescales, receptor kinetics, measured release), reasoning or lessons (P4, Volume 3), chess skill beyond safe-capture choice, independent replication (seeds share data), or that local APL caused the result (the matched and global arms answer that separately and are not gates).

## 6. Budget

Exact pass counts come from the frozen tapes (revision 2 section 3) plus the checkpoint rankings above. The dry run measures seconds per pass and peak RSS for each arm. Before the full launch, the registration states: passes per job, workers W = min(7, floor((free MiB - 1024) / peak job RSS)), and a wall guard of 1.5 x (measured seconds per pass x passes per job). A run that exceeds it fails.
