# 2026-10-27: Stockfish teaching set aside for Stage 1 (failed experiment)

Researcher decision, 2026-10-27, option (d): keep Stockfish teaching out of Stage 1 and document it as a failed experiment. It may be reused later, or it may turn out to be of little use. The code, review caches, registrations, runs and the D9 gate module are preserved unchanged.

## What was tried

- An isolated prototype, `StockfishValueBrain`: a fixed MBON value proxy and a conservative target-error interface.
- From registration r6 onward, every Stage 1 informative arm combined the verified task pulse with a Stockfish value pulse on the child-position cue. The pulse sign and size came from Stockfish's WDL expected score of the chosen move minus the Fly's MBON value prediction (the "absolute" target). Feedback protocol: `verified-outcome-plus-stockfish-v2`.
- Gate D9 was added to Stage 1 (`curriculum-stage1-acceptance-v2.mjs`). Stockfish-assisted teaching had to beat both the outcome-only and the shuffled-Stockfish controls by at least 10 final choices, with a positive family-bootstrap lower bound.

## What failed (evidence)

1. **Smoke r6 (reviewer finding 2, fix-goal prompt 2026-10-24).** The informative arm fell from 4 to 1 training board over 8 blocks. The value pulse's child cue shared only 2.6 of 15.4 cells with the move cue. That was fixed by the mover-perspective cue (r7), but this did not make Stockfish helpful.
2. **Build weakness audit (2026-10-25).** The Fly's value prediction is about 0 (spread about 0.013), so the error delivered equals a saturated engine target that is uncorrelated with verified outcomes.
3. **Probe v7 (2026-10-27 surrogate report).** 74 of 182 Stockfish pulses opposed the verified outcome: 61 success lessons were punished and 13 failure lessons rewarded. A board was correct right after its own lesson 83% of the time when Stockfish agreed, and 50% when it punished the certified move. In the surrogate, removing the Stockfish pulse left the training plateau unchanged (about 12/24), so Stockfish did not help.
4. **Relative signal check (2026-10-27, `research/reports/stage1-attack-map-cue-2026-10-27/stockfish-relative-check.mjs`).** This used the existing all-legal regret signal, which compares the move against the board's best alternative.

   | Move | Relative signal agrees with outcome | Absolute target agrees with outcome |
   |---|---|---|
   | Certified (24) | 21 | 9 (13 opposed) |
   | Unsafe capture (28) | 9 (19 opposed) | 15 |

   Neither version teaches the task cleanly.

## Diagnosis (partly hypothesis)

Stockfish measures something different from the Stage 1 task. The task asks whether the capturing piece survives the reply. Stockfish asks how likely the whole game is to be won. In these 6-piece endgames, both the safe and the unsafe capture often leave the game won. The engine difference is then small, or points the other way, and it is unrelated to the task outcome. A target that disagrees with the verified consequence this often cannot pass D9's requirement that Stockfish help beyond outcome-only teaching.

## Consequences

- Stage 1 teaching is outcome-only: verified task pulses only.
- D9 tests Stockfish assistance, so it does not apply while Stockfish teaching is excluded. Stage 1 is judged on the original frozen D1-D8 gate (`curriculum-stage-acceptance.mjs`; D7 deferred to Stage 2 under policy B), with no threshold changed. This replaces the earlier same-day statement that Stage 1 could not be accepted before a relative Stockfish condition existed (decision log).
- The D9 module and every Stockfish-taught run stay preserved as negative evidence.

## Could be reused later (not planned)

- Tasks whose criterion is game value (endgame stages, the Elo evaluation contract), where engine value and task outcome agree.
- A task-aligned engine target, for example engine evaluation restricted to the consequence the task certifies, registered as its own condition.
- Position value for search rather than move teaching.
