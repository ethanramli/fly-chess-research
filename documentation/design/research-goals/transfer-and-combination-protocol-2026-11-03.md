# Transfer and combination tests: complete protocol (2026-11-03)

**Status: researcher-directed protocol, 2026-11-03.** It completes Phase B and Phase C of the [restart plan](restart-plan-2026-10-30.md) section 8, as the [peer review of 2026-11-02](../../../research/reports/overnight-peer-review-2026-11-02/ranked-problems.md) required (problem 8). It replaces the outline in section 8 and the unapproved [combination draft](../../../research/reports/overnight-memory-plasticity-2026-10-31/combination-test-spec.md); both stay preserved. Nothing here may run before Phase A passes. No puzzles are generated and no sealed data is opened by this document.

The research question stays: can a simulated fly reason, meaning apply many unrelated ideas to solve an unfamiliar problem?

## Words used here

- **Idea (concept):** one chess fact the fly must learn from feedback, because the eye input does not state it.
- **Transfer:** earlier learning makes the fly better on a kind of problem it was never trained on.
- **Combination:** the fly uses ideas it learned separately, together, on problems that were never taught as a combination.
- **Twin pair:** two boards where the same move has opposite correct answers. A pair is correct when the fly scores the move higher on the board where it is good. Chance is half the pairs.
- **Locked set:** a test set made before training, from games kept apart from all other sets, which nobody reads and which is used once.
- **Development set:** a separate set used only to choose the saved memory snapshot.
- **Arm:** one comparison system, trained and tested under the same conditions as the fly.
- **Bootstrap lower limit:** resample whole games with replacement 10,000 times (seed 20261103) and take the 2.5% point of the difference in correct pairs. Implemented as `pairGate` in [transfer-evaluation-v1.mjs](../../../.codebase/src/neural-learning/transfer-evaluation-v1.mjs).
- **Run:** one complete training and test with one puzzle order and one choice seed. Three runs are not three flies.

## Rules for every phase

1. **Input:** Eyes v2 with zero input collisions ([revision](restart-plan-revision-2026-11-03.md), problem 1).
2. **Scoring:** every proposed move is scored from unchanged stored memory with `frozenScores` (revision, problem 4). The same single move score scores every task. There is no idea selector, no task label, no context signal and no hand-written rule that combines ideas.
3. **Memory (corrected later on 2026-11-03):** each phase declares, before data, either brain memory only or FlyChess with a disclosed engineered memory, as the researcher allowed on 2026-11-01. Results are reported for the declared system. The exact-recall store alone is always a comparison arm. An engineered-memory condition must also beat the same retrieval on raw eyes, on random or rewired features, with no memory and with mismatched memory (revision, problem 7 correction). Zero exact repeats between test and training inputs. The first version of this rule said "brain memory only"; that was a mistake.
4. **Feedback:** only the fly's own chosen move gets feedback, through the modeled dopamine cells, from an independent checker certificate. Unknown gives nothing. No feedback on test sets.
5. **Equal practice:** every arm gets the same number of feedback trials in the same order, with the same seeds. An arm that skips a training block gets the same number of **filler trials** instead: the non-chess arbitrary-pairing trials of the 2026-11-01 pilot, which carry feedback but no chess fact.
6. **Each pass score must hold in all three runs.** Every run gets an independent replay audit.
7. **Necessity:** each locked pair differs between its twins in the condition of exactly one idea. A system that lacks that idea gives both twins the same answer and gets that pair wrong. The generator certifies each pair's idea label, and the number of pairs per idea is fixed below. This is how each idea is shown to be needed.
8. **Checker:** every Phase B and C answer is certified by [landing-square-certificate.mjs](../../../.codebase/src/search-and-feedback/landing-square-certificate.mjs) (built 2026-11-03, 9 tests). For any legal non-king move it lists every legal opponent capture of the moved piece on its landing square, the attackers that are pinned, and the exchange values; `combinedAnswer` applies the combined rule below. It must pass an independent audit and the feedback quality gate before a phase starts.
9. **Generators** (programs that pick twin pairs from training-pool games) must exist and pass audit before each phase starts. No generator exists yet for any phase, including Phase A; the restart plan's rebuild list (section 11, item 6) still lists the new puzzle generator as to be built.

## Phase B: transfer of one learned idea to an unfamiliar problem

**Idea learned in Phase A (idea 1, legal recapture):** after the fly's capture, can the opponent legally capture the capturing piece on its landing square?

**New problem: quiet-move safety.** The fly makes a move that does not capture, with any piece except the king. The move is good if the opponent has no legal capture of the moved piece on its landing square. The same fact decides the answer, but Phase A never rewarded a quiet move, so the problem is unfamiliar.

**Checker:** `certifyLandingSquare` in [landing-square-certificate.mjs](../../../.codebase/src/search-and-feedback/landing-square-certificate.mjs). A move is good when its `recaptures` list is empty.

**Sets.** Training: training-pool puzzles only. Development: 48 twin pairs from 48 separate games. Locked: 60 twin pairs from 60 unrelated games, split by game code from every other set. 30 pairs use ordinary kinds; 30 use five new kinds, 6 each:

1. the only attacker is a pawn;
2. the only attacker is a knight;
3. the only attacker is a long-range piece on an open line;
4. the moved piece itself was blocking the attacker's line (the line opens when it moves);
5. the only possible capturer is the king, and the moved piece is protected (unsafe twin: unprotected).

No pinned-piece cases are allowed in Phase B; they belong to Phase C.

**Practice.** 480 feedback trials on the new task [choice], with checkpoints every 96 trials. The scores before any Phase B feedback (zero practice) are also recorded for every arm and reported; they are not a pass rule.

**Arms (all with the same Phase B practice):**

| Arm | What it is |
|---|---|
| Phase-A fly | Phase A memory snapshot, then Phase B training |
| Fresh fly | Starting memory, then Phase B training |
| Shuffled fly | Phase A exposure with matched shuffled feedback, then Phase B training |
| Plasticity-off fly | Same exposure, memory updates switched off |
| Simple learner | Learner on raw photoreceptors, same exposure and feedback |
| Similar-board recall | Answers each test board with the answer of its most similar trained eye input |
| Exact-recall store | The separate answer file; no answer for new boards |

**Pass scores (all must hold in all three runs):**

1. **B1 overall:** Phase-A fly at least 44/60 locked pairs. (Chance of passing at random: 0.02%.)
2. **B2 new kinds:** at least 22/30. (At random: 0.8%.)
3. **B3 transfer benefit:** at least 6 more pairs than the fresh fly and than the shuffled fly, each with bootstrap lower limit above 0.
4. **B4 fair alternatives:** the same margin and lower-limit rule against every other arm.
5. **B5 retention:** the Phase A development set, scored again after Phase B, falls by at most 10% of its Phase A score.
6. **B6 audit:** independent replay confirms every feedback event, certificate, file hash, unchanged-memory check, zero input collisions and zero exact repeats.

**Stopping rules:**

1. Do not start unless Phase A passed all six section 9 rules, the checker and generator passed audit, and the input check found zero collisions.
2. Training stops at exactly 480 trials. The snapshot is the checkpoint with the most correct development pairs; a tie goes to the earliest. If any single development count is lower than at the previous checkpoint by more than 10%, that checkpoint cannot be chosen.
3. A run stops early only for a failed safety check before training starts, a failed audit or a software fault. It is reported and repeated in a new run folder with the same numbers. A fault after the locked set is opened spends that set.
4. The locked set is opened once. No limit is lowered and no new try uses the same set.

**Results:**

- All pass: earlier learning transfers to an unfamiliar problem in this model and task.
- B3 fails: no transfer benefit; the thesis failed in this test.
- B4 fails against the simple learner: the task did not need the brain wiring. Against similar-board recall: input similarity explains the result.
- B1 or B2 fails: no transfer claim.

## Phase C: combining separately learned ideas

Two ideas is the smallest test, not "many". So Phase C has two steps. **C1 combines two ideas. C2 combines three.** A claim of reasoning under the researcher's definition needs C2. Every claim states the exact number of ideas combined, and that chess ideas all come from one game, so they are less unrelated than the researcher's example.

### The three ideas

| Idea | Fact the fly must learn | Training task (alone) | Checker field used |
|---|---|---|---|
| 1. Legal recapture | Can the opponent legally capture the capturing piece? | Phase A safe capture, using only captures that would lose material if recaptured | `recaptures` (the existing capture certificate gives the same list) |
| 2. Pin | A piece cannot legally leave the line between an attacker and its own king | Quiet-move safety where the only attacker is pinned (safe) or not pinned (unsafe twin); no captures | `recaptures` for the answer; `pinnedAttackers` for the pair label |
| 3. Exchange value | Is what is captured worth at least the capturing piece? Values: pawn 1, knight 3, bishop 3, rook 5, queen 9 [choice] | Captures that can always be legally recaptured, with no pins; good if the captured value is at least the capturing piece's value | `combinedAnswer`, from `moverValue` and `capturedValue` |

**Combined rule for test problems:** a capture is good if the opponent has no legal recapture, or if the captured value is at least the capturing piece's value. On each training set alone this rule gives the same answer as that set's own rule, so training never conflicts with the test. Idea 3 comes from a different part of chess (counting material) from ideas 1 and 2 (legal moves).

**Training-set rejection rules (the generator must count and report rejections):**

1. Idea 1 training: reject any board where a pin changes the answer, or where the captured value is at least the capturing piece's value.
2. Idea 2 training: reject any capture.
3. Idea 3 training: reject any board with a pin on the target square's attackers, or with no legal recapture.

### Combinations never taught

1 + 2, 1 + 3, 2 + 3, and 1 + 2 + 3. No training board contains any of them. The generator certifies this with the rejection rules above.

### C1: ideas 1 and 2

**Locked problems:** 60 twin pairs from 60 unrelated games. Every board is a capture that would lose material if recaptured, and a pinned enemy piece attacks the target square.

- 30 **pin pairs:** the only attacker of the target is pinned (good) or the pin line is blocked so it is not pinned (bad).
- 30 **recapture pairs:** the pinned attacker is present on both twins; an extra unpinned attacker is absent (good) or present (bad).

**Practice:** 480 trials of idea 1 and 480 trials of idea 2 [choice]. Order is idea 1 then 2 in run 1, idea 2 then 1 in run 2, and alternating blocks of 96 in run 3.

**Arms:** Full fly (ideas 1 and 2); idea-1-only fly (480 filler trials in place of idea 2); idea-2-only fly (filler in place of idea 1); fresh fly (960 filler trials); shuffled-feedback fly; plasticity-off fly; simple learner; similar-board recall; exact-recall store; and the **fixed-sum combiner**, which adds the idea-1-only fly's and idea-2-only fly's move scores with a fixed rule. The fixed-sum combiner tests the review's warning that a hand-written rule could combine two answers without the fly learning to combine.

**Pass scores (all three runs):**

1. **C1-a:** Full fly at least 44/60.
2. **C1-b:** at least 22/30 on pin pairs and at least 22/30 on recapture pairs.
3. **C1-c:** at least 6 more pairs than every other arm, including the best single-idea fly and the fixed-sum combiner, each with bootstrap lower limit above 0.
4. **C1-d:** retention: each single idea's development set falls by at most 10%.
5. **C1-e:** independent audit, as B6.

**Before C1 runs:** a software check on made-up data must show that the frozen move score can express all four required answer patterns (both idea conditions on and off) without a selector. If it cannot, stop and report it as a limit of the score, not a failure of the fly.

### C2: ideas 1, 2 and 3

**Locked problems:** 60 twin pairs from 60 unrelated games. Every board is a capture where a pinned enemy piece attacks the target square and the exchange value matters.

- 20 **pin pairs:** captured value lower than the capturing piece; the only attacker is pinned (good) or not pinned (bad).
- 20 **recapture pairs:** captured value lower; the pinned attacker is on both twins; an unpinned attacker is absent (good) or present (bad).
- 20 **value pairs:** an unpinned attacker is on both twins; the captured piece is worth at least the capturing piece (good) or less (bad).

**Practice:** 480 trials of each idea [choice], with three counterbalanced orders across the three runs (1-2-3, 3-1-2, and alternating blocks of 96).

**Arms:** Full fly; each two-idea fly (filler in place of the missing idea); each single-idea fly; fresh fly; shuffled-feedback fly; plasticity-off fly; simple learner; similar-board recall; exact-recall store; fixed-sum combiner of the three single-idea flies.

**Pass scores (all three runs):**

1. **C2-a:** Full fly at least 44/60.
2. **C2-b:** at least 15/20 on each of the three pair groups. (At random, the chance for one group is 2.1%.)
3. **C2-c:** at least 6 more pairs than every other arm, including the best two-idea fly and the fixed-sum combiner, each with bootstrap lower limit above 0.
4. **C2-d and C2-e:** retention and audit, as in C1.

### Stopping rules for C1 and C2

1. C1 does not start unless Phases A and B passed. C2 does not start unless C1 passed.
2. The checker audit, the generators and the score-expression check must pass first.
3. Training stops at the fixed trial counts. Snapshot choice and early stops follow the Phase B rules.
4. Each locked set is opened once. No pass score is lowered after data.

### Results

- C1 passes: the fly combined two separately learned chess ideas on unfamiliar problems in this model. This is not yet a reasoning claim.
- C2 passes, with Phases A, B, C1 and every audit passed: the first evidence for reasoning under the researcher's definition, inside chess and inside this model. Only then may "EUREKA EUREKA" be used.
- Full fly no better than its best fewer-idea arm: no combination.
- Full fly no better than the fixed-sum combiner: the combination can be explained by a fixed addition of separate scores.
- Full fly no better than similar-board recall or the simple learner: input similarity or a simpler learner explains the result.

## Links

[Restart plan revision 2026-11-03](restart-plan-revision-2026-11-03.md) · [Fix report](../../../research/reports/overnight-peer-review-2026-11-02/fixes-2026-11-03.md) · [Restart plan](restart-plan-2026-10-30.md)
