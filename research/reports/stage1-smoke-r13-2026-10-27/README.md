# Stage 1 smoke r13 (outcome-only, attack-map cue): early stop and diagnosis (2026-10-27)

Plan step P6 ([plan](../../../documentation/handoffs/stage1-outcome-only-plan-2026-10-27.md)). The run is an engineering smoke (1 replica, 8 blocks), not scientific evidence. Diagnosis uses the run's own records and training rows only.

## What happened

- Launched detached at 23:00 (UTC+7) as `fly detach --curriculum "python actions/curriculum-campaign-smoke-r13.json"` (ledger L049). It stopped at 23:11.
- `runs/lichess-stage1-synthetic-v1-smoke-r13/result.json` (SHA-256 c8d0bff8...ecb7): **gate-failed by the registered informative-arm early stop**. Block-start training-board counts were 0, 7, 20, 19, 7, 20 (window 3 blocks; best before 20, best in the last 3 starts 20). The independent audit and the control arms did not run, by design.
- D1 requires at least 22/24 training boards. No gate was evaluated.

## Diagnosis

Sources: `block-start-choices.mjs` (graph read-only: each block-start checkpoint restored into factory v7, all 24 training boards assessed; `block-start-choices-results.jsonl`) and the block receipts.

| Block start | Correct | Wrong capture | Quiet move | Tie |
|---|---|---|---|---|
| 0 (scratch) | 0 | 2 | 11 | 11 |
| 1 | 7 | 13 | 0 | 4 |
| 2 | 20 | 0 | 2 | 2 |
| 3 | 19 | 0 | 0 | 5 |
| 4 | 7 | 13 | 0 | 4 |
| 5 | 20 | 0 | 3 | 1 |

Block starts 1 and 4 have the same 13 wrong captures. The learner switches between two states: one prefers captures that nothing can reach, the other prefers captures an enemy piece can reach.

Lessons taught in each block (task phase, from the receipts; tokens from the registered cue):

| Block | Punished (failure) moves | Rewarded (success) moves | Count after |
|---|---|---|---|
| 1 | g5g7 [quiet, n:free, r:free]; a7a6 **[quiet, att:none]** | g5g4 [capture, att:none]; h4g5 [capture, n:kline] | 7 |
| 2 | g7f7 [capture, b:free]; c6b5 [capture, k:free] | g7g6 [capture, att:none]; h4g5 [capture, q:kline] | 20 |
| 3 | f1h1 [quiet, q:kline, r:free]; g7g5 [capture, n:kline] | h6h5 [capture, q:kline]; g7f7 [capture, att:none] | 19 |
| 4 | c3c2 **[quiet, att:none]**; b1a1 **[quiet, att:none]** | c6b5 [capture, att:none]; h6h5 [capture, b:kline] | 7 |
| 5 | g7f7 [capture, b:kline]; h6h5 [capture, k:free] | g7g6 [capture, att:none]; b2e2 [capture, att:none] | 20 |

1. **Measured coincidence, mechanism partly hypothesis.** Both collapses follow blocks that punish safe quiet moves. Those moves carry `att:none`, the same token as a safe capture. A quiet move fails the task only because it is not a capture, but the lesson depresses every cue cell of the move, including the shared `att:none` cells. Recoveries follow blocks that punish reachable captures. The planner punishes the highest-scored failure. On a board that is already correct, that is often a safe quiet move, and the sentinel half of each block re-teaches a correct board.
2. **Measured.** Under the registered cue, 2 of 24 training boards tie by construction: f0-pin-p0a (h4g5 = g7g5) and f2-pin-p0a (f7f6 = h4f6). On each, a certified capture and a failing capture get identical token sets. D1 (22/24) then needs every other board correct at once, which leaves no margin.
3. **Not reproduced by the surrogate (open).** `conjoined-surrogate.mjs` (training rows, no graph; `conjoined-surrogate-results.jsonl`) rotates all 24 boards with the same failure rule. At eta 0.2 the registered cue swings 19-22, not down to 7. The real run differs in block structure (target plus sentinel), in background DAN factors on untaught channels (L041), or in something else not yet identified. A candidate encoding that conjoins attack tokens with capture/quiet (same facts, separate cells) is slightly steadier in the surrogate (minimum 20, against 19). Held-out results are equal (21/24, 9/12 pairs). This is weak evidence.

Not a defect: every component behaved as designed. The early stop worked as registered, and the mechanics check (L048) showed correct channels.

## Data-discipline mistake

While counting ties, a one-off command also encoded the 16 validation rows (ledger L050). No validation choice was evaluated and no final row was opened. The count is recorded in the ledger only and is not used here or in any decision.

## Stop S2: decisions needed from the researcher

Every remedy changes the cue's encoding or facts, or the registered eta rule, so the plan routes them to the researcher:

- (a) Encode attack facts separately for quiet moves and captures. Same information, separate cells; addresses finding 1; weak surrogate support.
- (b) Add true pin information: whether a reaching piece is pinned by an enemy slider behind it on its king line. A restricted pin flag. It removes the 2 structural ties in finding 2.
- (c) Use a slower eta (0.1 or 0.05; probe v8 also retained 3/4 there). This departs from the predeclared "largest passing eta" rule. In the surrogate, eta 0.1 is steadier (21-22).
- (d) Keep everything and rerun with a longer early-stop window. Not recommended: D1 needs 22 and the learner peaked at 20 with zero margin.

Recommendation: (a) together with (b) as attack-map cue v2. Re-screen it in the surrogate, run the full-graph fidelity check and a new probe (v9) to choose eta by the same rule, then run smoke r14.
