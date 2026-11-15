# From safe capture to a test of combined concepts: roadmap (2026-11-16)

**Status: proposal, design only, awaiting the researcher's approval.** Nothing ran on the graph, nothing was learned, and no sealed game or locked set was opened. Until this is approved, the [2026-11-03 protocol](transfer-and-combination-protocol-2026-11-03.md) stays as written. Serves Volume 3, *Reasoning*: chapters 2 (*Definition of Reasoning*), 4 (*Process*), 5 (*Evidence*) and 6 (*Constraints*). Its prerequisite is Volume 2, chapters 3 and 5. Written from commit `20a52606`; the latest checkpoint then was [next-checkpoint.md](../../next-checkpoint.md), "Current checkpoint: 2026-11-15, later the same day".

Every number below comes from design checks that anyone can rerun: [evidence report](../../../research/reports/combination-roadmap-2026-11-16/README.md). Numbers marked [choice] are design choices fixed here before any data. They do not come from a source.

## In plain words

The project wants to know whether the fly system can use ideas it learned in separate lessons, together, on a chess problem it has not seen. The current test cannot tell us that. In it, a system that simply adds up separate answers gets every pair right, and so does a rule that counts the pieces on the board. So a pass would not show that anything was combined.

This page changes the test and proposes one way to build the system:

1. **New test.** Show one board and ask for the best move. Then move one piece and ask again. The boards are built so that the best move changes, and so that adding up separate answers cannot follow the change. Only a system that matches facts about the same piece can.
2. **One mechanism.** Each lesson fills its own memory with one kind of fact: which piece reaches which square, which piece is pinned, what a piece is worth. When the system chooses a move, it writes the facts for that move into a small table and applies one fixed rule to the table.
3. **Order of work.** First check the rule with perfect facts and no learning. Then learn each kind of fact alone. Then test the learned facts together on boards never used before. Then add more kinds of fact.

What happens next: the researcher decides whether to adopt this. If yes, the first build needs no graph and no approval for a run. Its exact contents are in [the handoff](#handoff-for-the-first-build).

## Where we start

- **The fly's own connections have learned no chess.** The three-board test is inconclusive, and its new rule has only run on made-up inputs ([next-checkpoint.md](../../next-checkpoint.md), lines 9–13).
- **The engineered store helps on unseen games only when the choice is filtered.** It scored 349.3 of 560 against 233.8 for a random capture, and raw eye input (383.2) and random features (362.6) beat the fly's key ([v8 report](../../../research/reports/engineered-memory-test-v8-2026-11-07/README.md), lines 22–33). Over all legal moves it scored 30.6 against 21.9 (line 35).
- **No reasoning result exists** ([Volume 3 workspace](../../../research/literature/writings/03-reasoning/README.md), line 13).

Still open: whether the fly's own rule moves a safe capture up at all; whether the fly's code adds anything over raw input; and, until now, whether any test here could tell combining from adding.

## Where we want to end up

### What the words mean in a test

| Word | What must be true |
|---|---|
| Independently learned | Each concept has its own lessons, its own labeller that sees only that concept's question, and its own stored memory. Taking that memory away breaks that concept's answers and no other's. |
| Distinct concepts | The facts come from different chess rules, and on the test boards one fact cannot be worked out from the other. |
| Unfamiliar | No lesson board changed two concepts at once. Test boards come from other families. No test question repeats a lesson question (`exactRepeats`, [transfer-evaluation-v1.mjs](../../../.codebase/src/neural-learning/transfer-evaluation-v1.mjs), line 26). |
| Needed together | Changing either fact alone changes the best move, and no sum of single-concept answers gives the right choices. |

The protocol's ideas 1 and 2 are not distinct in this sense. Both are graded by the same checker field, `recaptures` (protocol lines 94–95).

### The final kind of position: "which capture, if any?"

The side to move chooses among all its legal moves except king moves. A move's score is the worth of what it takes, minus the worth of the moved piece if that piece can legally be taken back on the square where it lands. These are the checker's own fields (`capturedValue`, `moverValue`, `recaptures` in [landing-square-certificate.mjs](../../../.codebase/src/search-and-feedback/landing-square-certificate.mjs), lines 35–40), and the sign of the score is the protocol's good-or-bad answer (lines 49–53). The best move depends on facts from three families of chess rules:

- **Movement:** which enemy pieces reach the landing square.
- **King safety:** whether such a piece is pinned; later, whether the enemy king may take back, and what a check forces.
- **Material:** what each piece is worth.

Chess ideas all come from one game, so they are less unrelated than the researcher's example. Every claim says so.

### Kept back for the final tests

- Every board where two families change together. Lessons never contain one.
- A pinned piece that takes along its own pin line.
- Two defenders of one square, one pinned and one free.
- A defender that appears when a line opens.
- Black to move, long lines, pawn defenders, and positions from real games.

## What the current test can and cannot tell apart

### Who has which fact when a move is chosen

| Fact | Where it is worked out | Who has it at the moment of choice |
|---|---|---|
| The legal moves to choose from | chess.js, outside the fly ([fly-connections-packet-v1.mjs](../../../.codebase/src/neural-learning/fly-connections-packet-v1.mjs), lines 64 and 117–119). The restart plan lists this as a disclosed limit (section 3). | The scoring loop, which scores every legal move ([reading-before-feedback-v1.mjs](../../../.codebase/src/neural-learning/reading-before-feedback-v1.mjs), line 27) |
| The board after the move | The eye code plays the move and draws the result, with the two squares of the move brightened and a dim picture of a captured piece ([eyes-v1.mjs](../../../.codebase/src/chess-input/eyes-v1.mjs), lines 88–101; [eyes-v2.mjs](../../../.codebase/src/chess-input/eyes-v2.mjs), lines 26–36) | The fly's light-sensing cells ([probe-wide-learning-v4.mjs](../../../.codebase/scripts/neural-learning/probe-wide-learning-v4.mjs), lines 92–97) |
| The opponent's legal replies | Only in the checker (landing-square-certificate.mjs, lines 19–23) | Nobody. They reach the learner later, as one reward-or-punish signal for the lesson move ([three-board-feedback-v1.mjs](../../../.codebase/src/neural-learning/three-board-feedback-v1.mjs), lines 24–27) |
| Pins | Never worked out as pins. The checker calls an attacker "pinned" when it has no legal capture (lines 32–34) | Checker only |
| Exchange value | The checker's table (lines 7 and 35–36) | Checker only. The fly sees piece pictures, not numbers |
| The move score | Mean of three attraction output-cell types minus mean of three avoidance types (probe-wide-learning-v4.mjs, lines 85–86). The frozen single-type score is still switched off ([move-score-contract-v1.json](../../../.codebase/src/neural-learning/move-score-contract-v1.json), lines 8–16) | — |

### Listing legal replies makes the pin lesson unnecessary

The move generator already leaves out a pinned piece's captures. So any part that lists the opponent's legal replies answers every pin pair without knowing what a pin is. In check 1, the rule "no legal recapture" alone got the pin pair and the recapture pair right.

Today only the checker lists legal replies. A solver that used its fields would be an **oracle**: it would be reading the answer. It would become a **shortcut at run time** the moment any helper asked the move generator about the board after the move. The eye code also refuses an illegal move (eyes-v1.mjs, lines 85–86), so drawing an imagined reply through it would leak the same fact.

**Rule for every later build [choice]:** no part of the choosing system may list or test the opponent's replies with the legal-move generator. The legal-reply solver runs only as a labelled ceiling.

### A fixed sum passes the current test

The protocol's fixed-sum system adds the move scores of the flies that each learned one idea (protocol line 119). Take the ideal case: x1 is 1 when no legal recapture exists, and x3 is 1 when the captured piece is worth at least the capturing piece. A pair counts as right when the good board scores strictly higher; a tie is wrong. On one legal pair per group, good board minus bad board gives:

| Pair | What the weights must satisfy |
|---|---|
| Pin pair | 1·w1 + 0·w3 > 0 |
| Recapture pair | 1·w1 + 0·w3 > 0 |
| Value pair | 0·w1 + 1·w3 > 0 |

Any positive weights satisfy all three. Two more problems follow:

- **A rule with no chess idea also passes:** "−10 × pieces on the board + (captured worth − mover worth)". The generator makes a twin by editing one square ([twin-pair-generator-v1.mjs](../../../.codebase/src/puzzle-learning/twin-pair-generator-v1.mjs), lines 43–55), so a pin blocker or an extra attacker always adds a piece: 7 pieces on the bad board against 6 on the good one in check 1.
- **The pass rule cannot be met for the right reason.** It asks the full fly to beat the fixed-sum system by 6 pairs (protocol line 147). A fly that combined perfectly would tie it.

A separate development audit reached the same findings on other boards. It sits untracked in the working tree as `research/reports/combination-shortcut-audit-2026-11-16/` and is another session's work; this page does not depend on it.

### The repair: flip pairs

A **flip pair** is two boards that differ in the square of one piece and have different best moves. Five hand-built boards, all legal, White to move:

| Board | FEN | Best move | Next best |
|---|---|---|---|
| Which attacker is pinned, king e8 | `2b1k3/R2n4/1p1p4/4n3/N1p5/8/3N4/4R1K1 w - - 0 1` | d2c4 (+1) | 0 |
| Which attacker is pinned, king h7 | `2b5/R2n3k/1p1p4/4n3/N1p5/8/3N4/4R1K1 w - - 0 1` | a4b6 (+1) | 0 |
| Shared defender pinned, king e8 | `4k3/5p2/4n3/6b1/3r3P/8/8/3RR1K1 w - - 0 1` | d1d4 (+5) | h4g5 (+3) |
| Shared defender free, king f8 | `5k2/5p2/4n3/6b1/3r3P/8/8/3RR1K1 w - - 0 1` | h4g5 (+2) | 0 |
| Shared defender elsewhere, knight e7 | `5k2/4np2/8/6b1/3r3P/8/8/3RR1K1 w - - 0 1` | d1d4 (+5) | h4g5 (+3) |

- **Held the same:** the pieces and material inside each group, which enemy pieces reach each of the two candidate landing squares, and the worth of every piece.
- **Changed:** the piece the black king stands behind, or the square of the one defender.
- **How the best moves were verified:** the checker scored every legal non-king move on every board (25, 25, 14, 14 and 15 moves). Each board has exactly one best move.

**Why no fixed weights work.** Give each move four numbers that each come from one concept: how many enemy pieces reach the landing square, how many enemy pieces are pinned, the worth taken, the worth moved.

- On the two "which attacker" boards, both captures have the numbers (1, 1, 1, 3) on both boards. No rule that uses only these numbers can prefer one capture on the first board and the other on the second.
- On the three "shared defender" boards, the rook capture minus the pawn capture is (0, 0, +2, +4) every time. So any weights prefer the same capture on all three boards, but the best move changes.
- An exhaustive grid of 4,459 weight settings never got more than 2 of the 5 boards right.
- Even a sum that is handed the checker's own "can it be taken back" answer gets 4 of 5. It is wrong on the free-defender board, because there both captures can be taken back and the answer cancels.

**The same holds on boards built by a program.** A generator made 71 flip pairs (142 boards, 60 families) from random construction: 30 of "which attacker is pinned", 30 of "shared defender pinned or free" and 11 of "shared defender free or elsewhere". The match step got 71 of 71. The best fixed sum over 7,680 weight settings, fitted on these same boards, got 0 of 71 pairs and 51.1 of 142 boards. With the families split in half, a sum fitted on 33 pairs got 0 of the 38 kept-back pairs, and the match step got 38 of 38. A sum that was handed the checker's legal-recapture answer got 31 of 71: all 30 "which attacker" pairs and 1 of the 41 "shared defender" pairs. Part of this is true by construction. The generator keeps a pair only if the single-concept numbers cannot separate its two boards, and 26 candidates failed only that rule against 60 that passed. So the rule is needed, and it can be met at a workable rate: 30 pairs in under 3 minutes for one type and in 8 minutes for the other.

**What these boards rule out:** a fixed sum of single-concept answers, any one concept alone, counting pieces, comparing material, and counting attackers. A rule that picks the move leaving the opponent the fewest legal replies got 1 of 5.

**What can still pass, and what we do about each:**

| It could still pass | Answer |
|---|---|
| A helper that lists legal replies | Forbidden at run time by the rule above; run as a ceiling |
| A system handed a ready-matched fact, such as "pinned attackers of the landing square" | That fact is the answer to the matching. Records must be labelled without reference to any candidate move's result |
| One learner trained on boards where two concepts change together | Lessons never contain such boards; the removal and swap tests below would expose it |
| A hand-written rule over perfect facts | This is Milestone 1 itself, which is why Milestone 1 says nothing about learning or the fly |

## The mechanism: concept records and one match step

### The parts, and what each sees and gives out

| Part | Sees | Gives out |
|---|---|---|
| Move generator (chess.js, exists) | The real board | The legal moves of the side to move. It never runs on the board after the move |
| Board updater (exists inside the eye code) | The board and one candidate move | The board after the move |
| Question lister (new, small) | The board after the move | For every enemy piece except the king: one reach question and one pin question about the landing square. Plus two worth questions. It lists every piece, so it holds no chess fact |
| Eyes (needs one small addition: a still board with two marked squares) | The board and the two marked squares | Currents for the light-sensing cells |
| Connectome (weights fixed) | Those currents | The rates of the 5,177 Kenyon cells ([memory-v6-data.mjs](../../../.codebase/src/neural-learning/memory-v6-data.mjs), line 6) |
| Three concept memories (`NearestEpisodeMemory`, [kc-episodic-memory-v2.mjs](../../../.codebase/src/neural-learning/kc-episodic-memory-v2.mjs), line 13) | The Kenyon-cell rates for one question | Yes or no; a number for worth |
| Working memory (new, small) | The answers for one candidate move | A table of records. It is emptied after each candidate and never saved |
| Match step (new, fixed, written once) | The table | One score for the move |
| Chooser | All the scores, read from unchanged memory (`frozenScores`, transfer-evaluation-v1.mjs, lines 7–21) | The top move; ties are split evenly, as `scorePositions` does ([engineered-memory-task-v5.mjs](../../../.codebase/src/neural-learning/engineered-memory-task-v5.mjs), lines 114–128) |
| Output-cell score | — | Not used in this condition |

The store accepts only +1 or −1 today (kc-episodic-memory-v2.mjs, line 30). Worth needs numbers, so the worth memory needs that one limit lifted.

### The records

```
{ concept: 'reach', piece: 'e6', to: 'd4', value: 'yes' }     the piece on e6 can move to d4 by its own way of moving
{ concept: 'pin',   piece: 'e6', to: 'd4', value: 'held' }    the piece on e6 may not go to d4, because its king would be exposed
{ concept: 'worth', type: 'r', value: 5 }
```

No record holds a move's score, a legal reply, or another concept's answer. A pin record is asked per piece **and square**, so a pinned piece that takes along its own line is "free" for that square.

### The match step

An enemy piece **can take back** only if its reach record says yes **and** its pin record for the same piece and square says free.

```
score(move) = worth taken − worth moved, if any enemy piece can take back
score(move) = worth taken,               if none can
```

This is not a sum of concept answers. It matches two records about the same piece, asks whether any piece is left, and multiplies by the mover's worth.

### The lessons

| Lesson | Boards | Labels come from | What it may change |
|---|---|---|---|
| Reach | No pinned piece on the board | A labeller that uses board geometry only | The reach memory |
| Pin | A line piece, a piece and a king in one line, and near misses; reach is balanced yes and no | A labeller that uses board geometry only | The pin memory |
| Worth | One piece at a time | The five numbers 1, 3, 3, 5, 9 (the checker's table) [choice] | The worth memory |

- **Saved after the lessons:** the three memories with their fingerprints, the scaling of the Kenyon-cell rates, and the identities of the eye code and the graph.
- **Frozen during a test:** everything.
- **Not learned:** the match step. We wrote it.

### One move, step by step

Board `4k3/5p2/4n3/6b1/3r3P/8/8/3RR1K1 w - - 0 1`, candidate `d1d4` (rook takes rook).

1. After the move, the enemy pieces are the pawn f7, the knight e6 and the bishop g5.
2. Reach to d4: f7 no, e6 yes, g5 no.
3. Pin, for the square d4: e6 is held. It stands on the e-file between its king on e8 and the white rook on e1. f7 and g5 are free.
4. Worth: taken 5, moved 5.
5. The knight reaches d4 but is held, so no piece can take back. Score 5.

`h4g5` (pawn takes bishop) scores 3 the same way. `d1d4` is chosen, and the checker agrees.

**Now change one fact:** the black king stands on f8 instead of e8.

- The pin record for e6 becomes "free".
- The reach records, the piece count, the material and the number of legal moves (19) do not change.
- One side effect: `e1e6` no longer gives check. It still scores −2.
- Now the knight can take back on both squares. `d1d4` scores 5 − 5 = 0 and `h4g5` scores 3 − 1 = +2. The choice flips to `h4g5`, and the checker agrees.

### The same mechanism with more concept families

A new concept adds its own lesson, its own memory and one reason why a reply does not count. The match step keeps its wording: "a reply counts unless a record cancels it."

- **Guard.** The enemy king may not take on a square that one of my pieces reaches. On `8/8/4k3/3p4/1N6/8/8/r2R2K1 w - - 0 1`, `b4d5` scores +1, because the white rook on d1 guards d5 even though that rook is itself pinned. A system that let pins cancel guards would say −2. So the guard record depends on a reach record of my own side, and a pin must not cancel it.
- **Check answer.** On `4k3/2p5/3p4/8/4N3/8/8/4R1K1 w - - 0 1`, `e4d6` gives check from two pieces at once. The pawn on c7 reaches d6 but may not take, so the score is +1.

How much of chess each set covers, on 4,000 positions from random play (117,487 moves; not real games):

| Concepts | Positions where every move's score equals the checker's | Moves that equal the checker's |
|---|---|---|
| Reach, pin, worth | 71.8% | 98.7% |
| Plus a rule for the king | 98.7% | 99.9% |

### What would force a new design

- The answer depends on a second reply, as in a longer exchange. The table would have to hold imagined boards, which is a search.
- Adding a concept needs the match step rewritten, not just one more kind of record.
- No memory key reaches the accuracy the match step needs (Milestone 2).

## Milestones

**Splits, the same in every milestone.** The unit is a **family**: one source board with its flip partner, its mirror image, its copy with colours swapped, and any copy that differs by one bystander piece. A family is never divided between lessons, development and locked tests. Boards made by the generator get a family number from the generator's seed. Boards from real games are split by game with the existing hash (`restartSplit`, twin-pair-generator-v1.mjs, lines 19–23): lessons from `train`, development from `development`, the Milestone 3 locked set from `locked-c1` and the Milestone 4 locked set from `locked-c2`. The hash needs no sealed file to be opened.

**Pass numbers.** The numbers 44 of 60, 15 of 20, the margin of 6 and the bootstrap rule are the protocol's own (lines 145–147), kept so that the bar is not lowered.

### Milestone 0: the fly learns safe capture in its own connections (current work)

- **Data, controls, measure and cutoffs:** the existing [three-board protocol](../neural-learning/three-board-reading-before-feedback-2026-11-15.md), unchanged.
- **New ability:** a teaching signal that changes the fly's own connections in a useful way.
- **If it fails:** Milestones 1 to 5 still run with the engineered memory, which the researcher allowed for this volume (Volume 3 workspace, lines 11 and 26). Only the versions that use the fly's own connections as memory are blocked.

### Milestone 1: the test and the match step with perfect records

No learning, no graph.

- **Build:** the two geometry labellers, the records, the match step, the check that the match step equals the checker on every move, the flip-pair generator, and the comparison rules.
- **Data:** fresh boards made by the generator, 20 flip pairs for each of three pair types [choice]: which attacker is pinned; shared defender pinned or free; shared defender free or elsewhere.
- **Controls:** the best fixed sum fitted on these same boards (in its favour); each concept removed; piece-count, material and reply-count rules; exact recall; the legal-reply solver as ceiling.
- **Measure:** flip pairs with both boards right.
- **Advance:** the match step gets every pair and equals the checker on every legal non-king move; the fixed sum gets no pair.
- **Redirect:** the generator finds too few pairs of a type from random construction: use hand-made templates for that type and say so.
- **Stop:** a fixed sum of single-concept answers gets both boards of a pair right. Then that pair type does not test matching.
- **New ability:** a test that can tell matching from adding. It inherits nothing and says nothing about learning or the fly.

### Milestone 2: learn each concept from its own lesson

- **Build:** the marked-squares eye view, the three lessons, and probe sets.
- **Data:** separate lesson pools; probe questions from families never used in lessons.
- **Controls:** shuffled labels; no memory; the same memory fed raw eye input or random features in place of the fly's Kenyon cells.
- **Measure:** the share of yes-or-no answers that are right on unseen boards. "Don't know" counts as wrong.
- **Advance:** at least 99% of reach answers and at least 99% of pin answers right on unseen boards, in all three runs [choice], and better than shuffled labels and no memory. Why 99%: when 1% of records are wrong in the simulation, 87% of pairs stay right, and 80% of the hardest pair type. That clears the 44 of 60 and the 15 of 20 that Milestone 3 asks for. When 2% are wrong, the hardest type falls to 63%.
- **Redirect:** the fly's key misses the bar and the raw-input key meets it: go on with the raw-input system as the declared system, and record a "no" for the connectome at this step.
- **Stop:** no key reaches 90% [choice]. Then the view or the memory is wrong; redesign it before anything else.
- **New ability:** separately learned concepts that hold on unseen boards. It inherits the labellers and probes from Milestone 1. Retention is checked by asking every probe again after all lessons. With one memory per concept this check is close to automatic, and the report must say so.

### Milestone 3: use the learned concepts together

- **Data:** a locked set of 60 flip pairs from 60 unrelated families, 20 per type, made once and opened once.
- **Controls:** the fixed sum over the same learned records; each concept removed; records swapped between flip partners; similar-board recall (`similarBoardRecall`, transfer-evaluation-v1.mjs, line 37); exact recall; the simple learner on raw eye input with the same lessons; the legal-reply ceiling; and the whole system rebuilt on raw-input, random and rewired keys.
- **Measure:** flip pairs with both boards right.
- **Advance (in all three runs):** at least 44 of 60 pairs and at least 15 of 20 per type; at least 6 pairs more than every comparison system, with the family bootstrap lower limit above 0 (`pairGate`, transfer-evaluation-v1.mjs, line 49).
- **Redirect:** probes pass but pairs fail: put perfect records in place of one learned memory at a time. If the score returns, the cause is record errors adding up, not the match step.
- **Stop:** the fixed sum over the learned records matches the full system. Then the learned records already carry the matched answer, and the lessons leaked.
- **New ability:** separately learned concepts used together on unfamiliar boards. It inherits the test from Milestone 1 and the memories from Milestone 2.

### Milestone 4: combinations and families never used before

- **Data:** a second locked set of the kept-back pair types and board kinds listed above. None of them is used in development.
- **Advance:** the same numbers for each kept-back type.
- **New ability:** the result holds for new combinations, not only new boards.

### Milestone 5: more families and harder problems

- **Build:** add guard and check answer, each with its own lesson, its own probe bar and its own flip pairs.
- **Data:** natural positions where the larger concept set gives the checker's score on every move.
- **Stop and redesign:** problems that need a second reply.
- **New ability:** five concepts from three families, on positions that were not built for the test.

### What happens when one concept is removed or swapped

Worked out exactly on the five hand-built boards with perfect records. These are predictions for the learned system, not results.

| System | Boards right, of 5 | What it does |
|---|---|---|
| All three concepts | 5 | — |
| Pin memory removed | 2 | Wrong wherever a pin matters |
| Reach memory removed | 2 | Always takes the most valuable piece |
| Worth memory removed | 3.11 | Right on the "which attacker" boards; ties on the "shared defender" boards |
| Pin records taken from the flip partner | The choice flips on all four boards where a pin decides | The choice follows the records, not the picture |
| Reach records swapped between "free" and "elsewhere" | The choice flips on both | The same |

### What each result would let us say

- **Engineered combination (Milestone 1):** the test separates matching from adding, and perfect records plus the match step are enough. Nothing about learning. Nothing about the fly.
- **Separately learned combination (Milestone 3):** the assisted system used concepts learned in separate lessons, together, on unfamiliar boards. We wrote the match step, and the claim must say so.
- **What the connectome adds:** claimed only if the system on the fly's Kenyon cells beats the same system on raw input, random features and a rewired graph, with the same helpers. If they tie, the system result stands and the fly's wiring is not shown to add anything. The memory test already points that way.

The reserved celebration phrase stays reserved until the approved pass rules and an independent audit pass.

## Attempts to break it, and what each changed

1. **A legal board fooled the first draft.** On the first "king e8" board, without the bishop on c8, the match step chose rook takes knight on d7 (score 3). The black king takes back, and the checker says −2. **Change:** a board is eligible only if perfect records plus the match step give the checker's score on every legal non-king move. Replies by the king moved to Milestone 5.
2. **A second legal board fools a narrower rule.** On `4k3/8/8/4r3/R3p3/8/8/6K1 w - - 0 1`, after `a4e4` the moved rook is itself the piece that pins the black rook, and the black rook simply takes it (checker −4). "Pinned means it cannot capture" says +1. **Change:** pin records are asked per piece and square.
3. **A simpler system matched an earlier draft.** In the first "shared defender" boards, the rook that could be captured also defended the second target. A fixed sum that was given the legal-recapture answer then passed. **Change:** the targets were moved so that one piece defends both.
4. **A sound idea can still fail.** A board needs a median of 186 yes-or-no records (from 24 to 604), and one wrong record can change the choice. On the program-built pairs, 87% of pairs stay right when 1% of records are wrong, 76% at 2%, 55% at 5% and 35% at 10%. So memories that are 95% right would fail the test even though the match step is sound. The sign would be: probes look fine, pairs fail. **Change:** the accuracy bar in Milestone 2 and the one-memory-at-a-time check in Milestone 3.

**Objections that remain:**

- **The match step is hand-written.** This conflicts with protocol rule 2, "no hand-written rule that combines ideas" (line 22). The researcher allowed working memory to be outsourced to code for this volume (Volume 3 workspace, line 26), but adopting this page still needs a dated revision of the protocol. A system that learns how to combine would be a stronger result, and this roadmap does not deliver it.
- All the concepts come from one game.
- Worth is taught as numbers.
- The score looks one reply ahead on one square. It is not playing strength.

**What would send us to a different design:** no memory key reaches the accuracy bar on unseen boards.

## Choices fixed on this page [choice]

1. The candidates are all legal moves except king moves. The checker does not score king moves (landing-square-certificate.mjs, line 15). This is a filter, and every result must state it first.
2. The move score is worth taken minus worth moved if the piece can be legally taken back on its landing square, with the checker's piece values.
3. Three pair types of 20 pairs each, and the pass numbers named above.
4. The accuracy bar and the 90% stop line in Milestone 2.
5. No run-time part may list legal replies.

## Review record

**Problem Solving, deep-in-thought, solo.** The request asked for solo mode, so the three passes below were made by the author and are not independent.

| Pass | Assumption tested | Check | Outcome |
|---|---|---|---|
| Can it be reproduced? | The boards and numbers hold when recomputed from the checker at the pinned commit | Every score comes from `certifyLandingSquare`; the reach labeller agreed with chess.js on all 117,487 moves | Confirmed for what was tested. The checks are saved with their outputs in the evidence report |
| Could something simpler do it? | Nothing simpler than matching gets the flip pairs | Fixed sums over a grid, each concept removed, simple rules, and a sum given the legal-recapture answer | One draft board changed (item 3 above). The legal-reply helper still passes, so it is forbidden |
| Is it the right question? | A pass means separately learned concepts were used together | Looked for a board that passes without the intended behaviour | The eligibility rule was added (item 1). The hand-written match step stays open |

**Science Review, focused, science track, before a decisive protocol.** Scored by the author. Points at risk in this design:

| Worksheet row | At risk | Why | What would settle it |
|---|---|---|---|
| Variables and controls (8) | 2 | A helper that lists replies could slip into a later build | A test that fails if the choosing code calls the move generator on a board after the move |
| Sufficiency for the conclusion (5) | 2 | A pass supports "the assisted system combined", not "the fly combined" | The same system on raw-input, random and rewired keys |
| Study and collection design (7) | 2 | Boards are constructed; with three concepts, 28% of random-play positions are not eligible | Milestone 5 on natural positions |
| Mathematics and statistics (5) | 1 | The error simulation assumes each record fails independently | Measured error patterns from Milestone 2 |
| Testability (4) | 1 | The [choice] numbers need the researcher's approval | Approval or changes before any data |

## Handoff for the first build

**What to build:** Milestone 1 as tested repository code. No graph, no learner, no sealed data. Use Ponytail. The checks in the evidence report already hold working versions of the labellers and the match step; the build turns them into a module with tests.

**Files**

- `.codebase/src/search-and-feedback/concept-records-v1.mjs`: the reach and pin labellers, `recordsFor(fen, move)`, the match step, the four single-concept numbers, and the eligibility check.
- `.codebase/src/search-and-feedback/concept-flip-pairs-v1.json`: the fixture.
- `.codebase/src/puzzle-learning/flip-pair-generator-v1.mjs`: the generator with family numbers.
- `.codebase/tests/search-and-feedback/concept-records-v1.test.mjs`
- `.codebase/scripts/search-and-feedback/check-concept-records.mjs`

**Entry point:** `node --max-old-space-size=256 .codebase/scripts/search-and-feedback/check-concept-records.mjs [--out FILE]`

**Fixture format**

```
{ "schema": "concept-flip-pairs-v1",
  "pairs": [ { "id": "...", "family": 1, "type": "which attacker is pinned", "changedFact": "black king e8 -> h7",
               "boards": [ { "fen": "...", "best": "d2c4" }, { "fen": "...", "best": "a4b6" } ] } ],
  "traps": [ { "id": "...", "fen": "...", "move": "a4e4", "checkerScore": -4, "needs": "pin records per piece and square" } ] }
```

It holds the five boards and four trap boards above and the generated pairs from the evidence report.

**Expected output:** the saved outputs in the evidence report, reproduced by the new code.

**Acceptance checks**

1. Every board is legal and has exactly one best move by the checker.
2. The match step gives the checker's score on every legal non-king move of every eligible board.
3. The single-concept numbers are equal where this page says they are, and the best fixed sum gets no flip pair.
4. The removal and swap table is reproduced.
5. The pin-line board scores −4, and the guard and check-answer boards are reported as outside the three-concept set.
6. No record has a field for a score or a reply. A test fails if the module calls the move generator on a board after the move.
7. The generator keeps every member of a family in one split and reports how many candidates it rejected, by reason.

**Give up on this version if** a fixed sum of single-concept answers gets both boards of a flip pair right, or the generator cannot produce eligible pairs.

**How the result decides the next build**

- **All checks pass:** build the marked-squares eye view and the Milestone 2 lessons. Milestone 2 answers the largest open question: can any memory key answer reach and pin questions accurately enough on unseen boards?
- **A check fails:** repair the test first. No mechanism work until it passes.

**The rest of the path:** Milestones 2 and 3 give the first claim that separately learned concepts were used together. Milestone 4 adds unfamiliar combinations. Milestone 5 adds more families.

## Links

[Evidence report](../../../research/reports/combination-roadmap-2026-11-16/README.md) · [Transfer and combination protocol](transfer-and-combination-protocol-2026-11-03.md) · [Restart plan](restart-plan-2026-10-30.md) · [Memory handoff](memory-handoff-2026-11-07.md) · [Journal entry](../../../research/journal/discussions/2026-11-16-combination-roadmap.md) · [All research goals](README.md)
