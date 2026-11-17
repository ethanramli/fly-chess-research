# Current status

In the planned test, the researchers looked for settings that made the model rank a safe capture above every other move. They found settings for one of the three positions, short of the two required. After that test failed, a more extensive search found settings for all three positions. That later result is awaiting independent review. The model has yet to demonstrate that it can learn to pick safe captures and apply what it learned to unfamiliar positions.

The Fly Connections Memory investigation is paused while the researcher decides whether to request that review or close the work as a limited development result. See the [latest research handoff](next-checkpoint.md) for the decision and chronology.

## Update: 2026-11-17

The learned pin, reach and piece-value stores solved 60/60 open puzzle pairs in three runs. All reach probes used fresh boards and reused a training key at retrieval. The locked test awaits a decision on which inputs the no-repeat rule covers and which controls the gate requires the learner to beat. The matched fly pin test scored 329/648. The approved safe-capture run is blocked by missing pinned calibration files. [Continuation report](../research/reports/combination-roadmap-2026-11-16/continuation-2026-11-17.md).

## Update: 2026-11-16

A design review found that the planned test of combined ideas could be passed without combining anything: by adding up separate answers, or by counting the pieces on the board. A repaired test and a step-by-step plan are proposed and await the researcher's decision. Nothing ran, and the sealed games stay unused. This changes no result above; the model still has no learning or reasoning result. See the [roadmap proposal](design/research-goals/combination-roadmap-2026-11-16.md) and its [checks](../research/reports/combination-roadmap-2026-11-16/README.md).

The first [flip-pair benchmark](../research/reports/combination-roadmap-2026-11-16/README.md#first-benchmark-build) is now implemented. Its rule uses correct facts supplied by the benchmark. The next Volume 3 step is teaching those facts separately.

## Update: 2026-11-15, later

The three-board test has a new protocol. The old rule read the Kenyon cells in the same forward pass as the reward or punishment pulse, so the pulse's own activity got into the reading and broke check 3. In the new rule, each lesson first reads the Kenyon cells with no pulse, then delivers the pulse and takes only its learning signal. The scale stays at 0.014047, which was chosen on pulse-free readings. A check on saved data comes first. It can rule the rule out before six graph runs are spent, but it cannot show learning. The cutoffs are unchanged, everything is tested on made-up inputs only, and every run awaits approval. See the [protocol](design/neural-learning/three-board-reading-before-feedback-2026-11-15.md) and [journal item 40](../research/journal/experiments/2026-11-07-fly-connections-memory.md#40-2026-11-15-pivot-read-the-kenyon-cells-before-feedback).

## Update: 2026-11-15

The quiet circuit's learning-off run failed one of the test's required checks, so the three-board test is inconclusive and its other five runs are paused. The check asks that capping cell activity at 0.014047 keep at least 99% of each lesson's activity difference from the other moves. During reward and punishment pulses, the worst lesson kept only 22.35% (researcher's report; raw files on the graph machine). The scale had been chosen without pulses. A tool to measure the trade-off is built and tested on synthetic inputs: a larger scale flattens less but makes every learning update smaller. Its recording on the graph machine awaits approval, and the scale choice is open. See the [pulse scale check](design/neural-learning/pulse-scale-check-2026-11-15.md).

The offline report now checks every expected lesson and starting move score against the saved run. It also replays the updates with unpulsed cell readings and the same learning signals to measure the effect of changing the readings alone. [Independent review and fixes](../research/journal/experiments/2026-11-07-fly-connections-memory.md#39-2026-11-15-independent-review-of-the-pulse-scale-report).

## Update: 2026-11-14

A three-board feedback test is built and checked, and its run awaits the researcher's approval; nothing has run on the real circuit. It asks whether lessons move the safe capture toward the top more than wrong lessons do, in a quieter version of the circuit. The activity scale for that circuit (0.014047) was checked against a replay of the earlier cell readings: on these boards it caps one cell on two moves in total, across two of the three boards. Codex reports that the full 6,046-connection recheck keeps at least 99% of every move difference. See the [protocol](design/neural-learning/three-board-feedback-test-2026-11-14.md) and the [scale check](../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/README.md). The status below is unchanged.

## Current status: 2026-11-09

**Volume 2, chapters 3 and 5 remain stopped pending the researcher's decision.** The revision-4 predeclared single-shot capacity gate on the widened 6,046-gain mask found one exact win out of three and failed. A later, stronger sequential exact search found settings on all three boards, but it was chosen after the gate failure and has not had independent review; it does not change the predeclared result. The earlier 2,096-gain result is a negative bound for a linear surrogate, not an exact-network impossibility proof. Reward-only and valence probes still left safe captures below their best rivals on all three boards. The reward-only probe included an absent arm; the valence probe was a single arm with baseline scores only. Neither had an independent audit. These are limited development diagnostics, not a registered full-run result.

No full revision-4 learning run is recorded, and the sealed test games remain unused. Properties 1–3 remain unmet; the project has no transferable-reasoning result. See the [November 9 experiment stop report](../research/reports/fly-connections-memory-v1-2026-11-07/stop-report-2026-11-09.md), [checkpoint](next-checkpoint.md), and [dated journal](../research/journal/experiments/2026-11-07-fly-connections-memory.md).

Earlier project updates and failures are preserved in the [post-restart history](current-status-history-2026-10-31-through-2026-11-09.md) and the [pre-restart status history](current-status-history-through-2026-10-30.md).
