# Three-board feedback test: current circuit against the quiet, rescaled circuit (2026-11-14)

**Proposal awaiting the researcher's approval. Nothing is built or launched.** Volume 2, *The Classroom*, chapters 3 (*To Learn*) and 5 (*Evidence for Learning*). This is a development screen on three development boards. It is not evidence for Properties 1–3, and the sealed test games stay untouched.

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

**The scale 0.014047 is fixed from activity alone.** It is the smallest scale that keeps at least 99% of the measured cell-activity difference between every pair of legal moves on the three boards before teaching. No scores or outcomes were used to choose it. Evidence and checks are in the [calibration replay check](../../../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/README.md). On these boards the cap touches one cell on one move per board. In practice it is almost no cap at all: the real change in the quiet circuit is zero drive plus a cell reading about 107 times stronger (1.5 / 0.014047).

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
  4. Also record the share of active readings at the cap, and whether a capped cell feeds the current rival.
- **Run record:** a `manifest.json` with status, pid, command, pinned input hashes, start and end times, and volume and chapter, written before the run starts and again when it ends.

## Definitions

- **Gap:** strongest rival's score minus best safe capture's score, before teaching. The three conditions within a circuit start from the same gap, because they start from the same fresh state.
- **Closure** after 24 lessons: `(gap before − gap after) / gap before`. 0 means no change, 100% means tied, above 100% means the safe capture overtook, and negative means the gap grew.
- **Advantage over swapped:** closure with correct lessons minus closure with swapped lessons, in percentage points of the same gap.
- **Tie tolerance:** `1e-9 + 1e-7 × largest |score|` on that board, as in the exact capacity checks.
- **Eligible board:** a board whose gap before teaching is at least 100 times the tie tolerance in that circuit. Boards where the safe capture already leads, or where the gap is too small, are reported but not counted.
- Report every result twice: as raw score changes (safe capture, rival and gap) and as percentages.

**Why percentages decide across circuits.** Raw scores are in different units in the two circuits: zero-drive scores are much smaller. So the only fair common measure is the share of each circuit's own gap. To show that a percentage is not hiding a tiny change, also report the gap as a share of the board's score range and the number of moves above the best safe capture.

## Validity checks

If any one fails, that circuit's result is **inconclusive**:

1. Learning-off scores are bit-identical to the before-teaching scores at every checkpoint.
2. No lesson triggers the step-size guard (`0.5 × |learning signal| > 1`).
3. Quiet circuit: every cap comparison during feedback keeps at least 99%.
4. Current circuit: the before-teaching scores on `Q04sIPQ5:13` equal [the replay baseline](../../../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/replay-files/valence-baseline/probe.json) exactly (f6e4 0.0038446924882009625, b8d7 0.003851270070299506).

## Decision rules, fixed before data

| Outcome | Rule |
|---|---|
| **Expand to 12 boards** | On at least 2 boards eligible in **both** circuits, the quiet circuit has (a) closure with correct lessons of at least 20%, (b) an advantage over swapped of at least 20 points, and (c) an advantage at least 10 points larger than the current circuit's advantage on that board. |
| **Drop the quiet, rescaled approach** | The quiet circuit's validity checks hold, at least 2 boards are eligible in it, and its advantage over swapped is under 5 points on every eligible board. |
| **Inconclusive** | Any other result, including fewer than 2 boards eligible in both circuits. |

**Where the thresholds come from.**

- **The 5-point drop line:** the current circuit closed about 1.2% of the gap on its one fresh board (journal item 31: −6.58e-6 to −6.50e-6). A result under 5 points is little better than what already failed.
- **The 20% lines:** the earlier rescaled gamma-only probe closed about 19% in 16 lessons, but the unrewarded lesson move rose almost as much (journal item 21: −1.684e-5 to −1.365e-5). A pass must beat that movement *and* be selective.
- **Changes from the 2026-11-14 draft:** no numbers changed. Two points were clarified before data. "Eligible" means eligible in both circuits for the expansion rule, because rule (c) needs both values. Closure is judged after all 24 lessons, with every pass reported.
- **Not required here:** becoming the top move is reported only.

**If it expands:** the 12-board test uses the first 12, in file order, of the 13 practice boards from the dry-run development packet that this test does not use. Its gates are written down before data, and an absent-pulse condition is added. A later test lets the fly choose its own moves. Sealed games remain untouched.

## Build plan (smallest version)

1. **Scale recheck.** On a machine with `.cache/full.npz` and `.cache/flywire-annotations-v2.1.0.tsv`, rerun the replay's `check_scale.mjs` on its `all-kc.json`. It must reproduce `scale.json`. If it does not, stop.
2. **Baseline check, no new code.** Run the existing `probe-wide-learning-v2.mjs --boards 3 --repeats 0` once at default drive and once with `--bias 0`. This gives both circuits' starting gaps and must reproduce validity check 4. If fewer than 2 boards are eligible in both circuits, stop: the expansion rule could not be met.
3. **New probe.** Write `probe-wide-learning-v3.mjs` as a copy of v2 (v2 stays unchanged as item-31 evidence). It adds:
   - a condition option (Correct, Swapped, Learning off)
   - a `--kc-scale` option
   - a fresh model for every board
   - full score lists at every checkpoint
   - the per-lesson dopamine and cap records
   - the manifest
4. **Rules script.** A short separate script reads the six result files and applies the rules above.
5. **Inputs to pin:** graph, annotations, the replay's rebuilt local-inhibition package (`package.json` `034ba699…`, `sites.npz` `cb83c177…`), `boards.jsonl` and both scripts.
6. **Cost:** about 4,900 network passes, roughly 20 minutes on six workers. Each worker needs about 280 MiB, within the 2,048 MiB process limit.

Steps 1–2 run the simulator, so they need the researcher's approval, as does the run itself.

## Biggest uncertainty

The quiet circuit changes two things at once: zero drive and the rescaled reading. A pass will not say which one mattered. Also, at zero drive the safe capture and its rival share 97–99% of their active cells. If the swapped condition moves the gap as much as the correct one, the circuit is still lifting moves together. In that case the result is a drop or inconclusive, not a learning result.

Evidence: [calibration replay check](../../../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/README.md); [journal items 33–34](../../../research/journal/experiments/2026-11-07-fly-connections-memory.md#33-2026-11-14-three-board-feedback-test-protocol-and-corrections-found); [next checkpoint](../../next-checkpoint.md).
