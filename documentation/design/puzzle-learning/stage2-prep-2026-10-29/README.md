# Stage 2 preparation (2026-10-29)

Haiku sub-agents drafted this preparation while the full-r14 Stage 1 audit ran; the main session reviewed it. This is planning plus one draft module. Nothing is registered or run, and none of it applies unless full-r14 accepts Stage 1. Researcher policy: option A, local visible facts only ([readiness plan](../../../handoffs/stage2-readiness-2026-10-29.md)).

| Item | File | Review result |
|---|---|---|
| Verifier gap audit | [verifier-gap-audit.md](verifier-gap-audit.md) | Citations spot-checked and correct (verified-feedback:31-41, mate-certificate-check:13, avoid-mate-action-domain:17, panel:50-51, counterfactual-teaching-record:44); no stray files left. Key findings: escapable-check and misleading-improving-move have no verifier predicate; no Stage 2 counterfactual-pair verifier; **checker budgets are wall-clock (2,000 ms), so 'unknown' depends on machine load and is not reproducible in an audit replay, especially with parallel processes.** Stage 2 needs deterministic node budgets |
| Data chain design | [data-chain-design.md](data-chain-design.md) | Substance holds. Several line citations were corrected in its reviewer section, and its "audit v1/v2 discrepancy" is not an error |
| Learner/evaluator gap map | [learner-evaluator-gap-map.md](learner-evaluator-gap-map.md) | Citations spot-checked and correct (runtime factory:98, brain factory:13/70-71, retention observations:62-63, Stage 1 builder:68). Key finding: the existing Stage 2 learner is Stockfish-bound and uses `public-lesson-frame-cue`, not the attack-map cue Stage 1 memory was learned on |
| Cue v3 draft | `.codebase/src/chess-input/public-attack-map-cue-v3.mjs` with tests | Tokens correct: `attackTokens` is byte-identical to v2, fold-back to v2 tokens holds, and 20/20 cue tests pass (v1, v2, v3). **Budget defect:** see below. Marked DRAFT in its header |

## Cue v3 budget defect (measured)

[budget check](../../../../archive/early-development/research/reports/stage2-cue-v3-budget-2026-10-29/budget.mjs): 142 moves from Stage 1 training boards, synthetic 3x1000-KC mapping, no graph.
- v2 uses about 117 cells on average.
- v3 fills the 128-cell cap and drops about 60% of all token-cell assignments.
- Only about 43% of v2-token cells survive (34% at worst).

The token-level fold-back test cannot catch this, because it compares token lists, not stimulated cells.

Why it matters:
- It would dilute the Stage 1 facts.
- It would break Stage 1 retention (D7): Stage 1 memory sits on v2's cells, so changed stimulation for the same Stage 1 moves would fail retention for an encoding reason, not forgetting.

Required fix (design rule for v3, not yet implemented):
- v3 must reproduce v2's stimulated cells and currents exactly, and a test must compare stimulation, not tokens.
- The check and king-zone tokens go in additional, separately budgeted cells.
- Open choice: the size and current of that extra budget. For example, up to 64 extra cells: v2's 128-cell cap is about 2.5% of the 5,177 KCs, and the mushroom body's sparse coding is usually several percent. A literature check is needed before choosing.
- Also open: zone tokens are not conjoined with the act tag (r13's lesson about shared cells may apply), and "safe" means not attacked in the current position. Squares attacked only through the king (x-ray) are not marked, so "safe" is not "a legal escape". That keeps it a visible fact, not a verdict.

## Second round (2026-10-29 evening): built and reviewed

| Item | File | Review |
|---|---|---|
| Deterministic mate/avoid-mate verifiers | `.codebase/src/search-and-feedback/*-v2.mjs` (5 modules) | Replay stop is node budget only, and time is metadata only. 92/92 search-and-feedback tests; 24 v2 tests |
| Cue v3, revised budget | `.codebase/src/chess-input/public-attack-map-cue-v3.mjs` | v2 stimulation is reproduced exactly (142/142 moves, 100% of cells). New facts get a separate 64-cell/96-current budget. 23/23 cue tests. Open: the extra budget is always full |
| Stage 2 stratum predicates | `.codebase/src/search-and-feedback/stage2-strata-v1.mjs` | 16/16 tests. Every verdict is cross-checked by brute force in the tests. The main session brute-forced the misleading-move fixture independently (only Kxh8, a capture, allows Ra8#). "Attractive = capture or check" is an engineering definition **pending researcher review** |
| Stage 2 counterfactual pair verifier | `.codebase/src/search-and-feedback/stage2-counterfactual-pair-v1.mjs` | 9/9 tests; chess truth checked independently |

Decisions still needed from the researcher before Stage 2 data:
1. **Avoid-mate horizon.** The current domain sees only an opponent mate-in-1 after the move, while the curriculum lists quiet mating threats. Deeper means slower and needs larger node budgets.
2. **The "misleading improving move" definition.** The current one is a capture or check that permits a certified mate.
3. **The cue v3 extra budget size.**
