# Stage 1 representation ceiling (step 1, 2026-10-27)

Scope: step 1 of the researcher's 2026-10-27 plan (decision log: representation first). No graph run, no Fly, no pinned file changed, no registration. Training rows only (`research/data/lichess-stage1-synthetic-v1/train.jsonl`, SHA-256 `cc165730...67dd`); validation and final rows were not opened. Engineering diagnostic, not a learning result.

Run from the repository root: `node --max-old-space-size=256 research/reports/stage1-representation-ceiling-2026-10-27/ceiling.mjs` (about 95 s; output in [`results.jsonl`](results.jsonl), reproduced identically twice). Script SHA-256 `aaeecc6e...c7c9`.

## Question

Does a move description contain the facts needed to choose the safe capture on puzzles from a family never seen in training? If a learner with perfect memory cannot do it, no memory fix in the Fly can.

## Method

- **Learner** (supervised comparison baseline; never part of the Fly): an error-driven perceptron. Each fact has a weight starting at 0, and a move's score is the sum of its facts' weights. A training board counts as correct only if its certified move is the unique top score. After an error, the certified move's facts get +1 and the top-scoring wrong move's facts get -1. Passes repeat until no error, with at most 100 passes. Nothing decays and there is no weight bound.
- **Combination learner**: the same learner on every fact plus every pair of facts, to test whether facts are present but only useful in combination.
- **Test**: leave one family out. Train on 5 of the 6 training families and test on the 6th, for each family in turn, giving 24 held-out boards. Results are the mean over 5 training orders, with the range in brackets.
- **Twin-pair score**: the 24 boards are 12 twin pairs. Each pair has the same captures available but a different safe capture. A learner that ignores the surroundings picks the same capture in both twins and gets one right. Getting both twins right shows that the swap was read. Chance (random capture) is 11.3/24 boards and 2.7/12 pairs.
- **Learning curve**: train on k = 1..5 families, using every subset and 5 orders, and test on the rest.
- **Novelty**: the share of the facts that separate a held-out board's safe capture from its other captures that never occur in any training-family move.

## Descriptions

Allowed (public occupancy and label-blind geometry; no attack, pin or outcome judgement):

| Description | What a move becomes |
|---|---|
| v4 (current Fly cue) | move vector plus every other piece's exact offset from the landing square, each tied to the move type (e.g. `act:at:rxb:opp:k:-1,1`) |
| v4 untagged | the same offsets, not tied to the move type, plus one move-type fact |
| v4 mover-tagged | offsets tied to the moving piece only |
| relational-v3 | existing encoder: offsets around the landing and origin squares, walls, history |
| bound-ray all-legal | existing encoder: relational-v3 plus sliders on a line with the landing square and the pieces between them (exact vectors) |
| v4 untagged + rays | v4 untagged plus the bound-ray line facts, not tied to the move type |

Restricted ("R:"; these still need a researcher decision, per the 2026-10-24 reviewer addendum: attack maps, legality-aware attack judgements and pin flags). They were measured to inform that decision only:

| Description | Added facts |
|---|---|
| R: contact | a piece of type X is next to, or a knight's jump from, the landing square |
| R: + line-of-sight | a queen, rook or bishop on a matching line to the landing square, nothing between |
| R: + king-line | one of those pieces is on a clear line with its own king |
| R: relation classes only | the three classes above without the exact offsets |
| R: attack map | after the move, which enemy piece types can reach the landing square (chess.js `attackers`; pins ignored) |
| R: attack map + king-line | each such attacker marked as on a clear line with its own king or not |
| oracle | "the opponent can recapture" (the answer itself; harness check) |

## Results

Every description fits all 24 training boards (24/24) when trained on all of them.

| Description | Held-out boards /24 (linear) | Twin pairs both right /12 (linear) | Boards /24 (pairs) | Twin pairs /12 (pairs) | Unseen distinguishing facts |
|---|---|---|---|---|---|
| chance (random capture) | 11.3 | 2.7 | | | |
| v4 (current) | 9.2 [7-12] | 1.0 | 10.6 [5-14] | 2.2 | 79% |
| v4 untagged | 9.8 [8-11] | 0 | 11.4 [9-14] | 1.6 | 35% |
| v4 mover-tagged | 8.6 [6-11] | 0 | 7.8 [5-12] | 0.4 | 66% |
| relational-v3 | 10.6 [9-12] | 2.0 | 11.6 [10-13] | 2.6 | 56% |
| bound-ray all-legal | 10.2 [10-11] | 1.2 | 12.0 [10-13] | 2.6 | 57% |
| v4 untagged + rays | 9.6 [9-11] | 0.2 | 8.8 [7-12] | 0.4 | 37% |
| R: untagged + contact | 12.4 [11-15] | 2.4 | 11.2 [10-13] | 1.8 | 31% |
| R: + line-of-sight | 14.0 [11-16] | 3.0 | 10.4 [9-12] | 1.8 | 30% |
| R: + king-line | 12.6 [10-15] | 2.8 | 10.4 [8-12] | 1.8 | 29% |
| R: relation classes only | 14.2 [11-17] | 4.2 | 13.0 [12-15] | 3.8 | 12% |
| R: attack map | 18.6 [18-20] | 6.6 | 18.8 [17-21] | 6.8 | 15% |
| R: attack map + king-line | 20.2 [19-22] | 8.2 | 21.0 [20-22] | 9.0 | 17% |
| oracle | 24 | 12 | 24 | 12 | 0% |

By stratum (pin 12, blocked 6, absent 6), attack map + king-line: linear 9.2 / 5.2 / 5.8, pairs 9 / 6 / 6. The attack map alone gives linear 7.4 / 6 / 5.2. The pin stratum is the weakest. For reference, D2 on validation needs 14/16 (88%) and at least 3/4 per stratum. These training-family numbers are not D2.

Learning curve (linear, fraction of held-out twin pairs both right; chance 0.23):

| Description | train 1 family | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| v4 (current) | 0.03 | 0.06 | 0.09 | 0.12 | 0.08 |
| v4 untagged | 0 | 0.01 | 0.02 | 0.03 | 0 |
| bound-ray all-legal | 0.02 | 0.04 | 0.06 | 0.09 | 0.10 |
| R: relation classes only | 0.04 | 0.12 | 0.18 | 0.28 | 0.35 |
| R: attack map | 0.16 | 0.23 | 0.36 | 0.40 | 0.55 |
| R: attack map + king-line | 0.20 | 0.33 | 0.41 | 0.51 | 0.68 |

## Interpretation (diagnostic; limits below)

1. **No allowed description transfers.** On held-out families, a perfect-memory learner is at or below chance for every allowed description, with or without fact pairs: 0-2.6 of 12 twin pairs against a chance level of 2.7. Their twin-pair curves stay below chance up to 5 training families, so more families of the same kind are not predicted to help them. That is an extrapolation from 6 families.
2. **Why (partly hypothesis).** With exact offsets, most facts that decide a held-out board never occur in training: 79% for v4. Untagging makes facts repeat (35% unseen) but still does not transfer. An exact offset of a piece does not say whether that piece can reach the landing square, because that depends on piece type, direction and pieces in between together.
3. **What does transfer is an attack judgement.** Coarse geometry classes help little (at most 14.2/24, 4.2/12). An attack map reaches 18.6/24. Adding "the attacker is on a clear line with its own king" reaches 20-21/24 and 8-9/12 twin pairs, and its curve is still rising at 5 families. More training families would probably help these descriptions (hypothesis).
4. **Correction to the 2026-10-27 surrogate report.** Its "perceptron on cue-v4 tokens: 10/24 held out" is at chance level (random capture 11.3/24). It is not a partial result between chance and D2. The report's "D2 looks representation-limited" understated this: under v4 the held-out score is chance. The same comparison ("10 of 24 ... needs about 21") was given to the researcher in chat.

## Limits

- 24 boards, 6 families and 12 twin pairs from one synthetic producer. Ranges across training orders are wide (e.g. 7-12).
- The learners are supervised comparison baselines on idealized facts, with no hashing, cell budget, bounds or forgetting. They bound what a linear readout of these facts can do. They say nothing about whether the Fly would reach that bound.
- An attack map is an engineered perception input closer to the answer than occupancy; the oracle is one step further (legality). Using either in the Fly needs a researcher decision and does not model vision. Nothing here is a biological claim.
- Validation and final families were not used. Choosing a description from these training-family results is allowed. Acceptance evidence must still come from validation (D2) in a registered run.
