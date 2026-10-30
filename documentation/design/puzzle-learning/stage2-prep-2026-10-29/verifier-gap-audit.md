# Stage 2 verifier gap audit (2026-10-29)

Scope: can the existing code certify every Stage 2 stratum and counterfactual pair? Code-reading audit only. No graph, run, or fly command was executed. Paths are relative to `.codebase/src/` unless noted.

## Strata

| Stratum | Certifier (file:line) | What it proves and its bounds | Gap |
|---|---|---|---|
| actual-mate | `verified-feedback.mjs:31-41` (forced-mate branch) calling `mate-certificate-check.mjs:5` | Actor's forced mate within plies 1 or 3, replayed on the successor. Node cap 100000 and 2000 ms (`verified-feedback.mjs:36`). Unknown returns no event (`:35`). | Panel never checks that the position is a mate-in-1/3 beyond the task label. Wall-clock limit makes unknown timing-dependent (see below). |
| escapable-check | Same forced-mate branch; panel mapping at `lichess-stage2-avoid-mate-panel.mjs:23-24` | Shows only that the attacker cannot mate within the horizon. | No predicate that the side to move is in check or that a legal escape exists. "Escapable" is not verified, only "not mated". |
| mandatory-defense | `avoid-mate-action-certificate-check.mjs:11-47`, built by `avoid-mate-action-domain.mjs:11-39` | Opponent mate within remaining 2 plies is checked over all legal replies (`mate-certificate-check.mjs:26-28`). Learner label reversed (`avoid-mate-action-certificate-check.mjs:39-40`). | "Mandatory" (only defenses survive) is implied by balanced labels in the panel, not certified. |
| misleading-improving-move | Same avoid-mate chain | Only mate outcome after the move. | Nothing certifies "improving" (material or positional gain). No verifier exists for the lure. |

## Horizon finding (inference from code, not yet executed)

`avoid-mate-action-domain.mjs:17` calls `certifyMate(child, ..., {plies: 2})`. In `mate-certificate.mjs:9-14` the root is the opponent to move. Its first move reaches a node checked for mate (`:13`). The next node is only a horizon leaf (`:14`) and its moves are not expanded. So a mate delivered on the opponent's second move (quiet threat, then mate) is not seen. The verifier covers opponent mate-in-1 after the learner action, which is narrower than the "quiet mating threats" required by `principles-curriculum.md` Stage 2 opponent coverage. By contrast, the forced-mate branch with plies 3 (`verified-feedback.mjs:36`) does reach the actor's second-move mate, because the defender moves first.

A probe was attempted but each queen-containing certificate took about 1.5 s, so a sweep was not run. The next step is a fixed fixture with a known quiet-threat mate-in-2.

## Counterfactual pairs

No Stage 2 pair verifier exists. `counterfactual-teaching-record.mjs:44` accepts only `capture-retention`. The pair checker `lichess-counterfactual-action-pair-check-v1.mjs` is capture-only (`:1`, `:62`). `curriculum-stage-acceptance.mjs:64,151` consumes `counterfactualPairs` but does not verify them.

Required pair certificate (inference): one-piece difference that changes one escape square, supporting piece or interposition; both actions' avoid-mate or mate certificates; crossed outcome.

## Search-estimate hazards

- `search-and-feedback/puzzle-search.mjs:101-117` `verifyMate` is a search-side mate check; it returns `failure` at horizon leaves (`:109`). It is not on the Stage 2 path, but a future caller could mistake it for a certificate. Do not route Stage 2 through it.
- `lichess-stockfish-review.mjs:72` and `stockfish-value-brain.mjs:54,69` are estimates and must not supply `learningAllowed`. Currently the panel uses only `verifiedExperience` (`lichess-stage2-avoid-mate-panel.mjs:42-48`), which is correct.
- Checker budgets are wall-clock (`mate-certificate-check.mjs:13`). An exhausted timer yields `unknown` on one machine and a verdict on another. This is not a search estimate, but it breaks reproducibility of unknown handling (inference).

## Panel and balance

- `lichess-stage2-avoid-mate-panel.mjs:50-51` requires at least one success and one failure. The domain note (`stage2-avoid-mate-domain.md:23`) says "balanced". The code does not check counts.
- No per-stratum 12/16 count is computed here (that belongs to acceptance).
- All-legal coverage is enforced (`:35-39`), and the six-piece bound (`:34`) and history binding (`:17-20`) are present.

## Prioritized verifier work items

1. **Decide and fix the avoid-mate horizon.** Confirm whether quiet threats need opponent mate-in-2 (child plies 3). Change `avoid-mate-action-domain.mjs:17` and the checker plies together, with a registered fixture. This is a researcher decision because it changes the frozen definition.
2. **Make checker budgets deterministic.** Use node-only bounds for acceptance (`mate-certificate-check.mjs:13`, `verified-feedback.mjs:36`). Keep time limits as operational guards only.
3. **Add stratum predicates.** Escapable-check: in-check plus at least one legal escape, checked. Misleading-improving-move: a registered static gain criterion with its own certificate. Mandatory-defense: certify that non-defensive actions lose.
4. **Enforce balance and counts in the panel.** Replace `:50-51` with the documented block balance and fail on imbalance.
5. **Build a Stage 2 counterfactual pair verifier** modeled on `lichess-counterfactual-action-pair-check-v1.mjs`, covering the three change types.
6. **Add fixtures and tests** per stratum, including a quiet mate-in-2 case, run through `npm test`. Do not run graph experiments.
