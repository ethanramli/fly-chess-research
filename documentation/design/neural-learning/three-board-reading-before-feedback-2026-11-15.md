# Three-board test with the reading before feedback (2026-11-15)

**Written and built on 2026-11-15, before any data from this rule. Nothing has run on the real graph. Every run below needs the researcher's approval.** Volume 2, *The Classroom*, chapters 3 (*To Learn*) and 5 (*Evidence for Learning*). This is a development screen on three development boards. It is not evidence for Properties 1–3, and the sealed test games stay untouched.

## What changes, in plain words

In each lesson, the fly's model sees a move and then gets a reward or punishment pulse. The learning rule needs two things from that lesson: which Kenyon cells the move turned on, and what the dopamine cells said about it.

Until now, the rule took both from the same moment: the forward pass that already had the pulse in it. The pulse itself also turns Kenyon cells on. So the rule saw the pulse's own activity mixed in with the move's. In the quiet circuit, that extra activity pushed cells past the reading cap of 0.014047, and the cap flattened the differences between moves. Required check 3 caught this: the worst lesson kept only 22.35% of a move difference, where 99% was needed, on all 72 lessons of the quiet learning-off run ([journal item 37](../../../research/journal/experiments/2026-11-07-fly-connections-memory.md#37-2026-11-15-check-3-failed-in-the-quiet-learning-off-run)).

**The new rule reads the Kenyon cells first, with no pulse, and then delivers the pulse.** The first look gives the **reading before feedback**: what the move alone turned on. The second pass gives only the dopamine signal. So the rule learns from what the move did, not from what the pulse did. This is the order the fly sees in conditioning experiments, where odour activity comes before the dopamine ([source and approximations](#source-and-approximations)).

**Why the scale can stay at 0.014047.** That scale was chosen to keep at least 99% of every difference between moves when no pulse is present (worst pair 99.0003%, [calibration check](../../../research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/README.md)). The new rule reads exactly those pulse-free readings. So the calibration now applies to the readings the rule uses, and no new scale has to be chosen. This also removes the open scale choice of the [pulse scale check](pulse-scale-check-2026-11-15.md) for this rule. That page's recorder is still needed, because its pulse-free readings feed the offline check below.

**What we look for.** First, a cheap check on saved data asks whether the new rule could plausibly favour the safe capture at all. If it can't, we stop before spending six graph runs. If it might, the six runs ask the same question as before, under the same cutoffs: do correct lessons pull the safe capture toward first place clearly more than swapped lessons, and more than in the current circuit?

## What stays the same

The [2026-11-14 protocol](three-board-feedback-test-2026-11-14.md) stays as written, and its result stays inconclusive. This page is a new protocol with a new probe and new rules files. Everything below is copied unchanged from it:

- the two circuits (current: drive 0.01, reading `rate / 1.5`; quiet: drive 0, reading `min(1, rate / 0.014047)`)
- the three boards, their four lessons per pass, six passes and the order of lessons
- the three conditions (correct, swapped, learning off), fresh memory on every board, and the pulse current 0.75 to PAM07 and PAM02 (reward) or PPL101 and PPL103 (punishment)
- the dopamine means, the fixed 10-entry matrix, the learning step and the gain limits 0.2 and 1.8
- the cap comparison, the 99% requirement, the tie tolerance, the eligibility rule, closure, advantage, the 1e-9 slack at cutoffs, and every cutoff number

Both circuits use the new rule. Rule (c) below compares the two circuits, so both must learn the same way for the comparison to credit the circuit and not the rule.

## The rule

For each of the 6,046 learnable connections `i`, from Kenyon cell `j` onto an output cell of type `m`:

```
gain[i] ← clip to [0.2, 1.8] of  gain[i] + 0.5 × D[m] × (reading before feedback of j + gain[i] − 1)
```

- **Reading before feedback** of cell `j`: the cell's reading in the pulse-free pass of the lesson move, using the circuit's reading (`rate / 1.5` in the current circuit, `min(1, rate / 0.014047)` in the quiet one). It uses the gains as they stand at that moment, so it reflects everything learned so far.
- **`D[m]`**: the learning signal for output type `m`, computed from the dopamine cells' mean firing in the pulsed pass, times the fixed matrix. This is unchanged.

The only change from the 2026-11-14 rule is where the reading comes from.

## The two-pass lesson

Each lesson runs two forward passes of the same move, one straight after the other, with no gain change between them:

1. **Reading pass, no pulse.** Run the move. Copy every learnable Kenyon cell's rate and turn it into the reading before feedback. Record the move's score, the dopamine means, a fingerprint (SHA-256) of the cell rates, and a fingerprint of the gains.
2. **Feedback pass, with the lesson's pulse.** Run the same move with the reward or punishment current. Compute the dopamine means and the learning signal `D`. Record a fingerprint of the gains again; it must equal the first.
3. **Check the step size** as before (`0.5 × |D| > 1` stops the run before any change).
4. **Update** every learnable gain with the rule above.

Each forward pass starts from rest, so "before" means first in the lesson's order. It is not a time interval in the simulation. Each run needs 886 forward passes: 742 for the 7 checkpoints and 144 for the 72 lessons, 72 more than the 2026-11-14 probe.

## Source and approximations

The rule is linked to the registered [Handler et al. 2019 entry](../../../research/literature/source-solution-register.md#2026-10-09-gamma2-timing-dependent-plasticity-candidate) and its [2026-11-15 addendum](../../../research/literature/source-solution-register.md#2026-11-15-reading-before-feedback-in-the-three-board-test). That entry records gamma2 Kenyon-cell-to-output changes that depend on whether odour activity comes before or after dopamine, with receptor perturbations chiefly as gamma4 evidence. The source motivates one thing here: the Kenyon-cell activity that pairs with dopamine is the activity present before the dopamine arrives. No new source was read for this page.

Approximations, which the source does not supply:

- **Order, not timing.** The two passes are separate runs from rest, with no trace carried between them and no interval in simulated time. Model steps are not biological time.
- **One order only.** Only the before-then-pulse order is modelled. The opposite order, which the source reports can change the sign of the change, is not.
- **Sign from the matrix.** Whether a gain rises or falls comes from the fixed matrix and the `(reading + gain − 1)` term of the existing rule, not from the timing evidence. Where `D` is negative, an active cell's gain falls, which matches the depression seen when odour comes first. Where `D` is positive, the rise is not supported by this source.
- **Beyond the sourced compartments.** The evidence is chiefly from gamma compartments; the rule applies it to all six output types.
- **A rate, not a trace.** The reading is the end-of-pass rate, not a decaying eligibility trace, and no receptor types are modelled.
- **Mixed feedback pass.** The pulsed pass still contains the move, so `D` includes any dopamine activity the move itself evokes, as in the 2026-11-14 rule.

## Before the six runs: the offline check on saved data

**Why.** The six runs take graph time and need approval. A cheap first look can rule the rule out. If the rule's own first steps already fail to favour the safe capture, the six runs could not reach "expand". The check needs one graph recording, the [pulse scale check](pulse-scale-check-2026-11-15.md)'s fixed-weight recording. That recording is a diagnostic graph run with no feedback learning. It answers one named question that blocks the feedback runs: could the new rule's updates favour the safe capture at all? The feedback-enabled next step is the six runs below. The check itself runs offline and loads no graph.

**Inputs.**
- the fixed-weight recording: every legal move with no pulse, a reward pulse and a punishment pulse, with the weights fixed. It holds the 3,770 learnable Kenyon cells' rates, the dopamine means and learning signals, and the mapping of the 6,046 connections with their starting weights.
- the saved quiet learning-off run, `runs/three-board-feedback-2026-11-14/quiet-off/result.json`
- the verified board packet (`boards.jsonl`, SHA-256 `fc058e1e…`)
- the annotation file, used only to count the output cells of each type

**Replay.** For each board, and for correct and swapped labels separately, run the rule's 24 updates from fresh gains. Each lesson uses its move's **pulse-free rates** as the reading and the learning signal recorded with that move's pulse. The scale is 0.014047. This is the existing unpulsed-reading replay of the pulse scale report, applied to this rule.

**Push toward the safe capture.** At the start, find the best safe capture and the strongest rival from the recorded pulse-free scores, as the rules do. A learnable connection from cell `j` onto an output cell of type `m` adds `starting weight × gain × rate of j` to that output cell's input. So the gain changes shift the safe-minus-rival input difference on type `m` by:

```
sum over type-m connections of  starting weight × (gain − 1) × (safe capture's rate of j − rival's rate of j)
```

These are the **per-output-type safe-minus-rival sums**. The score averages the attraction cells (MBON11, MBON12, MBON02) minus the avoidance cells (MBON05, MBON01, MBON15). So one unit of input on a type-`m` cell moves the score by `±1 / (number of cells in m's group)`, plus for attraction and minus for avoidance. The **push** is the sum of the six type sums weighted this way. A positive push means the changed gains favour the safe capture over the rival. The cell counts come from the annotation file, which is why the commands below count them first.

The push holds every rate and learning signal at its learning-off value. It is a first-order estimate of the input change and ignores the network's response to it. The screen uses only its signs and comparisons, never its size.

**Self-check.** Before reading any answer, the check confirms its inputs and arithmetic. If any part fails, it reports "self-check failed", reads no answer, and exits with status 1.

1. The saved learning-off run and the recording agree exactly: all 72 lessons with the packet's boards, passes, moves and labels and bit-identical dopamine means and learning signals, and all 106 starting move scores bit-identical. Both come from the same circuit with the same weights, so any difference means they did not read the same thing.
2. On every connection, the first replayed update equals the rule written out by hand, `1 + 0.5 × D × (reading + 1 − 1)`.
3. The push summed by output type equals the push summed by cell, within a billionth of the total change.

**The three rule-out conditions.** A board passes when all three hold:

1. **It still favours the safe capture without its most helpful cell.** The push minus the largest positive single-cell contribution is above zero. This rules out an effect that rests on one Kenyon cell of 3,770, which a small change in readings during a real run could erase.
2. **Correct labels push further than swapped labels.** The correct-label push is greater than the swapped-label push. This rules out updates that ignore the label. That pattern lifted every move together in journal items 21, 30 and 31.
3. **It already favours the safe capture after 12 lessons.** The push after passes 1–3 is above zero. The replay is exact for the first lesson and drifts from a real run as the gains change, because then rates and signals would change too. So the first half is the part closest to a real run. A push that appears only in the second half rests on the least reliable part of the estimate.

None of the three implies another, and tests show each one failing alone.

**Reported, not judged.**
- the **top cell's share of change**: the largest single-cell contribution, in either direction, divided by the sum of all cells' contributions in absolute value. 100% means one cell does everything.
- the **12-lesson step share**: the push after 12 lessons divided by the push after 24. Near 100% means the push is all delivered early. Above 100% means it shrinks later. Negative means it changes sign.
- the six per-output-type sums for correct and swapped labels, and each board's safe capture, rival and starting gap

**The answer, fixed before data.** Boards qualify as in the rules below, using the quiet circuit's recorded starting gap.

| Answer | When | What happens next |
|---|---|---|
| self-check failed | any self-check part fails | Stop and find out why. No answer is read. |
| too few boards | fewer than 2 boards qualify | Don't request the six runs. The rules below would give inconclusive, because they need 2 boards. |
| ruled out | fewer than 2 qualifying boards pass all three conditions | Don't request the six runs under this protocol. Record which conditions failed. Running them anyway would need a dated revision. |
| not ruled out | at least 2 qualifying boards pass all three | Request the researcher's approval for the six runs. |

The 2-board threshold matches the expansion rule, which needs 2 boards. The conditions are lenient on purpose: any positive amount counts. The screen only stops runs that could not reach "expand"; it never counts as a learning result. "Not ruled out" says nothing about whether the rule works.

## Required checks

Each check makes sure the comparison measures what it claims to. If any one fails, the whole result is **inconclusive** and the cutoffs are not read. Checks 1, 2 and 4 are unchanged; check 5 gains one item; check 3 is revised; checks 6 and 7 are new.

1. **Learning off changes nothing.** Unchanged.
2. **No oversized step.** Unchanged.
3. **The cap keeps move differences in the reading the rule uses** (revised). Quiet circuit: each lesson's reading before feedback is compared with every legal move's reading before teaching, and with the earlier lessons' readings before feedback in the same pass. Every comparison keeps at least 99%, and the cap record must say it was taken from the reading before feedback. In the learning-off run this repeats the calibration and should pass, because the readings equal the ones the scale was chosen on. In the correct and swapped runs it tests whether learned changes push readings past the cap.
4. **The current circuit is the one that already failed.** Unchanged: its before-teaching scores on `Q04sIPQ5:13` equal the replay baseline exactly. Teaching does not affect them.
5. **The runs are complete and match their condition.** Unchanged, plus: each run's file must name the rule "reading before feedback". This stops a 2026-11-14 run from being read as a run of this rule.
6. **The reading before feedback is a fresh, pulse-free reading of the lesson move, taken immediately before its pulse** (new). For every lesson:
   - the reading pass has no pulse and the feedback pass has the lesson's pulse
   - the feedback pass is the very next forward pass on that board
   - the gains fingerprint is the same in both passes
   - in the first lesson of each pass, the reading equals that move's reading at the checkpoint just before, because no gain changes in between. With learning off, every lesson's reading equals that move's reading before teaching.

   Without this check, a run that read the pulsed pass, or read a stale reading, could pass as this rule.
7. **Each pulse reaches its own dopamine cells** (new). In every lesson, the pulsed pass raises the mean firing of the pulse's own dopamine types above the reading pass: PAM07 and PAM02 for reward, and PPL101 and PPL103 for punishment. If a pulse failed to arrive, the lesson would teach nothing, and a failure would say nothing about the rule. The reading pass makes this comparison possible for the first time.

## Decision rules, fixed before data

These are the 2026-11-14 rules with the numbers unchanged. Apply the steps in order; the first that matches gives the answer.

1. **Inconclusive** if a required check fails, or if fewer than 2 boards are eligible in both circuits.
2. **Expand to 12 boards** if, on at least 2 boards eligible in both circuits, the quiet circuit has:
   - (a) closure with correct lessons of at least 20%. This rules out a change too small to matter.
   - (b) an advantage over swapped of at least 20 points. This rules out lessons that lift every move together.
   - (c) an advantage at least 10 points larger than the current circuit's on that board. This rules out an effect the current circuit shows under the same rule.
3. **Drop the quiet, rescaled circuit with the reading before feedback** if its advantage over swapped is under 5 points on every board eligible in the quiet circuit. We would stop testing zero drive with the 0.014047 reading under this rule.
4. **Inconclusive** otherwise: the result falls between the expansion and drop cutoffs.

Definitions, exact-cutoff handling, the worked example and where each number comes from are in [the 2026-11-14 protocol](three-board-feedback-test-2026-11-14.md#decision-rules-fixed-before-data). The numbers come from earlier results under the old rule, and they are kept so that a change in the result can be credited to the rule rather than to new cutoffs. No closure under either rule has been seen. The only result so far is the learning-off check 3 failure.

## What to record

Everything the 2026-11-14 probe records, plus for each lesson:
- the reading pass: forward-pass count, no pulse, score, dopamine means, and fingerprints of the cell rates and of the gains
- the feedback pass: forward-pass count, pulse and gains fingerprint
- the cap record of the reading before feedback

For each checkpoint, a fingerprint of every legal move's cell rates. For each run, the rule name and the number of output cells per type that the probe found. That count lets the annotation count used by the offline check be confirmed afterwards.

## Commands for the laptop (each run after approval)

From the repository root on the graph machine. The first three need no graph.

```
node --test .codebase/tests/neural-learning/three-board-reading-before-feedback-v1.test.mjs .codebase/tests/neural-learning/reading-before-feedback-check-v1.test.mjs
```

Count the output cells per type from the annotation file (reads only that file):

```
node --max-old-space-size=256 .codebase/scripts/neural-learning/count-output-cells-v1.mjs --annotations .cache/flywire-annotations-v2.1.0.tsv
```

Make the fixed-weight recording, a graph run that needs approval. Skip this if `runs/pulse-readings-2026-11-15/quiet-fixed-weights` already holds a complete recording:

```
node --max-old-space-size=512 .codebase/scripts/neural-learning/record-pulse-readings-v1.mjs --config runs/replay-calibration-inputs/calibration-config.json --out runs/pulse-readings-2026-11-15/quiet-fixed-weights
```

Run the offline check. It counts the output cells again itself, and prints and saves the counts:

```
node --max-old-space-size=256 .codebase/scripts/neural-learning/check-reading-before-feedback-v1.mjs --recording runs/pulse-readings-2026-11-15/quiet-fixed-weights --packet runs/replay-calibration-inputs/boards.jsonl --learning-off-run runs/three-board-feedback-2026-11-14/quiet-off --annotations .cache/flywire-annotations-v2.1.0.tsv --out runs/pulse-readings-2026-11-15/reading-before-feedback-check.json
```

Only if the answer is "not ruled out" and the researcher approves, run the six runs, one per circuit and condition, serially:

```
node --max-old-space-size=512 .codebase/scripts/neural-learning/probe-wide-learning-v4.mjs --config runs/replay-calibration-inputs/calibration-config.json --circuit current --condition correct --out runs/three-board-reading-before-feedback-2026-11-15/current-correct
```

Repeat for `current swapped`, `current off`, `quiet correct`, `quiet swapped` and `quiet off`, each into its own `CIRCUIT-CONDITION` folder. Then:

```
node .codebase/scripts/neural-learning/apply-three-board-rules-v2.mjs --runs runs/three-board-reading-before-feedback-2026-11-15 --baseline research/reports/fly-connections-memory-v1-2026-11-07/calibration-replay-2026-11-14/replay-files/valence-baseline/probe.json --packet runs/replay-calibration-inputs/boards.jsonl --out runs/three-board-reading-before-feedback-2026-11-15/decision.json
```

- **Cost:** 886 forward passes per run, 5,316 in all, about 9% more than the 2026-11-14 test. Memory is as before, about 280 MiB per run; that is an estimate from the earlier probe, not a measurement.
- **The five paused 2026-11-14 runs stay paused.** These commands write only to new folders. The probe and the recorder refuse a folder that already holds a run, and the check refuses to overwrite its output.
- **The pulse scale report** (commands on [its page](pulse-scale-check-2026-11-15.md#how-to-run-it-on-the-graph-machine-after-approval)) is optional for this protocol. The offline check makes its own exact comparison with the saved run.

## What is built (2026-11-15)

| File | What it does |
|---|---|
| [`reading-before-feedback-v1.mjs`](../../../.codebase/src/neural-learning/reading-before-feedback-v1.mjs) | The two-pass lesson and checks 3, 5, 6 and 7. It then hands over to the unchanged v1 checks and verdicts. |
| [`probe-wide-learning-v4.mjs`](../../../.codebase/scripts/neural-learning/probe-wide-learning-v4.mjs) | A copy of the v3 probe that runs the new lesson. It also records the rule name and the number of output cells per type, and pins both shared rules files. |
| [`apply-three-board-rules-v2.mjs`](../../../.codebase/scripts/neural-learning/apply-three-board-rules-v2.mjs) | A copy of the v1 rules script that uses the new checks |
| [`reading-before-feedback-check-v1.mjs`](../../../.codebase/src/neural-learning/reading-before-feedback-check-v1.mjs), [`check-reading-before-feedback-v1.mjs`](../../../.codebase/scripts/neural-learning/check-reading-before-feedback-v1.mjs) | The offline check and its script |
| [`count-output-cells-v1.mjs`](../../../.codebase/scripts/neural-learning/count-output-cells-v1.mjs) | Prints the output-cell counts from the annotation file |

`three-board-feedback-v1.mjs`, `probe-wide-learning-v3.mjs` and `apply-three-board-rules-v1.mjs` are unchanged, because completed runs pin their hashes.

## Tests (2026-11-15, made-up inputs only)

[`three-board-reading-before-feedback-v1.test.mjs`](../../../.codebase/tests/neural-learning/three-board-reading-before-feedback-v1.test.mjs) has 8 tests on a tiny made-up circuit. In it, the reward pulse excites one Kenyon cell and an output cell excites another, so a pulse changes a reading and learning changes later readings, as in the real graph.

- **The rule reads the pulse-free pass.** Gains after 24 lessons equal the same lessons written out separately, with the reading from a pass without the pulse and the signal from the pass with it. The v1 rule, which reads the pulsed pass, ends with different gains. Each lesson costs exactly one extra forward pass.
- **The record.** In every condition, each reading pass has no pulse and comes straight before its feedback pass, and the gains don't change between the two. First-lesson readings match the checkpoint before them. With learning off, every reading matches the start. Each pulse raises its own dopamine cells. Later readings change once gains have changed.
- **Check 3 on the right reading.** At a scale just above every pulse-free rate, the v1 rule's cap check fails because the pulse pushes a cell over the cap. The new rule's check keeps 100%.
- **Unchanged parts.** Fresh memory, and the step-size guard stopping a board before any change.
- **Each new or revised check failing alone.** Twelve single breaks each make the result inconclusive with their own message: a run of the old rule; a pulsed, missing or wrongly pulsed reading pass; another pass in between; gains changed in between; a reading that differs from its checkpoint, during learning or with learning off; a pulse that does not raise PAM07 or PPL103; a cap under 99%; and a cap record taken from the pulsed pass. The v1 checks still apply. With every check passing, the v1 verdicts come out as before.
- **Genuine tiny runs** raise none of the new failures.
- **Scripts.** The probe stops at a wrong input pin before any graph work, marks its manifest `failed` with the rule name, and refuses a used folder or an unknown circuit. The rules script reads six made-up runs built on the real board packet and reports "expand". After one reading pass is spoiled, it reports inconclusive and names the lesson.

[`reading-before-feedback-check-v1.test.mjs`](../../../.codebase/tests/neural-learning/reading-before-feedback-check-v1.test.mjs) has 8 tests on made-up recordings built on the real board packet:

- **Output-cell counts.** One cell per annotation row of an output type; Kenyon cells and other types skipped; repeated roots flagged; a missing column refused; a type with no cells refused.
- **Push, worked by hand,** per output type and per cell, with the attraction and avoidance signs.
- **Self-check.** It passes on matching data. Eight spoiled inputs each fail it, and then no answer is read: a learning signal off by 1e-12, a dopamine mean, a starting score off by 1e-15, a missing score, a missing lesson, two lessons swapped, the wrong condition, and boards out of order.
- **Pulse-free rates.** A reward pulse that would light up a cell in the pulsed rates leaves its gain untouched in the replay.
- **Screen.** Not ruled out when every board passes. Each rule-out condition, failing alone, rules the rule out: one cell carrying everything, labels that don't matter, and a push that appears only after lesson 12. Too few qualifying boards gives "too few boards".
- **Scripts.** The count script's numbers match the annotation file. The check runs on a recording of the real size, refuses one without 6,046 connections, refuses to overwrite, and exits with status 1 when the self-check fails.

**Each test was shown to fail when its code is broken.** Nineteen deliberate breaks were made, one at a time, and every one was caught:
- the rule reading the pulsed pass
- each part of check 6 removed: the no-pulse test, consecutive passes, unchanged gains, the checkpoint match
- check 7 removed
- check 3 not asking which reading it used
- the rule name not checked
- a cap record taken from the pulsed rates
- the offline replay reading pulsed rates
- the self-check ignoring learning signals, or ignoring starting scores
- each rule-out condition weakened or dropped
- the attraction and avoidance signs dropped from the push, by cell or by type
- Kenyon cells counted as output cells
- the 2-board minimum lowered

## Focused science review (2026-11-15, before data)

Science track, solo review by the builder, so it is not independent. It covers the worksheet rows this protocol can affect. The question is whether the new rule and its screen can give an interpretable result either way.

| Row (points) | Objection | Check | Disposition |
|---|---|---|---|
| Variables and controls (8) | Changing the rule and keeping the circuits could credit the rule's effect to the circuit. | Both circuits use the new rule, so rule (c) still compares circuits under one rule. Swapped and learning-off runs use the same two-pass lesson, at matched exposure. | Addressed in the design. The earlier caveat remains: the quiet circuit changes drive and reading together. |
| Variables and controls (8) | The rule could look selective only because readings differ between moves. | Correct and swapped lessons read the same moves the same way; only the learning signal differs. Rule (b) and rule-out condition 2 compare exactly that. | Addressed in the design. |
| Testability (4) | The screen's push is not a closure, so it could be read as a learning result. | The screen can only stop runs. Its answers and next steps were fixed above before data, and "not ruled out" is stated to say nothing about learning. | Addressed. |
| Mathematics and statistics (5) | The push ignores the network's nonlinear response and recurrent paths, so its size is not a score change. | Only signs and comparisons are used. The self-check confirms the arithmetic two ways, and a hand-worked test fixes the signs. | Disclosed limit. A sign could still differ from a real run, which is why condition 3 favours the early, more reliable half. |
| Mathematics and statistics (5) | Output-cell counts come from the annotation file. The probe also skips cells whose root is not in the graph, which this count cannot see. If the counts are wrong, the push's weighting of attraction against avoidance is wrong. | The probe now records its own counts, so the two can be compared after the six runs. The check prints the counts it used and any repeated roots. | **Open until real data.** Compare the counts before reading the six runs. |
| Sufficiency for the conclusion (5) | The rival is fixed at the start, while the rules find it again at each checkpoint. | Disclosed. The screen asks about the first steps, where the starting rival is the right one. | Disclosed limit. |
| Systematic collection (5) | The screen depends on the saved learning-off run and a new recording agreeing. | Self-check part 1 requires all 72 lessons and 106 starting scores to match bit for bit. | Open until the recording runs. |
| Study and collection design (7) | This protocol was written after check 3 failed. Was the change chosen to get a result? | Only the learning-off run has data, and it has no closure. The cutoffs are unchanged. The rule change follows the failure's cause: the rule read the pulse. A scale change was the alternative ([pulse scale check](pulse-scale-check-2026-11-15.md)). It would keep the pulse in the reading, and every larger scale weakens the readings. | Recorded as a pivot in the [journal](../../../research/journal/experiments/2026-11-07-fly-connections-memory.md#40-2026-11-15-pivot-read-the-kenyon-cells-before-feedback) and [decision log](../../../research/project/decision_log.md). |

**Review passes (solo, distinct assumptions).**

1. **The rule reads what it says.** *Assumption:* the update uses the pulse-free pass. *Check:* an independent hand-written loop in the tiny circuit gives the same final gains, and the v1 rule gives different ones. Mutating the probe to read the pulsed pass is caught. *Disposition:* confirmed for the tested scope.
2. **The conditions are independent.** *Assumption:* each rule-out condition can fail alone. *Finding:* the first draft had "favours the safe capture" together with "survives without its most helpful cell". The second implies the first, so the draft really had only two conditions. It was replaced by "favours the safe capture by lesson 12" before any test or data. Made-up cases now fail each condition alone. *Disposition:* changed, then confirmed.
3. **Check 3 still tests something.** *Assumption:* with pulse-free readings, check 3 could be empty. *Check:* in learning-off runs it repeats the calibration and should pass. In learning runs, readings drift as gains change, and a test shows the check failing on a 0.985 share. *Disposition:* confirmed. The check is informative only in the correct and swapped runs, and the protocol says so.

## Biggest uncertainty

Taking the pulse out of the reading removes what made check 3 fail. It may also remove most of what made gains change at all. The pulse-free reading is weaker, and in the zero-drive circuit the safe capture and its rival share 97–99% of their active cells. If the push is tiny and the same for correct and swapped labels, the screen rules the rule out. Then the next question is the circuit or the boards, not the scale.

Evidence and history: [journal items 37–40](../../../research/journal/experiments/2026-11-07-fly-connections-memory.md#37-2026-11-15-check-3-failed-in-the-quiet-learning-off-run); [2026-11-14 protocol](three-board-feedback-test-2026-11-14.md); [pulse scale check](pulse-scale-check-2026-11-15.md); [next checkpoint](../../next-checkpoint.md).
