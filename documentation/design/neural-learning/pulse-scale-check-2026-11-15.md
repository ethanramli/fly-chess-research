# Pulse scale check: how the quiet circuit's scale affects move differences and update size (2026-11-15)

**Built and tested on synthetic inputs on 2026-11-15. Nothing has run on the real graph.** The recording needs the researcher's approval. Volume 2, *The Classroom*, chapters 3 (*To Learn*) and 5 (*Evidence for Learning*). This is a development tool for the [three-board feedback test](three-board-feedback-test-2026-11-14.md). It is not a learning result, and the sealed test games stay untouched.

## Why this exists

The quiet circuit reads each Kenyon cell's activity as `min(1, rate / 0.014047)`. Any rate above 0.014047 is flattened to the same reading. The scale was chosen so that flattening keeps at least 99% of the activity difference between any two moves. It was chosen from forward passes **without** a reward or punishment pulse.

During a lesson, the circuit gets a pulse. The researcher reports that the real learning-off run of the quiet circuit failed required check 3 on all 72 lessons. That check asks the cap to keep at least 99% of each lesson's activity difference from the other moves. The worst comparison kept only 22.35%. So during pulses, some cells go well above 0.014047, and the cap hides most of what makes a lesson's activity differ. By the protocol's own rule, a failed check makes the whole test inconclusive. Five of the six runs are paused.

A larger scale would flatten less. But the learning rule uses the same reading. Each update is `0.5 × learning signal × (reading + gain − 1)`, A larger scale lowers the reading. Starting from a gain of 1, that makes every update smaller; after gains have moved, the replay below measures the effect rather than assuming it. This tool measures both effects on the same three boards, so the researcher can choose a scale, or a different fix, knowing what it costs.

**Why a diagnostic graph run is justified here** (AGENTS.md core iteration rule). The question blocks the feedback experiment directly: while check 3 fails, every quiet-circuit result is inconclusive. The question is: which scale keeps at least 99% of move differences during pulses, and how much smaller do updates become at that scale? The next feedback-enabled step is to rerun the three-board feedback test's six runs. That rerun would use a revised scale or check, written as a dated protocol revision before any lesson data from those runs. The researcher decides that revision.

## What the tool does

1. **The recorder** ([`record-pulse-readings-v1.mjs`](../../../.codebase/scripts/neural-learning/record-pulse-readings-v1.mjs)), for the graph machine. It runs the quiet circuit (zero drive) with connection weights fixed. Every legal move on the three development boards gets three forward passes: no pulse, a reward pulse and a punishment pulse. That is 106 moves × 3 = 318 passes. It records:
   - the rate of every cell feeding a learnable connection
   - the mean firing of each dopamine-neuron type and the learning signal for each of the six output types
   - the move score
   - the mapping of the 6,046 learnable connections: each connection's graph edge, output type, presynaptic cell and starting weight

   The graph setup, input pin checks and resource guard (RSS at most 2,048 MiB, at least 256 MiB free) are copied from `probe-wide-learning-v3.mjs`. The copy leaves v3 unchanged, because completed runs pin its hash. The recorder fingerprints every weight the forward pass reads (connection weights, their signed copy and the drive) before and after capture. It fails if anything changed.

2. **The report** ([`report-pulse-scale-v1.mjs`](../../../.codebase/scripts/neural-learning/report-pulse-scale-v1.mjs)), offline. It loads no graph. It refuses a recording that is incomplete or does not match: an unfinished run, a missing or repeated move and pulse, a different board packet, unconfirmed fixed weights, or a mapping that does not cover exactly 6,046 connections. The shared code is in [`pulse-readings-v1.mjs`](../../../.codebase/src/neural-learning/pulse-readings-v1.mjs). It reuses the rule, pulses, cap share and cell reading from `three-board-feedback-v1.mjs`, which is not edited.

## What the report shows

**How much moves differ.** For each board, it gives the summed activity difference between moves with no pulse, between moves that all get a reward pulse, and between moves that all get a punishment pulse. Each cell is counted once per learnable connection, as in the calibration. It also gives how far each pulse moves a move's own activity, the highest rate under each pulse, and the share of active readings at the old cap.

**Two kinds of comparison.** For each kind, the report gives the worst share kept at 0.014047, how many comparisons fail, and the smallest scale, in steps of 0.000001, that keeps at least 99%. It also gives the share kept one step below that scale, so the boundary is visible from both sides.

| Set | What is compared | Why it matters |
|---|---|---|
| Protocol, correct labels | Exactly check 3 of the learning-off run: each lesson's pulsed activity against every legal move with no pulse, and against the earlier lessons in the same pass | This is the comparison that failed. It mixes two things: differences between moves, and the pulse's own push on the cells. |
| Protocol, swapped labels | The same check with the swapped condition's pulses, at fixed weights (its first pass) | Swapped lessons put reward pulses on different moves, so the boundary can differ. |
| Same pulse: none | Every pair of different moves, no pulse | The original calibration. If the recorder reads the same cells as the calibration did, it gives 0.014047 again. |
| Same pulse: reward, and same pulse: punishment | Every pair of different moves receiving the same pulse | Whether the circuit can still tell moves apart during a lesson, without counting the pulse's push as a move difference |

With weights fixed, all six passes repeat, so one pass gives all 72 lessons of the learning-off run.

**The update replay.** At the old scale and at each set's smallest passing scale, it replays the probe's update arithmetic. That means 24 lessons per board, for correct and for swapped labels, from the same fixed readings. It reports:
- how far gains move from 1
- how far the correct and swapped gain sets end up apart (mean, largest and root-mean-square difference per connection, and the mean after each pass)
- how many gains reach their limits
- whether each set passes 99% at that scale
- the share of each lesson's reading that the pulse adds on top of the same move without a pulse

That last number tests the strongest rival explanation. If the pulse supplies most of the reading, then updates follow the pulse rather than the move. That is the pattern that lifted every move together in journal items 21, 30 and 31.

**What the replay cannot say.** It estimates update size with the readings held fixed. In a real run, the readings change as the gains change: the output cells feed back to the dopamine cells. So actual learning, and any change in the safe capture's rank, remains unmeasured. A larger gap between correct and swapped gains is not a closure result.

**Cross-checks printed first.** The report compares its own numbers with earlier results:
- the calibration's no-pulse worst shares (100%, 99.0003%, 99.0054%) and its scale 0.014047
- the researcher's 22.35% and 72 of 72 failing lessons
- optionally, with `--learning-off-run`, the real learning-off run's `result.json`. Every lesson's worst share and every starting move score must be bit-identical, because the recorder runs the probe's own forward with the same fixed weights.

A mismatch is printed as `DIFFERS` and is not corrected. It would mean the calibration, the probe and the recorder did not read the same cells.

## What stays fixed

The protocol, its cutoffs and the 99% requirement are unchanged. The report gives no recommended scale. Choosing one is the researcher's decision and would be a dated protocol revision. The five paused runs, the sealed games and all historical outputs are untouched.

## How to run it on the graph machine (after approval)

From the repository root, on this branch, check the tools first. The tests use synthetic inputs and the tracked board packet:

```
node --test .codebase/tests/neural-learning/pulse-readings-v1.test.mjs
```

Record (one run; estimated at about 10 minutes and about 300 MiB from the probe's timing and memory; not measured):

```
node --max-old-space-size=512 .codebase/scripts/neural-learning/record-pulse-readings-v1.mjs --config runs/replay-calibration-inputs/calibration-config.json --out runs/pulse-readings-2026-11-15/quiet-fixed-weights
```

Report, with the exact comparison against the learning-off run. If that run is in a different folder, point `--learning-off-run` at it:

```
node --max-old-space-size=256 .codebase/scripts/neural-learning/report-pulse-scale-v1.mjs --recording runs/pulse-readings-2026-11-15/quiet-fixed-weights --packet runs/replay-calibration-inputs/boards.jsonl --learning-off-run runs/three-board-feedback-2026-11-14/quiet-off --out runs/pulse-readings-2026-11-15/report.json
```

`--scales 0.02,0.03` adds scales to the replay. The recorder refuses a folder that already holds a run, and the report refuses to overwrite its output file. On the Mac, the report took 2.3 s and 116 MiB on a synthetic recording of the real size: 3,770 cells, 6,046 connections and 318 readings.

## Tests (2026-11-15, synthetic inputs)

[`pulse-readings-v1.test.mjs`](../../../.codebase/tests/neural-learning/pulse-readings-v1.test.mjs) has 9 tests:

- **Unchanged weights.** Capture on a tiny made-up circuit leaves every weight bit-identical, and each pulse reaches only its own dopamine cells. A forward pass that changes one weight is caught.
- **Same check as the probe.** The report's protocol comparisons equal the probe's own learning-off cap records exactly: the same worst share, and the same number of comparisons.
- **Scale boundary.** On readings where the answer can be worked out by hand, the search finds the smallest passing scale: 0.009901, and 0.029400 when cells are weighted (it would be 0.029600 unweighted). One step below each fails. On 20 random cases, the binary search gives the same scale as checking every 0.000001 step.
- **Replay arithmetic.** Each replayed lesson changes a gain by 0.5 × learning signal × (reading + gain − 1), as the probe's rule does. This is checked on the first and second passes, because the gain term is zero on the first.
- **Incomplete input rejection.** Recordings are rejected when a reading is missing or repeated, the run is unfinished, the packet differs, fixed weights are unconfirmed, the record count is wrong, the mapping is short or its weights are wrong, the rates are malformed, the feedback signals are missing, or a move is not legal.
- **Larger scale, smaller updates.** In one constructed case, the old scale fails every one of the 72 lessons. The smallest passing scale is larger and passes 99%. Yet on every board it gives smaller gain changes, less difference between correct and swapped gains, and fewer capped readings.
- **End to end.** The report script runs on synthetic files. It refuses a mapping without 6,046 connections, matches a learning-off run that agrees, flags one that differs by 1e-12 in one lesson, and refuses a run from the wrong condition. The recorder stops at a wrong input pin before reading the graph, marks its manifest `failed`, and refuses a used folder.

**Each test was shown to fail when its code is broken.** Ten deliberate breaks were made, one at a time, and every one was caught:
- a pulse sent to the wrong cells
- no weight check
- earlier lessons left out of the protocol comparisons
- a boundary one step too high
- a coarser search
- the gain term dropped from the rule
- no missing-reading check
- the replay ignoring the scale
- a tolerant learning-off comparison
- no pin check

The first sweep missed two of these breaks: the left-out earlier lessons, and the dropped gain term. Those two tests were strengthened, as described above.

## Focused science review (2026-11-15, before any real recording)

Science track, solo review by the builder, so it is not independent. It covers the worksheet rows this tool can affect. The question is whether the report can tell the researcher what a scale costs without implying a learning result.

| Row (points) | Objection | Check | Disposition |
|---|---|---|---|
| Variables and controls (8) | Check 3 compares a pulsed lesson with unpulsed moves, so it also counts the pulse's own push as a "difference". A scale can pass it just by keeping that push, or by capping nothing at all, while saying nothing about telling moves apart. | The report shows same-pulse comparisons next to the protocol ones. For each replayed scale, it also shows the share of the reading added by the pulse, and the share of lesson readings still capped. | Addressed in the design; **open until real data**. If the protocol set needs a scale near the highest pulsed rate (almost nothing capped), but the same-pulse sets pass far lower, then the check as written measures pulse preservation. Which set should govern check 3 is then a protocol question for the researcher. |
| Mathematics and statistics (5) | The binary search assumes the kept share never falls as the scale rises. | Derivation: each term `|min(a, s) − min(b, s)|` cannot fall as `s` rises, and the denominator is fixed. Test: the search agrees with checking every step on 20 random cases. Both sides of each boundary are reported. | Confirmed for the tested scope. |
| Sufficiency for the conclusion (5) | Gain change from fixed readings could be read as learning. In a real run, the readings move as gains change. | The report and this page say the replay estimates update size only. No closure, rank or score change is computed. | Disclosed limit. A larger correct-vs-swapped gap is not evidence that the safe capture moves up. |
| Systematic collection (5) | The 22.35% and 72-of-72 rest on the researcher's report; the raw files are not in the repository. | `--learning-off-run` requires every lesson's share kept and every starting score to match the real run bit for bit. | Open until the recording runs. |
| Testability (4) | The report lists several candidate scales and gives no rule for choosing. Choosing by the replayed gain gap would mean picking on a learning proxy. | None possible in code; the scale choice is the researcher's. | **Recommendation:** before reading the replay, write down which comparison set governs check 3. Choose the scale from activity alone, and label any choice informed by the replay as exploratory. |

**What the review lets us say.** Once it runs on the graph machine, the tool can say which scale keeps 99% for each kind of comparison, and how much smaller fixed-reading updates become there. It cannot say whether any scale lets the fly learn.

Evidence and history: [journal items 37–38](../../../research/journal/experiments/2026-11-07-fly-connections-memory.md#37-2026-11-15-check-3-failed-in-the-quiet-learning-off-run); [three-board protocol](three-board-feedback-test-2026-11-14.md); [calibration scale check](../../../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/README.md).
