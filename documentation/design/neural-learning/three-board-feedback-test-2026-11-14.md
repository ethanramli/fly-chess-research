# Three-board feedback test: current circuit against the quiet, rescaled circuit (2026-11-14)

**Built and checked on 2026-11-14; the run awaits the researcher's approval. Nothing has been launched on the real circuit.** Volume 2, *The Classroom*, chapters 3 (*To Learn*) and 5 (*Evidence for Learning*). This is a development screen on three development boards. It is not evidence for Properties 1–3, and the sealed test games stay untouched.

**Addendum 2026-11-15.** The researcher reports that the quiet learning-off run failed required check 3 on all 72 lessons: the worst comparison kept 22.35%, below 99%. By the rules below, the result is inconclusive; the other five runs are paused. Nothing below is changed. The [pulse scale check](pulse-scale-check-2026-11-15.md) measures pulsed activity before any revision ([journal item 37](../../../research/journal/experiments/2026-11-07-fly-connections-memory.md#37-2026-11-15-check-3-failed-in-the-quiet-learning-off-run)). Later the same day, a new protocol replaced the next step: each lesson reads the Kenyon cells without the pulse first. See [three-board test with the reading before feedback](three-board-reading-before-feedback-2026-11-15.md) ([journal item 40](../../../research/journal/experiments/2026-11-07-fly-connections-memory.md#40-2026-11-15-pivot-read-the-kenyon-cells-before-feedback)).

## The question in plain words

On each of three chess boards, the fly's model ranks a safe capture below some other move. Earlier tries at teaching it lifted every move together, so the safe capture never caught up (journal items 21, 30 and 31). This test asks whether a quieter version of the circuit lets lessons move the safe capture toward the top more than wrong lessons do. In the quiet circuit, background drive is switched off and cell activity is read on a calibrated scale. To count, the effect has to beat the current circuit too.

The main measure is **closure**: how much of the starting gap between the safe capture and its strongest rival the lessons remove. The key comparison is closure with correct lessons minus closure with the same lessons' reward and punishment labels swapped.

## The two circuits

Both circuits use the revision-4 learning rule on the 6,046 learnable Kenyon-cell connections onto the six output types, local inhibition, and the six-output score (attraction minus avoidance). The rule is in `probe-wide-learning-v2.mjs`.

| | Current | Quiet, rescaled |
|---|---|---|
| Background drive | 0.01 to every neuron (trainer default) | 0 |
| How a Kenyon cell's activity enters the rule | `k = max(0, rate) / 1.5` | `k = min(1, max(0, rate) / 0.014047)` |
| Dopamine factor | unchanged: the mean of `max(0, rate) / 1.5` per dopamine-neuron type, times the fixed 10-entry matrix | the same |

**The scale 0.014047 is fixed from activity alone.** It is the smallest scale that keeps at least 99% of the measured cell-activity difference between every pair of legal moves on the three boards before teaching. No scores or outcomes were used to choose it. Evidence and checks are in the [calibration replay check](../../../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/README.md). On these boards the cap touches one cell on two moves in total: one move on `SjmcbcGu:16` and one on `5XRGyGSj:13`, and none on `Q04sIPQ5:13`. Codex reran the full 6,046-connection calculation on the graph machine and reports that 0.014047 keeps at least 99% of every measured difference before teaching. In practice it is almost no cap at all: the real change in the quiet circuit is zero drive plus a cell reading about 107 times stronger (1.5 / 0.014047).

## Boards, lessons and conditions

**Boards:** `Q04sIPQ5:13`, `SjmcbcGu:16` and `5XRGyGSj:13`, from the replay's `inputs/boards.jsonl` (SHA-256 `fc058e1e…`). Each board has four lessons in a fixed order: two verified safe captures, then two verified unsafe captures. When a board has only one move of a kind, that move repeats.

| Board | Rewarded lessons | Punished lessons |
|---|---|---|
| `Q04sIPQ5:13` | d6c5, e5e4 | e5h2, e5b2 |
| `SjmcbcGu:16` | f2e3 twice | c3d5 twice |
| `5XRGyGSj:13` | g8g7 twice | c6d4 twice |

On `Q04sIPQ5:13` the best-scoring safe capture at default drive (f6e4) is not a lesson move. On the other two boards the only safe capture is itself the rewarded move.

**Conditions.** Every circuit runs all three, each with fresh memory on every board (3 conditions × 3 boards × 2 circuits = 18 fresh starts):

1. **Correct:** a safe capture sends current 0.75 to every PAM07 and PAM02 cell (reward neurons). An unsafe capture sends 0.75 to every PPL101 and PPL103 cell (punishment neurons).
2. **Swapped:** the same moves in the same order with the same currents, but the labels are reversed. Safe captures get the punishment current and unsafe captures get the reward current. Each pass still has two reward pulses and two punishment pulses. With two lessons of each kind, this is the only count-preserving assignment that makes every lesson wrong.
3. **Learning off:** the same lessons and currents as Correct, but no connection ever changes.

Each board gets 6 passes of its 4 lessons: 24 lessons, 12 reward pulses and 12 punishment pulses.

## What to record

- **Scores at every checkpoint:** the score of every legal move before teaching and after each of the 6 passes, in every condition (7 checkpoints).
- **Who is ahead at every checkpoint:** the best-scoring safe capture and the strongest rival (the best-scoring move that is not a verified safe capture), found again each time. Record their identities, so a change of rival or of best safe capture is visible.
- **Every lesson:** the move and the label delivered; the actual average firing of each dopamine-neuron type in that forward pass (PAM07, PAM02, PAM03, PPL101, PPL103); the learning signal for each of the six output types; the number of connections changed; and the number at their limits (0.2 or 1.8).
- **Cap during feedback** (quiet circuit, every lesson):
  1. Take the lesson's rates on the learnable connections, with each cell counted once per connection, as in `check_scale.mjs`.
  2. Compare them with every legal move's rates before teaching, and with the other lesson moves' rates in the same pass.
  3. For each comparison, compute the share of the summed difference that survives the cap.
  4. Also record the share of active readings at the cap, and how many of the capped cells were also active for the current rival at the start of that pass. A capped cell that the rival also uses is where the cap could hide a difference that matters.
- **Run record:** a `manifest.json` with status, pid, command, pinned input hashes, start and end times, and volume and chapter, written before the run starts and again when it ends.

## Definitions

- **Gap:** strongest rival's score minus best safe capture's score, before teaching. The three conditions within a circuit start from the same gap, because they start from the same fresh state.
- **Closure** after 24 lessons: `(gap before − gap after) / gap before`. 0 means no change, 100% means tied, above 100% means the safe capture overtook, and negative means the gap grew.
- **Advantage over swapped:** closure with correct lessons minus closure with swapped lessons, in percentage points of the same gap.
- **Tie tolerance:** `1e-9 + 1e-7 × largest |score|` on that board, as in the exact capacity checks.
- **Eligible board:** a board whose gap before teaching is at least 100 times the tie tolerance in that circuit. Boards where the safe capture already leads, or where the gap is too small, are reported but not counted.
- Report every result twice: as raw score changes (safe capture, rival and gap) and as percentages.

**Why percentages decide across circuits.** Raw scores are in different units in the two circuits: zero-drive scores are much smaller. So the only fair common measure is the share of each circuit's own gap. To show that a percentage is not hiding a tiny change, also report the gap as a share of the board's score range and the number of moves above the best safe capture.

## Required checks

Each check makes sure the comparison measures what it claims to. If any one fails, the whole result is **inconclusive** and the thresholds are not read.

1. **Learning off changes nothing.** Learning-off scores are bit-identical to the before-teaching scores at every checkpoint, and no connection changes. If they moved, something other than learning moves scores, and the correct-lesson change could not be credited to learning.
2. **No oversized step.** No lesson triggers the step-size guard (`0.5 × |learning signal| > 1`). A step that large would overshoot the rule's intended update. At the configured saturation of 1.5, each dopamine mean is at most 1, so the largest possible step is 0.65 and this check cannot fail on the real circuit. It is kept as a guard against a changed configuration.
3. **The cap still keeps move differences during lessons.** Quiet circuit: every cap comparison during feedback keeps at least 99%. The scale was chosen on forward passes without dopamine pulses. If lessons push cells above the cap, the quiet circuit could no longer tell moves apart, and a failure would say nothing about the idea.
4. **The current circuit is the one that already failed.** Its before-teaching scores on `Q04sIPQ5:13` equal [the replay baseline](../../../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/replay-files/valence-baseline/probe.json) exactly (f6e4 0.0038446924882009625, b8d7 0.003851270070299506). Otherwise the comparison circuit is not the one the earlier probes used.
5. **The runs are complete and match their condition.** All six runs ended with status `complete` and cover the three boards in order. The rules don't trust a run's own record of what it taught. They check it against the verified board packet (`boards.jsonl`, SHA-256 `fc058e1e…`):
   - Each board has exactly 24 lessons: the packet's four, in packet order, in each of the six passes, with the labels the run's condition assigns. A missing, repeated, extra or out-of-order lesson fails the check, even when the total is still 24.
   - Each board has 7 checkpoints in order, and each one scores every legal move in the packet.
   - The best safe capture, the rival and the gap are recomputed from the recorded scores and the packet's verified safe captures.

   Within each circuit, the three conditions start from identical scores, which shows the memory was fresh. Without these checks, a run that taught six lessons could still be read as a full test and trigger "expand".

## Decision rules, fixed before data

**In plain words.** The quiet circuit is worth more boards only if correct lessons pull the safe capture clearly closer to first place, wrong lessons do not, and the old circuit could not do the same. If correct lessons do barely better than wrong ones, we stop pursuing the quiet circuit. Anything else, or too little data to compare, leaves the question open.

Apply the steps in order. The first one that matches gives the answer.

**Values exactly on a cutoff.** Exactly 20% closure, exactly 20 points over swapped and exactly 10 points over the current circuit each meet their requirement. Exactly 5 points over swapped is not "under 5 points", so it does not trigger drop. Closures are ratios of score differences, so a value meant to sit on a cutoff can be computed a hair to either side. With the real first board's gap, a 20% closure computes as 0.19999999999994725. So a value within 1e-9 of a cutoff counts as being on it. That is a billionth of the gap, far below any difference that matters. The cutoff numbers are unchanged.

1. **Inconclusive** if a required check fails, or if fewer than 2 boards are eligible in both circuits. Rule (c) below compares the two circuits on the same board, so a board counts only if it is eligible in both.
2. **Expand to 12 boards** if, on at least 2 boards eligible in both circuits, the quiet circuit has:
   - (a) closure with correct lessons of at least 20%. This rules out a change too small to matter.
   - (b) an advantage over swapped of at least 20 points. This rules out lessons that lift every move together: swapped lessons would then close the gap about as much.
   - (c) an advantage at least 10 points larger than the current circuit's advantage on that board. This rules out an effect that the old circuit already shows, so the change to the circuit gets the credit.
3. **Drop the quiet, rescaled circuit** if its advantage over swapped is under 5 points on every board eligible in the quiet circuit. We would stop testing zero drive with the 0.014047 reading, because correct lessons barely beat wrong ones.
4. **Inconclusive** otherwise: the result falls between the expansion and drop cutoffs.

The two cutoffs cannot both hold: expansion needs an advantage of at least 20 points on two boards, and dropping needs under 5 points on every board.

**Worked example.** Suppose the quiet circuit, on two boards eligible in both circuits, closes 50% of the gap with correct lessons and 10% with swapped labels: an advantage of 40 points. On those boards the current circuit closes 5% and 0%: an advantage of 5 points. All three cutoffs hold (50 ≥ 20, 40 ≥ 20, 40 − 5 ≥ 10), so the test expands. If the current circuit's advantage were 35 points, (c) would fail. The quiet advantage of 40 is above the drop line, so the answer would be inconclusive. If only one board were eligible in both circuits, step 1 would give inconclusive before any threshold is read.

**Where the thresholds come from.**

- **The 5-point drop line:** the current circuit closed about 1.2% of the gap on its one fresh board (journal item 31: −6.58e-6 to −6.50e-6). A result under 5 points is little better than what already failed.
- **The 20% lines:** the earlier rescaled gamma-only probe closed about 19% in 16 lessons, but the unrewarded lesson move rose almost as much (journal item 21: −1.684e-5 to −1.365e-5). A pass must beat that movement *and* be selective.
- **Changes from the 2026-11-14 draft:** no numbers changed. Two points were clarified before data. "Eligible" means eligible in both circuits for the expansion rule, because rule (c) needs both values. Closure is judged after all 24 lessons, with every pass reported.
- **Second change, made at the build on 2026-11-14 and still before data:** the rules now give exactly one answer. Before, the drop rule needed only the quiet circuit's own checks and 2 boards eligible in it. So one result could read as both "drop" and "inconclusive": all checks passing in the quiet circuit, a failed check in the current circuit, or only one board eligible in both. Now any failed check, or fewer than 2 boards eligible in both circuits, gives inconclusive first. The cutoff numbers are unchanged.
- **Third change, after Codex's review of `5c0f6fe3`, still before data:** two bugs in the rules code were fixed. Values exactly on a cutoff are now counted as described above; the cutoff numbers are unchanged. Lesson records are now checked against the board packet, because a run with six lessons could otherwise trigger "expand".
- **Not required here:** becoming the top move is reported only.

**If it expands:** the 12-board test uses the first 12, in file order, of the 13 practice boards from the dry-run development packet that this test does not use. Its gates are written down before data, and an absent-pulse condition is added. A later test lets the fly choose its own moves. Sealed games remain untouched.

## What is built (2026-11-14)

1. **Scale recheck: done by Codex.** Codex reports rerunning the replay's `check_scale.mjs` with the graph and annotations: 0.014047 keeps at least 99% of every measured difference before teaching. The checker's import had to be repointed first, because the copy now sits in a different folder ([scale check](../../../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/README.md)). Codex's output file is not in the repository.
2. **Baseline check: done by Codex.** Codex reports that all three boards clear the starting-gap cutoff in both circuits. The real run measures its own starting gaps and applies the cutoff again, so the verdict does not rest on this report.
3. **The probe:** [`probe-wide-learning-v3.mjs`](../../../.codebase/scripts/neural-learning/probe-wide-learning-v3.mjs). One process runs one circuit and one condition on the three boards. v2 stays unchanged as item-31 evidence. Compared with v2, it adds:
   - `--circuit current|quiet`. The quiet circuit's drive (0) and scale (0.014047) are fixed in code, so they cannot be mistyped.
   - `--condition correct|swapped|off`
   - fresh memory for every board: the 6,046 learnable connections are restored to their exact starting values, and nothing else ever changes
   - every legal move's score at every checkpoint
   - the per-lesson dopamine and cap records
   - the manifest, which also checks every input hash in the config before loading the graph
   - a refusal to start in a folder that already holds a run
   - only the three development boards, by name: no other board is read
4. **The shared rules:** [`three-board-feedback-v1.mjs`](../../../.codebase/src/neural-learning/three-board-feedback-v1.mjs) holds the learning step, the cap check and the decision rules, so the probe and the rules script use one copy.
5. **The rules script:** [`apply-three-board-rules-v1.mjs`](../../../.codebase/scripts/neural-learning/apply-three-board-rules-v1.mjs) reads the six run folders and the verified board packet (it stops if the packet hash differs), applies the required checks and the decision rules, and prints the raw changes and percentages per board.
6. **Tests:** [`three-board-feedback-v1.test.mjs`](../../../.codebase/tests/neural-learning/three-board-feedback-v1.test.mjs) (24 tests). A tiny made-up circuit checks the lesson loop. Made-up results check every verdict, including the case where only one board is eligible in both circuits. They also check values exactly at, just below and just above each cutoff, and runs with missing, repeated or reordered lessons.

**Inputs pinned by the config.** The run uses the replay's config, `runs/replay-calibration-inputs/calibration-config.json`. Its tracked copy hashes to `dcfceb3a…`. The config pins the graph, the annotations, the three games, `boards.jsonl`, the mapping check and the replay's rebuilt local-inhibition package (`package.json` `034ba699…`, `sites.npz` `cb83c177…`). The probe stops if any hash differs, and records the hashes of the config, itself and the shared rules in each manifest.

## How to run it (after approval)

From the repository root on the graph machine, one run per circuit and condition:

```
node --max-old-space-size=512 .codebase/scripts/neural-learning/probe-wide-learning-v3.mjs --config runs/replay-calibration-inputs/calibration-config.json --circuit current --condition correct --out runs/three-board-feedback-2026-11-14/current-correct
```

Repeat for `current swapped`, `current off`, `quiet correct`, `quiet swapped` and `quiet off`, each into its own `CIRCUIT-CONDITION` folder. Then:

```
node .codebase/scripts/neural-learning/apply-three-board-rules-v1.mjs --runs runs/three-board-feedback-2026-11-14 --baseline research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/replay-files/valence-baseline/probe.json --packet runs/replay-calibration-inputs/boards.jsonl --out runs/three-board-feedback-2026-11-14/decision.json
```

- **Cost:** about 814 network passes per run, 4,884 in all. Each run needs about 280 MiB.
- **Serial or parallel:** AGENTS.md keeps graph experiments serial, which takes roughly two hours. Six runs at once would take roughly 20 minutes and stay within the memory limits, but needs the researcher's explicit approval.
- The 512 MiB heap matches v2's usage line. CPU duty pacing is not implemented, as in v2.

## Biggest uncertainty

The quiet circuit changes two things at once: zero drive and the rescaled reading. A pass will not say which one mattered. Also, at zero drive the safe capture and its rival share 97–99% of their active cells. If the swapped condition moves the gap as much as the correct one, the circuit is still lifting moves together. In that case the result is a drop or inconclusive, not a learning result.

Evidence: [calibration replay check](../../../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/README.md); [journal items 33–34](../../../research/journal/experiments/2026-11-07-fly-connections-memory.md#33-2026-11-14-three-board-feedback-test-protocol-and-corrections-found); [next checkpoint](../../next-checkpoint.md).
