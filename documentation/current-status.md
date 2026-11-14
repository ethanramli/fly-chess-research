# Current status

In the planned test, the researchers looked for settings that made the model rank a safe capture above every other move. They found settings for one of the three positions, short of the two required. After that test failed, a more extensive search found settings for all three positions. That later result is awaiting independent review. The model has yet to demonstrate that it can learn to pick safe captures and apply what it learned to unfamiliar positions.

The Fly Connections Memory investigation is paused while the researcher decides whether to request that review or close the work as a limited development result. See the [latest research handoff](next-checkpoint.md) for the decision and chronology.

## Update: 2026-11-14

A three-board feedback test is proposed and awaits the researcher's approval; nothing is built or run. It asks whether lessons move the safe capture toward the top more than wrong lessons do, in a quieter version of the circuit. The activity scale for that circuit (0.014047) was checked against a replay of the earlier cell readings: on these boards it caps one cell on one move per board. See the [protocol](design/neural-learning/three-board-feedback-test-2026-11-14.md) and the [scale check](../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/README.md). The status below is unchanged.

## Current status: 2026-11-09

**Volume 2, chapters 3 and 5 remain stopped pending the researcher's decision.** The revision-4 predeclared single-shot capacity gate on the widened 6,046-gain mask found one exact win out of three and failed. A later, stronger sequential exact search found settings on all three boards, but it was chosen after the gate failure and has not had independent review; it does not change the predeclared result. The earlier 2,096-gain result is a negative bound for a linear surrogate, not an exact-network impossibility proof. Reward-only and valence probes still left safe captures below their best rivals on all three boards. The reward-only probe included an absent arm; the valence probe was a single arm with baseline scores only. Neither had an independent audit. These are limited development diagnostics, not a registered full-run result.

No full revision-4 learning run is recorded, and the sealed test games remain unused. Properties 1–3 remain unmet; the project has no transferable-reasoning result. See the [November 9 experiment stop report](../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md), [checkpoint](next-checkpoint.md), and [dated journal](../research/journal/experiments/2026-11-07-fly-connections-memory.md).

Earlier project updates and failures are preserved in the [post-restart history](current-status-history-2026-10-31-through-2026-11-09.md) and the [pre-restart status history](current-status-history-through-2026-10-30.md).
