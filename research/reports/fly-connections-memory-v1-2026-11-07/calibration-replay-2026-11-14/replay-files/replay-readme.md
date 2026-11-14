# FlyChess memory calibration replay

14 November 2026 · Volume 2, *To Learn* and *Evidence for Learning*

The old FlyChess diagnostic regenerated the cell activity on three development boards. It ran with the original background activity and with background activity set to zero. These are pre-teaching readings. The replay changed no learned weights and used no sealed games.

## What to hand to Opus

- `all-kc.json` contains the per-move rates. The zero-drive rows have `theta: 0.01`.
- `scale.json` gives **0.014047** as the candidate Kenyon-cell scale. It retains at least **99%** of summed absolute rate difference in all **1,954** within-board pairs of legal moves. Each of the 6,046 learnable connections contributes once. The calculation uses the rates alone. A scale based on the median positive rate kept only about **0.011%** of the original difference for the worst move pair.
- `valence-baseline/probe.json` records the first board before teaching under the original six-output-circuit scoring rule. The same safe move starts 12 places behind other moves, with the starting margin consistent with the published value of about −6.58 × 10⁻⁶. This is a fresh starting measurement.
- The later controlled test still needs to check cell activity during feedback. The calibration uses readings taken without feedback pulses.

## What was rebuilt

The source is GitHub commit [4a2c396](https://github.com/ethanramli/fly-chess-research/commit/4a2c3964b7eaeaa5736ead6d011b6ea2313749a1). The archived graph and annotations matched their historical SHA-256 hashes. The local inhibition package was rebuilt from the pinned contact data and tracked skeletons. The projection file matched the historical SHA-256. The 17 arrays match byte for byte, verified by reproducing the old archive hash with only the ZIP platform marker changed. The three boards were regenerated from their public game records and checked against the original board IDs, legal-move counts and safe captures. The original Windows activity dump was unavailable for direct comparison. Replayed activity summaries agree with the published diagnostic. [Experiment journal](https://github.com/ethanramli/fly-chess-research/blob/4a2c3964b7eaeaa5736ead6d011b6ea2313749a1/research/journal/experiments/2026-11-07-fly-connections-memory.md#L159)

The replay used the tracked diagnostic with a new input file for the three known boards. It took about 39 seconds on this machine after setup. The paused learning run was left untouched. The package includes the replay manifest, activity summaries, the scale calculation and the regenerated board records.
